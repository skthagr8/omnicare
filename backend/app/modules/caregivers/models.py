import uuid
from datetime import datetime
from typing import Optional

from geoalchemy2 import Geography
from sqlalchemy import Date, DateTime, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import pg_enum
from app.core.enums import CaregiverStatus, DiagnosisCategory


class Caregiver(Base):
    __tablename__ = "caregivers"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    status: Mapped[CaregiverStatus] = mapped_column(
        pg_enum(CaregiverStatus, "caregiver_status"),
        default=CaregiverStatus.OFF_SHIFT,
        nullable=False,
    )
    last_confirmed_location = mapped_column(Geography(geometry_type="POINT", srid=4326))
    last_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="caregiver")
    certifications: Mapped[list["CaregiverCertification"]] = relationship(
        back_populates="caregiver", cascade="all, delete-orphan"
    )


class CaregiverCertification(Base):
    __tablename__ = "caregiver_certifications"
    __table_args__ = (
        PrimaryKeyConstraint("caregiver_id", "diagnosis_category"),
    )

    caregiver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    diagnosis_category: Mapped[DiagnosisCategory] = mapped_column(
        pg_enum(DiagnosisCategory, "diagnosis_category"), nullable=False
    )
    certified_at: Mapped[datetime] = mapped_column(Date, server_default="CURRENT_DATE")

    caregiver: Mapped[Caregiver] = relationship(back_populates="certifications")
