import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, status, Query
from app.modules.tasks.schemas import TaskCompletionCreate, TaskCompletionCreate, TaskCompletionResponse, TaskCompletionUpdate, TaskCompletionUpdate
from app.modules.tasks.schemas import TaskCompletionResponse
from app.modules.tasks.service import TaskService
from app.modules.tasks.service import TaskService
from app.modules.scheduling.schemas import ClientResponse
from app.modules.audit import router
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.scheduling.schemas import (
    SessionCheckIn,
    SessionCheckOut,
    SessionAssessmentItem,
    SessionCreate,
    SessionMedicationItem,
    SessionResponse,
)
from app.modules.scheduling.service import scheduling_service, serialize_session
from app.modules.scheduling.patients import list_session_patients, reassign_caregiver
from app.modules.scheduling.schemas import (
    ReassignCaregiverRequest,
    ReassignCaregiverResponse,
    SessionPatient,
)
from app.modules.medications.service import medication_service


scheduling_router = APIRouter()


@scheduling_router.patch("/tasks/{task_id}", response_model=TaskCompletionResponse)
async def update_session_task_execution(
    task_id: uuid.UUID,
    data: TaskCompletionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TaskService.update_session_task(db, task_id, data)

@scheduling_router.delete("/tasks/{task_id}", response_model=TaskCompletionResponse)
async def void_session_task_execution(
    task_id: uuid.UUID,
    reason: Optional[str] = Query("Cancelled", description="Reason for voiding"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TaskService.void_session_task(db, task_id, reason or "Cancelled")

@scheduling_router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return serialize_session(await scheduling_service.create(db, current_user, data))

@scheduling_router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session_by_id(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_session(
        await scheduling_service.get_by_id(db, session_id, current_user.org_id)
    )

@scheduling_router.put("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: uuid.UUID,
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_session(
        await scheduling_service.update_session(db, session_id, current_user.org_id, data)
    )

@scheduling_router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    caregiver_id: Optional[uuid.UUID] = None,
    client_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Not scoped by organisation: returns sessions across all organisations.
    return await scheduling_service.list(db, caregiver_id, client_id)



@scheduling_router.get("/patients", response_model=list[SessionPatient])
async def list_patients_from_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin patients table: every client with sessions, plus diagnoses, acuity and caregiver.

    Not scoped by organisation.
    """
    return await list_session_patients(db)


@scheduling_router.patch("/patients/{client_id}/caregiver", response_model=ReassignCaregiverResponse)
async def reassign_patient_caregiver(
    client_id: uuid.UUID,
    data: ReassignCaregiverRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Move a patient's upcoming scheduled visits to another caregiver (any organisation)."""
    return await reassign_caregiver(db, client_id, data.caregiver_id)


@scheduling_router.get("/visits/today", response_model=list[SessionResponse])
async def get_todays_visits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await scheduling_service.get_todays_visits(
            db=db,
            actor=current_user,
        )

@scheduling_router.post("/sessions/{session_id}/check-in", response_model=SessionResponse)
async def check_in(
    session_id: uuid.UUID,
    data: SessionCheckIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # The service already returns a serialized SessionResponse.
    return await scheduling_service.check_in(db, session_id, current_user.org_id, data)

@scheduling_router.post("/sessions/{session_id}/check-out", response_model=SessionResponse)
async def check_out(
    session_id: uuid.UUID,
    data: SessionCheckOut,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # The service already returns a serialized SessionResponse.
    return await scheduling_service.check_out(db, session_id, current_user.org_id, data)
    
@scheduling_router.get("/sessions/{session_id}/tasks", response_model=list[TaskCompletionResponse])
async def list_session_tasks(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Materialise tasks required by the client's diagnoses (idempotent).
    await TaskService.ensure_diagnosis_tasks(db, session_id)
    return await TaskService.list_for_session(db, session_id)

@scheduling_router.post("/sessions/{session_id}/tasks", response_model=TaskCompletionResponse, status_code=status.HTTP_201_CREATED)
async def create_session_task(
    session_id: uuid.UUID,
    data: TaskCompletionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TaskService.create_for_session(db, session_id, data)

@scheduling_router.get("/sessions/{session_id}/assessment-items", response_model=list[SessionAssessmentItem])
async def get_session_assessment_items(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await scheduling_service.get_session_assessment_items(
        db, session_id, current_user.id
    )

@scheduling_router.get("/sessions/{session_id}/medications", response_model=list[SessionMedicationItem])
async def get_session_medications(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await scheduling_service.get_session_medications(
        db, session_id, current_user.id
    )

@scheduling_router.get("/sessions/{session_id}/client",response_model=ClientResponse,)
async def get_session_client(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await scheduling_service.get_session_client(
        db=db,
        session_id=session_id,
        actor=actor,
    )


# http://localhost:3001/visits/{session_id}/medications