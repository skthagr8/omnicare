import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import pg_enum
from app.core.enums import AssessmentState, AssessmentType


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregiver_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    assessment_type: Mapped[AssessmentType] = mapped_column(
        pg_enum(AssessmentType, "assessment_type"), nullable=False
    )
    state: Mapped[AssessmentState] = mapped_column(
        pg_enum(AssessmentState, "assessment_state"),
        default=AssessmentState.PENDING,
        nullable=False,
    )
    refused_reason: Mapped[Optional[str]] = mapped_column(Text)
    administered_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    administered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )

    tug: Mapped[Optional["TugAssessment"]] = relationship(
        back_populates="assessment", uselist=False
    )
    cmai: Mapped[Optional["CmaiAssessment"]] = relationship(
        back_populates="assessment", uselist=False
    )
    braden: Mapped[Optional["BradenAssessment"]] = relationship(
        back_populates="assessment", uselist=False
    )
    delirium: Mapped[Optional["DeliriumScreening"]] = relationship(
        back_populates="assessment", uselist=False
    )


class TugAssessment(Base):
    __tablename__ = "tug_assessments"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    completion_time_sec: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    hesitation_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    freezing_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    assessment: Mapped[Assessment] = relationship(back_populates="tug")


class CmaiAssessment(Base):
    __tablename__ = "cmai_assessments"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    total_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    physical_nonaggressive: Mapped[Optional[int]] = mapped_column(SmallInteger)
    physical_aggressive: Mapped[Optional[int]] = mapped_column(SmallInteger)
    verbal_agitation: Mapped[Optional[int]] = mapped_column(SmallInteger)

    assessment: Mapped[Assessment] = relationship(back_populates="cmai")


class BradenAssessment(Base):
    __tablename__ = "braden_assessments"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    total_score: Mapped[Optional[int]] = mapped_column(SmallInteger)
    skin_inspection_notes: Mapped[Optional[str]] = mapped_column(Text)

    assessment: Mapped[Assessment] = relationship(back_populates="braden")


class DeliriumScreening(Base):
    __tablename__ = "delirium_screenings"

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    cam_positive: Mapped[Optional[bool]] = mapped_column(Boolean)
    risk_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))
    threshold_breached: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )

    assessment: Mapped[Assessment] = relationship(back_populates="delirium")


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregiver_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    recorded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(100))
    triggered_assessment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )
