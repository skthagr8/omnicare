import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.family.schemas import (
    FamilyMemberResponse,
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestUpdate,
)
from app.modules.family.service import FamilyService

router = APIRouter()


@router.get("", response_model=list[FamilyMemberResponse])
async def list_family_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await FamilyService.list_members(db, current_user.org_id)


@router.post("/service-requests", response_model=ServiceRequestResponse, status_code=201)
async def create_service_request(
    data: ServiceRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await FamilyService.create_service_request(db, current_user, data)


@router.get("/service-requests", response_model=list[ServiceRequestResponse])
async def list_service_requests(
    client_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await FamilyService.list_service_requests(db, current_user.org_id, client_id)


@router.patch("/service-requests/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(
    request_id: uuid.UUID,
    data: ServiceRequestUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return await FamilyService.update_service_request(db, request_id, data)
