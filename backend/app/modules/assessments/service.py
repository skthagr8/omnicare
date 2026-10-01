import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import AssessmentType
from app.modules.assessments.models import (
    Assessment,
    BradenAssessment,
    CmaiAssessment,
    DeliriumScreening,
    Observation,
    TugAssessment,
)
from app.modules.assessments.schemas import AssessmentCreate, ObservationCreate
from app.modules.auth.models import User


class AssessmentService:
    @staticmethod
    async def create(db: AsyncSession, actor: User, data: AssessmentCreate) -> Assessment:
        payload = data.model_dump(
            exclude={"tug", "cmai", "braden", "delirium"}
        )
        assessment = Assessment(administered_by=actor.id, **payload)
        db.add(assessment)
        await db.flush()

        if data.assessment_type == AssessmentType.TUG and data.tug:
            db.add(TugAssessment(assessment_id=assessment.id, **data.tug.model_dump()))
        elif data.assessment_type == AssessmentType.CMAI and data.cmai:
            db.add(CmaiAssessment(assessment_id=assessment.id, **data.cmai.model_dump()))
        elif data.assessment_type == AssessmentType.BRADEN and data.braden:
            db.add(BradenAssessment(assessment_id=assessment.id, **data.braden.model_dump()))
        elif data.assessment_type == AssessmentType.DELIRIUM_SCREEN and data.delirium:
            db.add(
                DeliriumScreening(
                    assessment_id=assessment.id, **data.delirium.model_dump()
                )
            )

        await db.commit()
        return await AssessmentService.get(db, assessment.id)

    @staticmethod
    async def get(db: AsyncSession, assessment_id: uuid.UUID) -> Assessment:
        result = await db.execute(
            select(Assessment)
            .options(
                selectinload(Assessment.tug),
                selectinload(Assessment.cmai),
                selectinload(Assessment.braden),
                selectinload(Assessment.delirium),
            )
            .where(Assessment.id == assessment_id)
        )
        assessment = result.scalar_one_or_none()
        if not assessment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found")
        return assessment

    @staticmethod
    async def list_for_client(db: AsyncSession, client_id: uuid.UUID) -> list[Assessment]:
        result = await db.execute(
            select(Assessment)
            .options(
                selectinload(Assessment.tug),
                selectinload(Assessment.cmai),
                selectinload(Assessment.braden),
                selectinload(Assessment.delirium),
            )
            .where(Assessment.client_id == client_id)
            .order_by(Assessment.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def add_observation(
        db: AsyncSession, actor: User, data: ObservationCreate
    ) -> Observation:
        observation = Observation(recorded_by=actor.id, **data.model_dump())
        db.add(observation)
        await db.commit()
        await db.refresh(observation)
        return observation
