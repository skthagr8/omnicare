from sqlalchemy.exc import IntegrityError
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import security_manager
from app.modules.auth.models import User
from app.modules.auth.schemas import UserCreate, LoginRequest, CaregiverInvitationCreate, InvitationResponse
from app.modules.auth.models import EmailInvitation, InvitationStatus, CaregiverShell
from datetime import datetime, timezone, timedelta
from starlette.concurrency import run_in_threadpool
import hashlib
import re
import secrets
import uuid

from app.core.config import settings
from app.core.enums import CaregiverStatus, DiagnosisCategory
from app.modules.caregivers.models import Caregiver, CaregiverCertification
from app.modules.organisations.models import Organization


class AuthService:
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """Create a new user."""
        email = user_data.email.strip().lower()

        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        password_hash = await run_in_threadpool(
            security_manager.hash_password, user_data.password
        )

        user = User(
            email=email,
            password_hash=password_hash,
            full_name=user_data.full_name.strip(),
            phone=user_data.phone,
            role=user_data.role,
        )
        db.add(user)

        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        await db.refresh(user)  # load server-default timestamps before serializing
        return user

    @staticmethod
    async def authenticate(db: AsyncSession, login_data: LoginRequest) -> User:
        """Authenticate a user."""
        result = await db.execute(
            select(User).where(User.email == login_data.email.strip().lower())
        )
        
        user = result.scalar_one_or_none()

        if not user or not await run_in_threadpool(
            security_manager.verify_password, login_data.password, user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )

        if login_data.portal and user.role != login_data.portal:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"This account is not authorised for the {login_data.portal} portal",
                    )
        return user
    
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession, user_id: "str | uuid.UUID"
    ) -> Optional[User]:
        """Get user by ID (accepts the string `sub` from a JWT)."""
        try:
            uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
        except (ValueError, AttributeError):
            return None
        return await db.get(User, uid)

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email."""
        result = await db.execute(
            select(User).where(User.email == email.strip().lower())
        )
        return result.scalar_one_or_none()



    # ------------------------------------------------------------------
    # Caregiver invitations
    # ------------------------------------------------------------------
    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def _utcnow() -> datetime:
        # The invitation timestamp columns are "timestamp without time zone" holding UTC.
        return datetime.now(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def _effective_status(invitation: EmailInvitation) -> str:
        status_value = getattr(invitation.status, "value", invitation.status)
        if status_value == InvitationStatus.PENDING.value and invitation.expires_at <= AuthService._utcnow():
            return InvitationStatus.EXPIRED.value
        return status_value

    @staticmethod
    async def create_caregiver_invitation(
        db: AsyncSession,
        invitation_data: CaregiverInvitationCreate,
        admin_user: User
    ) -> tuple[EmailInvitation, str]:
        """Create (or renew an expired) caregiver invitation.

        Returns the invitation and the raw one-time token for the email link; only the
        token's SHA-256 hash is stored.
        """
        if admin_user.org_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your admin account is not linked to an organisation, so caregivers cannot be invited yet.",
            )

        email = invitation_data.caregiver_email.strip().lower()

        # 1. The email must not already belong to an account.
        existing_user = await db.execute(select(User).where(User.email == email))
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already has an OmniCare account.",
            )

        # 2. One invitation row per email (unique). A live pending invite blocks a resend;
        #    an expired one is renewed in place.
        result = await db.execute(
            select(EmailInvitation).where(EmailInvitation.caregiver_email == email)
        )
        invitation = result.scalar_one_or_none()
        if invitation is not None:
            current = AuthService._effective_status(invitation)
            if current == InvitationStatus.PENDING.value:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An invitation has already been sent to this address and is still pending.",
                )
            if current == InvitationStatus.ACCEPTED.value:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This caregiver has already accepted an invitation.",
                )

        certifications = [getattr(c, "value", c) for c in invitation_data.certifications]

        # 3. Shell profile: the admin-verified details the caregiver will activate.
        shell = None
        if invitation is not None and invitation.caregiver_shell_id:
            shell = await db.get(CaregiverShell, invitation.caregiver_shell_id)
        if shell is None:
            shell = CaregiverShell(email=email, full_name="", org_id=admin_user.org_id, verification_source="")
            db.add(shell)
        shell.full_name = invitation_data.full_name.strip()
        shell.email = email
        shell.org_id = admin_user.org_id
        shell.verification_source = invitation_data.verification_source.strip()
        shell.certifications = certifications
        await db.flush()

        # 4. One-time token, valid for the configured window (48 hours by default).
        token = secrets.token_urlsafe(32)
        expires_at = AuthService._utcnow() + timedelta(hours=settings.caregiver_invitation_ttl_hours)

        if invitation is None:
            invitation = EmailInvitation(caregiver_email=email)
            db.add(invitation)
        invitation.invited_by = admin_user.id
        invitation.caregiver_shell_id = shell.id
        invitation.status = InvitationStatus.PENDING.value
        invitation.expires_at = expires_at
        invitation.token_hash = AuthService._hash_token(token)

        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An invitation record already exists for this email address.",
            )

        await db.refresh(invitation)
        return invitation, token

    @staticmethod
    async def list_caregiver_invitations(db: AsyncSession, admin_user: User) -> list[dict]:
        """Invitations for the admin's organisation, newest first."""
        if admin_user.org_id is None:
            return []
        result = await db.execute(
            select(EmailInvitation, CaregiverShell, Organization)
            .join(CaregiverShell, CaregiverShell.id == EmailInvitation.caregiver_shell_id)
            .join(Organization, Organization.id == CaregiverShell.org_id)
            .where(CaregiverShell.org_id == admin_user.org_id)
            .order_by(EmailInvitation.created_at.desc())
        )
        return [
            {
                "id": invitation.id,
                "caregiver_email": invitation.caregiver_email,
                "full_name": shell.full_name,
                "organization_name": org.name,
                "certifications": list(shell.certifications or []),
                "verification_source": shell.verification_source,
                "status": AuthService._effective_status(invitation),
                "created_at": invitation.created_at,
                "expires_at": invitation.expires_at,
            }
            for invitation, shell, org in result.all()
        ]

    @staticmethod
    async def _load_invitation_by_token(db: AsyncSession, token: str):
        result = await db.execute(
            select(EmailInvitation, CaregiverShell, Organization)
            .join(CaregiverShell, CaregiverShell.id == EmailInvitation.caregiver_shell_id)
            .join(Organization, Organization.id == CaregiverShell.org_id)
            .where(EmailInvitation.token_hash == AuthService._hash_token(token.strip()))
        )
        return result.one_or_none()

    @staticmethod
    async def validate_invitation_token(db: AsyncSession, token: str) -> dict:
        """Check an invite link without consuming it."""
        row = await AuthService._load_invitation_by_token(db, token)
        if row is None:
            return {"status": "invalid"}
        invitation, shell, org = row
        current = AuthService._effective_status(invitation)
        if current == InvitationStatus.ACCEPTED.value:
            return {"status": "used"}
        if current == InvitationStatus.EXPIRED.value:
            return {"status": "expired"}
        return {
            "status": "valid",
            "email": invitation.caregiver_email,
            "full_name": shell.full_name,
            "organization_name": org.name,
            "continue_url": f"/complete-profile?token={token.strip()}",
            # Naive UTC in the DB; mark it as UTC so browsers parse it correctly.
            "expires_at": invitation.expires_at.replace(tzinfo=timezone.utc),
        }

    _PASSWORD_RULES = (
        (lambda p: 8 <= len(p) <= 128, "be 8 to 128 characters long"),
        (lambda p: re.search(r"[A-Z]", p), "contain an uppercase letter"),
        (lambda p: re.search(r"[a-z]", p), "contain a lowercase letter"),
        (lambda p: re.search(r"[0-9]", p), "contain a number"),
    )

    @staticmethod
    async def activate_caregiver_invitation(
        db: AsyncSession, token: str, password: str, phone: Optional[str]
    ) -> User:
        """Consume an invite: create the caregiver's user, caregiver record and certifications."""
        row = await AuthService._load_invitation_by_token(db, token)
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This invitation link is not valid.")
        invitation, shell, _org = row
        current = AuthService._effective_status(invitation)
        if current == InvitationStatus.ACCEPTED.value:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation has already been used.")
        if current == InvitationStatus.EXPIRED.value:
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="This invitation has expired.")

        failed = [msg for rule, msg in AuthService._PASSWORD_RULES if not rule(password)]
        if failed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must " + ", ".join(failed) + ".",
            )

        phone = (phone or "").strip() or None
        if phone and len(phone) > 20:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is too long.")

        if await AuthService.get_user_by_email(db, invitation.caregiver_email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

        password_hash = await run_in_threadpool(security_manager.hash_password, password)
        user = User(
            email=invitation.caregiver_email,
            password_hash=password_hash,
            full_name=shell.full_name,
            phone=phone,
            role="caregiver",
            org_id=shell.org_id,
        )
        db.add(user)
        await db.flush()

        db.add(Caregiver(user_id=user.id, status=CaregiverStatus.OFF_SHIFT, registered_by=invitation.invited_by))
        await db.flush()
        for category in shell.certifications or []:
            db.add(CaregiverCertification(caregiver_id=user.id, diagnosis_category=DiagnosisCategory(category)))

        invitation.status = InvitationStatus.ACCEPTED.value
        invitation.registered_user_id = user.id

        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This invitation could not be activated.")
        return user
