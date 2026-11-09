import asyncio
import sys
import traceback
import uuid
from datetime import datetime, timezone

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.core.enums import AssessmentType
from app.modules.assessments.schemas import (
    AssessmentCreate,
    AssessmentResponse,
    BradenScore,
    CmaiScore,
    ObservationCreate,
    ObservationResponse,
    TugScore,
)
from app.modules.assessments.service import AssessmentService
from app.modules.auth.models import User


async def debug_assessment_service_flow(
    client_id_str: str, session_id_str: str, user_id_str: str
) -> None:
    client_id = uuid.UUID(client_id_str)
    session_id = uuid.UUID(session_id_str)
    actor_user = User(id=uuid.UUID(user_id_str), role="caregiver")

    async with async_session_factory() as db:
        try:
            print("--- 1. Testing TUG Assessment Creation & Subtype Dispatch ---")
            tug_payload = AssessmentCreate(
                client_id=client_id,
                session_id=session_id,
                assessment_type=AssessmentType.TUG,
                state="completed",
                administered_at=datetime.now(timezone.utc),
                tug=TugScore(completion_time_sec=12.5,hesitation_flag=True,freezing_flag=False,),)
            created_tug = await AssessmentService.create(db, actor_user, tug_payload)
            tug_id = created_tug.id
            print(f"[OK] TUG Assessment Created ID: {tug_id}")
            print(f"[OK] Eager Loaded Subtype Object (TUG): {created_tug.tug}")

            print("\n--- 2. Testing Assessment Fetch with Eager Loading (selectinload) ---")
            fetched_assessment = await AssessmentService.get(db, tug_id)
            print(f"[OK] Fetched Assessment ID: {fetched_assessment.id}")
            print("[OK] Serialized Output:")
            print(AssessmentResponse.model_validate(fetched_assessment).model_dump_json(indent=2))

            print("\n--- 3. Testing Client Assessments List ---")
            client_assessments = await AssessmentService.list_for_client(db, client_id)
            print(f"[OK] Assessments Count for Client: {len(client_assessments)}")

            print("\n--- 4. Testing Observation Logging ---")
            obs_payload = ObservationCreate(
                client_id=client_id,
                session_id=session_id,        
                note="Patient was relaxed and cooperative during observation window.",
            )
            logged_obs = await AssessmentService.add_observation(db, actor_user, obs_payload)
            print(f"[OK] Observation Logged ID: {logged_obs.id}")
            print("[OK] Schema Output:", ObservationResponse.model_validate(logged_obs).model_dump_json(indent=2))

            print("\n--- 5. Testing Assessment Update ---")
            update_payload = AssessmentCreate(
                client_id=client_id,
                session_id=session_id,
                assessment_type=AssessmentType.TUG,
                state="completed",
                administered_at=datetime.now(timezone.utc)
            )
            updated_assessment = await AssessmentService.update_assessment(
                db, assessment_id=tug_id, data=update_payload, actor=actor_user
            )
            print(f"[OK] Updated Result Note: OK")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_assessment_service.py <CLIENT_UUID> <SESSION_UUID> <USER_UUID>")
        sys.exit(1)
    asyncio.run(debug_assessment_service_flow(sys.argv[1], sys.argv[2], sys.argv[3]))