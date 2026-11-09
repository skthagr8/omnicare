from datetime import date, datetime
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.auth.models import User
from app.modules.medications.schemas import (
    MedicationAdministrationCreate,
    MedicationAdministrationResponse,
    MedicationAdministrationUpdate,
    MedicationCreate,
    MedicationResponse,
    MedicationScheduleCreate,
    MedicationScheduleResponse,
    MedicationScheduleUpdate,
)
from app.modules.medications.service import medication_service

router = APIRouter()

@router.post("", response_model=MedicationResponse, status_code=201)
async def create_medication(
    data: MedicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.create_medications(db, data)


@router.get("/client/{client_id}", response_model=list[MedicationResponse])
async def list_medications(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.list_client_medications(db, client_id)


@router.get("/{medication_id}/administrations", response_model=list[MedicationAdministrationResponse])
async def list_session_administrations_for_medication(
    medication_id: uuid.UUID,
    session_id: uuid.UUID,  # Picked up as a query parameter (e.g., ?session_id=...)
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.list_session_administrations_for_medication(db, medication_id, session_id)


@router.get("/{medication_id}/schedules", response_model=list[MedicationScheduleResponse])
async def list_schedules(
    medication_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.list_schedules(db, medication_id)


@router.post(
    "/{medication_id}/medication-schedules",
    response_model=MedicationScheduleResponse,
    status_code=201,
)
async def create_schedule(
    medication_id: uuid.UUID,
    data: MedicationScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.create_schedule(db, medication_id, data, current_user)


@router.patch("/{medication_id}/medication-schedules/{schedule_id}", response_model=MedicationScheduleResponse)
async def update_schedule(
    medication_id: uuid.UUID,
    schedule_id: uuid.UUID,
    data: MedicationScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Added medication_id to match service layer signature
    return await medication_service.update_schedule(db, medication_id, schedule_id, data)


@router.post(
    "/administrations",
    response_model=list[MedicationAdministrationResponse],
    status_code=201,
)
async def create_administration(
    data: list[MedicationAdministrationCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.create_administrations(db, current_user, data)


@router.get("/administrations", response_model=list[MedicationAdministrationResponse])
async def list_administrations(
    session_id: uuid.UUID,  # Picked up as a query parameter
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.list_administrations(db, current_user, session_id)


@router.patch("/administrations/{administration_id}", response_model=MedicationAdministrationResponse)
async def update_administration(
    administration_id: uuid.UUID,
    data: MedicationAdministrationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await medication_service.update_administration(db, administration_id, data)


@router.get("/client/{client_id}/weekly", response_model=list[MedicationAdministrationResponse])
async def list_weekly_medications(
    client_id: uuid.UUID,
    week_start: date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await medication_service.list_weekly_occurrences(db, client_id, week_start)
