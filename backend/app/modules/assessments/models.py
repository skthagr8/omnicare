import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, SmallInteger, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import pg_enum
from app.core.enums import AssessmentState, AssessmentType

if TYPE_CHECKING:
    from app.modules.clients.models import Client


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


class IadlAssessment(Base):
    __tablename__ = "iadl_assessments"

    BINARY_CHOICES = (
        (0, "Dependent"),
        (1, "Independent"),
    )

    class MemoryStatus(str, Enum):
        GOOD = "GOOD"
        FAIR = "FAIR"
        POOR = "POOR"
        UNKNOWN = "UNKNOWN"

    class AgeCategory(str, Enum):
        UNDER_65 = "UNDER_65"
        AGE_65_74 = "65_74"
        AGE_75_84 = "75_84"
        AGE_85_PLUS = "85_PLUS"
        UNKNOWN = "UNKNOWN"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    patient: Mapped["Client"] = relationship("Client")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=text("now()"), onupdate=text("now()")
    )

    bathing: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    transferring: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    mobility: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    meal_preparation: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    laundry: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    medication_management: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    telephone_use: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    community_mobility: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    fell_last_12_months: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    fell_last_month: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    multiple_falls: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    fear_of_falling: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    uses_vision_aids: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    uses_hearing_aids: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    pain_last_month: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    pain_limits_activities: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    diagnosis_stroke: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    diagnosis_dementia_alzheimers: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    increased_sleep_latency: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    difficulty_returning_to_sleep: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    uses_sleep_meds: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    has_diabetes: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))

    memory_status: Mapped[MemoryStatus] = mapped_column(
        pg_enum(MemoryStatus, "iadl_memory_status"), nullable=False,
        default=MemoryStatus.UNKNOWN, server_default=MemoryStatus.UNKNOWN.value
    )
    age_category: Mapped[AgeCategory] = mapped_column(
        pg_enum(AgeCategory, "iadl_age_category"), nullable=False,
        default=AgeCategory.UNKNOWN, server_default=AgeCategory.UNKNOWN.value
    )

    __table_args__ = (
        CheckConstraint("bathing IN (0, 1)", name="iadl_bathing_binary"),
        CheckConstraint("transferring IN (0, 1)", name="iadl_transferring_binary"),
        CheckConstraint("mobility IN (0, 1)", name="iadl_mobility_binary"),
        CheckConstraint("meal_preparation IN (0, 1)", name="iadl_meal_prep_binary"),
        CheckConstraint("laundry IN (0, 1)", name="iadl_laundry_binary"),
        CheckConstraint("medication_management IN (0, 1)", name="iadl_medication_binary"),
        CheckConstraint("telephone_use IN (0, 1)", name="iadl_telephone_binary"),
        CheckConstraint("community_mobility IN (0, 1)", name="iadl_community_mobility_binary"),
        Index("ix_iadl_assessments_patient_created_at", patient_id, created_at.desc()),
    )

    @property
    def total_adl_score(self) -> int:
        return self.bathing + self.transferring + self.mobility

    @property
    def total_iadl_score(self) -> int:
        return (
            self.meal_preparation
            + self.laundry
            + self.medication_management
            + self.telephone_use
            + self.community_mobility
        )

    @property
    def adl_dependency_level(self) -> str:
        score = self.total_adl_score
        if score <= 1:
            return "High"
        if score == 2:
            return "Moderate"
        return "Low"

    @property
    def iadl_dependency_level(self) -> str:
        score = self.total_iadl_score
        if score <= 1:
            return "High"
        if score <= 3:
            return "Moderate"
        return "Low"

    @property
    def fall_risk_flag(self) -> bool:
        return any(
            (
                self.fell_last_12_months,
                self.fell_last_month,
                self.multiple_falls,
                self.fear_of_falling,
            )
        )

    def __str__(self) -> str:
        return f"IADL assessment for {self.patient_id} at {self.created_at}"


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








