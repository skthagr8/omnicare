"""seed_initial_admin

Revision ID: 68b984e2aab8
Revises: 20261011_demo
Create Date: 2026-10-17 10:24:03.491726

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# Revision identifiers, used by Alembic.
revision: str = "68b984e2aab8"
down_revision: Union[str, None] = "20261011_demo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
