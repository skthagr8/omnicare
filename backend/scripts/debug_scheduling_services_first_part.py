# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401


import asyncio
import sys
import traceback
import uuid

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.modules.auth.models import User
from app.modules.scheduling.schemas import SessionResponse
from app.modules.scheduling.service import scheduling_service, serialize_session
from app.modules.tasks.schemas import TaskCompletionResponse
from app.modules.tasks.service import TaskService


async def debug_services_flow(session_id_str: str, user_id_str: str, org_id_str: str) -> None:
    session_id = uuid.UUID(session_id_str)
    mock_user = User(
        id=uuid.UUID(user_id_str),
        org_id=uuid.UUID(org_id_str),
        role="caregiver",
    )

    async with async_session_factory() as db:
        try:
            print("--- 1. Testing Get Session & Serialization ---")
            raw_session = await scheduling_service.get(db, session_id, mock_user.org_id)
            print(f"[OK] Fetched ORM Session: {raw_session.id}")
            
            serialized = serialize_session(raw_session)
            validated_session = SessionResponse.model_validate(serialized)
            print("[OK] Session Schema Validation Passed:")
            print(validated_session.model_dump_json(indent=2))

            print("\n--- 2. Testing Today's Visits ---")
            todays_visits = await scheduling_service.get_todays_visits(db=db, actor=mock_user)
            print(f"[OK] Fetched {len(todays_visits)} visits for today.")

            print("\n--- 3. Testing Session Tasks Fetch ---")
            tasks = await TaskService.list_for_session(db, session_id)
            validated_tasks = [TaskCompletionResponse.model_validate(t) for t in tasks]
            print(f"[OK] Fetched {len(validated_tasks)} tasks for session.")

            print("\n--- 4. Testing Session Client Retrieval ---")
            client_info = await scheduling_service.get_session_client(
                db=db, session_id=session_id, actor=mock_user
            )
            print(f"[OK] Session Client Retrieved: {client_info.full_name}")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_scheduling_services.py <SESSION_UUID> <USER_UUID> <ORG_UUID>")
        sys.exit(1)
    asyncio.run(debug_services_flow(sys.argv[1], sys.argv[2], sys.argv[3]))