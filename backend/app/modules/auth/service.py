from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import security_manager
from app.modules.auth.models import User
from app.modules.auth.schemas import UserCreate, LoginRequest


class AuthService:
    """Authentication service."""
    
    @staticmethod
    async def create_user(
        db: AsyncSession,
        user_data: UserCreate
    ) -> User:
        """Create a new user."""
        # Check if user exists
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )
        
        # Create user
        user = User(
            email=user_data.email,
            password_hash=security_manager.hash_password(user_data.password),
            full_name=user_data.full_name,
            phone=user_data.phone,
            role=user_data.role
        )
        
        db.add(user)
        await db.flush()
        await db.refresh(user)
        
        return user
    
    @staticmethod
    async def authenticate(
        db: AsyncSession,
        login_data: LoginRequest
    ) -> User:
        """Authenticate a user."""
        result = await db.execute(
            select(User).where(User.email == login_data.email)
        )
        user = result.scalar_one_or_none()
        
        if not user or not security_manager.verify_password(
            login_data.password,
            user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )
        
        return user
    
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: str
    ) -> Optional[User]:
        """Get user by ID."""
        return await db.get(User, user_id)
    
    @staticmethod
    async def get_user_by_email(
        db: AsyncSession,
        email: str
    ) -> Optional[User]:
        """Get user by email."""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
