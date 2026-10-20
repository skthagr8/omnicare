"""Activate demo users and set a shared demo password.

This migration affects only seeded demo accounts whose email addresses use
the reserved example.invalid domain. It does not alter real/application users.

WARNING: This shared password is suitable only for local/demo environments.
"""

from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext

revision = "demo_users_password_0002"
down_revision = "68b984e2aab8"
branch_labels = None
depends_on = None

# Keep this scheme aligned with the application's authentication configuration.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_DEMO_PASSWORD = "Strongpass123"
_DEMO_EMAIL_PATTERN = "%@example.invalid"


def upgrade() -> None:
    connection = op.get_bind()
    password_hash = _pwd_context.hash(_DEMO_PASSWORD)

    connection.execute(
        sa.text(
            """
            UPDATE users
            SET password_hash = :password_hash,
                is_active = TRUE
            WHERE email LIKE :email_pattern
            """
        ),
        {
            "password_hash": password_hash,
            "email_pattern": _DEMO_EMAIL_PATTERN,
        },
    )


def downgrade() -> None:
    # Restore the original seed migration's account state.
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE users
            SET password_hash = '!',
                is_active = FALSE
            WHERE email LIKE :email_pattern
            """
        ),
        {"email_pattern": _DEMO_EMAIL_PATTERN},
    )
