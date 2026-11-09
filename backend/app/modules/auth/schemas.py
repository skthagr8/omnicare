from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator,field_validator, ConfigDict
import uuid
from typing import Literal, Optional

from app.core.enums import DiagnosisCategory



class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=20)  # matches String(20) column
    role: str = Field(pattern="^(admin|caregiver|family)$")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserCreate(UserBase):
    """Schema for creating a user (internal / admin-created)."""
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:  # bcrypt limit is bytes, not characters
            raise ValueError("Password must be at most 72 bytes")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserRegister(UserCreate):
    """Public self-registration: admin role is not allowed."""
    role: Literal["caregiver", "family"]

class UserResponse(UserBase):
    id: uuid.UUID
    org_id: Optional[uuid.UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str
    portal: Optional[Literal["admin", "caregiver", "family"]] = None


class TokenResponse(BaseModel):
    """Schema for token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    """Schema for password change."""
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""
    email: EmailStr


class CaregiverInvitationCreate(BaseModel):
    caregiver_email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    verification_source: str = Field(min_length=1, max_length=255)
    # Diagnosis categories: dementia, post_stroke, parkinsons, other.
    certifications: list[DiagnosisCategory] = Field(default_factory=list)
    # Ignored for admins: the caregiver always joins the inviting admin's organisation.
    org_association: Optional[uuid.UUID] = None

class InvitationResponse(BaseModel):
    status: str
    message: str
    invitation_id: uuid.UUID


class CaregiverInvitationListItem(BaseModel):
    """One row of the admin caregiver directory (an invitation and its outcome)."""
    id: uuid.UUID
    caregiver_email: str
    full_name: str
    organization_name: Optional[str] = None
    certifications: list[str] = Field(default_factory=list)
    verification_source: Optional[str] = None
    status: str  # pending | accepted | expired
    created_at: datetime
    expires_at: datetime


class CaregiverInvitationList(BaseModel):
    organization_name: Optional[str] = None  # the admin's organisation (invites join it)
    invitations: list[CaregiverInvitationListItem]


class InvitationTokenRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)


class InvitationValidateResponse(BaseModel):
    status: Literal["valid", "expired", "used", "invalid"]
    email: Optional[str] = None
    full_name: Optional[str] = None
    organization_name: Optional[str] = None
    continue_url: Optional[str] = None
    expires_at: Optional[datetime] = None


class InvitationActivateResponse(BaseModel):
    status: Literal["activated"]
    email: str