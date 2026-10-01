import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.core.geo import geo_from_point, point_from_geo
from app.modules.auth.models import User
from app.modules.clients.models import (
    CarePlan,
    Client,
    ClientEmergencyContact,
    ClientFamilyLink,
)
from app.modules.clients.schemas import (
    CarePlanCreate,
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    EmergencyContactCreate,
    FamilyLinkCreate,
)


def serialize_client(client: Client) -> ClientResponse:
    return ClientResponse(
        id=client.id,
        org_id=client.org_id,
        full_name=client.full_name,
        date_of_birth=client.date_of_birth,
        address_text=client.address_text,
        location=geo_from_point(client.location),
        diagnosis_category=client.diagnosis_category,
        acuity_tier=client.acuity_tier,
        registered_by=client.registered_by,
        is_active=client.is_active,
        created_at=client.created_at,
        updated_at=client.updated_at,
    )


class ClientService:
    @staticmethod
    async def create(db: AsyncSession, data: ClientCreate, actor: User) -> Client:
        client = Client(
            org_id=actor.org_id,
            full_name=data.full_name,
            date_of_birth=data.date_of_birth,
            address_text=data.address_text,
            location=point_from_geo(data.location),
            diagnosis_category=data.diagnosis_category,
            acuity_tier=data.acuity_tier,
            registered_by=actor.id,
        )
        db.add(client)
        await db.commit()
        await db.refresh(client)
        return client

    @staticmethod
    async def list(db: AsyncSession, org_id: uuid.UUID) -> list[Client]:
        result = await db.execute(select(Client).where(Client.org_id == org_id))
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, client_id: uuid.UUID, org_id: uuid.UUID) -> Client:
        client = await db.get(Client, client_id)
        if not client or client.org_id != org_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
        return client

    @staticmethod
    async def update(
        db: AsyncSession, client_id: uuid.UUID, org_id: uuid.UUID, data: ClientUpdate
    ) -> Client:
        client = await ClientService.get(db, client_id, org_id)
        payload = data.model_dump(exclude_unset=True)
        if "location" in payload:
            client.location = point_from_geo(payload.pop("location"))
        for key, value in payload.items():
            setattr(client, key, value)
        await db.commit()
        await db.refresh(client)
        return client

    @staticmethod
    async def add_contact(
        db: AsyncSession,
        client_id: uuid.UUID,
        org_id: uuid.UUID,
        data: EmergencyContactCreate,
    ) -> ClientEmergencyContact:
        await ClientService.get(db, client_id, org_id)
        contact = ClientEmergencyContact(client_id=client_id, **data.model_dump())
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def link_family(
        db: AsyncSession, client_id: uuid.UUID, org_id: uuid.UUID, data: FamilyLinkCreate
    ) -> ClientFamilyLink:
        await ClientService.get(db, client_id, org_id)
        link = ClientFamilyLink(client_id=client_id, **data.model_dump())
        db.add(link)
        await db.commit()
        await db.refresh(link)
        return link

    @staticmethod
    async def add_care_plan(
        db: AsyncSession, client_id: uuid.UUID, actor: User, data: CarePlanCreate
    ) -> CarePlan:
        if actor.role != UserRole.ADMIN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Requires admin role")
        await ClientService.get(db, client_id, actor.org_id)
        plan = CarePlan(client_id=client_id, created_by=actor.id, **data.model_dump())
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        return plan
