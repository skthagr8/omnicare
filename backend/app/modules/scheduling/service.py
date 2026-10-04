from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import SessionStatus, UserRole
from app.core.geo import geo_from_point, point_from_geo
from app.modules.auth.models import User
from app.modules.scheduling.models import CaregiverSession
from app.modules.scheduling.schemas import (
    SessionCheckIn,
    SessionCheckOut,
    SessionCreate,
    SessionResponse,
)


def serialize_session(session: CaregiverSession) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        org_id=session.org_id,
        client_id=session.client_id,
        caregiver_id=session.caregiver_id,
        scheduled_start=session.scheduled_start,
        scheduled_end=session.scheduled_end,
        visit_date=session.visit_date,
        status=session.status,
        check_in_at=session.check_in_at,
        check_in_location=geo_from_point(session.check_in_location),
        check_in_geofence_verified=session.check_in_geofence_verified,
        check_out_at=session.check_out_at,
        check_out_location=geo_from_point(session.check_out_location),
        created_by=session.created_by,
        created_at=session.created_at,
    )


class SchedulingService:
    @staticmethod
    async def create(db: AsyncSession, actor: User, data: SessionCreate) -> CaregiverSession:
        session = CaregiverSession(
            org_id=actor.org_id,
            client_id=data.client_id,
            caregiver_id=data.caregiver_id,
            scheduled_start=data.scheduled_start,
            scheduled_end=data.scheduled_end,
            created_by=actor.id if actor.role == UserRole.ADMIN else None,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def list(
        db: AsyncSession,
        org_id: uuid.UUID,
        caregiver_id: uuid.UUID | None = None,
        client_id: uuid.UUID | None = None,
    ) -> list[CaregiverSession]:
        stmt = select(CaregiverSession).where(CaregiverSession.org_id == org_id)
        if caregiver_id:
            stmt = stmt.where(CaregiverSession.caregiver_id == caregiver_id)
        if client_id:
            stmt = stmt.where(CaregiverSession.client_id == client_id)
        result = await db.execute(stmt.order_by(CaregiverSession.scheduled_start))
        return list(result.scalars().all())

    @staticmethod
    async def today(
        db: AsyncSession, org_id: uuid.UUID, caregiver_id: uuid.UUID | None = None
    ) -> list[CaregiverSession]:
        today = datetime.now(timezone.utc).date()
        stmt = select(CaregiverSession).where(
            CaregiverSession.org_id == org_id,
            CaregiverSession.visit_date == today,
        )
        if caregiver_id:
            stmt = stmt.where(CaregiverSession.caregiver_id == caregiver_id)
        result = await db.execute(stmt.order_by(CaregiverSession.scheduled_start))
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID) -> CaregiverSession:
        session = await db.get(CaregiverSession, session_id)
        if not session or session.org_id != org_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
        return session

    @staticmethod
    async def check_in(
        db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID, data: SessionCheckIn
    ) -> CaregiverSession:
        session = await SchedulingService.get(db, session_id, org_id)
        session.check_in_at = datetime.now(timezone.utc)
        session.check_in_location = point_from_geo(data.location)
        session.check_in_geofence_verified = data.geofence_verified
        session.status = SessionStatus.IN_PROGRESS
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def check_out(
        db: AsyncSession, session_id: uuid.UUID, org_id: uuid.UUID, data: SessionCheckOut
    ) -> CaregiverSession:
        session = await SchedulingService.get(db, session_id, org_id)
        session.check_out_at = datetime.now(timezone.utc)
        session.check_out_location = point_from_geo(data.location)
        session.status = SessionStatus.COMPLETED
        await db.commit()
        await db.refresh(session)
        return session
