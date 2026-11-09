from typing import TYPE_CHECKING, Optional

from app.core.enums import CompletionStatus, PriorityRanking

if TYPE_CHECKING:
    from app.modules.clients.models import DiagnosisTaskRequirement
    from app.modules.scheduling.models import CaregiverSession

import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import pg_enum


if TYPE_CHECKING:
    from app.modules.clients.models import (
        DiagnosisDefinition,
        DiagnosisTaskRequirement,
    )


class Task(Base):
    """
    Reusable task catalogue entry.

    Defines what a task is, not which diagnosis requires it
    or whether it has been completed in a particular session.
    """

    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[Optional[str]] = mapped_column(Text)

    description_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
    )

    anticipated_duration_minutes: Mapped[Optional[int]] = mapped_column(
        Integer,
    )

    priority: Mapped[PriorityRanking] = mapped_column(
        pg_enum(PriorityRanking, "priority_ranking"),
        nullable=False,
        default=PriorityRanking.MEDIUM,
        server_default=PriorityRanking.MEDIUM.value,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
        onupdate=func.now(),
    )

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
    )

    # Diagnosis configurations that reuse this task.
    diagnosis_requirements: Mapped[
        list["DiagnosisTaskRequirement"]
    ] = relationship(
        "DiagnosisTaskRequirement",
        back_populates="task",
    )

    # Actual executions of this task.
    completions: Mapped[list["TaskCompletion"]] = relationship(
        "TaskCompletion",
        back_populates="task",
    )

    __table_args__ = (
        CheckConstraint(
            "anticipated_duration_minutes IS NULL "
            "OR anticipated_duration_minutes > 0",
            name="ck_tasks_duration_positive",
        ),
    )


class TaskCompletion(Base):
    """
    A task instance recorded against a client's caregiver session.

    All session-specific state and display overrides live here,
    never on the reusable Task catalogue entry.
    """

    __tablename__ = "task_completions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional provenance: which diagnosis rule generated this task?
    diagnosis_task_requirement_id: Mapped[
        Optional[uuid.UUID]
    ] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "diagnosis_task_requirements.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    completed_status: Mapped[CompletionStatus] = mapped_column(
        pg_enum(CompletionStatus, "completion_status"),
        nullable=False,
        default=CompletionStatus.NOT_COMPLETED,
        server_default=CompletionStatus.NOT_COMPLETED.value,
    )

    # Retained for compatibility with existing consumers.
    # Keep it consistent with completed_status.
    was_skipped: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    # Session-specific display overrides.
    title_override: Mapped[Optional[str]] = mapped_column(
        String(150),
    )

    details_override: Mapped[Optional[str]] = mapped_column(Text)

    priority_override: Mapped[Optional[str]] = mapped_column(
        String(10),
    )

    # Session-specific scheduling and execution.
    due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
    )

    skip_reason: Mapped[Optional[str]] = mapped_column(Text)

    revision: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    void_reason: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
    )

    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="completions",
    )

    diagnosis_requirement: Mapped[
        Optional["DiagnosisTaskRequirement"]
    ] = relationship(
        "DiagnosisTaskRequirement",
    )

    session: Mapped["CaregiverSession"] = relationship(
        "CaregiverSession",
        foreign_keys=[session_id],
        primaryjoin=(
            "TaskCompletion.session_id == CaregiverSession.id"
        ),
        viewonly=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["session_id", "client_id"],
            [
                "caregiver_sessions.id",
                "caregiver_sessions.client_id",
            ],
            name="fk_task_completions_session_client",
            ondelete="CASCADE",
        ),
        UniqueConstraint(
            "session_id",
            "task_id",
            name="uq_task_completions_session_task",
        ),
        CheckConstraint(
            "NOT was_skipped OR completed_status <> 'completed'",
            name="ck_task_completions_skipped_not_completed",
        ),
        CheckConstraint(
            "priority_override IS NULL OR "
            "priority_override IN ('high', 'normal', 'low')",
            name="ck_task_completions_priority_override",
        ),
        CheckConstraint(
            "revision >= 0",
            name="ck_task_completions_revision_nonnegative",
        ),
    )
