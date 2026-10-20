import asyncio
import os
import asyncpg


async def main():
    database_url = os.environ["DATABASE_URL"].replace(
    "postgresql+asyncpg://",
    "postgresql://",
)

    print("DATABASE_URL:", database_url)

    conn = await asyncpg.connect(database_url)

    print(
        "Connection:",
        await conn.fetchrow(
            """
            SELECT
                current_database(),
                current_user,
                current_schema(),
                inet_server_addr()
            """
        ),
    )

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS alembic_debug_test (
            id INTEGER PRIMARY KEY,
            value TEXT
        )
        """
    )

    await conn.execute(
        """
        INSERT INTO alembic_debug_test (id, value)
        VALUES (1, 'backend-test')
        ON CONFLICT (id)
        DO UPDATE SET value = EXCLUDED.value
        """
    )

    print(
        "Inserted row:",
        await conn.fetchrow(
            "SELECT id, value FROM alembic_debug_test WHERE id = 1"
        ),
    )

    await conn.close()


asyncio.run(main())