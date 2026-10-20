"""Opt-in fictional demo data: at least 100 rows per included SQLAlchemy table.

Copy into alembic/versions and set down_revision to the schema revision.
Run with: alembic -x seed_demo=true upgrade head

Requires a migrated schema with valid foreign keys, including administrator
profiles referenced by care plans. Does not repair model imports or mappings.

All identity and contact fields below are deterministically generated from
seed_id()/pick_from() and are not real people, organizations, or addresses.
Guardrails preserved from the original seed, and must not be relaxed:
  - every demo user/caregiver/client/medication/care-plan row is created
    with is_active = False (or the equivalent inactive status literal)
  - every demo email uses the IANA-reserved "example.invalid" domain
  - every demo phone number uses the NANP-reserved 555-01XX block
  - medication dosage/instructions text is always stamped
    "DEMO ONLY - not for administration"
  - every enum-valued column (role, status, state, drug_class, priority,
    acuity_tier, assessment_type, ...) uses only literals confirmed to
    exist on the real schema; do not introduce new enum values here
"""

from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid5

import sqlalchemy as sa
from alembic import context, op


revision = "demo_seed_0001"
down_revision = "REPLACE_WITH_SCHEMA_REVISION"
branch_labels = None
depends_on = None

NAMESPACE = UUID("b58a1ee2-d8b6-4823-97c6-4e754d4f6789")
STAMP = datetime(2026, 10, 5, 8, tzinfo=timezone.utc)
STAMP_NAIVE = STAMP.replace(tzinfo=None)

BASE_COUNT = 100  # rows generated per primary entity; see module docstring

# ---------------------------------------------------------------------------
# Deterministic "humanized" identity pools.
#
# These are plain, common given/family names with no connection to real
# individuals, chosen for breadth rather than any single background. Picks
# are index-derived (not random) so the seed stays reproducible between
# upgrade/downgrade runs on the same revision.
# ---------------------------------------------------------------------------
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

STREET_NAMES = (
    "Ridgeview", "Maple Grove", "Cedar Hollow", "Willow Creek", "Harbor",
    "Fernwood", "Birchwood", "Sunrise", "Lantern Hill", "Meadowbrook",
    "Orchard", "Stonebridge", "Clearwater", "Brookside", "Highland",
    "Pinecrest", "Riverbend", "Cobblestone", "Hillcrest", "Rosewood",
)
STREET_SUFFIXES = ("Lane", "Avenue", "Court", "Drive", "Road", "Way")
DEMO_CITIES = (
    "Demo City", "Fictional Falls", "Sample Springs", "Testville",
    "Placeholder Point", "Exampleton",
)

MEDICATION_LABELS = (
    "Demo Multivitamin Tablet", "Demo Blood Pressure Tablet",
    "Demo Cholesterol Tablet", "Demo Glucose Control Tablet",
    "Demo Thyroid Tablet", "Demo Pain Relief Tablet",
    "Demo Bone Health Tablet", "Demo Heart Rhythm Tablet",
    "Demo Mood Support Tablet", "Demo Sleep Support Tablet",
)

TASK_LABELS = (
    "Morning Mobility Check", "Hydration Reminder", "Meal Assistance",
    "Medication Reminder", "Light Housekeeping", "Companionship Visit",
    "Vital Signs Check", "Safety Walkthrough", "Bathing Assistance",
    "Evening Wind-down Routine",
)


def pick_from(pool: tuple, index: int, offset: int = 0) -> str:
    """Deterministic, reproducible selection — no randomness, same output
    for the same (pool, index, offset) every run so upgrade/downgrade stay
    symmetric."""
    return pool[(index * 7 + offset) % len(pool)]


def human_name(category_offset: int, index: int) -> str:
    first = pick_from(FIRST_NAMES, index, category_offset)
    last = pick_from(LAST_NAMES, index, category_offset + 3)
    return f"{first} {last}"


def human_address(index: int) -> str:
    number = 100 + index
    street = pick_from(STREET_NAMES, index, 1)
    suffix = pick_from(STREET_SUFFIXES, index, 2)
    city = pick_from(DEMO_CITIES, index, 4)
    return f"{number} {street} {suffix}, {city}"


