# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401

from fastapi import HTTPException
from sqlalchemy import select
import asyncio
import sys
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from app.schemas.common import GeoPoint
import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.core.enums import SessionStatus
from app.core.geo import geo_from_point
from app.modules.auth.models import User
from app.modules.scheduling.schemas import (
    SessionCheckIn,
    SessionCheckOut,
    SessionCreate,
    SessionResponse,
)
from app.modules.scheduling.service import scheduling_service, serialize_session
from app.modules.tasks.schemas import (
    TaskCompletionCreate,
    TaskCompletionResponse,
    TaskCompletionUpdate,
)
from app.modules.tasks.service import TaskService

async def run_step(label, coro_fn):
    """
    Run a single debug step. Returns (label, ok, result_or_exception).
    Never raises.
    """
    print(f"\n--- {label} ---")
    try:
        result = await coro_fn()
        print(f"[OK] {label}")
        return (label, True, result)
    except Exception as e:
        print(f"[FAIL] {label}")
        traceback.print_exc()
        return (label, False, e)


async def debug_services_flow(
    session_id_str: str,
    user_id_str: str,
    org_id_str: str,
    admin_id_str: str | None = None,
) -> None:
    session_id  = uuid.UUID(session_id_str)
    caregiver_id = uuid.UUID(user_id_str)
    org_id      = uuid.UUID(org_id_str)
    admin_id    = uuid.UUID(admin_id_str) if admin_id_str else caregiver_id

    caregiver = User(id=caregiver_id, org_id=org_id, role="caregiver")
    admin     = User(id=admin_id,     org_id=org_id, role="admin")

    results: list[tuple[str, bool, object]] = []

    # outer-scope bindings that later steps depend on
    client = None
    created_session_id: uuid.UUID | None = None
    created_task_id:    uuid.UUID | None = None

    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)

    async with async_session_factory() as db:

        # ------------------------------------------------------------------
        # READ PATH — the four steps from the original script
        # ------------------------------------------------------------------

        async def _1():
            raw = await scheduling_service.get(db, session_id, org_id)
            print(f"  session id: {raw.id}")
            print(f"  caregiver id: {raw.caregiver_id}")
            serialized = serialize_session(raw)
            validated  = SessionResponse.model_validate(serialized)
            print(validated.model_dump_json(indent=2))
            return validated

        results.append(await run_step("1. get (ORM) + serialize_session + SessionResponse", _1))

        async def _2():
            visits = await scheduling_service.get_todays_visits(db=db, actor=caregiver)
            print(f"  visits today: {len(visits)}")
            return visits

        results.append(await run_step("2. get_todays_visits (caregiver)", _2))

        async def _3():
            tasks = await TaskService.list_for_session(db, session_id)
            validated = [TaskCompletionResponse.model_validate(t) for t in tasks]
            print(f"  tasks: {len(validated)}")
            return validated

        results.append(await run_step("3. TaskService.list_for_session", _3))

        async def _4():
            nonlocal client

            client = await scheduling_service.get_session_client(
                db=db, session_id=session_id, actor=caregiver
            )
            print(f"  client: {client.full_name}")
            return client

        results.append(await run_step("4. get_session_client (caregiver owns session)", _4))

        # ------------------------------------------------------------------
        # NEGATIVE AUTH — the same endpoint with the wrong role must 403
        # ------------------------------------------------------------------

        async def _4b():
            try:
                await scheduling_service.get_session_client(
                    db=db, session_id=session_id, actor=admin
                )
            except HTTPException as e:
                if e.status_code == 403:
                    print("  correctly rejected admin on caregiver-only endpoint")
                    return "403 expected"

                raise
            except Exception as e:
                raise AssertionError(
            f"expected HTTPException(403), got {type(e).__name__}: {e}"
            )

            raise AssertionError("admin was NOT rejected — expected 403")

        results.append(await run_step("4b. get_session_client rejects non-caregiver (403)", _4b))

        # ------------------------------------------------------------------
        # GET_BY_ID (returns SessionResponse, not ORM)
        # ------------------------------------------------------------------

        async def _5():
            resp = await scheduling_service.get_by_id(db, session_id, org_id)
            print(f"  returned type: {type(resp).__name__}")
            return resp

        results.append(await run_step("5. get_by_id (returns SessionResponse)", _5))

        # ------------------------------------------------------------------
        # LIST (no filters)
        # ------------------------------------------------------------------

        async def _6():
            sessions = await scheduling_service.list(db)
            print(f"  total sessions: {len(sessions)}")
            return sessions

        results.append(await run_step("6. list (no filters)", _6))

        # ------------------------------------------------------------------
        # LIST with caregiver filter
        # ------------------------------------------------------------------

        async def _7():
            sessions = await scheduling_service.list(db, caregiver_id=caregiver_id)
            print(f"  sessions for caregiver: {len(sessions)}")
            return sessions

        results.append(await run_step("7. list(caregiver_id=...)", _7))

        # ------------------------------------------------------------------
        # LIST with client filter
        # ------------------------------------------------------------------

        async def _8():
            client = await scheduling_service.get_session_client(
                db=db, session_id=session_id, actor=caregiver
            )
            sessions = await scheduling_service.list(db, client_id=client.id)
            print(f"  sessions for client: {len(sessions)}")
            return sessions

        results.append(await run_step("8. list(client_id=...)", _8))

        # ------------------------------------------------------------------
        # LIST_SESSIONS_BY_ID
        # ------------------------------------------------------------------

        async def _9():
            sessions = await scheduling_service.list_sessions_by_id(
                db, [session_id], org_id
            )
            print(f"  sessions returned: {len(sessions)}")
            return sessions

        results.append(await run_step("9. list_sessions_by_id", _9))

        # ------------------------------------------------------------------
        # CREATE — creates a new session for tomorrow, using admin actor
        # ------------------------------------------------------------------

        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        created_session_id: uuid.UUID | None = None

        async def _10():
            nonlocal created_session_id
            assert client is not None, "step 4 must succeed before step 10"
            data = SessionCreate(
                client_id=client.id,
                caregiver_id=caregiver_id,
                scheduled_start=tomorrow,
                scheduled_end=tomorrow + timedelta(hours=1),
            )
            new_session = await scheduling_service.create(db, admin, data)
            created_session_id = new_session.id
            print(f"  created session: {new_session.id}")
            return new_session

        results.append(await run_step("10. create (admin)", _10))

        # ------------------------------------------------------------------
        # UPDATE_SESSION
        # ------------------------------------------------------------------

        async def _11():
            assert created_session_id, "create must succeed before update"
            assert client is not None
            data = SessionCreate(
                client_id=client.id,
                caregiver_id=caregiver_id,
                scheduled_start=tomorrow + timedelta(hours=2),
                scheduled_end=tomorrow + timedelta(hours=3),
            )
            updated = await scheduling_service.update_session(
                db, created_session_id, org_id, data
            )
            print(f"  updated session: {updated.id}")
            return updated

        results.append(await run_step("11. update_session (admin)", _11))

        # ------------------------------------------------------------------
        # CHECK_IN — transitions session to IN_PROGRESS
        # ------------------------------------------------------------------

        async def _12():
            assert created_session_id, "create must succeed before check_in"

            data = SessionCheckIn(
                location=GeoPoint(latitude=0.0, longitude=0.0),
                geofence_verified=True,
                time=datetime.now(timezone.utc),
            )
           
            
            checked = await scheduling_service.check_in(
                db, created_session_id, org_id, data
            )
            print(f"  status: {checked.status}")
            assert checked.status == SessionStatus.IN_PROGRESS, checked.status
            return checked

        results.append(await run_step("12. check_in", _12))

        # ------------------------------------------------------------------
        # CHECK_OUT — transitions to COMPLETED
        # ------------------------------------------------------------------

        async def _13():
            assert created_session_id, "create must succeed before check_out"
            data = SessionCheckOut(
                location=GeoPoint(latitude=0.0, longitude=0.0),
                time=datetime.now(timezone.utc),
            )
            checked = await scheduling_service.check_out(
                db, created_session_id, org_id, data
            )
            print(f"  status: {checked.status}")
            assert checked.status == SessionStatus.COMPLETED, checked.status
            return checked

        results.append(await run_step("13. check_out", _13))

        # ------------------------------------------------------------------
        # LIST_SESSION_TASKS — delegated to TaskService
        # ------------------------------------------------------------------

        async def _14():
            tasks = await scheduling_service.list_session_tasks(db, session_id)
            print(f"  tasks: {len(tasks)}")
            return tasks

        results.append(await run_step("14. list_session_tasks (delegates)", _14))

        # ------------------------------------------------------------------
        # CREATE_SESSION_TASK — adds a task to the created session
        #
        # NOTE: TaskCompletionCreate's exact fields depend on your schema.
        #       The fields below are the common case; adjust to match.
        # ------------------------------------------------------------------

        created_task_id: uuid.UUID | None = None

        async def _15():
            nonlocal created_task_id
            assert created_session_id, "create must succeed before create_session_task"
            assert client is not None, "step 4 must succeed before step 15"   # ← narrow the type


            # Fetch a task_id to attach — use the first task in the system
            from app.modules.tasks.models import Task
            
            task_row = (await db.execute(select(Task).limit(1))).scalar_one_or_none()
            if task_row is None:
                raise RuntimeError(
                    "No tasks exist in DB — seed at least one Task before running "
                    "create_session_task."
                )


            payload = TaskCompletionCreate(
                session_id = created_session_id,
                client_id = client.id,
                task_id=task_row.id,
                due_at=tomorrow + timedelta(hours=1),
            )
           
            new_task = await scheduling_service.create_session_task(
                db, created_session_id, payload
            )
            created_task_id = new_task.id
            print(f"  created task: {new_task.id}")
            return new_task

        results.append(await run_step("15. create_session_task", _15))

        # ------------------------------------------------------------------
        # UPDATE_SESSION_TASK
        # ------------------------------------------------------------------

        async def _16():
            assert created_task_id, "create_session_task must succeed before update"
            payload = TaskCompletionUpdate(
                skip_reason="patient asleep",
                was_skipped=True,
            )
            updated = await scheduling_service.update_session_task(
                db, created_task_id, payload
            )
            print(f"  updated task: {updated.id}")
            return updated

        results.append(await run_step("16. update_session_task", _16))

        # ------------------------------------------------------------------
        # VOID_SESSION_TASK — soft-deletes the task
        # ------------------------------------------------------------------

        async def _17():
            assert created_task_id, "create_session_task must succeed before void"
            voided = await scheduling_service.void_session_task(
                db, created_task_id, reason="debug script teardown"
            )
            print(f"  voided task: {voided.id}")
            return voided

        results.append(await run_step("17. void_session_task", _17))

        # ------------------------------------------------------------------
        # GET_SESSION_ASSESSMENT_ITEMS — eager-loads assessment_items
        # ------------------------------------------------------------------

        async def _18():
            items = await scheduling_service.get_session_assessment_items(
                db, session_id, caregiver_id
        )
            print(f"  assessment requirement/completion rows: {len(items)}")
            return items

        

        # ------------------------------------------------------------------
        # GET_SESSION_MEDICATIONS — eager-loads medications
        # ------------------------------------------------------------------
        
        async def _19():
            items = await scheduling_service.get_session_medications(
                db, session_id, caregiver_id
        )
            print(f"  medication requirement/completion rows: {len(items)}")
            return items
        

        # ------------------------------------------------------------------
        # GET_SESSIONS_BY_CLIENT
        # ------------------------------------------------------------------

        async def _20():
            assert client is not None, "step 4 must succeed before step 15"   # ← narrow the type
            sessions = await scheduling_service.get_sessions_by_client(
                db, client_id=client.id, caregiver_id=caregiver_id
            )
            print(f"  sessions for client+caregiver: {len(sessions)}")
            return sessions

        results.append(await run_step("20. get_sessions_by_client", _20))

    # ---------------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------------
    passed = sum(1 for _, ok, _ in results if ok)
    total  = len(results)
    print("\n" + "=" * 60)
    print(f"SUMMARY: {passed}/{total} steps passed")
    print("=" * 60)
    for label, ok, _ in results:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {label}")

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(
            "Usage: python debug_scheduling_services.py "
            "<SESSION_UUID> <CAREGIVER_UUID> <ORG_UUID> [ADMIN_UUID]"
        )
        sys.exit(1)

    session_id_str = sys.argv[1]
    user_id_str    = sys.argv[2]
    org_id_str     = sys.argv[3]
    admin_id_str   = sys.argv[4] if len(sys.argv) >= 5 else None

    asyncio.run(debug_services_flow(session_id_str, user_id_str, org_id_str, admin_id_str))