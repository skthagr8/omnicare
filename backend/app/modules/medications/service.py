import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.medications.models import (
    Medication,
    MedicationAdministration,
    MedicationSchedule,
)
from app.modules.medications.schemas import (
    MedicationAdministrationCreate,
    MedicationCreate,
    MedicationScheduleCreate,
    MedicationAdministrationUpdate,
    MedicationScheduleUpdate
)
from datetime import time, timedelta, datetime, date
from app.core.enums import MedicationAdminStatus
from sqlalchemy.orm import selectinload
from app.modules.clients.models import (
    ClientDiagnosis,
    DiagnosisDefinition,
    DiagnosisMedicationRequirement,
)
from app.modules.scheduling.models import CaregiverSession


def client_medication_ids(client_id: uuid.UUID):
    """Ids of the medications a client receives: those required by any of the
    client's active diagnoses whose definition is active. Medications are not
    owned by clients; this join is the only client -> medication link."""
    return (
        select(DiagnosisMedicationRequirement.medication_id)
        .join(
            ClientDiagnosis,
            ClientDiagnosis.diagnosis_definition_id
            == DiagnosisMedicationRequirement.diagnosis_definition_id,
        )
        .join(
            DiagnosisDefinition,
            DiagnosisDefinition.id == ClientDiagnosis.diagnosis_definition_id,
        )
        .where(
            ClientDiagnosis.client_id == client_id,
            ClientDiagnosis.is_active.is_(True),
            DiagnosisDefinition.is_active.is_(True),
        )
    )