def demo_phone(index: int) -> str:
    # NANP reserves 555-0100 through 555-0199 for fictional use; never a
    # real, dialable number.
    return f"+1-202-555-{100 + (index % 100):04d}"


def demo_email(first: str, last: str, index: int) -> str:
    # "example.invalid" is an IANA-reserved TLD/domain that will never
    # resolve, so this can never collide with or notify a real mailbox.
    return f"{first.lower()}.{last.lower()}{index}@example.invalid"


def seed_id(label):
    return uuid5(NAMESPACE, label)


def age_category_at(birth_date: date, assessed_on: date) -> str:
    age = assessed_on.year - birth_date.year - (
        (assessed_on.month, assessed_on.day) < (birth_date.month, birth_date.day)
    )
    if age < 0:
        raise ValueError("Assessment date cannot precede date of birth")
    if age < 65:
        return "UNDER_65"
    if age < 75:
        return "65_74"
    if age < 85:
        return "75_84"
    return "85_PLUS"


def seed_rows():
    """Build at least 100 fictional, human-readable rows per current
    in-scope SQLAlchemy table."""
    table_names = (
        "organizations", "users", "caregivers", "caregiver_certifications",
        "family_members", "clients", "client_emergency_contacts", "client_family_links",
        "care_plans", "caregiver_sessions", "tasks", "medications",
        "medication_schedules", "medication_administrations", "assessments",
        "tug_assessments", "cmai_assessments", "braden_assessments",
        "delirium_screenings", "iadl_assessments", "observations", "service_requests",
        "task_completions",
    )
    rows = {name: [] for name in table_names}
    categories = ("dementia", "post_stroke", "parkinsons", "other")
    assessment_types = ("tug", "cmai", "braden", "delirium")
    binary_fields = (
        "bathing", "transferring", "mobility", "meal_preparation", "laundry",
        "medication_management", "telephone_use", "community_mobility",
    )
    flag_fields = (
        "fell_last_12_months", "fell_last_month", "multiple_falls", "fear_of_falling",
        "uses_vision_aids", "uses_hearing_aids", "pain_last_month", "pain_limits_activities",
        "increased_sleep_latency", "difficulty_returning_to_sleep", "uses_sleep_meds",
        "has_diabetes",
    )
    for index in range(BASE_COUNT):
        organization_id = seed_id(f"organization-{index}")
        admin_id = seed_id(f"admin-{index}")
        caregiver_id = seed_id(f"caregiver-{index}")
        family_id = seed_id(f"family-{index}")
        client_id = seed_id(f"client-{index}")
        session_id = seed_id(f"session-{index}")
        task_id = seed_id(f"task-{index}")
        medication_id = seed_id(f"medication-{index}")
        schedule_id = seed_id(f"schedule-{index}")
        category = categories[index % len(categories)]
        start = STAMP + timedelta(days=index)
        end = start + timedelta(hours=1)
        completed = index % 2 == 0
        birth_date = date(1935 + index % 30, 1 + index % 12, 15)

        admin_name = human_name(10, index)
        caregiver_name = human_name(20, index)
        family_name = human_name(30, index)
        client_name = human_name(40, index)
        contact_name = human_name(50, index)

        rows["organizations"].append({
            "id": organization_id,
            "name": f"{pick_from(STREET_NAMES, index, 5)} Home Care Services (Demo)",
            "created_at": STAMP, "updated_at": STAMP,
        })
        for role, display_name, uid in (
            ("admin", admin_name, seed_id(f"admin-{index}")),
            ("caregiver", caregiver_name, caregiver_id),
            ("family", family_name, family_id),
        ):
            first, last = display_name.split(" ", 1)
            rows["users"].append({
                "id": uid,
                "org_id": organization_id,
                "email": demo_email(first, last, index),
                "password_hash": "!",
                "full_name": display_name,
                "role": role,
                "is_active": False,
                "created_at": STAMP_NAIVE,
                "updated_at": STAMP_NAIVE,
            })
        rows["caregivers"].append({
            "user_id": caregiver_id, "status": "off_shift", "registered_by": admin_id,
        })
        rows["caregiver_certifications"].append({
            "caregiver_id": caregiver_id, "diagnosis_category": category,
            "certified_at": STAMP.date(),
        })
        rows["family_members"].append({
            "user_id": family_id, "relationship_to_client": "relative",
        })
        rows["clients"].append({
            "id": client_id, "org_id": organization_id,
            "full_name": client_name,
            "date_of_birth": birth_date,
            "address_text": human_address(index),
            "location": "SRID=4326;POINT(0 0)", "diagnosis_category": category,
            "acuity_tier": ("green", "amber", "red")[index % 3],
            "registered_by": admin_id, "is_active": False,
            "created_at": STAMP, "updated_at": STAMP,
        })
        rows["client_emergency_contacts"].append({
            "id": seed_id(f"contact-{index}"), "client_id": client_id,
            "full_name": contact_name, "relationship": "relative",
            "phone": demo_phone(index), "is_primary": True,
        })
        rows["client_family_links"].append({
            "client_id": client_id, "family_member_id": family_id,
            "is_primary_contact": True, "linked_at": STAMP,
        })
        rows["care_plans"].append({
            "id": seed_id(f"care-plan-{index}"), "client_id": client_id,
            "description": (
                f"Synthetic care plan for demo client {client_name}; "
                "not a clinical recommendation."
            ),
            "created_by": admin_id, "is_active": False, "created_at": STAMP,
        })
        rows["caregiver_sessions"].append({
            "id": session_id, "org_id": organization_id, "client_id": client_id,
            "caregiver_id": caregiver_id, "scheduled_start": start, "scheduled_end": end,
            "status": "completed" if completed else "scheduled",
            "check_in_at": start if completed else None,
            "check_out_at": end if completed else None,
            "created_by": None, "created_at": STAMP,
        })
        rows["tasks"].append({
            "id": task_id, "name": f"{pick_from(TASK_LABELS, index, 6)} (Demo {index + 1})",
            "target_category": category,
            "description": "Synthetic task; demonstration only.",
            "is_active": False, "anticipated_duration_minutes": 10 + index % 6 * 5,
            "priority": ("low", "medium", "high", "critical")[index % 4],
            "created_at": STAMP, "updated_at": STAMP,
        })
        rows["medications"].append({
            "id": medication_id, "client_id": client_id,
            "name": pick_from(MEDICATION_LABELS, index, 7),
            "drug_class": "other",
            "dosage": "DEMO ONLY - not for administration",
            "instructions": "Synthetic placeholder; never administer.",
            "requires_glucose_check": False, "window_start_local": time(8),
            "window_end_local": time(9), "is_active": False, "created_at": STAMP,
        })
        rows["medication_schedules"].append({
            "id": schedule_id, "medication_id": medication_id,
            "scheduled_time": time(8, 30), "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "created_at": STAMP,
        })
        rows["medication_administrations"].append({
            "id": seed_id(f"administration-{index}"), "session_id": session_id,
            "medication_id": medication_id, "schedule_id": schedule_id,
            "status": "administered" if completed else "pending",
            "recorded_by": caregiver_id,
            "administered_at": start + timedelta(minutes=30) if completed else None,
            "created_at": start,
        })
        for assessment_type in assessment_types:
            assessment_id = seed_id(f"assessment-{assessment_type}-{index}")
            state = "completed" if completed else "pending"
            rows["assessments"].append({
                "id": assessment_id, "session_id": session_id, "client_id": client_id,
                "assessment_type": assessment_type, "state": state,
                "administered_by": caregiver_id,
                "administered_at": start + timedelta(minutes=10) if completed else None,
                "created_at": start,
            })
            detail: dict[str, Any] = {"assessment_id": assessment_id}
            if assessment_type == "tug":
                detail.update(completion_time_sec=Decimal("10.00") + index % 20 if completed else None,
                              hesitation_flag=completed and index % 3 == 0,
                              freezing_flag=completed and index % 5 == 0)
                table_name = "tug_assessments"
            elif assessment_type == "cmai":
                detail.update(total_score=29 + index % 175 if completed else None)
                table_name = "cmai_assessments"
            elif assessment_type == "braden":
                detail.update(total_score=6 + index % 18 if completed else None)
                table_name = "braden_assessments"
            else:
                detail.update(cam_positive=index % 4 == 0 if completed else None,
                              risk_score=Decimal(index % 100) / 100 if completed else None,
                              threshold_breached=completed and index % 4 == 0)
                table_name = "delirium_screenings"
            rows[table_name].append(detail)

        iadl_record = {
            "id": seed_id(f"iadl-{index}"), "patient_id": client_id,
            "created_at": start, "updated_at": end,
            "memory_status": ("GOOD", "FAIR", "POOR", "UNKNOWN")[index % 4],
            "age_category": age_category_at(birth_date, start.date()),
            "diagnosis_stroke": category == "post_stroke",
            "diagnosis_dementia_alzheimers": category == "dementia",
        }
        iadl_record.update({field: (index >> position) & 1
                            for position, field in enumerate(binary_fields)})
        iadl_record.update({field: (index + position) % 5 == 0
                            for position, field in enumerate(flag_fields)})
        rows["iadl_assessments"].append(iadl_record)
        rows["observations"].append({
            "id": seed_id(f"observation-{index}"), "session_id": session_id,
            "client_id": client_id, "recorded_by": caregiver_id,
            "note": (
                f"Synthetic observation for demo client {client_name}; "
                "not a clinical record."
            ),
            "is_flagged": False,
            "triggered_assessment_id": seed_id(f"assessment-tug-{index}"),
            "created_at": end,
        })
        rows["service_requests"].append({
            "id": seed_id(f"request-{index}"), "client_id": client_id,
            "requested_by": family_id,
            "description": f"Fictional request for a care visit for {client_name}.",
            "status": "pending", "created_at": STAMP,
        })
        rows["task_completions"].append({
            "id": seed_id(f"task-completion-{index}"), "task_id": task_id,
            "session_id": session_id, "client_id": client_id,
            "completed_status": "completed" if completed else "not_completed",
            "was_skipped": False, "created_at": end, "updated_at": end,
        })
    return rows


