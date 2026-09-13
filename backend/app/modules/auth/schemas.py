from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
import uuid


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    phone: Optional[str] = None
    role: str = Field(pattern="^(admin|caregiver|family)$")


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str = Field(min_length=8, max_length=128)
    
    @validator("password")
    def validate_password_strength(cls, v):
        """Validate password strength."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserResponse(UserBase):
    """Schema for user response."""
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    access_token: str
    refresh_token: str
    
    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


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
