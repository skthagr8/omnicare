from typing import Optional, Tuple
from fastapi import WebSocket, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import security_manager
from app.core.database import async_session_factory
from app.modules.auth.models import User


async def authenticate_websocket(
    websocket: WebSocket
) -> Tuple[Optional[User], Optional[str]]:
    """
    Authenticate a WebSocket connection.
    
    Returns (user, error_message) tuple.
    """
    # Get token from query parameters or headers
    token = websocket.query_params.get("token")
    
    if not token:
        # Try Authorization header
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        return None, "Missing authentication token"
    
    try:
        # Decode token
        payload = security_manager.decode_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            return None, "Invalid token"
        
        # Get user from database
        async with async_session_factory() as session:
            user = await session.get(User, user_id)
            
            if not user:
                return None, "User not found"
            
            if not user.is_active:
                return None, "User account is disabled"
            
            return user, None
            
    except Exception as e:
        return None, f"Authentication failed: {str(e)}"