def seed_tables(connection, rows):
    """Validate the complete seed shape before making any database writes."""
    if connection.dialect.name != "postgresql":
        raise RuntimeError("The demo seed requires PostgreSQL with PostGIS.")
    inspector = sa.inspect(connection)
    existing = set(inspector.get_table_names())
    missing = set(rows) - existing
    if missing:
        raise RuntimeError(
            "Migrate the current model schema before seeding. Missing tables: "
            + ", ".join(sorted(missing))
        )
    for name in rows:
        for foreign_key in inspector.get_foreign_keys(name):
            parent_name = foreign_key["referred_table"]
            parent_schema = foreign_key.get("referred_schema")
            if not inspector.has_table(parent_name, schema=parent_schema):
                raise RuntimeError(
                    f"Unresolved foreign-key target for {name}: {parent_name}. "
                    "Repair and migrate the model schema before seeding."
                )
    metadata = sa.MetaData()
    tables = {}
    for name, records in rows.items():
        table = sa.Table(name, metadata, autoload_with=connection, resolve_fks=False)
        supplied = set().union(*(set(record) for record in records))
        unknown = supplied - set(table.c.keys())
        required = {
            column.name for column in table.columns
            if not column.nullable and column.server_default is None
            and column.computed is None
        }
        if unknown or any(required - set(record) for record in records):
            raise RuntimeError(
                f"Seed/schema mismatch in {name}; apply the current schema migration first."
            )
        for record in records:
            for key, value in record.items():
                column_type = table.c[key].type
                if isinstance(column_type, sa.Enum) and value not in column_type.enums:
                    raise RuntimeError(f"Unsupported enum value {name}.{key}: {value!r}")
                if isinstance(column_type, sa.DateTime) and isinstance(value, datetime):
                    if bool(column_type.timezone) != (value.utcoffset() is not None):
                        raise RuntimeError(f"Timestamp timezone mismatch in {name}.{key}")
        tables[name] = table
    return tables


