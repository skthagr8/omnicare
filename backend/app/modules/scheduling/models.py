import uuid
from datetime import date, datetime
from typing import Optional

from geoalchemy2 import Geography
from sqlalchemy import Boolean, Computed, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.db_types import pg_enum
from app.core.enums import SessionStatus


class CaregiverSession(Base):
    __tablename__ = "caregiver_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False
    )
    caregiver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.user_id", ondelete="RESTRICT"),
        nullable=False,
    )
    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    visit_date: Mapped[date] = mapped_column(
        Date,
        Computed("(scheduled_start AT TIME ZONE 'UTC')::date", persisted=True),
    )
    status: Mapped[SessionStatus] = mapped_column(
        pg_enum(SessionStatus, "session_status"),
        default=SessionStatus.SCHEDULED,
        nullable=False,
    )
    check_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    check_in_location = mapped_column(Geography(geometry_type="POINT", srid=4326))
    check_in_geofence_verified: Mapped[Optional[bool]] = mapped_column(Boolean)
    check_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    check_out_location = mapped_column(Geography(geometry_type="POINT", srid=4326))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("administrators.user_id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()"
    )
