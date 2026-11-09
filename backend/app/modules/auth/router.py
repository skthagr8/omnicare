from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks
from app.modules.auth.schemas import (
    CaregiverInvitationCreate,
    CaregiverInvitationList,
    InvitationActivateResponse,
    InvitationResponse,
    InvitationTokenRequest,
    InvitationValidateResponse,
)
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import security_manager
from app.modules.auth.models import User
from app.modules.auth.schemas import (
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    PasswordChangeRequest
)
from app.modules.auth.service import AuthService
from app.modules.organisations.models import Organization
from app.modules.auth.send_resend_email_task import send_resend_email_task
from app.core.config import settings
from app.modules.auth.schemas import UserRegister
from app.core.deps import get_current_user, require_role  # add require_role to your existing import



router = APIRouter()

@router.post(
    "/admin/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_user(
    user_data: UserCreate,  # full UserCreate: admin role allowed here
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Admin-only: create a user with any role, including admin."""
    return await AuthService.create_user(db, user_data)

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user and return tokens (same shape as /login)."""
    user = await AuthService.create_user(db, user_data)
    await db.commit()  # persist before the client can use the tokens

    return TokenResponse(
        access_token=security_manager.create_access_token(
            data={"sub": str(user.id), "role": user.role}
        ),
        refresh_token=security_manager.create_refresh_token(
            data={"sub": str(user.id)}
        ),
        expires_in=settings.access_token_expire_minutes * 60,
        user=user,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token."""
    try:
        payload = security_manager.decode_token(refresh_data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        user = await AuthService.get_user_by_id(db, payload.get("sub"))
        if not user:
            raise ValueError("User not found")
        if not user.is_active:
            raise ValueError("User account is disabled")

        access_token = security_manager.create_access_token(
            data={"sub": str(user.id), "role": user.role}
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_data.refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
            user=user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login and get tokens."""
    user = await AuthService.authenticate(db, login_data)
    
    # Create tokens
    access_token = security_manager.create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    refresh_token = security_manager.create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=user
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user."""
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change password."""
    # Verify current password
    if not security_manager.verify_password(
        password_data.current_password,
        current_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = security_manager.hash_password(
        password_data.new_password
    )
    await db.commit()
    
    return {"message": "Password changed successfully"}

@router.post(
    "/send-invitation-email", 
    response_model=InvitationResponse, 
    status_code=status.HTTP_202_ACCEPTED
)
async def send_email_invitation(
    invitation_data: CaregiverInvitationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Creates structural shells, updates state definitions, and triggers 
    an immediate transactional email delivery stream through Resend.
    """

    # Process database operations safely via the service
    invitation, token = await AuthService.create_caregiver_invitation(
        db=db,
        invitation_data=invitation_data,
        admin_user=current_user
    )

    # Hand off network network call execution to background task worker threads
    background_tasks.add_task(
        send_resend_email_task,
        invitation_id=str(invitation.id),
        recipient_email=invitation.caregiver_email,
        caregiver_name=invitation_data.full_name.strip(),
        token=token,
    )

    # Instantly reply to the admin client context in milliseconds 
    return InvitationResponse(
        status="processing",
        message=f"Invitation successfully constructed. Email dispatch triggered for {invitation.caregiver_email}.",
        invitation_id=invitation.id
    )


@router.get("/invitations", response_model=CaregiverInvitationList)
async def list_caregiver_invitations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Caregiver invitations sent for the admin's organisation (the caregiver directory)."""
    org_name = None
    if current_user.org_id is not None:
        org = await db.get(Organization, current_user.org_id)
        org_name = org.name if org else None
    return CaregiverInvitationList(
        organization_name=org_name,
        invitations=await AuthService.list_caregiver_invitations(db, current_user),
    )


@router.post("/invitations/validate", response_model=InvitationValidateResponse)
async def validate_caregiver_invitation(
    body: InvitationTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public: check an invite link's token without using it up."""
    return await AuthService.validate_invitation_token(db, body.token)


@router.post("/invitations/activate", response_model=InvitationActivateResponse)
async def activate_caregiver_invitation(
    token: str = Form(..., min_length=16, max_length=256),
    password: str = Form(..., max_length=128),
    phone: Optional[str] = Form(default=None, max_length=20),
    preferred_name: Optional[str] = Form(default=None, max_length=100),
    privacy_acknowledged: bool = Form(...),
    photo: Optional[UploadFile] = File(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Public: the caregiver sets a password and activates their account.

    preferred_name and photo are accepted for the form's sake but not stored yet
    (there are no columns for them).
    """
    if not privacy_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please acknowledge the client privacy statement.",
        )
    user = await AuthService.activate_caregiver_invitation(db, token, password, phone)
    return InvitationActivateResponse(status="activated", email=user.email)
