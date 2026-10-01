import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.auth.models import User
from app.modules.medications.schemas import (
    MedicationAdministrationCreate,
    MedicationAdministrationResponse,
    MedicationCreate,
    MedicationResponse,
    MedicationScheduleCreate,
    MedicationScheduleResponse,
)
from app.modules.medications.service import MedicationService

router = APIRouter()


@router.post("", response_model=MedicationResponse, status_code=201)
async def create_medication(
    data: MedicationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await MedicationService.create(db, data)


@router.get("/client/{client_id}", response_model=list[MedicationResponse])
async def list_medications(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await MedicationService.list_for_client(db, client_id)


@router.post(
    "/{medication_id}/schedules",
    response_model=MedicationScheduleResponse,
    status_code=201,
)
async def add_schedule(
    medication_id: uuid.UUID,
    data: MedicationScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await MedicationService.add_schedule(db, medication_id, data)


@router.post(
    "/administrations",
    response_model=MedicationAdministrationResponse,
    status_code=201,
)
async def record_administration(
    data: MedicationAdministrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await MedicationService.record_administration(db, current_user, data)
