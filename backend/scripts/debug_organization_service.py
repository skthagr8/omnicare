import asyncio
import sys
import traceback
import uuid

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.modules.organisations.schemas import (
    OrganizationCreate,
    OrganizationResponse,
)
from app.modules.organisations.service import OrganizationService


async def debug_organization_service_flow(org_name: str) -> None:
    async with async_session_factory() as db:
        try:
            print("--- 1. Testing Organization Creation ---")
            create_payload = OrganizationCreate(name=org_name)
            created_org = await OrganizationService.create(db, create_payload)
            org_id = created_org.id
            print(f"[OK] Organization Created ID: {org_id}")
            print(
                "[OK] Schema Serialization:",
                OrganizationResponse.model_validate(created_org).model_dump_json(indent=2),
            )

            print("\n--- 2. Testing Organization Get by ID ---")
            fetched_org = await OrganizationService.get(db, org_id)
            if fetched_org:
                print(f"[OK] Fetched Org Name: {fetched_org.name}")
            else:
                print(f"[FAIL] Organization '{org_id}' not found.")

            print("\n--- 3. Testing Non-Existent Organization Fetch ---")
            dummy_id = uuid.uuid4()
            missing_org = await OrganizationService.get(db, dummy_id)
            print(f"[OK] Non-existent fetch returned None: {missing_org is None}")

            print("\n--- 4. Testing Organization Listing ---")
            all_orgs = await OrganizationService.list(db)
            print(f"[OK] Total Organizations Count: {len(all_orgs)}")
            for org in all_orgs:
                print(f" - {org.id} | {org.name} | Created: {getattr(org, 'created_at', 'N/A')}")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    name_arg = sys.argv[1] if len(sys.argv) > 1 else f"Test Org {uuid.uuid4().hex[:6]}"
    asyncio.run(debug_organization_service_flow(name_arg))