class MedicationService:

    # ---------------------------------------------------------
    # Medications
    # ---------------------------------------------------------
    # Maps to router.post("/medications", response_model=MedicationResponse, status_code=201)
    @staticmethod
    async def create_medications(db: AsyncSession, data: MedicationCreate) -> Medication:
        med = Medication(**data.model_dump())
        db.add(med)
        await db.commit()
        await db.refresh(med)
        return med

    # Maps to router.get("/medications/client/{client_id}", response_model=list[MedicationResponse])
    @staticmethod
    async def list_client_medications(db: AsyncSession, client_id: uuid.UUID) -> list[Medication]:
        result = await db.execute(
            select(Medication).where(
                Medication.id.in_(client_medication_ids(client_id)),
                Medication.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    # ---------------------------------------------------------
    # Schedules
    # ---------------------------------------------------------

    # Maps to router.get("/medications/{medication_id}/medication-schedules", response_model=list[MedicationScheduleResponse])
    @staticmethod
    async def list_schedules(
        db: AsyncSession, medication_id: uuid.UUID
    ) -> list[MedicationSchedule]:
        result = await db.execute(
            select(MedicationSchedule).where(
                MedicationSchedule.medication_id == medication_id
            )
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def create_schedule(
        db: AsyncSession,
        medication_id: uuid.UUID,
        data: MedicationScheduleCreate,
        user: User,
    ) -> MedicationSchedule:
        if getattr(user, "role", None) != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only users with the 'admin' role can add medication schedules",
            )
        schedule = MedicationSchedule(
           medication_id=medication_id,
           **data.model_dump(),
        )
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        return schedule

    @staticmethod
    # Maps to router.patch("/medications/{medication_id}/medication-schedules/{schedule_id}", response_model=MedicationScheduleResponse)
    async def update_schedule(  
        db: AsyncSession,
        medication_id: uuid.UUID,
        schedule_id: uuid.UUID, # Fixed: schedules are not tied to session_id
        data: MedicationScheduleUpdate,
    ) -> MedicationSchedule:
        result = await db.execute(
            select(MedicationSchedule).where(
                MedicationSchedule.id == schedule_id,
                MedicationSchedule.medication_id == medication_id,
            )
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Medication schedule not found")
            
        # Fixed: exclude_unset prevents overwriting existing data with None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(schedule, key, value)
            
        await db.commit()
        await db.refresh(schedule)
        return schedule

    # ---------------------------------------------------------
    # Administrations (The Clinical Logbook)
    # ---------------------------------------------------------
    # Maps to router.patch("/medications/administrations/{administration_id}", response_model=MedicationAdministrationResponse)
    @staticmethod
    async def update_administration(
        db: AsyncSession,
        administration_id: uuid.UUID,
        data: MedicationAdministrationUpdate,
    ) -> MedicationAdministration:
        result = await db.execute(
            select(MedicationAdministration).where(
                MedicationAdministration.id == administration_id
            )
        )
        admin = result.scalar_one_or_none()
        if not admin:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Medication administration not found")
            
        # Fixed: exclude_unset=True
        update_data = data.model_dump(exclude_unset=True)
            
        for key, value in update_data.items():
            setattr(admin, key, value)
            
        await db.commit()
        await db.refresh(admin)
        return admin
    
    # Maps to router.get("/sessions/{session_id}/administrations", response_model=list[MedicationAdministrationResponse])
    @staticmethod
    async def list_administrations(
        db: AsyncSession, actor: User, session_id: uuid.UUID
    ) -> list[MedicationAdministration]:
        result = await db.execute(
            select(MedicationAdministration).where(
                MedicationAdministration.recorded_by == actor.id, # Fixed: mapped to DB column
                MedicationAdministration.session_id == session_id,
            )
        )
        return list(result.scalars().all())

    # Maps to router.post("/administrations", response_model=list[MedicationAdministrationResponse])
    @staticmethod
    async def create_administrations(
        db: AsyncSession, actor: User, data: list[MedicationAdministrationCreate]
    ) -> list[MedicationAdministration]:
        # A dose may only be recorded for a medication the session's client receives
        # through an active diagnosis (medications carry no client_id of their own).
        session_ids = {item.session_id for item in data}
        session_clients = dict((await db.execute(
            select(CaregiverSession.id, CaregiverSession.client_id)
            .where(CaregiverSession.id.in_(session_ids))
        )).all())
        allowed: dict[uuid.UUID, set[uuid.UUID]] = {}
        for client_id in set(session_clients.values()):
            allowed[client_id] = set((await db.execute(client_medication_ids(client_id))).scalars().all())

        admins = []
        for item in data:
            client_id = session_clients.get(item.session_id)
            if client_id is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"Session {item.session_id} not found")
            if item.medication_id not in allowed[client_id]:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Medication {item.medication_id} is not part of this client's diagnosis care plan",
                )

            # Enforce timestamp for completed meds
            if item.status.value == "completed" and item.administered_at is None:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "administered_at is required when status is completed",
                )
                
            dump = item.model_dump(exclude={"missed_reason", "glucose_check_value"})
            
            admin = MedicationAdministration(
                recorded_by=actor.id, # Fixed: mapped to DB column
                missed_reason=item.missed_reason,
                glucose_check_value=item.glucose_check_value,
                **dump
            )
            db.add(admin)
            admins.append(admin)
            
        await db.commit()
        for admin in admins:
            await db.refresh(admin)
        return admins



    # Maps to router.get("/medications/{medication_id}/administrations?session_id={session_id}", response_model=list[MedicationAdministrationResponse])
    @staticmethod
    async def list_session_administrations_for_medication(
        db: AsyncSession, medication_id: uuid.UUID, session_id: uuid.UUID
    ) -> list[MedicationAdministration]:
        result = await db.execute(
            select(MedicationAdministration)
            .join(MedicationSchedule, MedicationAdministration.schedule_id == MedicationSchedule.id)
            .where(
                MedicationSchedule.medication_id == medication_id,
                MedicationAdministration.session_id == session_id,
            )
        )
        return list(result.scalars().all())


    @staticmethod
    async def list_weekly_occurrences(
        db: AsyncSession, client_id: uuid.UUID,  week_start: date
    ) -> list[dict]:
        """
        Retrieves all scheduled medication occurrences for a client during a given week,
        merging active schedules with any recorded administration logs.
        """
        week_end = week_start + timedelta(days=7)

        # 1. Fetch all active schedules for the client with their parent Medication details
        schedule_stmt = (select(MedicationSchedule)
                         .join(Medication, MedicationSchedule.medication_id == Medication.id)
                         .options(selectinload(MedicationSchedule.medication))
                         .where(Medication.id.in_(client_medication_ids(client_id)),
                                Medication.is_active.is_(True),
                                  ))
        
        schedules_result = await db.execute(schedule_stmt)
        schedules = schedules_result.scalars().all()

        # 2. Fetch existing administrations logged within this week range

        admin_stmt = (select(MedicationAdministration)
    # Medications are shared between clients, so the client of a dose comes from its session.
    .join(CaregiverSession, MedicationAdministration.session_id == CaregiverSession.id)
    .where(
        CaregiverSession.client_id == client_id,
        MedicationAdministration.administered_at >= datetime.combine(week_start, time.min),
        MedicationAdministration.administered_at < datetime.combine(week_end, time.min),
    )
)
        

        admins_result = await db.execute(admin_stmt)
        # Map existing records by (schedule_id, scheduled_date) for quick lookup
        administrations = {
            (admin.schedule_id, admin.administered_at.date()): admin
            for admin in admins_result.scalars().all()
        }

        # 3. Build the weekly occurrence matrix based on schedule rules (days_of_week 1-7)
        occurrences = []
        current_date = week_start
        
        for _ in range(7):
            iso_weekday = current_date.isoweekday()  # 1 = Monday, 7 = Sunday
            
            for schedule in schedules:
                # Check if this medication is scheduled for this day of the week
                if iso_weekday in schedule.days_of_week:
                    lookup_key = (schedule.id, current_date)
                    existing_admin = administrations.get(lookup_key)

                    occurrences.append({
                        "administration_id": existing_admin.id if existing_admin else None,
                        "client_id": client_id,
                        "medication_id": schedule.medication_id,
                        "schedule_id": schedule.id,
                        "session_id": existing_admin.session_id if existing_admin else None,
                        "scheduled_date": current_date,
                        "scheduled_time": schedule.scheduled_time,
                        "status": existing_admin.status if existing_admin else MedicationAdminStatus.PENDING,
                        "administered_at": existing_admin.administered_at if existing_admin else None,
                        "recorded_by": existing_admin.recorded_by if existing_admin else None,
                        "glucose_check_value": existing_admin.glucose_check_value if existing_admin else None,
                        "missed_reason": existing_admin.missed_reason if existing_admin else None,
                        "medication": schedule.medication,
                    })

            current_date += timedelta(days=1)

        return occurrences
    




medication_service = MedicationService()