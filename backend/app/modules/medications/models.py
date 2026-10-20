import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, Time
from sqlalchemy.dialects.postgresql import ARRAY, SMALLINT, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.enums import MedicationAdminStatus
from app.core.db_types import pg_enum
from app.core.enums import MedicationAdminStatus, MedicationClass
from omnicare.backend.app.modules.clients.models import ClientDiagnosisCategory
    

class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    diagnosis_category: Mapped[ClientDiagnosisCategory] = mapped_column(
        pg_enum(ClientDiagnosisCategory, "client_diagnosis_category"), nullable=False
    )
    drug_class: Mapped[MedicationClass] = mapped_column(
        pg_enum(MedicationClass, "medication_class"),
        default=MedicationClass.OTHER,
        nullable=False,
    )
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    instructions: Mapped[str] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    requires_glucose_check: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    window_start_local: Mapped[time] = mapped_column(Time, nullable=False)
    window_end_local: Mapped[time] = mapped_column(Time, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )

    schedules: Mapped[list["MedicationSchedule"]] = relationship(
        back_populates="medication", cascade="all, delete-orphan"
    )


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    medication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medications.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_time: Mapped[time] = mapped_column(Time, nullable=False)
    days_of_week: Mapped[list[int]] = mapped_column(
        ARRAY(SMALLINT), default=[1, 2, 3, 4, 5, 6, 7], nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )

    medication: Mapped[Medication] = relationship(back_populates="schedules")

class MedicationAdministration(Base):
    """Tracks historical logs, refusals, and completions for specific calendar dates."""

    __tablename__ = "medication_administrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medication_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    caregiver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.user_id", ondelete="SET NULL"),
        nullable=True,
    )

    # Specific date this dose belongs to on the calendar
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Operational Outcome
    status: Mapped[MedicationAdminStatus] = mapped_column(
        pg_enum(MedicationAdminStatus, "medication_admin_status"),
        default=MedicationAdminStatus.PENDING,
        nullable=False,
    )
    administered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )
    non_completion_reason: Mapped[Optional[str]] = mapped_column(String(255))
    glucose_level: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2))

    # Relationships
    schedule: Mapped["MedicationSchedule"] = relationship()

    __table_args__ = (
        # Ensures only ONE log entry per schedule per client per calendar date
        Index(
            "uq_schedule_client_date",
            "schedule_id",
            "client_id",
            "scheduled_date",
            unique=True,
        ),
    )