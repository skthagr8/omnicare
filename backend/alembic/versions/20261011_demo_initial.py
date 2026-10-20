"""Initial application schema and opt-in fictional demo dataset.

Revision ID: 20261011_demo
Revises: None

This frozen revision is for disposable development databases only.
"""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid5

import sqlalchemy as sa
from alembic import context, op
from geoalchemy2 import Geography, Geometry
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


revision = "20261011_demo"
down_revision = None
branch_labels = None
depends_on = None

NAMESPACE = UUID("b58a1ee2-d8b6-4823-97c6-4e754d4f6789")
STAMP = datetime(2026, 10, 5, 8, tzinfo=timezone.utc)
BASE_COUNT = 100
CATEGORIES = ("dementia", "post_stroke", "parkinsons", "other")
ASSESSMENT_TYPES = ("tug", "cmai", "braden", "delirium")
BINARY_FIELDS = (
    "bathing", "transferring", "mobility", "meal_preparation", "laundry",
    "medication_management", "telephone_use", "community_mobility",
)
IADL_FLAGS = (
    "fell_last_12_months", "fell_last_month", "multiple_falls", "fear_of_falling",
    "uses_vision_aids", "uses_hearing_aids", "pain_last_month", "pain_limits_activities",
    "increased_sleep_latency", "difficulty_returning_to_sleep", "uses_sleep_meds",
    "has_diabetes", "diagnosis_stroke", "diagnosis_dementia_alzheimers",
)
FIRST_NAMES = (
    "Amara", "Brian", "Carmen", "Daniel", "Elena", "Felix", "Grace", "Hassan",
    "Irene", "James", "Kavya", "Liam", "Maria", "Noah", "Olivia", "Peter",
    "Ruth", "Samuel", "Tendai", "Uche", "Victor", "Wanjiru", "Xiomara",
    "Yusuf", "Zara", "Abel", "Beatrice", "Caleb", "Diana", "Ethan",
    "Fatima", "George", "Halima", "Isaac", "Joyce", "Kevin", "Lydia",
    "Moses", "Nadia", "Omar", "Priya", "Quentin", "Rachel", "Simon",
    "Teresa", "Umar", "Vera", "Winston", "Yolanda", "Zainab",
)
LAST_NAMES = (
    "Achieng", "Baker", "Chen", "Davies", "Esposito", "Farah", "Gatimu",
    "Hernandez", "Ibrahim", "Johansson", "Kariuki", "Lindqvist", "Mwangi",
    "Nguyen", "Odhiambo", "Patel", "Quinn", "Rossi", "Silva", "Thompson",
    "Umeh", "Vargas", "Wambui", "Xu", "Yamada", "Zuberi", "Adebayo",
    "Brennan", "Castillo", "Dubois", "Eriksen", "Fernandez", "Gichuru",
    "Haile", "Ivanov", "Jensen", "Kamau", "Lopez", "Mutua", "Ndung'u",
    "Okafor", "Petrov", "Reyes", "Santos", "Tanaka", "Uwimana", "Vance",
    "Wanjala", "Yamamoto", "Zhou",
)
STREETS = (
    "Ridgeview", "Maple Grove", "Cedar Hollow", "Willow Creek", "Harbor",
    "Fernwood", "Birchwood", "Sunrise", "Lantern Hill", "Meadowbrook",
    "Orchard", "Stonebridge", "Clearwater", "Brookside", "Highland",
    "Pinecrest", "Riverbend", "Cobblestone", "Hillcrest", "Rosewood",
)
TASKS = (
    "Morning Mobility Check", "Hydration Reminder", "Meal Assistance",
    "Medication Reminder", "Light Housekeeping", "Companionship Visit",
    "Vital Signs Check", "Safety Walkthrough", "Bathing Assistance",
    "Evening Wind-down Routine",
)
MEDICATIONS = (
    "Demo Multivitamin Tablet", "Demo Blood Pressure Tablet", "Demo Cholesterol Tablet",
    "Demo Glucose Control Tablet", "Demo Thyroid Tablet", "Demo Pain Relief Tablet",
    "Demo Bone Health Tablet", "Demo Heart Rhythm Tablet", "Demo Mood Support Tablet",
    "Demo Sleep Support Tablet",
)


