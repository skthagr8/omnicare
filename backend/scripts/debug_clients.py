# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401

from app.modules.caregivers.models import Caregiver  # noqa: F401
import asyncio
import sys
import traceback
import uuid
from datetime import date
from app.core.database import async_session_factory, close_db
from app.modules.auth.models import User
from app.modules.clients.schemas import ClientCreate, ClientResponse, ClientUpdate, GeoPoint
from app.modules.clients.service import client_service


async def debug_client_routes(user_id_str: str, org_id_str: str) -> None:
    current_user = User(id=uuid.UUID(user_id_str), org_id=uuid.UUID(org_id_str))

    async with async_session_factory() as db:
        try:
            print("=== 1. Testing client_service.create_client ===")
            create_payload = ClientCreate(
                full_name="Jane Doe",
                date_of_birth=date(1960, 5, 20),
                address_text="Westlands, Nairobi",
                gender="Female",
                location=GeoPoint(latitude=-1.2676, longitude=36.8121),
                residence="Private Residence",
                assessment_observations="Initial assessment complete.",
            )
            client_orm = await client_service.create_client(
                db, create_payload, org_id=current_user.org_id, actor_user_id=current_user.id
            )
            print(f"[OK] Created Client ID: {client_orm.id}")
            print("[OK] Schema Validation:", ClientResponse.model_validate(client_orm).model_dump_json(indent=2))

            print("\n=== 2. Testing client_service.list_clients ===")
            clients = await client_service.list_clients(db, current_user.org_id, only_active=True)
            print(f"[OK] Listed {len(clients)} active clients for org {current_user.org_id}")

            print("\n=== 3. Testing client_service.get_client ===")
            fetched = await client_service.get_client(db, client_orm.id)
            print("[OK] Fetched Name:", ClientResponse.model_validate(fetched).full_name)

            print("\n=== 4. Testing client_service.update_client ===")
            update_payload = ClientUpdate(
                address_text="Kilimani, Nairobi",
                location=GeoPoint(latitude=-1.2891, longitude=36.7832),
            )
            updated = await client_service.update_client(db, client_orm.id, update_payload)
            print("[OK] Updated Location:", ClientResponse.model_validate(updated).location)

            print("\n=== 5. Testing client_service.deactivate_client ===")
            deactivated = await client_service.deactivate_client(db, client_orm.id)
            print(f"[OK] Deactivation Status: {deactivated}")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python debug_clients.py <USER_UUID> <ORG_UUID>")
        sys.exit(1)
    asyncio.run(debug_client_routes(sys.argv[1], sys.argv[2]))