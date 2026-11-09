import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_client, get_current_user, require_role
from app.modules.auth.models import User
from app.modules.clients.models import Client
from app.modules.family.schemas import (
    CareTeamMemberResponse,
    FamilyMemberResponse,
    FamilyVisitResponse,
    HealthSummaryResponse,
    LinkedClientResponse,
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestUpdate,
    VisitDetailResponse,
)
from app.modules.family.service import FamilyPortalService, FamilyService

router = APIRouter()


@router.get("", response_model=list[FamilyMemberResponse])
async def list_family_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await FamilyService.list_members(db, current_user.org_id)


# --- Family portal: linked clients and their care -------------------------


@router.get("/me/clients", response_model=list[LinkedClientResponse])
async def list_my_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clients (loved ones) the signed-in family member is linked to."""
    return await FamilyPortalService.list_linked_clients(db, current_user)


@router.get("/clients/{client_id}/visits", response_model=list[FamilyVisitResponse])
async def list_client_visits(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    return await FamilyPortalService.list_visits(db, client.id, limit)


@router.get("/clients/{client_id}/care-team", response_model=list[CareTeamMemberResponse])
async def list_client_care_team(
    db: AsyncSession = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    return await FamilyPortalService.list_care_team(db, client.id)


@router.get("/clients/{client_id}/health", response_model=HealthSummaryResponse)
async def get_client_health(
    days: int = Query(30, ge=7, le=180),
    db: AsyncSession = Depends(get_db),
    client: Client = Depends(get_current_client),
):
    return await FamilyPortalService.get_health_summary(db, client, days)


@router.get("/visits/{session_id}", response_model=VisitDetailResponse)
async def get_visit_detail(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await FamilyPortalService.get_visit_detail(db, current_user, session_id)


# --- Service requests ------------------------------------------------------


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
    return await FamilyService.list_service_requests(db, current_user, client_id)


@router.patch("/service-requests/{request_id}", response_model=ServiceRequestResponse)
async def update_service_request(
    request_id: uuid.UUID,
    data: ServiceRequestUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return await FamilyService.update_service_request(db, request_id, data)
