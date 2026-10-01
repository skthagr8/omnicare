from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.organizations.models import Organization
from app.modules.organizations.schemas import OrganizationCreate


class OrganizationService:
    @staticmethod
    async def create(db: AsyncSession, data: OrganizationCreate) -> Organization:
        org = Organization(name=data.name)
        db.add(org)
        await db.commit()
        await db.refresh(org)
        return org

    @staticmethod
    async def get(db: AsyncSession, org_id) -> Organization | None:
        return await db.get(Organization, org_id)

    @staticmethod
    async def list(db: AsyncSession) -> list[Organization]:
        result = await db.execute(select(Organization).order_by(Organization.created_at))
        return list(result.scalars().all())
