from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, Query, Body, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.modules.auth.models import User
from app.modules.tasks.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskCompletionCreate,
    TaskCompletionUpdate,
    TaskCompletionResponse,
    GenerateTasksFromRequirementsRequest,
)
from app.modules.tasks.service import task_service

# ==========================================================
# Task Catalogue Router
# ==========================================================
router = APIRouter(tags=["Tasks"])

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.create_task(db, data)


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    active_only: bool = Query(True, description="Filter for active tasks only"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.list_tasks(
        db, active_only=active_only, limit=limit, offset=offset
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.get_task(db, task_id)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.update_task(db, task_id, data)


@router.post("/{task_id}/deactivate", response_model=TaskResponse)
async def deactivate_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.deactivate_task(db, task_id)


@router.delete("/{task_id}", response_model=TaskResponse)
async def soft_delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.soft_delete_task(db, task_id)


# ==========================================================
# Task Completions Router (Executions)
# ==========================================================
completions_router = APIRouter(tags=["Task Completions"])

@completions_router.post("", response_model=TaskCompletionResponse, status_code=status.HTTP_201_CREATED)
async def create_completion(
    data: TaskCompletionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.create_completion(db, data)


@completions_router.get("", response_model=list[TaskCompletionResponse])
async def list_completions(
    session_id: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.list_completions(
        db, session_id=session_id, client_id=client_id, limit=limit, offset=offset
    )


@completions_router.get("/{completion_id}", response_model=TaskCompletionResponse)
async def get_completion(
    completion_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.get_completion(db, completion_id)


@completions_router.patch("/{completion_id}", response_model=TaskCompletionResponse)
async def update_completion(
    completion_id: UUID,
    data: TaskCompletionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.update_completion(db, completion_id, data)


@completions_router.post("/{completion_id}/void", response_model=TaskCompletionResponse)
async def void_completion(
    completion_id: UUID,
    reason: str = Body(..., embed=True, description="Reason for voiding the completion"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.void_completion(db, completion_id, reason)


@completions_router.delete("/{completion_id}", response_model=TaskCompletionResponse)
async def soft_delete_completion(
    completion_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.soft_delete_completion(db, completion_id)


@completions_router.post("/generate", response_model=list[TaskCompletionResponse], status_code=status.HTTP_201_CREATED)
async def generate_from_requirements(
    data: GenerateTasksFromRequirementsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await task_service.generate_from_requirements(db, data)

