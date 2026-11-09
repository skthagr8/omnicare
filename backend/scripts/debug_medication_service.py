# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401

import asyncio
import sys
import traceback
import uuid
from datetime import date, datetime, timezone, time, timedelta
import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.modules.auth.models import User
from app.modules.medications.schemas import (
    MedicationAdministrationCreate,
    MedicationAdministrationUpdate,
    MedicationCreate,
    MedicationResponse,
    MedicationScheduleCreate
)
from app.modules.medications.service import medication_service



async def debug_medication_flow(
    client_id_str: str, session_id_str: str, admin_user_id_str: str
) -> None:
    client_id = uuid.UUID(client_id_str)
    session_id = uuid.UUID(session_id_str)
    admin_user = User(id=uuid.UUID(admin_user_id_str), role="admin")
    regular_user = User(id=uuid.uuid4(), role="caregiver")

    async with async_session_factory() as db:
        try:
            print("--- 1. Testing Medication Creation ---")
            med_payload = MedicationCreate(
                client_id=client_id,
                name="Aspirin",
                dosage="100mg",
                instructions="Take with water after meals",
                is_active=True,
                 window_start_local=time(7, 0),     # 07:00 local
                 window_end_local=time(21, 0),      # 21:00 local
            )
            created_med = await medication_service.create_medications(db, med_payload)
            med_id = created_med.id
            print(f"[OK] Medication Created ID: {med_id}")
            print("[OK] Schema Output:", MedicationResponse.model_validate(created_med).model_dump_json(indent=2))

            print("\n--- 2. Testing Schedule Creation (RBAC Enforcement) ---")
            sched_payload = MedicationScheduleCreate(
                client_id=client_id,
                scheduled_time="08:00:00",
                days_of_week=[1, 3, 5],  # Mon, Wed, Fri
            )
            
            # 2a. Fail test: regular caregiver attempt
            try:
                await medication_service.create_schedule(db, med_id, sched_payload, user=regular_user)
                print("[FAIL] Non-admin user was able to create schedule!")
            except Exception as e:
                print(f"[OK] Non-admin rejected as expected: {e}")

            # 2b. Success test: admin user attempt
            schedule = await medication_service.create_schedule(db, med_id, sched_payload, user=admin_user)
            schedule_id = schedule.id
            print(f"[OK] Schedule Created ID by Admin: {schedule_id}")

            print("\n--- 3. Testing Medication Administrations Logging ---")
            medication_id = med_id
            admin_payload = [
                MedicationAdministrationCreate(
                    session_id=session_id,
                    medication_id=medication_id,
                    schedule_id=schedule_id,
                    status="administered",
                    administered_at=datetime.now(timezone.utc),
                    glucose_check_value=110.5,
                )
            ]
            logged_admins = await medication_service.create_administrations(
                db, actor=admin_user, data=admin_payload
            )
            admin_id = logged_admins[0].id
            print(f"[OK] Administration Logged ID: {admin_id}")

            print("\n--- 4. Testing Administration Field Mapping Update ---")
            # Verify missed_reason -> non_completion_reason remapping
            update_payload = MedicationAdministrationUpdate(
                status="missed",
                missed_reason="Patient refused medication",
            )
            updated_admin = await medication_service.update_administration(
                db, administration_id=admin_id, data=update_payload
            )
            print(f"[OK] Updated Admin ID: {updated_admin.id}")
            print(f"[OK] Mapped non_completion_reason: {getattr(updated_admin, 'non_completion_reason', None)}")

            print("\n--- 5. Testing Weekly Occurrences Generation ---")
            today = date.today()
            week_start = today - timedelta(days=today.weekday())  # Current Monday
            occurrences = await medication_service.list_weekly_occurrences(
                db, client_id=client_id, week_start=week_start
            )
            print(f"[OK] Weekly Occurrences Generated: {len(occurrences)} slots found for the week.")

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_medication_service.py <CLIENT_UUID> <SESSION_UUID> <ADMIN_USER_UUID>")
        sys.exit(1)
    asyncio.run(debug_medication_flow(sys.argv[1], sys.argv[2], sys.argv[3]))