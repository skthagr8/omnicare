import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.caregivers.live import list_on_shift
from app.modules.caregivers.schemas import (
    CaregiverCertificationCreate,
    CaregiverCertificationResponse,
    CaregiverResponse,
    CaregiverUpdate,
    OnShiftCaregiver,
)
from app.modules.caregivers.service import CaregiverService, serialize_caregiver

router = APIRouter()


@router.get("", response_model=list[CaregiverResponse])
async def list_caregivers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Not scoped by organisation: lists caregivers across all organisations.
    caregivers = await CaregiverService.list(db)
    return [serialize_caregiver(item) for item in caregivers]


# Declared before "/{caregiver_id}" so the literal path wins.
@router.get("/on-shift", response_model=list[OnShiftCaregiver])
async def list_on_shift_caregivers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin live view: caregivers on shift, their location, and today's assigned clients.

    Not scoped by organisation.
    """
    return await list_on_shift(db)


@router.get("/{caregiver_id}", response_model=CaregiverResponse)
async def get_caregiver(
    caregiver_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    #_: User = Depends(get_current_user),
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
