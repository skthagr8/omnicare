from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

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

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user."""
    user = await AuthService.create_user(db, user_data)

    token_data = {"sub": str(user.id)}
    access_token = security_manager.create_access_token(data=token_data)
    refresh_token = security_manager.create_refresh_token(data=token_data)

    user.access_token = access_token
    user.refresh_token = refresh_token

    return user


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


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token."""
    try:
        payload = security_manager.decode_token(refresh_data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
        
        user_id = payload.get("sub")
        user = await AuthService.get_user_by_id(db, user_id)
        
        if not user:
            raise ValueError("User not found")
        
        access_token = security_manager.create_access_token(
            data={"sub": str(user.id), "role": user.role}
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_data.refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
            user=user
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
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
