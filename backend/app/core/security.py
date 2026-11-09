from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
from datetime import timezone
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SecurityManager:
    """Handles authentication and security operations."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except ValueError:
            # Malformed hash or unsupported input: treat as a failed match
            return False

    @staticmethod
    def _encode(data: Dict[str, Any], token_type: str, expires: timedelta) -> str:
        to_encode = data.copy()
        to_encode.update(
            {"exp": datetime.now(timezone.utc) + expires, "type": token_type}
        )
        return jwt.encode(
            to_encode, settings.secret_key, algorithm=settings.jwt_algorithm
        )

    @staticmethod
    def create_access_token(
        data: Dict[str, Any], expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token."""
        return SecurityManager._encode(
            data,
            "access",
            expires_delta or timedelta(minutes=settings.access_token_expire_minutes),
        )

    @staticmethod
    def create_refresh_token(
        data: Dict[str, Any], expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT refresh token."""
        return SecurityManager._encode(
            data,
            "refresh",
            expires_delta or timedelta(days=settings.refresh_token_expire_days),
        )

    @staticmethod
    def decode_token(
        token: str, expected_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Decode and validate a JWT; optionally enforce its `type` claim."""
        try:
            payload = jwt.decode(
                token, settings.secret_key, algorithms=[settings.jwt_algorithm]
            )
        except JWTError:
            raise ValueError("Invalid or expired token")

        if expected_type and payload.get("type") != expected_type:
            raise ValueError("Invalid token type")
        return payload


security_manager = SecurityManager()