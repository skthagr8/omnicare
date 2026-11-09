"""Caregiver invitation tokens.

Revision ID: 1nv1t3t0k3n
Revises: m1ss1ngd1ag0
Create Date: 2026-11-09

- email_invitations.token_hash: SHA-256 of the one-time token sent in the invite link
  (the raw token is only ever in the email).
- email_invitations.caregiver_shell_id: links the invite to the pre-filled shell profile.
- caregiver_shells.certifications: diagnosis categories the admin verified.
- created_at/updated_at on email_invitations defaulted to a fixed literal timestamp;
  they now default to now().
"""
from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "1nv1t3t0k3n"
down_revision = "m1ss1ngd1ag0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("email_invitations", sa.Column("token_hash", sa.String(64), nullable=True))
    op.create_index(
        "ix_email_invitations_token_hash", "email_invitations", ["token_hash"], unique=True
    )
    op.add_column(
        "email_invitations",
        sa.Column(
            "caregiver_shell_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("caregiver_shells.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "caregiver_shells",
        sa.Column(
            "certifications",
            postgresql.ARRAY(sa.String(50)),
            nullable=False,
            server_default="{}",
        ),
    )
    op.alter_column("email_invitations", "created_at", server_default=sa.text("now()"))
    op.alter_column("email_invitations", "updated_at", server_default=sa.text("now()"))


def downgrade() -> None:
    op.drop_column("caregiver_shells", "certifications")
    op.drop_column("email_invitations", "caregiver_shell_id")
    op.drop_index("ix_email_invitations_token_hash", table_name="email_invitations")
    op.drop_column("email_invitations", "token_hash")
