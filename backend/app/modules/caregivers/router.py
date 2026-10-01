import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.auth.models import User
from app.modules.caregivers.schemas import (
    CaregiverCertificationCreate,
    CaregiverCertificationResponse,
    CaregiverResponse,
    CaregiverUpdate,
)
from app.modules.caregivers.service import CaregiverService, serialize_caregiver

router = APIRouter()


@router.get("", response_model=list[CaregiverResponse])
async def list_caregivers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caregivers = await CaregiverService.list(db, current_user.org_id)
    return [serialize_caregiver(item) for item in caregivers]


@router.get("/{caregiver_id}", response_model=CaregiverResponse)
async def get_caregiver(
    caregiver_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return serialize_caregiver(await CaregiverService.get(db, caregiver_id))


@router.patch("/{caregiver_id}", response_model=CaregiverResponse)
async def update_caregiver(
    caregiver_id: uuid.UUID,
    data: CaregiverUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return serialize_caregiver(await CaregiverService.update(db, caregiver_id, data))


@router.post(
    "/{caregiver_id}/certifications",
    response_model=CaregiverCertificationResponse,
    status_code=201,
)
async def add_certification(
    caregiver_id: uuid.UUID,
    data: CaregiverCertificationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await CaregiverService.add_certification(db, caregiver_id, data)
