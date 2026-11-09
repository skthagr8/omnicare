from typing import Optional
from fastapi import Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import security_manager
from app.modules.auth.models import User
import uuid
from app.modules.clients.models import Client, ClientFamilyLink
from sqlalchemy import select

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user (access tokens only)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Rejects refresh tokens used as access tokens
        payload = security_manager.decode_token(token, expected_type="access")
        user_id = uuid.UUID(str(payload.get("sub")))
    except (ValueError, TypeError):
        # uuid.UUID raises ValueError on malformed input
        raise credentials_exception

    user = await db.get(User, user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    return user


def require_role(required_role: str):
    """Dependency to require a specific role."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role",
            )
        return current_user

    return role_checker


def require_roles(allowed_roles: list[str]):
    """Dependency to require any of multiple roles."""
    async def roles_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}",
            )
        return current_user

    return roles_checker



async def get_current_client(
    client_id: uuid.UUID = Path(..., description="The client being accessed"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Client:
    """
    Resolve the Client referred to by `client_id`, authorized for `current_user`.

    Authorization rule:
      - administrators may access any client in their org
      - family members may access a client only if a ClientFamilyLink exists
      - any other role is rejected

    Raises:
      404 if the client does not exist
      403 if the caller is not allowed to see this client
    """
    client = await db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Client not found")

    if current_user.role == "admin":
        # Optional: also enforce same-org
        if client.org_id != current_user.org_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Client belongs to a different organization")
        return client

    if current_user.role == "family":
        link = await db.execute(
            select(ClientFamilyLink)
            .where(
                ClientFamilyLink.client_id == client_id,
                ClientFamilyLink.family_member_id == current_user.id,
            )
        )
        if link.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not linked to this client",
            )
        return client

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                        detail="Role not permitted to access client data")