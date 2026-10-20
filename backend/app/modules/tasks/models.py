import uuid
from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import Boolean, DateTime, String, Text, ForeignKey, ForeignKeyConstraint, UniqueConstraint, CheckConstraint, Integer, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.db_types import pg_enum
from app.core.enums import ClientDiagnosisCategory
from app.core.enums import CompletionStatus, PriorityRanking


class Task(Base):
    """
    Catalog/template task. Execution state (completed / skipped) lives ONLY on
    TaskCompletion - the previous Task.completed_status / was_skipped were
    global across every client and could never be correct.
    """

    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    target_category: Mapped[ClientDiagnosisCategory] = mapped_column(
        pg_enum(ClientDiagnosisCategory, "client_diagnosis_category"),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(Text)
    description_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    # Was a DateTime ("anticipated completion time") - a catalog task has no
    # calendar time, only an expected duration.
    anticipated_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    priority: Mapped[PriorityRanking] = mapped_column(
        pg_enum(PriorityRanking, "priority_ranking"),
        nullable=False,
        default=PriorityRanking.MEDIUM,
        server_default=PriorityRanking.MEDIUM.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default="now()", onupdate="now()"
    )

   
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("name", "target_category", name="uq_tasks_name_target_category"),
        CheckConstraint(
            "anticipated_duration_minutes IS NULL OR anticipated_duration_minutes > 0",
            name="duration_positive",
        ),
    )


class TaskCompletion(Base):
    __tablename__ = "task_completions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="RESTRICT"),  # FK was missing
        nullable=False,
        index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    completed_status: Mapped[CompletionStatus] = mapped_column(
        pg_enum(CompletionStatus, "completion_status"),
        nullable=False,
        default=CompletionStatus.NOT_COMPLETED,
        server_default=CompletionStatus.NOT_COMPLETED.value,
    )
    was_skipped: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default="now()", onupdate="now()"
    )

    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    task: Mapped["Task"] = relationship()
    session: Mapped["CaregiverSession"] = relationship(
        foreign_keys=[session_id],
        primaryjoin="TaskCompletion.session_id == CaregiverSession.id",
        viewonly=True,
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["session_id", "client_id"],
            ["caregiver_sessions.id", "caregiver_sessions.client_id"],
            name="fk_task_completions_session_client",
            ondelete="CASCADE",
        ),
        UniqueConstraint("session_id", "task_id", name="uq_task_completions_session_task"),
        CheckConstraint(
            "NOT was_skipped OR completed_status <> 'completed'",
            name="skipped_not_completed",
        ),
    )