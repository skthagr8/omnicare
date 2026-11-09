# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401



import asyncio
import sys
import traceback
import uuid

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.core.enums import UserRole  # Adjust import path for UserRole
from app.modules.auth.models import User
from app.modules.family.schemas import (
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceRequestUpdate,
)
from app.modules.family.service import FamilyService


async def debug_family_service_flow(
    org_id_str: str, client_id_str: str, family_user_id_str: str
) -> None:
    org_id = uuid.UUID(org_id_str)
    client_id = uuid.UUID(client_id_str)
    family_user_id = uuid.UUID(family_user_id_str)

    # Mock user objects
    family_actor = User(id=family_user_id, org_id=org_id, role=UserRole.FAMILY)
    non_family_actor = User(id=uuid.uuid4(), org_id=org_id, role=UserRole.CAREGIVER)

    async with async_session_factory() as db:
        try:
            print("--- 1. Testing List Family Members by Org ID ---")
            members = await FamilyService.list_members(db, org_id)
            print(f"[OK] Fetched {len(members)} family members for org '{org_id}'.")

            print("\n--- 2. Testing Role Enforcement on Service Request Creation ---")
            create_payload = ServiceRequestCreate(
                client_id=client_id,
                description="Requesting additional weekend morning care sessions.",
            )

            # 2a. Reject non-family user role
            try:
                await FamilyService.create_service_request(
                    db, actor=non_family_actor, data=create_payload
                )
                print("[FAIL] Non-family role was able to create service request!")
            except Exception as e:
                print(f"[OK] Non-family role rejected as expected: {e}")

            # 2b. Accept family user role
            service_req = await FamilyService.create_service_request(
                db, actor=family_actor, data=create_payload
            )
            request_id = service_req.id
            print(f"[OK] Service Request Created ID: {request_id}")
            print(
                "[OK] Schema Output:",
                ServiceRequestResponse.model_validate(service_req).model_dump_json(indent=2),
            )

            print("\n--- 3. Testing List Service Requests ---")
            # All requests for org
            org_requests = await FamilyService.list_service_requests(db, actor=family_actor)
            print(f"[OK] Total Service Requests for Org: {len(org_requests)}")

            # Filtered by client_id
            client_requests = await FamilyService.list_service_requests(
                db, actor=family_actor, client_id=client_id
            )
            print(f"[OK] Filtered Service Requests for Client: {len(client_requests)}")

            print("\n--- 4. Testing Service Request Update ---")
            update_payload = ServiceRequestUpdate(
                status="approved",
                notes="Approved by care coordinator.",
            )
            updated_req = await FamilyService.update_service_request(
                db, request_id=request_id, data=update_payload
            )
            print(f"[OK] Updated Status: {getattr(updated_req, 'status', 'Updated')}")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_family_service.py <ORG_UUID> <CLIENT_UUID> <FAMILY_USER_UUID>")
        sys.exit(1)
    asyncio.run(
        debug_family_service_flow(sys.argv[1], sys.argv[2], sys.argv[3])
    )