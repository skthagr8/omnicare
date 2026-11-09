"""Create clients_with_missing_diagnosis (audit of diagnosis/acuity backfill).

Revision ID: m1ss1ngd1ag0
Revises: l1nk3dm3d520
Create Date: 2026-11-08

One row per client found without an active diagnosis, recording the diagnosis and initial
acuity assigned to fill the gap, the evidence used, and whether the diagnosis was supported
by recorded evidence or inferred. The table itself is filled by
scripts/backfill_missing_diagnoses.py, not by this migration.
"""
from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "m1ss1ngd1ag0"
down_revision = "l1nk3dm3d520"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "clients_with_missing_diagnosis",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("client_name", sa.String(150), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("assigned_category", sa.String(32)),
        sa.Column("diagnosis_basis", sa.String(16)),
        sa.Column("client_diagnosis_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("client_diagnoses.id", ondelete="SET NULL")),
        sa.Column("acuity_level", sa.String(8)),
        sa.Column("acuity_score", sa.Integer),
        sa.Column("acuity_tier_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("client_acuity_tiers.id", ondelete="SET NULL")),
        sa.Column("evidence", postgresql.JSONB),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.CheckConstraint("diagnosis_basis IN ('evidence', 'inferred')", name="ck_cwmd_diagnosis_basis"),
        sa.CheckConstraint("acuity_level IN ('red', 'amber', 'green')", name="ck_cwmd_acuity_level"),
    )


def downgrade() -> None:
    op.drop_table("clients_with_missing_diagnosis")
