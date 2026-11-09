from __future__ import annotations
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AssessmentType, SessionStatus, UserRole
from app.core.geo import geo_from_point, point_from_geo
from app.modules.assessments.models import Assessment
from app.modules.assessments.schemas import AssessmentResponse
from app.modules.auth.models import User
from app.modules.caregivers.models import Caregiver
from app.modules.clients.models import (
    Client,
    ClientDiagnosis,
    DiagnosisDefinition,
    DiagnosisAssessmentRequirement,
    DiagnosisMedicationRequirement,
)
from app.modules.medications.models import MedicationAdministration
from app.modules.medications.schemas import (
    MedicationAdministrationResponse,
    MedicationResponse,
)
from app.modules.scheduling.models import CaregiverSession
from app.modules.scheduling.schemas import (
    ClientResponse,
    SessionAssessmentItem,
    SessionCheckIn,
    SessionCheckOut,
    SessionCreate,
    SessionMedicationItem,
    SessionResponse,
)
from app.modules.tasks.models import TaskCompletion
from app.modules.tasks.schemas import TaskCompletionCreate, TaskCompletionUpdate
from app.modules.tasks.service import TaskService



def serialize_session(session: CaregiverSession) -> SessionResponse:

    print("SESSION ID:", session.id)
    print("CLIENT ID:", session.client_id)
    print("CAREGIVER ID:", session.caregiver_id)
    print("STATUS:", session.status)
    print("CREATED AT:", session.created_at)

    print("CHECK-IN LOCATION TYPE:", type(session.check_in_location))
    print("CHECK-IN LOCATION:", session.check_in_location)

    print("CHECK-OUT LOCATION TYPE:", type(session.check_out_location))
    print("CHECK-OUT LOCATION:", session.check_out_location)

    return SessionResponse(
        id=session.id,
        client_id=session.client_id,
        caregiver_id=session.caregiver_id,
        scheduled_start=session.scheduled_start,
        scheduled_end=session.scheduled_end,
        visit_date=session.visit_date,
        status=session.status,
        check_in_at=session.check_in_at,
        check_in_location=geo_from_point(session.check_in_location),
        check_in_geofence_verified=session.check_in_geofence_verified,
        check_out_at=session.check_out_at,
        check_out_location=geo_from_point(session.check_out_location),
        created_by=session.created_by,
        created_at=session.created_at,
    )

def serialize_client(client: Client) -> ClientResponse:
    return ClientResponse(
        id=client.id,
        first_name=client.first_name,
        last_name=client.last_name,
        date_of_birth=client.date_of_birth,
        gender=client.gender,
        created_at=client.created_at,
        updated_at=client.updated_at,
    )