def validate_external_references(connection, rows, tables):
    inspector = sa.inspect(connection)
    metadata = sa.MetaData()
    for name, records in rows.items():
        for foreign_key in inspector.get_foreign_keys(name):
            parent_name = foreign_key["referred_table"]
            parent_schema = foreign_key.get("referred_schema")
            if parent_name in rows and parent_schema in (None, "public"):
                continue
            child_columns = foreign_key["constrained_columns"]
            parent_columns = foreign_key["referred_columns"]
            needed = {
                tuple(record.get(column) for column in child_columns)
                for record in records
                if all(record.get(column) is not None for column in child_columns)
            }
            if not needed:
                continue
            parent = sa.Table(parent_name, metadata, schema=parent_schema,
                              autoload_with=connection, resolve_fks=False)
            columns = [parent.c[column] for column in parent_columns]
            found = {
                tuple(record) for record in connection.execute(
                    sa.select(*columns).where(sa.tuple_(*columns).in_(list(needed)))
                )
            }
            missing = needed - found
            if missing:
                raise RuntimeError(
                    f"Missing {len(missing)} external reference(s) for {name} -> "
                    f"{parent_name}: {sorted(map(str, missing))[:3]}. "
                    "Create the required profiles before applying the seed migration."
                )


def seed_identity(table, records):
    columns = list(table.primary_key.columns)
    if not columns:
        raise RuntimeError(f"Cannot safely delete from {table.fullname}: no primary key")
    if len(columns) == 1:
        column = columns[0]
        return column.in_([record[column.name] for record in records])
    return sa.tuple_(*columns).in_([
        tuple(record[column.name] for column in columns) for record in records
    ])


