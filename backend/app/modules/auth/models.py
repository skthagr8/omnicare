from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.modules.caregivers.models import Caregiver, CaregiverCertification  # noqa: F401
    # also guard any other cross-module model imports here (FamilyMember, Organization, ...)
    from app.modules.family.models import FamilyMember  # noqa: F401
    from app.modules.organisations.models import Organization  # noqa: F401
   


import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.enums import InvitationStatus

class User(Base):
    """User model for authentication."""
    
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    org_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET_NULL"),
        nullable=True,
        index=True,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
    DateTime, server_default=func.now(), onupdate=func.now()
    )
    
    # Relationships
    caregiver: Mapped[Optional["Caregiver"]] = relationship(
        back_populates="user",
        uselist=False,
        foreign_keys="Caregiver.user_id",
    )
    family_members: Mapped[Optional["FamilyMember"]] = relationship(
        back_populates="user",
        uselist=False,
    )
    organization: Mapped[Optional["Organization"]] = relationship(
        foreign_keys=[org_id]
    )
    


class CaregiverShell(Base):
    """Caregiver shell model for minimal caregiver representation."""
    
    __tablename__ = "caregiver_shells"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id"), nullable=False)  

    org_association: Mapped[Optional["Organization"]] = relationship(
        "Organization",
        uselist=False,
        foreign_keys="[CaregiverShell.org_id]",
    )

    verification_source = mapped_column(String(255), nullable=False)
    # Diagnosis categories (dementia, post_stroke, parkinsons, other) verified by the admin;
    # copied to caregiver_certifications when the caregiver activates.
    certifications: Mapped[list[str]] = mapped_column(
        ARRAY(String(50)), nullable=False, server_default="{}", default=list
    )

class EmailInvitation(Base):
    """Email invitation model for inviting caregivers."""

    __tablename__ = "email_invitations"
    id: Mapped[uuid.UUID] = mapped_column(  
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    caregiver_email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey("users.id", ondelete="SET NULL"),
    nullable=True
    )

    invited_by_admin: Mapped[Optional["User"]] = relationship(
        uselist=False,
        foreign_keys="[EmailInvitation.invited_by]",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )
    status: Mapped[InvitationStatus] = mapped_column(
        String(50),
        nullable=False,
        server_default=InvitationStatus.PENDING.value
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    registered_user_id: Mapped[uuid.UUID | None] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey("users.id", ondelete="SET NULL"),
    nullable=True,
    )

    # SHA-256 of the one-time token in the invite link; the raw token is never stored.
    token_hash: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True)
    caregiver_shell_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("caregiver_shells.id", ondelete="SET NULL"),
        nullable=True,
    )
    caregiver_shell: Mapped[Optional["CaregiverShell"]] = relationship(
        uselist=False,
        foreign_keys="[EmailInvitation.caregiver_shell_id]",
    )

    registered_user: Mapped[Optional["User"]] = relationship(
        uselist=False,
        foreign_keys="[EmailInvitation.registered_user_id]",
    )
