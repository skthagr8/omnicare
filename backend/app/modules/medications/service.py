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
)


class MedicationService:
    @staticmethod
    async def create(db: AsyncSession, data: MedicationCreate) -> Medication:
        med = Medication(**data.model_dump())
        db.add(med)
        await db.commit()
        await db.refresh(med)
        return med

    @staticmethod
    async def list_for_client(db: AsyncSession, client_id: uuid.UUID) -> list[Medication]:
        result = await db.execute(
            select(Medication).where(
                Medication.client_id == client_id, Medication.is_active.is_(True)
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def add_schedule(
        db: AsyncSession, medication_id: uuid.UUID, data: MedicationScheduleCreate
    ) -> MedicationSchedule:
        med = await db.get(Medication, medication_id)
        if not med:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Medication not found")
        schedule = MedicationSchedule(medication_id=medication_id, **data.model_dump())
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        return schedule

    @staticmethod
    async def record_administration(
        db: AsyncSession, actor: User, data: MedicationAdministrationCreate
    ) -> MedicationAdministration:
        if data.status.value == "administered" and data.administered_at is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "administered_at is required when status is administered",
            )
        admin = MedicationAdministration(recorded_by=actor.id, **data.model_dump())
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        return admin
