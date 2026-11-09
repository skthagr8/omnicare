# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401

import asyncio
import sys
import traceback
import uuid
import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.core.enums import AcuityLevel
from app.modules.auth.models import User
from app.modules.clients.schemas import (
    AcuityTierCreate,
    AcuityTierResponse,
    ClientFamilyLinkResponse,
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyContactUpdate,
)
from app.modules.clients.service import client_service


async def debug_subresources(client_id_str: str, user_id_str: str, family_member_id_str: str) -> None:
    client_id = uuid.UUID(client_id_str)
    current_user = User(id=uuid.UUID(user_id_str))
    family_member_id = uuid.UUID(family_member_id_str)

    async with async_session_factory() as db:
        try:
            print("=== 1. Emergency Contact CRUD ===")
            contact = await client_service.add_emergency_contact(
                db,
                client_id,
                EmergencyContactCreate(
                    full_name="John Doe",
                    relationship_type="Son",
                    phone="+254712345678",
                    is_primary=True,
                ),
            )
            print("[OK] Added Contact:", EmergencyContactResponse.model_validate(contact).model_dump())

            updated_contact = await client_service.update_emergency_contact(
                db, contact.id, EmergencyContactUpdate(phone="+254799999999")
            )
            print("[OK] Updated Contact Phone:", EmergencyContactResponse.model_validate(updated_contact).phone)

            deleted_contact = await client_service.delete_emergency_contact(db, contact.id)
            print(f"[OK] Contact Deleted: {deleted_contact}")

            print("\n=== 2. Family Link Operations ===")
            link = await client_service.link_family_member(
                db, client_id, family_member_id, is_primary_contact=True
            )
            print("[OK] Linked Family Member:", ClientFamilyLinkResponse.model_validate(link).model_dump())

            unlinked = await client_service.unlink_family_member(db, client_id, family_member_id)
            print(f"[OK] Unlinked Status: {unlinked}")

            print("\n=== 3. Acuity Tier Management ===")
            tier = await client_service.add_acuity_tier(
                db,
                client_id,
                AcuityTierCreate(level=AcuityLevel.RED, reason_notes="High fall risk"),
                actor_user_id=current_user.id,
            )
            print("[OK] Added Acuity Tier:", AcuityTierResponse.model_validate(tier).model_dump())

            tiers = await client_service.list_acuity_tiers(db, client_id)
            print(f"[OK] Total Client Acuity Tiers: {len(tiers)}")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_subresources.py <CLIENT_UUID> <USER_UUID> <FAMILY_MEMBER_UUID>")
        sys.exit(1)
    asyncio.run(debug_subresources(sys.argv[1], sys.argv[2], sys.argv[3]))