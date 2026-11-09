from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import CompletionStatus
from app.modules.tasks.models import Task, TaskCompletion
from app.modules.tasks.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskCompletionCreate,
    TaskCompletionUpdate,
    GenerateTasksFromRequirementsRequest,
)
from app.modules.clients.models import DiagnosisTaskRequirement
from app.modules.scheduling.models import CaregiverSession


class TaskService:
    """Business logic for task catalogue entries and task executions."""

    # ==========================================================
    # Reusable task catalogue
    # ==========================================================

    # Maps to router.post("/tasks", response_model=TaskResponse)
    @staticmethod
    async def create_task(db: AsyncSession, payload: TaskCreate) -> Task:
        task = Task(**payload.model_dump())
        db.add(task)
        await TaskService._commit(db)
        await db.refresh(task)
        return task

    # Maps to router.get("/tasks/{task_id}", response_model=TaskResponse)
    @staticmethod
    async def get_task(db: AsyncSession, task_id: UUID) -> Task:
        result = await db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.deleted_at.is_(None),
            )
        )
        task = result.scalar_one_or_none()
        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )
        return task

    # Maps to router.get("/tasks", response_model=list[TaskResponse])
    @staticmethod
    async def list_tasks(
        db: AsyncSession,
        *,
        active_only: bool = True,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Task]:
        query = select(Task).where(Task.deleted_at.is_(None))

        if active_only:
            query = query.where(Task.is_active.is_(True))

        query = query.order_by(Task.name).offset(offset).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    # Maps to router.patch("/tasks/{task_id}", response_model=TaskResponse)
    @staticmethod
    async def update_task(
        db: AsyncSession,
        task_id: UUID,
        payload: TaskUpdate,
    ) -> Task:
        task = await TaskService.get_task(db, task_id)
        changes = payload.model_dump(exclude_unset=True)

        if "name" in changes and changes["name"] is None:
            raise HTTPException(422, "Task name cannot be null.")

        if (
            "anticipated_duration_minutes" in changes
            and changes["anticipated_duration_minutes"] is None
        ):
            # Null is allowed: duration is optional.
            pass

        for field, value in changes.items():
            setattr(task, field, value)

        if "description" in changes:
            task.description_updated_at = datetime.now(timezone.utc)

        await TaskService._commit(db)
        await db.refresh(task)
        return task

    # Maps to router.post("/tasks/{task_id}/deactivate", response_model=TaskResponse)
    @staticmethod
    async def deactivate_task(db: AsyncSession, task_id: UUID) -> Task:
        """Deactivate without deleting historical executions."""
        task = await TaskService.get_task(db, task_id)
        task.is_active = False
        await TaskService._commit(db)
        await db.refresh(task)
        return task

    # Maps to router.delete("/tasks/{task_id}", response_model=TaskResponse)
    @staticmethod
    async def soft_delete_task(db: AsyncSession, task_id: UUID) -> Task:
        task = await TaskService.get_task(db, task_id)
        task.is_active = False
        task.deleted_at = datetime.now(timezone.utc)
        await TaskService._commit(db)
        await db.refresh(task)
        return task

    # ==========================================================
    # Task execution / caregiver session
    # ==========================================================

    # Maps to router.post("/tasks/completions", response_model=TaskCompletionResponse)
    @staticmethod
    async def create_completion(
        db: AsyncSession,
        payload: TaskCompletionCreate,
    ) -> TaskCompletion:
        task = await TaskService.get_task(db, payload.task_id)

        if not task.is_active:
            raise HTTPException(
                status_code=409,
                detail="Cannot schedule an inactive task.",
            )

        await TaskService._validate_session_client(
            db,
            session_id=payload.session_id,
            client_id=payload.client_id,
        )

        requirement = None
        if payload.diagnosis_task_requirement_id is not None:
            requirement = await TaskService._get_requirement(
                db, payload.diagnosis_task_requirement_id
            )
            if requirement.task_id != payload.task_id:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "The diagnosis task requirement does not "
                        "refer to the supplied task."
                    ),
                )

        completion = TaskCompletion(**payload.model_dump())
        db.add(completion)
        await TaskService._commit(db)
        await db.refresh(completion)
        return completion

    # Maps to router.get("/tasks/completions/{completion_id}", response_model=TaskCompletionResponse)
    @staticmethod
    async def get_completion(db: AsyncSession, completion_id: UUID) -> TaskCompletion:
        result = await db.execute(
            select(TaskCompletion)
            .options(selectinload(TaskCompletion.task))
            .where(
                TaskCompletion.id == completion_id,
                TaskCompletion.deleted_at.is_(None),
            )
        )
        completion = result.scalar_one_or_none()

        if completion is None:
            raise HTTPException(
                status_code=404,
                detail="Task completion not found.",
            )
        return completion

    # Maps to router.get("/tasks/completions", response_model=list[TaskCompletionResponse])
    @staticmethod
    async def list_completions(
        db: AsyncSession,
        *,
        session_id: UUID | None = None,
        client_id: UUID | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[TaskCompletion]:
        query = select(TaskCompletion).where(
            TaskCompletion.deleted_at.is_(None)
        )

        if session_id is not None:
            query = query.where(TaskCompletion.session_id == session_id)

        if client_id is not None:
            query = query.where(TaskCompletion.client_id == client_id)

        query = (
            query.options(selectinload(TaskCompletion.task))
            .order_by(TaskCompletion.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    # Maps to router.patch("/tasks/completions/{completion_id}", response_model=TaskCompletionResponse)
    @staticmethod
    async def update_completion(
        db: AsyncSession,
        completion_id: UUID,
        payload: TaskCompletionUpdate,
    ) -> TaskCompletion:
        completion = await TaskService.get_completion(db, completion_id)
        changes = payload.model_dump(exclude_unset=True)

        if payload.expected_revision is not None and payload.expected_revision != completion.revision:
            raise HTTPException(
                status_code=409,
                detail="This task was changed elsewhere. Refresh and try again.",
            )

        # Do not permit an ordinary update to silently alter a voided task.
        if completion.void_reason:
            raise HTTPException(
                status_code=409,
                detail="Voided task completions cannot be updated.",
            )

        for field, value in changes.items():
            setattr(completion, field, value)

        # Keep the legacy boolean and status aligned.
        if "was_skipped" in changes:
            if changes["was_skipped"]:
                if completion.completed_status == CompletionStatus.COMPLETED:
                    raise HTTPException(
                        status_code=422,
                        detail="A completed task cannot also be skipped.",
                    )
                if not completion.skip_reason:
                    raise HTTPException(
                        status_code=422,
                        detail="skip_reason is required when skipping a task.",
                    )
            else:
                completion.skip_reason = None

        if "completed_status" in changes:
            is_completed = (
                getattr(completion.completed_status, "value",
                        completion.completed_status) == "completed"
            )

            if is_completed:
                if completion.was_skipped:
                    raise HTTPException(
                        status_code=422,
                        detail="A skipped task cannot be marked completed.",
                    )
                if completion.completed_at is None:
                    completion.completed_at = datetime.now(timezone.utc)
            else:
                completion.completed_at = None

        completion.revision += 1
        await TaskService._commit(db)
        await db.refresh(completion)
        # Keep the task loaded so the response can derive title/priority.
        await db.refresh(completion, attribute_names=["task"])
        return completion

    # Maps to router.post("/tasks/completions/{completion_id}/void", response_model=TaskCompletionResponse)
    @staticmethod
    async def void_completion(
        db: AsyncSession,
        completion_id: UUID,
        reason: str,
    ) -> TaskCompletion:
        if not reason.strip():
            raise HTTPException(
                status_code=422,
                detail="A reason is required to void a completion.",
            )

        completion = await TaskService.get_completion(db, completion_id)
        if completion.void_reason:
            raise HTTPException(
                status_code=409,
                detail="Task completion is already voided.",
            )

        completion.void_reason = reason.strip()
        completion.revision += 1
        await TaskService._commit(db)
        await db.refresh(completion)
        return completion

    # Maps to router.delete("/tasks/completions/{completion_id}", response_model=TaskCompletionResponse)
    @staticmethod
    async def soft_delete_completion(
        db: AsyncSession,
        completion_id: UUID,
    ) -> TaskCompletion:
        completion = await TaskService.get_completion(db, completion_id)
        completion.deleted_at = datetime.now(timezone.utc)
        completion.revision += 1
        await TaskService._commit(db)
        await db.refresh(completion)
        return completion

    # ==========================================================
    # Diagnosis-driven task generation
    # ==========================================================

    # Maps to router.post("/tasks/completions/generate", response_model=list[TaskCompletionResponse])
    @staticmethod
    async def generate_from_requirements(
        db: AsyncSession,
        payload: GenerateTasksFromRequirementsRequest,
    ) -> list[TaskCompletion]:
        """
        Create session task instances from diagnosis configuration.

        Requirement IDs must have been resolved for the client's
        active diagnoses by the clinical-configuration layer.
        """
        await TaskService._validate_session_client(
            db,
            session_id=payload.session_id,
            client_id=payload.client_id,
        )

        result = await db.execute(
            select(DiagnosisTaskRequirement)
            .options(selectinload(DiagnosisTaskRequirement.task))
            .where(
                DiagnosisTaskRequirement.id.in_(
                    payload.diagnosis_task_requirement_ids
                )
            )
            .order_by(DiagnosisTaskRequirement.sequence_order)
        )
        requirements = list(result.scalars().all())

        requested_ids = set(payload.diagnosis_task_requirement_ids)
        found_ids = {requirement.id for requirement in requirements}

        if found_ids != requested_ids:
            raise HTTPException(
                status_code=404,
                detail="One or more diagnosis task requirements were not found.",
            )

        # Requirements may reference the same reusable task. The
        # model's unique(session_id, task_id) constraint allows only
        # one execution of a given task per session.
        task_to_requirement = {}
        for requirement in requirements:
            task = requirement.task

            if not task.is_active or task.deleted_at is not None:
                continue

            task_to_requirement.setdefault(task.id, requirement)

        existing_tasks_result = await db.execute(
            select(TaskCompletion.task_id).where(
                TaskCompletion.session_id == payload.session_id,
                TaskCompletion.deleted_at.is_(None),
            )
        )
        existing_task_ids = set(existing_tasks_result.scalars().all())

        created = []
        for task_id, requirement in task_to_requirement.items():
            if task_id in existing_task_ids:
                continue

            completion = TaskCompletion(
                task_id=task_id,
                session_id=payload.session_id,
                client_id=payload.client_id,
                diagnosis_task_requirement_id=requirement.id,
            )
            db.add(completion)
            created.append(completion)

        await TaskService._commit(db)

        for completion in created:
            await db.refresh(completion)

        return created

    @staticmethod
    async def ensure_diagnosis_tasks(db: AsyncSession, session_id: UUID) -> None:
        """
        Make sure the session has one task execution for every task
        required by the client's active diagnoses (DiagnosisTaskRequirement).

        Idempotent and safe under concurrent calls: rows that already exist
        for (session_id, task_id), including soft-deleted or voided ones,
        are left untouched via ON CONFLICT DO NOTHING.
        """
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        from app.modules.clients.models import ClientDiagnosis, DiagnosisDefinition

        session = await db.get(CaregiverSession, session_id)
        if session is None:
            return

        result = await db.execute(
            select(DiagnosisTaskRequirement.id, DiagnosisTaskRequirement.task_id)
            .join(ClientDiagnosis, ClientDiagnosis.diagnosis_definition_id == DiagnosisTaskRequirement.diagnosis_definition_id)
            .join(DiagnosisDefinition, DiagnosisDefinition.id == DiagnosisTaskRequirement.diagnosis_definition_id)
            .join(Task, Task.id == DiagnosisTaskRequirement.task_id)
            .where(
                ClientDiagnosis.client_id == session.client_id,
                ClientDiagnosis.is_active.is_(True),
                DiagnosisDefinition.is_active.is_(True),
                Task.is_active.is_(True),
                Task.deleted_at.is_(None),
            )
            .order_by(DiagnosisTaskRequirement.sequence_order)
        )

        # One execution per task per session (uq_task_completions_session_task);
        # the first requirement by sequence order wins.
        rows: dict[UUID, UUID] = {}
        for requirement_id, task_id in result.all():
            rows.setdefault(task_id, requirement_id)
        if not rows:
            return

        await db.execute(
            pg_insert(TaskCompletion)
            .values([
                {
                    "task_id": task_id,
                    "session_id": session.id,
                    "client_id": session.client_id,
                    "diagnosis_task_requirement_id": requirement_id,
                }
                for task_id, requirement_id in rows.items()
            ])
            .on_conflict_do_nothing(constraint="uq_task_completions_session_task")
        )
        await TaskService._commit(db)

    # ==========================================================
    # Internal helpers
    # ==========================================================

    @staticmethod
    async def _get_requirement(
        db: AsyncSession,
        requirement_id: UUID,
    ) -> DiagnosisTaskRequirement:
        requirement = await db.get(DiagnosisTaskRequirement, requirement_id)
        if requirement is None:
            raise HTTPException(
                status_code=404,
                detail="Diagnosis task requirement not found.",
            )
        return requirement

    @staticmethod
    async def _validate_session_client(
        db: AsyncSession,
        *,
        session_id: UUID,
        client_id: UUID,
    ) -> None:
        result = await db.execute(
            select(CaregiverSession).where(
                CaregiverSession.id == session_id,
                CaregiverSession.client_id == client_id,
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise HTTPException(
                status_code=404,
                detail="Caregiver session not found for this client.",
            )

    @staticmethod
    async def _commit(db: AsyncSession) -> None:
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(
                status_code=409,
                detail=(
                    "The operation conflicts with existing task data "
                    "or a database constraint."
                ),
            ) from exc


    # ==========================================================
    # Session-Scoped Task Execution Management
    # ==========================================================

    # Maps to router.get("/scheduling/sessions/{session_id}/tasks", response_model=list[TaskCompletionResponse])
    @staticmethod
    async def list_for_session(
        db: AsyncSession,
        session_id: UUID,
    ) -> list[TaskCompletion]:
        """List all active task completions assigned to a specific caregiver session."""
        result = await db.execute(
            select(TaskCompletion)
            .options(selectinload(TaskCompletion.task))
            .where(
                TaskCompletion.session_id == session_id,
                TaskCompletion.deleted_at.is_(None),
            )
            .order_by(TaskCompletion.created_at.desc())
        )
        return list(result.scalars().all())

    # Maps to router.post("/scheduling/sessions/{session_id}/tasks", response_model=TaskCompletionResponse)
    @staticmethod
    async def create_for_session(
        db: AsyncSession,
        session_id: UUID,
        payload: TaskCompletionCreate,
    ) -> TaskCompletion:
        """Create or schedule a task execution directly within a caregiver session."""
        # Ensure payload session_id matches path parameter
        if payload.session_id != session_id:
            payload.session_id = session_id

        task = await TaskService.get_task(db, payload.task_id)

        if not task.is_active:
            raise HTTPException(
                status_code=409,
                detail="Cannot schedule an inactive task.",
            )

        await TaskService._validate_session_client(
            db,
            session_id=payload.session_id,
            client_id=payload.client_id,
        )

        requirement = None
        if payload.diagnosis_task_requirement_id is not None:
            requirement = await TaskService._get_requirement(
                db, payload.diagnosis_task_requirement_id
            )
            if requirement.task_id != payload.task_id:
                raise HTTPException(
                    status_code=422,
                    detail="The diagnosis task requirement does not refer to the supplied task.",
                )

        completion = TaskCompletion(**payload.model_dump())
        db.add(completion)
        await TaskService._commit(db)
        await db.refresh(completion)
        return completion

    # Maps to router.patch("/scheduling/tasks/{task_id}", response_model=TaskCompletionResponse)
    @staticmethod
    async def update_session_task(
        db: AsyncSession,
        task_id: UUID,  # Note: Refers to TaskCompletion.id in this routing context
        payload: TaskCompletionUpdate,
    ) -> TaskCompletion:
        """Update an existing task completion record (status, overrides, notes)."""
        # Re-uses the existing update_completion logic internally
        return await TaskService.update_completion(db, task_id, payload)

    # Maps to router.delete("/scheduling/tasks/{task_id}", response_model=TaskCompletionResponse)
    @staticmethod
    async def void_session_task(
        db: AsyncSession,
        task_id: UUID,  # Note: Refers to TaskCompletion.id in this routing context
        reason: str = "Voided via scheduling endpoint",
    ) -> TaskCompletion:
        """Void or soft-delete a task completion from a session."""
        return await TaskService.void_completion(db, task_id, reason)


task_service = TaskService()