def guard_rollback(connection, rows, tables):
    inspector = sa.inspect(connection)
    metadata = sa.MetaData()
    inbound = []
    for schema in inspector.get_schema_names():
        if schema == "information_schema" or schema.startswith("pg_"):
            continue
        for name in inspector.get_table_names(schema=schema):
            for foreign_key in inspector.get_foreign_keys(name, schema=schema):
                parent_name = foreign_key["referred_table"]
                parent_schema = foreign_key.get("referred_schema") or schema
                if parent_schema != "public" or parent_name not in rows:
                    continue
                child = sa.Table(name, metadata, schema=schema,
                                 autoload_with=connection, resolve_fks=False)
                inbound.append((child, foreign_key, parent_name))

    lock_targets = {f"public.{name}" for name in tables}
    lock_targets.update(child.fullname for child, _, _ in inbound)
    preparer = connection.dialect.identifier_preparer
    quoted_targets = []
    for target in sorted(lock_targets):
        schema, name = target.split(".", 1)
        quoted_targets.append(f"{preparer.quote_schema(schema)}.{preparer.quote(name)}")
    connection.exec_driver_sql(
        "LOCK TABLE " + ", ".join(quoted_targets) + " IN SHARE ROW EXCLUSIVE MODE"
    )

    for child, foreign_key, parent_name in inbound:
        child_columns = [child.c[column] for column in foreign_key["constrained_columns"]]
        parent_columns = foreign_key["referred_columns"]
        parent_values = [tuple(record[column] for column in parent_columns)
                         for record in rows[parent_name]]
        referenced = sa.tuple_(*child_columns).in_(parent_values)
        if child.schema == "public" and child.name in rows:
            referenced = sa.and_(referenced, sa.not_(seed_identity(child, rows[child.name])))
        if connection.execute(sa.select(sa.literal(1)).select_from(child)
                              .where(referenced).limit(1)).first() is not None:
            raise RuntimeError(
                f"Rollback refused: non-seed rows in {child.fullname} reference "
                f"demo rows in {parent_name}. No seed rows have been deleted."
            )


def upgrade():
    if context.get_x_argument(as_dictionary=True).get("seed_demo") != "true":
        raise RuntimeError("Demo data is opt-in: use alembic -x seed_demo=true upgrade head.")
    if context.is_offline_mode():
        raise RuntimeError("Demo seeding requires an online connection for schema validation.")
    connection = op.get_bind()
    rows = seed_rows()
    tables = seed_tables(connection, rows)
    validate_external_references(connection, rows, tables)
    # Batched insert per table rather than one execute() per row: far fewer
    # round trips for ~100+ rows/table across 22 tables, and still a single
    # transaction managed by the Alembic migration context.
    for name, records in rows.items():
        if records:
            connection.execute(tables[name].insert(), records)


def downgrade():
    if context.is_offline_mode():
        raise RuntimeError("Demo rollback requires an online connection.")
    connection = op.get_bind()
    rows = seed_rows()
    tables = seed_tables(connection, rows)
    guard_rollback(connection, rows, tables)
    for name, records in reversed(list(rows.items())):
        if not records:
            continue
        table = tables[name]
        connection.execute(table.delete().where(seed_identity(table, records)))