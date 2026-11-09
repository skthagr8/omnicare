"""Create (or reset) a family-portal account linked to a client.

Usage:
    python -m scripts.seed_family <email> "<full name>" <password> [client_id] [relationship]

With no client_id, the first active client (oldest) is used. The family user is
placed in that client's organisation, gets a family_members row and a
client_family_links row (not primary contact). Re-running with an existing
email resets the password, re-activates the account and ensures the links exist.
"""
import asyncio
import sys
import uuid

from sqlalchemy import select

# Import all model modules so SQLAlchemy registers all relationships correctly
import app.db.base  # noqa: F401
import app.modules.registry  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.core.security import security_manager
from app.modules.auth.models import User
from app.modules.clients.models import Client, ClientFamilyLink
from app.modules.family.models import FamilyMember


async def main(
    email: str,
    full_name: str,
    password: str,
    client_id: str | None = None,
    relationship: str = "relative",
) -> None:
    email = email.strip().lower()
    async with async_session_factory() as db:
        query = select(Client).where(Client.is_active.is_(True))
        if client_id:
            query = select(Client).where(Client.id == uuid.UUID(client_id))
        client = (
            await db.execute(query.order_by(Client.created_at, Client.id).limit(1))
        ).scalar_one_or_none()
        if client is None:
            sys.exit("No matching client found; pass a valid client_id.")

        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user and user.role != "family":
            sys.exit(f"{email} already exists with role '{user.role}'; refusing to change it.")

        if user:
            user.password_hash = security_manager.hash_password(password)
            user.is_active = True
            user.org_id = client.org_id
            print(f"Reset existing family user {email}")
        else:
            user = User(
                email=email,
                full_name=full_name.strip(),
                password_hash=security_manager.hash_password(password),
                phone="+15550100100",
                role="family",
                is_active=True,
                org_id=client.org_id,
            )
            db.add(user)
            await db.flush()
            print(f"Created family user {email}")

        if await db.get(FamilyMember, user.id) is None:
            db.add(FamilyMember(user_id=user.id, relationship_to_client=relationship))
            await db.flush()

        if await db.get(ClientFamilyLink, (client.id, user.id)) is None:
            db.add(ClientFamilyLink(client_id=client.id, family_member_id=user.id, is_primary_contact=False))

        await db.commit()
        print(f"Linked to client {client.full_name} ({client.id}) in org {client.org_id}")
    await close_db()


if __name__ == "__main__":
    if not 4 <= len(sys.argv) <= 6:
        sys.exit('Usage: python -m scripts.seed_family <email> "<full name>" <password> [client_id] [relationship]')
    asyncio.run(main(*sys.argv[1:]))
