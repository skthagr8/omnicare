import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.core.database import Base


class EmergencyEvent(Base):
    """Emergency event model."""
    
    __tablename__ = "emergency_events"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False
    )
    caregiver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregivers.id", ondelete="CASCADE")
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326))
    details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), default="active")
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default="now()",
        onupdate="now()"
    )


class EmergencyOutbox(Base):
    """Emergency outbox for guaranteed notification delivery."""
    
    __tablename__ = "emergency_outbox"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("emergency_events.id", ondelete="CASCADE"),
        nullable=False
    )
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    twilio_message_sid: Mapped[Optional[str]] = mapped_column(String(255))
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default="now()"
    )
