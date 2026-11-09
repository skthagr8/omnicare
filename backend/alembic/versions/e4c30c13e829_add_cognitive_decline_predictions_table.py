"""add cognitive_decline_predictions table

Revision ID: e4c30c13e829
Revises: 7c1e5a90b2d4
Create Date: 2026-11-03 18:34:06.438525

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

# Revision identifiers, used by Alembic.
revision: str = "e4c30c13e829"
down_revision: Union[str, None] = "7c1e5a90b2d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cognitive_decline_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("anchor_round", sa.Integer(), nullable=True),
        sa.Column("target_round", sa.Integer(), nullable=True),
        sa.Column("decline_rate", sa.Float(), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column(
            "data_source",
            sa.String(length=32),
            nullable=False,
            server_default="population_prior",
        ),
        sa.Column(
            "confidence",
            sa.String(length=16),
            nullable=False,
            server_default="low",
        ),
        sa.Column(
            "mapped_features",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column(
            "predicted_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_cognitive_decline_predictions_client_id"),
        "cognitive_decline_predictions",
        ["client_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_cognitive_decline_predictions_client_id"),
        table_name="cognitive_decline_predictions",
    )
    op.drop_table("cognitive_decline_predictions")
