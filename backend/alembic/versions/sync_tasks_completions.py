"""Sync task_completions with the TaskCompletion model.

Revision ID: a3d8f2c41b7e
Revises: 7c1e5a90b2d4
Create Date: 2026-11-04

Scope: task_completions ONLY. Idempotent and defensive: every step checks the
live schema first, so it is safe on a table that is already partly migrated.

  * adds the 9 missing columns (provenance FK, overrides, due/completed, reasons, revision)
  * makes updated_at NOT NULL (NULLs backfilled first)
  * renames check  skipped_not_completed -> ck_task_completions_skipped_not_completed
  * adds the priority_override / revision >= 0 checks (autogenerate never sees these)
  * renames ix_public_task_completions_* -> ix_task_completions_*
  * adds index + FK (ON DELETE SET NULL) for diagnosis_task_requirement_id

CONFIRM `alembic heads` before running; down_revision must be your current head
(7c1e5a90b2d4 is the seed migration).
"""
from __future__ import annotations

import logging

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a3d8f2c41b7e"
down_revision = "e4c30c13e829"
branch_labels = None
depends_on = None

log = logging.getLogger("alembic.runtime.migration")

T = "task_completions"
OLD_CK = "skipped_not_completed"
CK_SKIP = "ck_task_completions_skipped_not_completed"
CK_PRIO = "ck_task_completions_priority_override"
CK_REV = "ck_task_completions_revision_nonnegative"
FK_PROV = "task_completions_diagnosis_task_requirement_id_fkey"
PROV = "diagnosis_task_requirement_id"

# (column, old index name, new index name)
INDEXES = [
    ("client_id", "ix_public_task_completions_client_id", "ix_task_completions_client_id"),
    ("session_id", "ix_public_task_completions_session_id", "ix_task_completions_session_id"),
    ("task_id", "ix_public_task_completions_task_id", "ix_task_completions_task_id"),
]
IX_PROV = "ix_task_completions_diagnosis_task_requirement_id"


def _new_columns():
    return [
        sa.Column(PROV, postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title_override", sa.String(150), nullable=True),
        sa.Column("details_override", sa.Text(), nullable=True),
        sa.Column("priority_override", sa.String(10), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("skip_reason", sa.Text(), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("void_reason", sa.Text(), nullable=True),
    ]


def _inspect():
    insp = sa.inspect(op.get_bind())
    if not insp.has_table(T):
        raise RuntimeError(f"Table {T} does not exist")
    return {
        "cols": {c["name"] for c in insp.get_columns(T)},
        "idx": {i["name"] for i in insp.get_indexes(T)},
        "checks": {c["name"] for c in insp.get_check_constraints(T)},
        "fks": insp.get_foreign_keys(T),
    }


def upgrade() -> None:
    s = _inspect()

    # 1. Missing columns (NOT NULL revision has a server default, so existing rows are fine).
    for col in _new_columns():
        if col.name not in s["cols"]:
            op.add_column(T, col)

    # 2. updated_at NOT NULL (keeps its server default); backfill NULLs first.
    op.execute(f"UPDATE {T} SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL")
    op.alter_column(T, "updated_at", existing_type=sa.DateTime(timezone=True),
                    existing_server_default=sa.text("now()"), nullable=False)

    # 3. Check constraints (op.f => name used literally, no naming-convention prefixing).
    if OLD_CK in s["checks"] and CK_SKIP not in s["checks"]:
        op.execute(f"ALTER TABLE {T} RENAME CONSTRAINT {OLD_CK} TO {CK_SKIP}")
    elif CK_SKIP not in s["checks"]:
        op.create_check_constraint(
            op.f(CK_SKIP), T, "NOT was_skipped OR completed_status <> 'completed'")
    if CK_PRIO not in s["checks"]:
        op.create_check_constraint(
            op.f(CK_PRIO), T,
            "priority_override IS NULL OR priority_override IN ('high', 'normal', 'low')")
    if CK_REV not in s["checks"]:
        op.create_check_constraint(op.f(CK_REV), T, "revision >= 0")

    # 4. Indexes: rename the legacy ix_public_* ones, create anything still missing.
    for col, old, new in INDEXES:
        if new in s["idx"]:
            continue
        if old in s["idx"]:
            op.execute(f"ALTER INDEX {old} RENAME TO {new}")
        else:
            op.create_index(op.f(new), T, [col])
    if IX_PROV not in s["idx"]:
        op.create_index(op.f(IX_PROV), T, [PROV])

    # 5. Provenance FK.
    if not any(fk["constrained_columns"] == [PROV] for fk in s["fks"]):
        op.create_foreign_key(
            op.f(FK_PROV), T, "diagnosis_task_requirements", [PROV], ["id"],
            ondelete="SET NULL")


def downgrade() -> None:
    """Reverts the schema. Data in the dropped columns is lost."""
    s = _inspect()

    for fk in s["fks"]:
        if fk["constrained_columns"] == [PROV] and fk.get("name"):
            op.drop_constraint(fk["name"], T, type_="foreignkey")
    if IX_PROV in s["idx"]:
        op.drop_index(IX_PROV, table_name=T)
    for _col, old, new in INDEXES:
        if new in s["idx"] and old not in s["idx"]:
            op.execute(f"ALTER INDEX {new} RENAME TO {old}")

    for ck in (CK_PRIO, CK_REV):
        if ck in s["checks"]:
            op.drop_constraint(ck, T, type_="check")
    if CK_SKIP in s["checks"] and OLD_CK not in s["checks"]:
        op.execute(f"ALTER TABLE {T} RENAME CONSTRAINT {CK_SKIP} TO {OLD_CK}")

    op.alter_column(T, "updated_at", existing_type=sa.DateTime(timezone=True),
                    existing_server_default=sa.text("now()"), nullable=True)

    for col in reversed(_new_columns()):
        if col.name in s["cols"]:
            op.drop_column(T, col.name)