class SchedulingService:

    # Maps to router.post("/scheduling/sessions", response_model=SessionResponse)
    @staticmethod
    async def create(db: AsyncSession, actor: User, data: SessionCreate) -> CaregiverSession:
        # The visit belongs to the client's organisation (the admin may have none).
        client = await db.get(Client, data.client_id)
        if client is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")

        caregiver_active = await db.scalar(
            select(User.is_active)
            .join(Caregiver, Caregiver.user_id == User.id)
            .where(Caregiver.user_id == data.caregiver_id)
        )
        if caregiver_active is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Caregiver not found")
        if not caregiver_active:
            raise HTTPException(status.HTTP_409_CONFLICT, "Caregiver account is inactive")

        # Reject double-booking: an open visit of this caregiver that overlaps the new window.
        clash = (
            await db.execute(
                select(CaregiverSession.scheduled_start, CaregiverSession.scheduled_end, Client.full_name)
                .join(Client, Client.id == CaregiverSession.client_id)
                .where(
                    CaregiverSession.caregiver_id == data.caregiver_id,
                    CaregiverSession.status.in_((SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS)),
                    CaregiverSession.scheduled_start < data.scheduled_end,
                    CaregiverSession.scheduled_end > data.scheduled_start,
                )
                .order_by(CaregiverSession.scheduled_start)
                .limit(1)
            )
        ).first()
        if clash:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Schedule conflict: caregiver already has a visit with {clash.full_name} "
                f"from {clash.scheduled_start:%Y-%m-%d %H:%M} to {clash.scheduled_end:%H:%M} UTC.",
            )

        session = CaregiverSession(
            org_id=client.org_id,
            client_id=data.client_id,
            caregiver_id=data.caregiver_id,
            scheduled_start=data.scheduled_start,
            scheduled_end=data.scheduled_end,
            created_by=actor.id if actor.role == UserRole.ADMIN else None,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session
  
    # Maps to router.get("/scheduling/sessions/{session_id}", response_model=SessionResponse)
    @staticmethod
    async def get_by_id(db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID) -> SessionResponse: 
        session = await db.get(CaregiverSession, session_id)
        if not session or session.org_id != org_id:
            raise ValueError("Session not found")
        return serialize_session(session)
    
    # Maps to router.put("/scheduling/sessions/{session_id}", response_model=SessionResponse)
    @staticmethod
    async def update_session(db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID, data: SessionCreate) -> SessionResponse:
        session = await db.get(CaregiverSession, session_id)
        if not session or session.org_id != org_id:
            raise ValueError("Session not found")
        session.client_id = data.client_id
        session.caregiver_id = data.caregiver_id
        session.scheduled_start = data.scheduled_start
        session.scheduled_end = data.scheduled_end
        await db.commit()
        await db.refresh(session)
        return serialize_session(session)
  
    # Maps to router.get("/scheduling/sessions", response_model=list[SessionResponse])
    @staticmethod
    async def list(
            db: AsyncSession,
            caregiver_id: uuid.UUID | None = None,
            client_id: uuid.UUID | None = None,
            *,
            org_id: uuid.UUID | None = None,
        ) -> list[SessionResponse]:
            # The API always passes org_id; None (unscoped) is for internal scripts only.
            stmt = select(CaregiverSession)
            if org_id:
                stmt = stmt.where(CaregiverSession.org_id == org_id)
            if caregiver_id:
                stmt = stmt.where(CaregiverSession.caregiver_id == caregiver_id)
            if client_id:
                stmt = stmt.where(CaregiverSession.client_id == client_id)
            result = await db.execute(stmt.order_by(CaregiverSession.scheduled_start))
            return [serialize_session(s) for s in result.scalars().all()]

    # Maps to router.get("/scheduling/sessions/{session_ids}", response_model=list[SessionResponse])
    @staticmethod
    async def list_sessions_by_id(
        db: AsyncSession, session_ids: list[uuid.UUID], org_id: uuid.UUID
    ) -> list[SessionResponse]:
        stmt = select(CaregiverSession).where(
            CaregiverSession.id.in_(session_ids),
            CaregiverSession.org_id == org_id,
        )
        result = await db.execute(stmt.order_by(CaregiverSession.scheduled_start))
        return [serialize_session(s) for s in result.scalars().all()]

    # Maps to router.get("/scheduling/sessions/{session_id}", response_model=SessionResponse)
    @staticmethod
    async def get(db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID) -> SessionResponse:
        session = await db.get(CaregiverSession, session_id)
        if not session or session.org_id != org_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
        return session

    # Maps to router.post("/scheduling/sessions/{session_id}/check-in", response_model=SessionResponse)
    @staticmethod
    async def check_in(
        db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID, data: SessionCheckIn
    ) -> CaregiverSession:
        session = await SchedulingService.get(db, session_id, org_id)
        session.check_in_at = datetime.now(timezone.utc)
        session.check_in_location = point_from_geo(data.location)
        session.check_in_geofence_verified = data.geofence_verified
        session.status = SessionStatus.IN_PROGRESS
        await db.commit()
        await db.refresh(session)
        return serialize_session(session)

    # Maps to router.post("/scheduling/sessions/{session_id}/check-out", response_model=SessionResponse)
    @staticmethod
    async def check_out(
        db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID, data: SessionCheckOut
    ) -> CaregiverSession:
        session = await SchedulingService.get(db, session_id, org_id)
        session.check_out_at = datetime.now(timezone.utc)
        session.check_out_location = point_from_geo(data.location)
        session.status = SessionStatus.COMPLETED
        await db.commit()
        await db.refresh(session)
        return serialize_session(session)

    # Maps to router.get("/scheduling/sessions/{session_id}/tasks", response_model=list[TaskCompletionResponse])
    @staticmethod
    async def list_session_tasks(
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> list[TaskCompletion]:
        """List all active task completions for a specific caregiver session."""
        return await TaskService.list_for_session(db, session_id)

    # Maps to router.post("/scheduling/sessions/{session_id}/tasks", response_model=TaskCompletionResponse)
    @staticmethod
    async def create_session_task(
        db: AsyncSession,
        session_id: uuid.UUID,
        payload: TaskCompletionCreate,
    ) -> TaskCompletion:
        """Create or schedule a task execution directly within a caregiver session."""
        return await TaskService.create_for_session(db, session_id, payload)

    # Maps to router.patch("/scheduling/tasks/{task_id}", response_model=TaskCompletionResponse)
    @staticmethod
    async def update_session_task(
        db: AsyncSession,
        task_id: uuid.UUID,
        payload: TaskCompletionUpdate,
    ) -> TaskCompletion:
        """Update an existing task completion record (status, overrides, notes)."""
        return await TaskService.update_session_task(db, task_id, payload)

    # Maps to router.delete("/scheduling/tasks/{task_id}", response_model=TaskCompletionResponse)
    @staticmethod
    async def void_session_task(
        db: AsyncSession,
        task_id: uuid.UUID,
        reason: str = "Voided via scheduling endpoint",
    ) -> TaskCompletion:
        """Void or soft-delete a task completion from a session."""
        return await TaskService.void_session_task(db, task_id, reason)

    # Maps to router.get("/scheduling/visits/today", response_model=list[SessionResponse])
    @staticmethod
    async def get_todays_visits(
    db: AsyncSession,
    actor: User,
    ) -> list[SessionResponse]:
        if not actor or str(actor.role).lower() != "caregiver":
            raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Caregiver role required.",
        )
        today = datetime.now(timezone.utc).date()
        stmt = (
        select(CaregiverSession)
        .where(
            CaregiverSession.caregiver_id == actor.id,
            CaregiverSession.visit_date == today,
        )
        .order_by(CaregiverSession.scheduled_start)
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()
        return [serialize_session(session) for session in sessions]

    # ------------------------------------------------------------------
    # Care-plan helpers
    #   session -> client_id -> client_diagnoses -> diagnosis_definition
    #           -> assessment / medication requirements
    # ------------------------------------------------------------------

    @staticmethod
    async def _get_session_client_id(
        db: AsyncSession, session_id: uuid.UUID, caregiver_id: uuid.UUID
    ) -> uuid.UUID:
        """Step 1: fetch only the client_id of a session assigned to this caregiver."""
        client_id = await db.scalar(
            select(CaregiverSession.client_id).where(
                CaregiverSession.id == session_id,
                CaregiverSession.caregiver_id == caregiver_id,
            )
        )
        if client_id is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or not assigned to this caregiver.",
            )
        return client_id

    @staticmethod
    async def _get_active_client_diagnoses(
        db: AsyncSession, client_id: uuid.UUID, *loader_options
    ) -> list[ClientDiagnosis]:
        """Steps 2-3: the client's active diagnoses with their active definitions."""
        stmt = (
            select(ClientDiagnosis)
            .join(ClientDiagnosis.definition)
            .where(
                ClientDiagnosis.client_id == client_id,
                ClientDiagnosis.is_active.is_(True),
                DiagnosisDefinition.is_active.is_(True),
            )
            .options(*loader_options)
        )
        result = await db.execute(stmt)
        return list(result.scalars().unique().all())

    # Maps to router.get("/scheduling/sessions/{session_id}/assessment-items", response_model=list[SessionAssessmentItem])
    @staticmethod
    async def get_session_assessment_items(
        db: AsyncSession, session_id: uuid.UUID, caregiver_id: uuid.UUID
    ) -> list[SessionAssessmentItem]:
        # 1. Session -> client_id (also verifies the caregiver owns it)
        client_id = await SchedulingService._get_session_client_id(
            db, session_id, caregiver_id
        )

        # 2-3. Active diagnoses with their definitions + assessment requirements
        diagnoses = await SchedulingService._get_active_client_diagnoses(
            db,
            client_id,
            selectinload(ClientDiagnosis.definition).selectinload(
                DiagnosisDefinition.assessment_requirements
            ),
        )

        # 4. Flatten requirements across all diagnoses (first one per type wins)
        requirements_by_type: dict[AssessmentType, DiagnosisAssessmentRequirement] = {}
        for diagnosis in diagnoses:
            for req in diagnosis.definition.assessment_requirements:
                requirements_by_type.setdefault(req.assessment_type, req)

        # 5. Assessments actually recorded in this session. The score
        #    sub-records are eager-loaded: AssessmentResponse reads them and a
        #    lazy load is not allowed under AsyncSession.
        assessments = (await db.execute(
            select(Assessment)
            .options(
                selectinload(Assessment.tug),
                selectinload(Assessment.cmai),
                selectinload(Assessment.braden),
                selectinload(Assessment.delirium),
            )
            .where(Assessment.session_id == session_id)
            .order_by(Assessment.created_at)
        )).scalars().all()
        actual_by_type = {a.assessment_type: a for a in assessments}  # latest wins

        # 6. Combine
        return [
            SessionAssessmentItem(
                assessment_type=req.assessment_type,
                is_required=req.is_required,
                frequency_days=req.frequency_days,
                instructions=req.instructions,
                completed=(
                    AssessmentResponse.model_validate(actual_by_type[req.assessment_type])
                    if req.assessment_type in actual_by_type
                    else None
                ),
            )
            for req in requirements_by_type.values()
        ]

    # Maps to router.get("/scheduling/sessions/{session_id}/medications", response_model=list[SessionMedicationItem])
    @staticmethod
    async def get_session_medications(
        db: AsyncSession, session_id: uuid.UUID, caregiver_id: uuid.UUID
    ) -> list[SessionMedicationItem]:
        client_id = await SchedulingService._get_session_client_id(
            db, session_id, caregiver_id
        )

        diagnoses = await SchedulingService._get_active_client_diagnoses(
            db,
            client_id,
            selectinload(ClientDiagnosis.definition)
            .selectinload(DiagnosisDefinition.medication_requirements)
            .selectinload(DiagnosisMedicationRequirement.medication),
        )

        requirements_by_med: dict[uuid.UUID, DiagnosisMedicationRequirement] = {}
        for diagnosis in diagnoses:
            for req in diagnosis.definition.medication_requirements:
                requirements_by_med.setdefault(req.medication_id, req)

        administrations = (await db.execute(
            select(MedicationAdministration)
            .where(MedicationAdministration.session_id == session_id)
            .order_by(MedicationAdministration.created_at)
        )).scalars().all()
        admin_by_med = {a.medication_id: a for a in administrations}  # latest wins

        return [
            SessionMedicationItem(
                medication=MedicationResponse.model_validate(req.medication),
                is_required=req.is_required,
                instructions=req.instructions,
                administration=(
                    MedicationAdministrationResponse.model_validate(admin_by_med[req.medication_id])
                    if req.medication_id in admin_by_med
                    else None
                ),
            )
            for req in requirements_by_med.values()
        ]

    # Maps to router.get("/scheduling/sessions/{client_id}", response_model=list[SessionResponse])
    @staticmethod
    async def get_sessions_by_client(
        db: AsyncSession, client_id: uuid.UUID, caregiver_id: uuid.UUID
    ) -> list[SessionResponse]:
        stmt = (
            select(CaregiverSession)
            .where(
                CaregiverSession.client_id == client_id,
                CaregiverSession.caregiver_id == caregiver_id,
            )
            .order_by(CaregiverSession.scheduled_start)
        )
        result = await db.execute(stmt)
        sessions = result.scalars().all()
        if not sessions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No sessions found for this client and caregiver."
            )
        return [serialize_session(session) for session in sessions]

    # Maps to router.get("/sessions/{session_id}/client",response_model=ClientResponse)
    @staticmethod
    async def get_session_client(db: AsyncSession, session_id: uuid.UUID, actor: User,) -> Client:
        if actor is None or actor.role != "caregiver":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Caregiver role required.",
            )
        stmt = (
        select(Client)
        .join(
            CaregiverSession,
            CaregiverSession.client_id == Client.id,
        )
        .where(
            CaregiverSession.id == session_id,
            CaregiverSession.caregiver_id == actor.id,
        )
    )
        result = await db.execute(stmt)
        client = result.scalar_one_or_none()
        if client is None:
            raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or not assigned to this caregiver.",
        )
        return client



   



 


scheduling_service = SchedulingService()