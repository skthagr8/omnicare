"""Usage: python -m scripts.seed_admin admin@omnicare.com "Admin User" 'StrongPass123'"""
import app.db.base  # noqa: F401
from app.modules.auth.models import User
import app.modules.registry
import asyncio
import sys
from sqlalchemy import select
from app.core.database import async_session_factory, close_db
from app.core.security import security_manager

# Import all model modules so SQLAlchemy registers all relationships correctly
import app.modules.auth.models
import app.modules.caregivers.models
from app.modules.auth.models import User
from app.modules.caregivers.models import Caregiver, CaregiverCertification
from app.modules.family.models import FamilyMember
from app.modules.organisations.models import Organization

from app.modules.auth import models as _auth  # noqa: F401
from app.modules.caregivers import models as _caregivers  # noqa: F401
from app.modules.clients import models as _clients  # noqa: F401
from app.modules.family import models as _family  # noqa: F401



async def main(email: str, full_name: str, password: str) -> None:
    email = email.strip().lower()
    async with async_session_factory() as db:
        user = (
            await db.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()

        if user:
            user.role = "admin"
            user.is_active = True
            print(f"Promoted existing user {email} to admin")
        else:
            db.add(
                User(
                    email=email,
                    full_name=full_name.strip(),
                    password_hash=security_manager.hash_password(password),
                    role="admin",
                )
            )
            print(f"Created admin {email}")

        await db.commit()
    await close_db()


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit('Usage: python -m scripts.seed_admin <email> "<full name>" <password>')
    asyncio.run(main(*sys.argv[1:]))