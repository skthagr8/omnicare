import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.clients.schemas import (
    CarePlanCreate,
    CarePlanResponse,
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    EmergencyContactCreate,
    EmergencyContactResponse,
    FamilyLinkCreate,
    FamilyLinkResponse,
)
from app.modules.clients.service import ClientService, serialize_client

router = APIRouter()


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return serialize_client(await ClientService.create(db, data, current_user))


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return [serialize_client(c) for c in await ClientService.list(db, current_user.org_id)]


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_client(
        await ClientService.get(db, client_id, current_user.org_id)
    )


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return serialize_client(
        await ClientService.update(db, client_id, current_user.org_id, data)
    )


@router.post(
    "/{client_id}/emergency-contacts",
    response_model=EmergencyContactResponse,
    status_code=201,
)
async def add_emergency_contact(
    client_id: uuid.UUID,
    data: EmergencyContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return await ClientService.add_contact(db, client_id, current_user.org_id, data)


@router.post("/{client_id}/family-links", response_model=FamilyLinkResponse, status_code=201)
async def link_family(
    client_id: uuid.UUID,
    data: FamilyLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return await ClientService.link_family(db, client_id, current_user.org_id, data)


@router.post("/{client_id}/care-plans", response_model=CarePlanResponse, status_code=201)
async def add_care_plan(
    client_id: uuid.UUID,
    data: CarePlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return await ClientService.add_care_plan(db, client_id, current_user, data)
