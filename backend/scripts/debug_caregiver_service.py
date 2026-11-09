# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401


import asyncio
import sys
import traceback
import uuid
from datetime import date

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.modules.caregivers.schemas import (
    CaregiverCertificationCreate,
    CaregiverResponse,
    CaregiverUpdate,
    GeoPoint,
)
from app.modules.caregivers.service import CaregiverService, serialize_caregiver


async def debug_caregiver_service_flow(
    org_id_str: str, caregiver_id_str: str
) -> None:
    org_id = uuid.UUID(org_id_str)
    caregiver_id = uuid.UUID(caregiver_id_str)

    async with async_session_factory() as db:
        try:
            print("--- 1. Testing Caregiver List by Org ID ---")
            caregivers = await CaregiverService.list(db, org_id)
            print(f"[OK] Fetched {len(caregivers)} caregivers for org '{org_id}'.")

            print("\n--- 2. Testing Caregiver Get by ID ---")
            caregiver = await CaregiverService.get(db, caregiver_id)
            print(f"[OK] Fetched Caregiver User ID: {caregiver.user_id}")
            print(f"[OK] Eager Loaded User: {caregiver.user.full_name if caregiver.user else None}")
            print(f"[OK] Eager Loaded Certifications Count: {len(caregiver.certifications)}")

            print("\n--- 3. Testing Serialization (serialize_caregiver) ---")
            serialized = serialize_caregiver(caregiver)
            validated = CaregiverResponse.model_validate(serialized)
            print("[OK] Schema Validation Passed:")
            print(validated.model_dump_json(indent=2))

            print("\n--- 4. Testing Location & Status Update ---")
            update_payload = CaregiverUpdate(
                status="available",
                last_confirmed_location=GeoPoint(latitude=-1.286389, longitude=36.817223),
            )
            updated_caregiver = await CaregiverService.update(
                db, caregiver_id=caregiver_id, data=update_payload
            )
            print(f"[OK] Updated Status: {updated_caregiver.status}")
            print(f"[OK] Updated Location Timestamp: {updated_caregiver.last_confirmed_at}")

            print("\n--- 5. Testing Add Certification ---")
            cert_payload = CaregiverCertificationCreate(
                diagnosis_category="post_stroke",
                certified_at=date.today(),  
            )
            new_cert = await CaregiverService.add_certification(
                db, caregiver_id=caregiver_id, data=cert_payload
            )
            print(f"[OK] Created Certification: OK ")
            print(f"[OK] Category: {new_cert.diagnosis_category}")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python debug_caregiver_service.py <ORG_UUID> <CAREGIVER_USER_UUID>")
        sys.exit(1)
    asyncio.run(debug_caregiver_service_flow(sys.argv[1], sys.argv[2]))