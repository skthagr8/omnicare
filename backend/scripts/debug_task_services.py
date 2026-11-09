# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401

import asyncio
import sys
import traceback
import uuid

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.modules.tasks.schemas import (
    GenerateTasksFromRequirementsRequest,
    TaskCompletionCreate,
    TaskCompletionResponse,
    TaskCompletionUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.modules.tasks.service import task_service


async def debug_tasks_service_flow(
    session_id_str: str, client_id_str: str, def_id_str: str
) -> None:
    session_id = uuid.UUID(session_id_str)
    client_id = uuid.UUID(client_id_str)
    def_id = uuid.UUID(def_id_str)

    async with async_session_factory() as db:
        try:
            # -----------------------------------------------------------------
            # 1. CREATE — the task we'll use for everything below
            # -----------------------------------------------------------------
            print("--- 1. Testing Task Catalogue Creation ---")
            task_create = TaskCreate(
                name="Assisted Morning Walk",
                details="Assist client with 15-minute walk using walking frame.",
                priority="medium",
                category="mobility",
                is_active=True,
            )
            created_task = await task_service.create_task(db, task_create)
            task_id = created_task.id
            print(f"[OK] Task Created ID: {task_id}")
            print("[OK] Schema Output:",
                  TaskResponse.model_validate(created_task).model_dump_json(indent=2))

            # -----------------------------------------------------------------
            # 2. LIST & GET — verify the task is retrievable
            # -----------------------------------------------------------------
            print("\n--- 2. Testing Task Listing & Retrieval ---")
            tasks = await task_service.list_tasks(db, active_only=True, limit=10, offset=0)
            print(f"[OK] Active Tasks Count: {len(tasks)}")

            fetched_task = await task_service.get_task(db, task_id)
            print(f"[OK] Fetched Task name: {fetched_task.name}")

            # -----------------------------------------------------------------
            # 3. UPDATE (non-destructive) — change priority and details
            # -----------------------------------------------------------------
            print("\n--- 3. Testing Task Update ---")
            updated_task = await task_service.update_task(
                db, task_id,
                TaskUpdate(priority="high",
                           details="Updated: Requires 20-minute walk."),
            )
            print(f"[OK] Updated Priority: {updated_task.priority}")

            # -----------------------------------------------------------------
            # 4. COMPLETION — the task is still ACTIVE here, so this succeeds
            # -----------------------------------------------------------------
            print("\n--- 4. Testing Task Completion Execution ---")
            completion_create = TaskCompletionCreate(
                session_id=session_id,
                client_id=client_id,
                task_id=task_id,
                name="Assisted Morning Walk",
                details="Completed without issues.",
                priority="high",
                status="pending",
            )
            completion = await task_service.create_completion(db, completion_create)
            completion_id = completion.id
            print(f"[OK] Completion Created ID: {completion_id}")
            print("[OK] Completion Schema:",
                  TaskCompletionResponse.model_validate(completion).model_dump_json(indent=2))

            # -----------------------------------------------------------------
            # 5. VOID — reversible state change on the completion, not the task
            # -----------------------------------------------------------------
            print("\n--- 5. Testing Task Completion Voiding ---")
            voided = await task_service.void_completion(
                db, completion_id, reason="Client requested reschedule"
            )
            print(f"[OK] Voided Completion Status: DONE")

            # -----------------------------------------------------------------
            # 6. GENERATE FROM REQUIREMENTS — uses the still-active task
            #
            # The schema field is `diagnosis_task_requirement_ids` (not
            # `diagnosis_definition_ids`). Look up the requirement rows
            # linked to this definition, then generate from those IDs.
            # -----------------------------------------------------------------
            print("\n--- 6. Testing Task Generation From Requirements ---")

            from app.modules.clients.models import DiagnosisTaskRequirement
            from sqlalchemy import select

            req_ids = (await db.execute(
                select(DiagnosisTaskRequirement.id)
                .where(DiagnosisTaskRequirement.diagnosis_definition_id == def_id)
            )).scalars().all()

            if not req_ids:
                print(f"[SKIP] No requirement rows exist for definition {def_id}")
            else:
                gen_request = GenerateTasksFromRequirementsRequest(
                    session_id=session_id,
                    client_id=client_id,
                    diagnosis_task_requirement_ids=list(req_ids),
                )
                generated = await task_service.generate_from_requirements(db, gen_request)
                print(f"[OK] Generated Tasks Count: {len(generated)}")

            # -----------------------------------------------------------------
            # 7. DEACTIVATE — TERMINAL. Move last because it makes the task
            #    unusable for any subsequent create_completion / generate calls.
            # -----------------------------------------------------------------
            print("\n--- 7. Testing Task Deactivation (terminal) ---")
            deactivated_task = await task_service.deactivate_task(db, task_id)
            print(f"[OK] Deactivated Status: {deactivated_task.is_active == False}")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_task_services.py <SESSION_UUID> <CLIENT_UUID> <DIAGNOSIS_DEF_UUID>")
        sys.exit(1)
    asyncio.run(debug_tasks_service_flow(sys.argv[1], sys.argv[2], sys.argv[3]))