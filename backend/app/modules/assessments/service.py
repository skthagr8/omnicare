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

    # Maps to router POST /assessments
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
        elif data.assessment_type == AssessmentType.DELIRIUM and data.delirium:
            db.add(
                DeliriumScreening(
                    assessment_id=assessment.id, **data.delirium.model_dump()
                )
            )

        await db.commit()
        return await AssessmentService.get(db, assessment.id)

    # Maps to router GET /assessments/{assessment_id}
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

    # Maps to router GET /assessments/client/{client_id}
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

    # Maps to router POST /assessments/observations
    @staticmethod
    async def add_observation(
        db: AsyncSession, actor: User, data: ObservationCreate
    ) -> Observation:
        observation = Observation(recorded_by=actor.id, **data.model_dump())
        db.add(observation)
        await db.commit()
        await db.refresh(observation)
        return observation

    # Maps to router PUT /assessments/{assessment_id}   
    @staticmethod
    async def update_assessment(
        db: AsyncSession, assessment_id: uuid.UUID, data: AssessmentCreate, actor: User
    ) -> Assessment:
        result = await db.execute(
            select(Assessment)
            .where(Assessment.id == assessment_id)
        )
        assessment = result.scalar_one_or_none()
        if not assessment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found")

        payload = data.model_dump(
            exclude={"tug", "cmai", "braden", "delirium"}
        )
        for key, value in payload.items():
            setattr(assessment, key, value)

        await db.commit()
        return await AssessmentService.get(db, assessment.id)

    # Maps to router PUT /assessments/{assessment_id}
    @staticmethod
    async def update_assessment_for_client(
        db: AsyncSession, client_id: uuid.UUID, data: AssessmentCreate, actor: User
    ) -> Assessment:
        result = await db.execute(
            select(Assessment)
            .where(Assessment.client_id == client_id)
            .order_by(Assessment.created_at.desc())
        )
        assessment = result.scalar_one_or_none()
        if not assessment:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found")

        payload = data.model_dump(
            exclude={"tug", "cmai", "braden", "delirium"}
        )
        for key, value in payload.items():
            setattr(assessment, key, value)

        await db.commit()
        return await AssessmentService.get(db, assessment.id)
