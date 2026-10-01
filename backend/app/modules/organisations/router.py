from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.modules.auth.models import User
from app.modules.organizations.schemas import OrganizationCreate, OrganizationResponse
from app.modules.organizations.service import OrganizationService

router = APIRouter()


@router.post("", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    data: OrganizationCreate, db: AsyncSession = Depends(get_db)
):
    return await OrganizationService.create(db, data)


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    return await OrganizationService.list(db)


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id, db: AsyncSession = Depends(get_db)):
    return await OrganizationService.get(db, org_id)
