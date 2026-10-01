from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.geo import geo_from_point, point_from_geo
from app.modules.auth.models import User
from app.modules.caregivers.models import Caregiver, CaregiverCertification
from app.modules.caregivers.schemas import (
    CaregiverCertificationCreate,
    CaregiverResponse,
    CaregiverUpdate,
)


def serialize_caregiver(caregiver: Caregiver) -> CaregiverResponse:
    return CaregiverResponse(
        user_id=caregiver.user_id,
        full_name=caregiver.user.full_name if caregiver.user else None,
        status=caregiver.status,
        last_confirmed_location=geo_from_point(caregiver.last_confirmed_location),
        last_confirmed_at=caregiver.last_confirmed_at,
        certifications=caregiver.certifications,
    )


class CaregiverService:
    @staticmethod
    async def list(db: AsyncSession, org_id: uuid.UUID) -> list[Caregiver]:
        result = await db.execute(
            select(Caregiver)
            .join(User, User.id == Caregiver.user_id)
            .options(
                selectinload(Caregiver.user),
                selectinload(Caregiver.certifications),
            )
            .where(User.org_id == org_id)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get(db: AsyncSession, caregiver_id: uuid.UUID) -> Caregiver:
        result = await db.execute(
            select(Caregiver)
            .options(
                selectinload(Caregiver.user),
                selectinload(Caregiver.certifications),
            )
            .where(Caregiver.user_id == caregiver_id)
        )
        caregiver = result.scalar_one_or_none()
        if not caregiver:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Caregiver not found")
        return caregiver

    @staticmethod
    async def update(
        db: AsyncSession, caregiver_id: uuid.UUID, data: CaregiverUpdate
    ) -> Caregiver:
        caregiver = await CaregiverService.get(db, caregiver_id)
        if data.status is not None:
            caregiver.status = data.status
        if data.last_confirmed_location is not None:
            caregiver.last_confirmed_location = point_from_geo(data.last_confirmed_location)
            caregiver.last_confirmed_at = datetime.now(timezone.utc)
        await db.commit()
        return await CaregiverService.get(db, caregiver_id)

    @staticmethod
    async def add_certification(
        db: AsyncSession,
        caregiver_id: uuid.UUID,
        data: CaregiverCertificationCreate,
    ) -> CaregiverCertification:
        await CaregiverService.get(db, caregiver_id)
        cert = CaregiverCertification(
            caregiver_id=caregiver_id,
            diagnosis_category=data.diagnosis_category,
            certified_at=data.certified_at,
        )
        db.add(cert)
        await db.commit()
        await db.refresh(cert)
        return cert
