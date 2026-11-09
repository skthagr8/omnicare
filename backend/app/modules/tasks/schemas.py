
from datetime import datetime
from typing import Optional
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import CompletionStatus, PriorityRanking


# -------------------------
# Reusable task catalogue
# -------------------------

class TaskCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: Optional[str] = None
    anticipated_duration_minutes: Optional[int] = Field(
        default=None, gt=0
    )
    priority: PriorityRanking = PriorityRanking.MEDIUM
    is_active: bool = True


class TaskUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    description: Optional[str] = None
    anticipated_duration_minutes: Optional[int] = Field(
        default=None, gt=0
    )
    priority: Optional[PriorityRanking] = None
    is_active: Optional[bool] = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    description_updated_at: Optional[datetime] = None
    anticipated_duration_minutes: Optional[int] = None
    priority: PriorityRanking
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None


# -------------------------
# Session-specific execution
# -------------------------

PriorityOverride = Literal["high", "normal", "low"]


class TaskCompletionCreate(BaseModel):
    task_id: UUID
    session_id: UUID
    client_id: UUID
    diagnosis_task_requirement_id: Optional[UUID] = None

    due_at: Optional[datetime] = None
    title_override: Optional[str] = Field(default=None, max_length=150)
    details_override: Optional[str] = None
    priority_override: Optional[PriorityOverride] = None


class TaskCompletionUpdate(BaseModel):
    completed_status: Optional[CompletionStatus] = None
    was_skipped: Optional[bool] = None
    skip_reason: Optional[str] = None

    due_at: Optional[datetime] = None
    title_override: Optional[str] = Field(default=None, max_length=150)
    details_override: Optional[str] = None
    priority_override: Optional[PriorityOverride] = None

    void_reason: Optional[str] = None

    # Caregiver-app vocabulary. Translated to the fields above by
    # `translate_caregiver_fields`, and never stored directly.
    status: Optional[Literal["pending", "completed", "skipped"]] = Field(default=None, exclude=True)
    title: Optional[str] = Field(default=None, max_length=150, exclude=True)
    details: Optional[str] = Field(default=None, exclude=True)
    priority: Optional[PriorityOverride] = Field(default=None, exclude=True)
    # Optimistic-concurrency guard: rejected with 409 if stale.
    expected_revision: Optional[int] = Field(default=None, exclude=True)

    @model_validator(mode="after")
    def translate_caregiver_fields(self):
        fields = self.model_fields_set
        if "status" in fields and self.status is not None:
            if self.status == "completed":
                self.completed_status = CompletionStatus.COMPLETED
            elif self.status == "skipped":
                self.was_skipped = True
            else:
                self.completed_status = CompletionStatus.NOT_COMPLETED
                self.was_skipped = False
            # Mark the translated fields as explicitly set so
            # model_dump(exclude_unset=True) includes them.
            self.model_fields_set.update(
                {"completed_status"} if self.status == "completed"
                else {"was_skipped"} if self.status == "skipped"
                else {"completed_status", "was_skipped"}
            )
        for source, target in (("title", "title_override"), ("details", "details_override"), ("priority", "priority_override")):
            if source in fields:
                setattr(self, target, getattr(self, source))
                self.model_fields_set.add(target)
        return self


class TaskCompletionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_id: UUID
    session_id: UUID
    client_id: UUID
    diagnosis_task_requirement_id: Optional[UUID] = None

    completed_status: CompletionStatus
    was_skipped: bool

    title_override: Optional[str] = None
    details_override: Optional[str] = None
    priority_override: Optional[str] = None

    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    skip_reason: Optional[str] = None
    revision: int
    void_reason: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    # Derived, caregiver-app-facing view of the execution.
    title: str = "Task"
    details: Optional[str] = None
    priority: PriorityOverride = "normal"
    status: Literal["pending", "completed", "skipped"] = "pending"
    is_voided: bool = False

    @model_validator(mode="before")
    @classmethod
    def derive_caregiver_fields(cls, value):
        # Only ORM TaskCompletion objects need deriving; dicts pass through.
        if isinstance(value, dict) or not hasattr(value, "completed_status"):
            return value

        from sqlalchemy import inspect as sa_inspect

        # Never trigger a lazy load (it would fail under asyncio).
        task = None
        if "task" not in sa_inspect(value).unloaded:
            task = value.task

        data = {name: getattr(value, name) for name in cls.model_fields if hasattr(value, name) and name not in {"title", "details", "priority", "status", "is_voided"}}

        data["title"] = (value.title_override or (task.name if task else None) or "Task").strip() or "Task"
        data["details"] = value.details_override if value.details_override is not None else (task.description if task else None)

        if value.priority_override:
            data["priority"] = value.priority_override
        else:
            ranking = getattr(getattr(task, "priority", None), "value", getattr(task, "priority", None))
            data["priority"] = {"critical": "high", "high": "high", "medium": "normal", "low": "low"}.get(ranking, "normal")

        completed = getattr(value.completed_status, "value", value.completed_status) == "completed"
        data["status"] = "skipped" if value.was_skipped else "completed" if completed else "pending"
        data["is_voided"] = bool(value.void_reason or value.deleted_at)
        return data


# -------------------------
# Diagnosis-driven generation
# -------------------------

class GenerateTasksFromRequirementsRequest(BaseModel):
    session_id: UUID
    client_id: UUID
    diagnosis_task_requirement_ids: list[UUID] = Field(min_length=1)

    @model_validator(mode="after")
    def require_unique_requirements(self):
        if len(self.diagnosis_task_requirement_ids) != len(
            set(self.diagnosis_task_requirement_ids)
        ):
            raise ValueError(
                "Diagnosis task requirement IDs must be unique."
            )
        return self
