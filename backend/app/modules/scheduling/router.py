import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.scheduling.schemas import (
    SessionCheckIn,
    SessionCheckOut,
    SessionCreate,
    SessionResponse,
)
from app.modules.scheduling.service import SchedulingService, serialize_session

router = APIRouter()


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return serialize_session(await SchedulingService.create(db, current_user, data))


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    caregiver_id: Optional[uuid.UUID] = None,
    client_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = await SchedulingService.list(
        db, current_user.org_id, caregiver_id, client_id
    )
    return [serialize_session(item) for item in sessions]


@router.get("/visits/today", response_model=list[SessionResponse])
async def today_visits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caregiver_id = current_user.id if current_user.role.value == "caregiver" else None
    sessions = await SchedulingService.today(db, current_user.org_id, caregiver_id)
    return [serialize_session(item) for item in sessions]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_session(
        await SchedulingService.get(db, session_id, current_user.org_id)
    )


@router.post("/sessions/{session_id}/check-in", response_model=SessionResponse)
async def check_in(
    session_id: uuid.UUID,
    data: SessionCheckIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_session(
        await SchedulingService.check_in(db, session_id, current_user.org_id, data)
    )


@router.post("/sessions/{session_id}/check-out", response_model=SessionResponse)
async def check_out(
    session_id: uuid.UUID,
    data: SessionCheckOut,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_session(
        await SchedulingService.check_out(db, session_id, current_user.org_id, data)
    )
