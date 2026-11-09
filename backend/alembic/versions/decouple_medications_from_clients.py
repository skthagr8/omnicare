"""Decouple medications from clients.

Revision ID: d3c0u9l3m3d5
Revises: a3d8f2c41b7e
Create Date: 2026-11-08

A medication becomes a catalog entry. A client receives it only through
client_diagnoses -> diagnosis_definitions -> diagnosis_medication_requirements,
so medications.client_id is dropped.

Steps
-----
1. Remember which client each medication belonged to (for the coverage report).
2. Merge duplicate medications: rows identical in every catalog field
   (name, dosage, drug_class, instructions, description, glucose flag, window,
   is_active) collapse into the oldest row. schedules, administrations and
   diagnosis requirements are repointed to the kept row.
3. Merge schedules that became identical (same medication, time and days);
   administrations are repointed to the kept schedule.
4. Coverage report: log every (client, active medication) pair from the old
   ownership that the client's active diagnoses no longer provide. Nothing is
   aborted or auto-assigned: adding a requirement would give the drug to every
   client with that diagnosis, which is a clinical decision.
5. Drop medications.client_id (its index and FK go with it).

Downgrade re-adds a nullable client_id. The original owners are NOT restored.
"""
from __future__ import annotations

import logging

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "d3c0u9l3m3d5"
down_revision = "a3d8f2c41b7e"
branch_labels = None
depends_on = None

log = logging.getLogger("alembic.runtime.migration")


def upgrade() -> None:
    bind = op.get_bind()
    columns = {c["name"] for c in sa.inspect(bind).get_columns("medications")}
    if "client_id" not in columns:
        log.info("medications.client_id already absent; nothing to do.")
        return

    # 1. Old ownership, for the coverage report.
    op.execute("""
        CREATE TEMP TABLE med_owner ON COMMIT DROP AS
        SELECT id AS medication_id, client_id FROM medications WHERE is_active
    """)

    # 2. Merge duplicate medications.
    op.execute("""
        CREATE TEMP TABLE med_merge ON COMMIT DROP AS
        SELECT old_id, keep_id FROM (
            SELECT id AS old_id,
                   first_value(id) OVER (
                       PARTITION BY lower(btrim(name)), lower(btrim(dosage)), drug_class,
                                    coalesce(instructions, ''), coalesce(description, ''),
                                    requires_glucose_check, window_start_local,
                                    window_end_local, is_active
                       ORDER BY created_at, id
                   ) AS keep_id
            FROM medications
        ) ranked
        WHERE old_id <> keep_id
    """)

    # Requirements: drop rows that would duplicate (definition, kept medication)
    # before repointing, preferring the row already pointing at the kept id.
    op.execute("""
        DELETE FROM diagnosis_medication_requirements r
        USING (
            SELECT r2.id,
                   row_number() OVER (
                       PARTITION BY r2.diagnosis_definition_id, coalesce(m.keep_id, r2.medication_id)
                       ORDER BY (m.keep_id IS NOT NULL), r2.id
                   ) AS rn
            FROM diagnosis_medication_requirements r2
            LEFT JOIN med_merge m ON m.old_id = r2.medication_id
        ) d
        WHERE r.id = d.id AND d.rn > 1
    """)
    for table in ("diagnosis_medication_requirements", "medication_schedules", "medication_administrations"):
        op.execute(f"""
            UPDATE {table} t SET medication_id = m.keep_id
            FROM med_merge m WHERE t.medication_id = m.old_id
        """)
    op.execute("UPDATE med_owner o SET medication_id = m.keep_id FROM med_merge m WHERE o.medication_id = m.old_id")

    # 3. Merge schedules that are now identical.
    op.execute("""
        CREATE TEMP TABLE sched_merge ON COMMIT DROP AS
        SELECT old_id, keep_id FROM (
            SELECT id AS old_id,
                   first_value(id) OVER (
                       PARTITION BY medication_id, scheduled_time, days_of_week
                       ORDER BY created_at, id
                   ) AS keep_id
            FROM medication_schedules
        ) ranked
        WHERE old_id <> keep_id
    """)
    op.execute("""
        UPDATE medication_administrations a SET schedule_id = s.keep_id
        FROM sched_merge s WHERE a.schedule_id = s.old_id
    """)
    op.execute("DELETE FROM medication_schedules WHERE id IN (SELECT old_id FROM sched_merge)")
    merged = bind.execute(sa.text("SELECT count(*) FROM med_merge")).scalar_one()
    op.execute("DELETE FROM medications WHERE id IN (SELECT old_id FROM med_merge)")
    log.info("Merged %s duplicate medication row(s).", merged)

    # 4. Coverage report.
    uncovered = bind.execute(sa.text("""
        SELECT DISTINCT o.client_id, med.id, med.name
        FROM med_owner o
        JOIN medications med ON med.id = o.medication_id
        WHERE NOT EXISTS (
            SELECT 1
            FROM diagnosis_medication_requirements r
            JOIN client_diagnoses cd ON cd.diagnosis_definition_id = r.diagnosis_definition_id
            JOIN diagnosis_definitions dd ON dd.id = cd.diagnosis_definition_id
            WHERE r.medication_id = o.medication_id
              AND cd.client_id = o.client_id
              AND cd.is_active AND dd.is_active
        )
        ORDER BY o.client_id, med.name
    """)).all()
    for client_id, medication_id, name in uncovered:
        log.warning(
            "Client %s loses medication %s (%s): no active diagnosis requires it. "
            "Add a diagnosis_medication_requirement if this client should keep it.",
            client_id, name, medication_id,
        )
    if uncovered:
        log.warning("%s client medication(s) are no longer provided by a diagnosis.", len(uncovered))

    # 5. Drop the ownership column (index and FK are dropped with it).
    op.execute("ALTER TABLE medications DROP COLUMN client_id")


def downgrade() -> None:
    columns = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("medications")}
    if "client_id" in columns:
        return
    op.add_column(
        "medications",
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id", ondelete="CASCADE"),
            nullable=True,  # original owners cannot be restored
        ),
    )
    op.create_index("ix_medications_client_id", "medications", ["client_id"])
