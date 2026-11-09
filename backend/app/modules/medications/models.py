from __future__ import annotations

import uuid
from datetime import datetime, time
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import pg_enum
from app.core.enums import MedicationAdminStatus, MedicationClass

# No imports from scheduling / clients / caregivers: foreign keys use table-name
# strings, which resolve once app.db.base has imported every module.


class Medication(Base):
    """A catalog medication. It is not owned by any client: a client receives it
    through client_diagnoses -> diagnosis_definitions -> diagnosis_medication_requirements."""

    __tablename__ = "medications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    drug_class: Mapped[MedicationClass] = mapped_column(
        pg_enum(MedicationClass, "medication_class"),
        nullable=False,
        default=MedicationClass.OTHER,
    )
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    requires_glucose_check: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    # Local administration window. May wrap past midnight, so no ordering CHECK.
    window_start_local: Mapped[time] = mapped_column(Time, nullable=False)
    window_end_local: Mapped[time] = mapped_column(Time, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    schedules: Mapped[list["MedicationSchedule"]] = relationship(
        back_populates="medication", cascade="all, delete-orphan", passive_deletes=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text)


class MedicationSchedule(Base):
    __tablename__ = "medication_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    medication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    scheduled_time: Mapped[time] = mapped_column(Time, nullable=False)
    # ISO weekday: 1 = Monday ... 7 = Sunday
    days_of_week: Mapped[list[int]] = mapped_column(
        ARRAY(SmallInteger),
        nullable=False,
        default=lambda: [1, 2, 3, 4, 5, 6, 7],
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    medication: Mapped["Medication"] = relationship(back_populates="schedules")
    # Administrations are clinical history: deleting a schedule only unlinks them.
    administrations: Mapped[list["MedicationAdministration"]] = relationship(
        back_populates="schedule"
    )

    __table_args__ = (
        CheckConstraint(
            "cardinality(days_of_week) BETWEEN 1 AND 7 "
            "AND days_of_week <@ ARRAY[1,2,3,4,5,6,7]::smallint[]",
            name="days_valid",
        ),
    )


class MedicationAdministration(Base):
    """One recorded outcome (administered / refused / missed) for a medication in a visit."""

    __tablename__ = "medication_administrations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregiver_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    medication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medications.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    schedule_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medication_schedules.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[MedicationAdminStatus] = mapped_column(
        pg_enum(MedicationAdminStatus, "medication_admin_status"),
        nullable=False,
        default=MedicationAdminStatus.PENDING,
    )
    # ✅ ALSO VALID (Relies on DB for constraint):
    glucose_check_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1))
    administered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    missed_reason: Mapped[Optional[str]] = mapped_column(Text)
    recorded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    medication: Mapped["Medication"] = relationship()
    schedule: Mapped[Optional["MedicationSchedule"]] = relationship(
        back_populates="administrations"
    )

    __table_args__ = (
        CheckConstraint(
            "status <> 'administered' OR administered_at IS NOT NULL",
            name="administered_needs_time",
        ),
        CheckConstraint(
            "status NOT IN ('refused', 'missed') OR missed_reason IS NOT NULL",
            name="reason_required",
        ),
        CheckConstraint(
            "glucose_check_value IS NULL OR glucose_check_value >= 0",
            name="glucose_non_negative",
        ),
    )