def identifier(name="id"):
    return sa.Column(name, sa.UUID(), primary_key=True, nullable=False)


def reference(name, target, ondelete="RESTRICT", nullable=False, primary_key=False, index=False):
    return sa.Column(name, sa.UUID(), sa.ForeignKey(target, ondelete=ondelete),
                     nullable=nullable, primary_key=primary_key, index=index)


def timestamp(name="created_at", timezone_enabled=True, default=True, nullable=False):
    return sa.Column(name, sa.DateTime(timezone=timezone_enabled), nullable=nullable,
                     server_default=sa.text("now()") if default else None)


def flag(name, default=None):
    return sa.Column(name, sa.Boolean(), nullable=False,
                     server_default=sa.text(default) if default else None)


def schema_metadata():
    """Frozen schema: no imports of changing application model definitions."""
    metadata = sa.MetaData(schema="public")
    diagnosis = sa.Enum(*CATEGORIES, name="diagnosis_category")
    task_category = sa.Enum(*CATEGORIES, name="client_diagnosis_category")
    assessment_type = sa.Enum(*ASSESSMENT_TYPES, name="assessment_type")
    completion = sa.Enum("completed", "not_completed", "partially_completed", "refused",
                         name="completion_status")
    sa.Table("organizations", metadata, identifier(),
             sa.Column("name", sa.String(200), nullable=False), timestamp(), timestamp("updated_at"))
    sa.Table("users", metadata, identifier(),
             reference("org_id", "public.organizations.id", nullable=True, index=True),
             sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
             sa.Column("password_hash", sa.String(255), nullable=False),
             sa.Column("full_name", sa.String(255), nullable=False),
             sa.Column("phone", sa.String(20)),
             sa.Column("role", sa.String(20), nullable=False, index=True), flag("is_active"),
             timestamp(timezone_enabled=False), timestamp("updated_at", timezone_enabled=False))
    sa.Table("caregivers", metadata,
             reference("user_id", "public.users.id", "CASCADE", primary_key=True),
             sa.Column("status", sa.Enum("off_shift", "available", "en_route", "in_service",
                                        "emergency", name="caregiver_status"), nullable=False),
             sa.Column("last_confirmed_location", Geography("POINT", srid=4326)),
             timestamp("last_confirmed_at", default=False, nullable=True),
             reference("registered_by", "public.users.id", "SET NULL", nullable=True))
    sa.Table("caregiver_certifications", metadata,
             reference("caregiver_id", "public.caregivers.user_id", "CASCADE", primary_key=True),
             sa.Column("diagnosis_category", diagnosis, primary_key=True, nullable=False),
             sa.Column("certified_at", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")))
    sa.Table("family_members", metadata,
             reference("user_id", "public.users.id", "CASCADE", primary_key=True),
             sa.Column("relationship_to_client", sa.String(50)))
    sa.Table("clients", metadata, identifier(),
             reference("org_id", "public.organizations.id", index=True),
             sa.Column("full_name", sa.String(150), nullable=False),
             sa.Column("date_of_birth", sa.Date(), nullable=False),
             sa.Column("address_text", sa.String(300), nullable=False),
             sa.Column("location", Geography("POINT", srid=4326), nullable=False),
             sa.Column("diagnosis_category", diagnosis, nullable=False),
             sa.Column("acuity_tier", sa.Enum("green", "amber", "red", name="acuity_tier"), nullable=False),
             reference("registered_by", "public.users.id"), flag("is_active"),
             timestamp(), timestamp("updated_at"))
    sa.Table("client_emergency_contacts", metadata, identifier(),
             reference("client_id", "public.clients.id", "CASCADE"),
             sa.Column("full_name", sa.String(150), nullable=False),
             sa.Column("relationship", sa.String(50), nullable=False),
             sa.Column("phone", sa.String(30), nullable=False), flag("is_primary"))
    sa.Table("client_family_links", metadata,
             reference("client_id", "public.clients.id", "CASCADE", primary_key=True),
             reference("family_member_id", "public.family_members.user_id", "CASCADE", primary_key=True),
             flag("is_primary_contact"), timestamp("linked_at"))
    sa.Table("care_plans", metadata, identifier(),
             reference("client_id", "public.clients.id", "CASCADE"),
             sa.Column("description", sa.Text(), nullable=False),
             reference("created_by", "public.users.id"), flag("is_active"), timestamp())
    sa.Table("caregiver_sessions", metadata, identifier(),
             reference("org_id", "public.organizations.id", index=True),
             reference("client_id", "public.clients.id"),
             reference("caregiver_id", "public.caregivers.user_id"),
             timestamp("scheduled_start", default=False), timestamp("scheduled_end", default=False),
             sa.Column("visit_date", sa.Date(), sa.Computed(
                 "(scheduled_start AT TIME ZONE 'UTC')::date", persisted=True), nullable=False),
             sa.Column("status", sa.Enum("scheduled", "in_progress", "completed", "cancelled",
                                        name="session_status"), nullable=False),
             timestamp("check_in_at", default=False, nullable=True),
             sa.Column("check_in_location", Geography("POINT", srid=4326)),
             sa.Column("check_in_geofence_verified", sa.Boolean()),
             timestamp("check_out_at", default=False, nullable=True),
             sa.Column("check_out_location", Geography("POINT", srid=4326)),
             reference("created_by", "public.users.id", nullable=True), timestamp(),
             sa.UniqueConstraint("id", "client_id", name="uq_caregiver_sessions_id_client"))
    sa.Table("tasks", metadata, identifier(), sa.Column("name", sa.String(150), nullable=False),
             sa.Column("target_category", task_category, nullable=False, index=True),
             sa.Column("description", sa.Text()), timestamp("description_updated_at", default=False, nullable=True),
             flag("is_active", "true"), sa.Column("anticipated_duration_minutes", sa.Integer()),
             sa.Column("priority", sa.Enum("critical", "high", "medium", "low", name="priority_ranking"),
                       nullable=False, server_default="medium"), timestamp(), timestamp("updated_at", nullable=True),
             timestamp("deleted_at", default=False, nullable=True),
             sa.UniqueConstraint("name", "target_category", name="uq_tasks_name_target_category"),
             sa.CheckConstraint("anticipated_duration_minutes IS NULL OR anticipated_duration_minutes > 0",
                                name="duration_positive"))
    sa.Table("task_completions", metadata, identifier(),
             reference("task_id", "public.tasks.id", index=True),
             sa.Column("session_id", sa.UUID(), nullable=False, index=True),
             reference("client_id", "public.clients.id", "CASCADE", index=True),
             sa.Column("completed_status", completion, nullable=False, server_default="not_completed"),
             flag("was_skipped", "false"), timestamp(), timestamp("updated_at", nullable=True),
             timestamp("deleted_at", default=False, nullable=True),
             sa.ForeignKeyConstraint(["session_id", "client_id"],
                                     ["public.caregiver_sessions.id", "public.caregiver_sessions.client_id"],
                                     name="fk_task_completions_session_client", ondelete="CASCADE"),
             sa.UniqueConstraint("session_id", "task_id", name="uq_task_completions_session_task"),
             sa.CheckConstraint("NOT was_skipped OR completed_status <> 'completed'", name="skipped_not_completed"))
    sa.Table("medications", metadata, identifier(),
             reference("client_id", "public.clients.id", "CASCADE"),
             sa.Column("name", sa.String(150), nullable=False),
             sa.Column("drug_class", sa.Enum("antibiotic", "analgesic", "antidepressant", "antipsychotic",
                                            "other", name="medication_class"), nullable=False),
             sa.Column("dosage", sa.String(100), nullable=False), sa.Column("instructions", sa.Text()),
             flag("requires_glucose_check"), sa.Column("window_start_local", sa.Time(), nullable=False),
             sa.Column("window_end_local", sa.Time(), nullable=False), flag("is_active"), timestamp())
    sa.Table("medication_schedules", metadata, identifier(),
             reference("medication_id", "public.medications.id", "CASCADE"),
             sa.Column("scheduled_time", sa.Time(), nullable=False),
             sa.Column("days_of_week", ARRAY(sa.SmallInteger()), nullable=False), timestamp())
    sa.Table("medication_administrations", metadata, identifier(),
             reference("session_id", "public.caregiver_sessions.id", "CASCADE"),
             reference("medication_id", "public.medications.id"),
             reference("schedule_id", "public.medication_schedules.id", "SET NULL", nullable=True),
             sa.Column("status", sa.Enum("pending", "administered", "refused", "missed", "cancelled",
                                        name="medication_admin_status"), nullable=False),
             sa.Column("glucose_check_value", sa.Numeric(5, 1)),
             timestamp("administered_at", default=False, nullable=True), sa.Column("missed_reason", sa.Text()),
             reference("recorded_by", "public.caregivers.user_id"), timestamp())
    sa.Table("assessments", metadata, identifier(),
             reference("session_id", "public.caregiver_sessions.id", "CASCADE"),
             reference("client_id", "public.clients.id", "CASCADE"),
             sa.Column("assessment_type", assessment_type, nullable=False),
             sa.Column("state", sa.Enum("pending", "completed", "refused", "skipped", name="assessment_state"),
                       nullable=False), sa.Column("refused_reason", sa.Text()),
             reference("administered_by", "public.caregivers.user_id"),
             timestamp("administered_at", default=False, nullable=True), timestamp())
    sa.Table("tug_assessments", metadata,
             reference("assessment_id", "public.assessments.id", "CASCADE", primary_key=True),
             sa.Column("completion_time_sec", sa.Numeric(5, 2)), flag("hesitation_flag"), flag("freezing_flag"))
    sa.Table("cmai_assessments", metadata,
             reference("assessment_id", "public.assessments.id", "CASCADE", primary_key=True),
             *(sa.Column(name, sa.SmallInteger()) for name in (
                 "total_score", "physical_nonaggressive", "physical_aggressive", "verbal_agitation")))
    sa.Table("braden_assessments", metadata,
             reference("assessment_id", "public.assessments.id", "CASCADE", primary_key=True),
             sa.Column("total_score", sa.SmallInteger()), sa.Column("skin_inspection_notes", sa.Text()))
    sa.Table("delirium_screenings", metadata,
             reference("assessment_id", "public.assessments.id", "CASCADE", primary_key=True),
             sa.Column("cam_positive", sa.Boolean()), sa.Column("risk_score", sa.Numeric(5, 2)), flag("threshold_breached"))
    iadl = sa.Table("iadl_assessments", metadata, identifier(),
                    reference("patient_id", "public.clients.id", "CASCADE"), timestamp(), timestamp("updated_at"),
                    *(sa.Column(name, sa.SmallInteger(), nullable=False) for name in BINARY_FIELDS),
                    *(flag(name, "false") for name in IADL_FLAGS),
                    sa.Column("memory_status", sa.Enum("GOOD", "FAIR", "POOR", "UNKNOWN", name="iadl_memory_status"),
                              nullable=False, server_default="UNKNOWN"),
                    sa.Column("age_category", sa.Enum("UNDER_65", "65_74", "75_84", "85_PLUS", "UNKNOWN",
                                                     name="iadl_age_category"), nullable=False, server_default="UNKNOWN"))
    for name in BINARY_FIELDS:
        constraint_name = {"meal_preparation": "meal_prep", "medication_management": "medication"}.get(name, name)
        iadl.append_constraint(sa.CheckConstraint(f"{name} IN (0, 1)", name=f"iadl_{constraint_name}_binary"))
    sa.Index("ix_iadl_assessments_patient_created_at", iadl.c.patient_id, iadl.c.created_at.desc())
    sa.Table("observations", metadata, identifier(),
             reference("session_id", "public.caregiver_sessions.id", "CASCADE"),
             reference("client_id", "public.clients.id", "CASCADE"),
             reference("recorded_by", "public.caregivers.user_id"), sa.Column("note", sa.Text(), nullable=False),
             flag("is_flagged"), sa.Column("flag_reason", sa.String(100)),
             reference("triggered_assessment_id", "public.assessments.id", "SET NULL", nullable=True), timestamp())
    sa.Table("service_requests", metadata, identifier(),
             reference("client_id", "public.clients.id", "CASCADE"),
             reference("requested_by", "public.family_members.user_id"), sa.Column("description", sa.Text(), nullable=False),
             sa.Column("status", sa.String(30), nullable=False),
             reference("resulting_session_id", "public.caregiver_sessions.id", "SET NULL", nullable=True), timestamp())
    sa.Table("emergency_events", metadata, identifier(),
             reference("client_id", "public.clients.id", "CASCADE"),
             reference("caregiver_id", "public.caregivers.user_id", "CASCADE", nullable=True),
             sa.Column("event_type", sa.String(50), nullable=False), sa.Column("severity", sa.String(20), nullable=False),
             sa.Column("location", Geometry("POINT", srid=4326)), sa.Column("details", JSONB()),
             sa.Column("status", sa.String(20), nullable=False), timestamp("resolved_at", False, False, True),
             timestamp(timezone_enabled=False), timestamp("updated_at", timezone_enabled=False))
    sa.Table("emergency_outbox", metadata, identifier(),
             reference("event_id", "public.emergency_events.id", "CASCADE"),
             sa.Column("payload", JSONB(), nullable=False), sa.Column("status", sa.String(20), nullable=False),
             sa.Column("retry_count", sa.Integer(), nullable=False), sa.Column("twilio_message_sid", sa.String(255)),
             timestamp("next_retry_at", False, False, True), timestamp("processed_at", False, False, True),
             sa.Column("error_message", sa.Text()), timestamp(timezone_enabled=False))
    return metadata


def seed_id(label):
    return uuid5(NAMESPACE, label)


def pick(pool, index, offset=0):
    return pool[(index * 7 + offset) % len(pool)]


def person(index, offset):
    return f"{pick(FIRST_NAMES, index, offset)} {pick(LAST_NAMES, index, offset + 3)}"


def seed_rows():
    rows = {name: [] for name in (
        "organizations", "users", "caregivers", "caregiver_certifications", "family_members",
        "clients", "client_emergency_contacts", "client_family_links", "care_plans",
        "caregiver_sessions", "tasks", "medications", "medication_schedules",
        "medication_administrations", "assessments", "tug_assessments", "cmai_assessments",
        "braden_assessments", "delirium_screenings", "iadl_assessments", "observations",
        "service_requests", "task_completions",
    )}
    for index in range(BASE_COUNT):
        organization_id, admin_id, caregiver_id, family_id, client_id, session_id, task_id, medication_id, schedule_id = (
            seed_id(f"{kind}-{index}") for kind in (
                "organization", "admin", "caregiver", "family", "client", "session", "task", "medication", "schedule"))
        category = CATEGORIES[index % 4]
        start, end = STAMP + timedelta(days=index), STAMP + timedelta(days=index, hours=1)
        completed = index % 2 == 0
        birth_date = date(1935 + index % 30, 1 + index % 12, 15)
        rows["organizations"].append(dict(id=organization_id,
            name=f"{pick(STREETS, index, 5)} Home Care Services (Demo)", created_at=STAMP, updated_at=STAMP))
        for role, offset in (("admin", 10), ("caregiver", 20), ("family", 30)):
            full_name = person(index, offset)
            first, last = full_name.split(" ", 1)
            rows["users"].append(dict(id=seed_id(f"{role}-{index}"), org_id=organization_id,
                email=f"{first.lower()}.{last.lower()}{index}@example.invalid", password_hash="!",
                full_name=full_name, role=role, is_active=False,
                created_at=STAMP.replace(tzinfo=None), updated_at=STAMP.replace(tzinfo=None)))
        rows["caregivers"].append(dict(user_id=caregiver_id, status="off_shift", registered_by=admin_id))
        rows["caregiver_certifications"].append(dict(caregiver_id=caregiver_id, diagnosis_category=category,
                                                     certified_at=STAMP.date()))
        rows["family_members"].append(dict(user_id=family_id, relationship_to_client="relative"))
        address = (f"{100 + index} {pick(STREETS, index, 1)} "
                   f"{pick(('Lane', 'Avenue', 'Court', 'Drive', 'Road', 'Way'), index, 2)}, "
                   f"{pick(('Demo City', 'Fictional Falls', 'Sample Springs', 'Testville', 'Placeholder Point', 'Exampleton'), index, 4)}")
        rows["clients"].append(dict(id=client_id, org_id=organization_id, full_name=person(index, 40),
            date_of_birth=birth_date, address_text=address, location="SRID=4326;POINT(0 0)",
            diagnosis_category=category, acuity_tier=("green", "amber", "red")[index % 3],
            registered_by=admin_id, is_active=False, created_at=STAMP, updated_at=STAMP))
        rows["client_emergency_contacts"].append(dict(id=seed_id(f"contact-{index}"), client_id=client_id,
            full_name=person(index, 50), relationship="relative", phone=f"+1-202-555-{100 + index % 100:04d}", is_primary=True))
        rows["client_family_links"].append(dict(client_id=client_id, family_member_id=family_id,
                                               is_primary_contact=True, linked_at=STAMP))
        rows["care_plans"].append(dict(id=seed_id(f"care-plan-{index}"), client_id=client_id,
            description=f"Synthetic care plan for demo client {person(index, 40)}; not a clinical recommendation.",
            created_by=admin_id, is_active=False, created_at=STAMP))
        rows["caregiver_sessions"].append(dict(id=session_id, org_id=organization_id, client_id=client_id,
            caregiver_id=caregiver_id, scheduled_start=start, scheduled_end=end,
            status="completed" if completed else "scheduled", check_in_at=start if completed else None,
            check_out_at=end if completed else None, created_by=None, created_at=STAMP))
        rows["tasks"].append(dict(id=task_id, name=f"{pick(TASKS, index, 6)} (Demo {index + 1})",
            target_category=category, description="Synthetic task; demonstration only.", is_active=False,
            anticipated_duration_minutes=10 + index % 6 * 5,
            priority=("low", "medium", "high", "critical")[index % 4], created_at=STAMP, updated_at=STAMP))
        rows["medications"].append(dict(id=medication_id, client_id=client_id, name=pick(MEDICATIONS, index, 7),
            drug_class="other", dosage="DEMO ONLY - not for administration",
            instructions="Synthetic placeholder; never administer.", requires_glucose_check=False,
            window_start_local=time(8), window_end_local=time(9), is_active=False, created_at=STAMP))
        rows["medication_schedules"].append(dict(id=schedule_id, medication_id=medication_id,
            scheduled_time=time(8, 30), days_of_week=[1, 2, 3, 4, 5, 6, 7], created_at=STAMP))
        rows["medication_administrations"].append(dict(id=seed_id(f"administration-{index}"), session_id=session_id,
            medication_id=medication_id, schedule_id=schedule_id, status="administered" if completed else "pending",
            recorded_by=caregiver_id, administered_at=start + timedelta(minutes=30) if completed else None, created_at=start))
        for kind in ASSESSMENT_TYPES:
            assessment_id = seed_id(f"assessment-{kind}-{index}")
            rows["assessments"].append(dict(id=assessment_id, session_id=session_id, client_id=client_id,
                assessment_type=kind, state="completed" if completed else "pending", administered_by=caregiver_id,
                administered_at=start + timedelta(minutes=10) if completed else None, created_at=start))
            if kind == "tug":
                rows["tug_assessments"].append(dict(assessment_id=assessment_id,
                    completion_time_sec=Decimal("10.00") + index % 20 if completed else None,
                    hesitation_flag=completed and index % 3 == 0, freezing_flag=completed and index % 5 == 0))
            elif kind == "cmai":
                rows["cmai_assessments"].append(dict(assessment_id=assessment_id,
                    total_score=29 + index % 175 if completed else None))
            elif kind == "braden":
                rows["braden_assessments"].append(dict(assessment_id=assessment_id,
                    total_score=6 + index % 18 if completed else None))
            else:
                rows["delirium_screenings"].append(dict(assessment_id=assessment_id,
                    cam_positive=index % 4 == 0 if completed else None,
                    risk_score=Decimal(index % 100) / 100 if completed else None,
                    threshold_breached=completed and index % 4 == 0))
        age = start.year - birth_date.year - ((start.month, start.day) < (birth_date.month, birth_date.day))
        iadl = dict(id=seed_id(f"iadl-{index}"), patient_id=client_id, created_at=start, updated_at=end,
            memory_status=("GOOD", "FAIR", "POOR", "UNKNOWN")[index % 4],
            age_category="UNDER_65" if age < 65 else "65_74" if age < 75 else "75_84" if age < 85 else "85_PLUS")
        iadl.update({name: (index >> position) & 1 for position, name in enumerate(BINARY_FIELDS)})
        iadl.update({name: (index + position) % 5 == 0 for position, name in enumerate(IADL_FLAGS)})
        iadl.update(diagnosis_stroke=category == "post_stroke", diagnosis_dementia_alzheimers=category == "dementia")
        rows["iadl_assessments"].append(iadl)
        rows["observations"].append(dict(id=seed_id(f"observation-{index}"), session_id=session_id,
            client_id=client_id, recorded_by=caregiver_id,
            note=f"Synthetic observation for demo client {person(index, 40)}; not a clinical record.", is_flagged=False,
            triggered_assessment_id=seed_id(f"assessment-tug-{index}"), created_at=end))
        rows["service_requests"].append(dict(id=seed_id(f"request-{index}"), client_id=client_id,
            requested_by=family_id, description=f"Fictional request for a care visit for {person(index, 40)}.",
            status="pending", created_at=STAMP))
        rows["task_completions"].append(dict(id=seed_id(f"task-completion-{index}"), task_id=task_id,
            session_id=session_id, client_id=client_id, completed_status="completed" if completed else "not_completed",
            was_skipped=False, created_at=end, updated_at=end))
    return rows


def require_demo_flag(name):
    if context.is_offline_mode():
        raise RuntimeError("This disposable demo revision requires an online connection")
    if context.get_x_argument(as_dictionary=True).get(name) != "true":
        raise RuntimeError(f"Explicit opt-in required: alembic -x {name}=true")


def upgrade():
    require_demo_flag("seed_demo")
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        raise RuntimeError("PostgreSQL with PostGIS is required")
    metadata = schema_metadata()
    existing = set(sa.inspect(connection).get_table_names(schema="public"))
    collisions = existing & {table.name for table in metadata.tables.values()}
    if collisions:
        raise RuntimeError("Reset the disposable database first; existing application tables: "
                           + ", ".join(sorted(collisions)))
    op.execute('CREATE EXTENSION IF NOT EXISTS postgis')
    metadata.create_all(connection, checkfirst=False)
    for name, records in seed_rows().items():
        connection.execute(metadata.tables[f"public.{name}"].insert(), records)


def downgrade():
    require_demo_flag("reset_demo")
    connection = op.get_bind()
    metadata = schema_metadata()
    preparer = connection.dialect.identifier_preparer
    names = sorted(metadata.tables)
    connection.exec_driver_sql("LOCK TABLE " + ", ".join(
        f"public.{preparer.quote(metadata.tables[name].name)}" for name in names
    ) + " IN SHARE ROW EXCLUSIVE MODE")
    rows = seed_rows()
    for table in metadata.tables.values():
        records = rows.get(table.name, [])
        query = sa.select(sa.literal(1)).select_from(table)
        if records:
            columns = list(table.primary_key.columns)
            keys = [tuple(record[column.name] for column in columns) for record in records]
            query = query.where(sa.not_(sa.tuple_(*columns).in_(keys)))
        if connection.execute(query.limit(1)).first() is not None:
            raise RuntimeError(f"Non-demo rows exist in {table.fullname}; downgrade refused")
    metadata.drop_all(connection, checkfirst=False)