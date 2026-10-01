import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.assessments.schemas import (
    AssessmentCreate,
    AssessmentResponse,
    ObservationCreate,
    ObservationResponse,
)
from app.modules.assessments.service import AssessmentService
from app.modules.auth.models import User

router = APIRouter()


@router.post("", response_model=AssessmentResponse, status_code=201)
async def create_assessment(
    data: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await AssessmentService.create(db, current_user, data)


@router.get("/client/{client_id}", response_model=list[AssessmentResponse])
async def list_assessments(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await AssessmentService.list_for_client(db, client_id)


@router.post("/observations", response_model=ObservationResponse, status_code=201)
async def create_observation(
    data: ObservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await AssessmentService.add_observation(db, current_user, data)
