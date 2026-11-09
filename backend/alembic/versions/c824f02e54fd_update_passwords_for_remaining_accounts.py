"""update_passwords_for_remaining_accounts

Revision ID: c824f02e54fd
Revises: 966bda0984f3
Create Date: 2026-10-21 07:26:56.495449

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2
from passlib.context import CryptContext

# Revision identifiers, used by Alembic.
revision: str = "c824f02e54fd"
down_revision: Union[str, None] = "demo_users_password_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

"""update_passwords_for_remaining_accounts

Revision ID: <LEAVE_GENERATED_ID_HERE>
Revises: demo_users_password_0002
Create Date: 2026-10-21 10:22:00.000000
"""

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_DEMO_PASSWORD = "Strongpass123"

def upgrade() -> None:
    connection = op.get_bind()
    password_hash = _pwd_context.hash(_DEMO_PASSWORD)

    # Target all accounts that do NOT match the previously used .invalid domain
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET password_hash = :password_hash,
                is_active = TRUE
            WHERE email NOT LIKE '%@example.invalid'
            """
        ),
        {"password_hash": password_hash},
    )

def downgrade() -> None:
    connection = op.get_bind()
    
    # Restore these specific accounts to an inactive state with a broken hash
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET password_hash = '!',
                is_active = FALSE
            WHERE email NOT LIKE '%@example.invalid'
            """
        )
    )