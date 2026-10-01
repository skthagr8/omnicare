import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.modules.auth.models import User
from app.modules.family.models import FamilyMember, ServiceRequest
from app.modules.family.schemas import ServiceRequestCreate, ServiceRequestUpdate


class FamilyService:
    @staticmethod
    async def list_members(db: AsyncSession, org_id: uuid.UUID) -> list[FamilyMember]:
        result = await db.execute(
            select(FamilyMember).join(User, User.id == FamilyMember.user_id).where(
                User.org_id == org_id
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_service_request(
        db: AsyncSession, actor: User, data: ServiceRequestCreate
    ) -> ServiceRequest:
        if actor.role != UserRole.FAMILY:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Requires family role")
        request = ServiceRequest(
            client_id=data.client_id,
            requested_by=actor.id,
            description=data.description,
        )
        db.add(request)
        await db.commit()
        await db.refresh(request)
        return request

    @staticmethod
    async def list_service_requests(
        db: AsyncSession, org_id: uuid.UUID, client_id: uuid.UUID | None = None
    ) -> list[ServiceRequest]:
        from app.modules.clients.models import Client

        stmt = (
            select(ServiceRequest)
            .join(Client, Client.id == ServiceRequest.client_id)
            .where(Client.org_id == org_id)
        )
        if client_id:
            stmt = stmt.where(ServiceRequest.client_id == client_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update_service_request(
        db: AsyncSession, request_id: uuid.UUID, data: ServiceRequestUpdate
    ) -> ServiceRequest:
        request = await db.get(ServiceRequest, request_id)
        if not request:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Service request not found")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(request, key, value)
        await db.commit()
        await db.refresh(request)
        return request
