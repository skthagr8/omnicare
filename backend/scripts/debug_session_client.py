import asyncio
import sys
import traceback
import uuid

from fastapi.encoders import jsonable_encoder
from sqlalchemy import select

# 1. Force load all SQLAlchemy models into the registry
from app.modules.registry import import_all_models
import_all_models()

# 2. Now import your DB and services
from app.core.database import async_session_factory, close_db
from app.modules.clients.schemas import ClientResponse
from app.modules.scheduling.service import scheduling_service
from app.modules.scheduling.models import CaregiverSession
from app.modules.auth.models import User                      # adjust path


async def main(session_id: str) -> None:
    sid = uuid.UUID(session_id)
    async with async_session_factory() as db:
        try:
            # 0. Find the caregiver who owns this session and use them as the actor
            session_row = (
                await db.execute(select(CaregiverSession).where(CaregiverSession.id == sid))
            ).scalar_one_or_none()
            print("0a. session row:", session_row and (session_row.id, session_row.caregiver_id, session_row.client_id))

            actor = (
                await db.execute(select(User).where(User.id == session_row.caregiver_id))
            ).scalar_one()
            print("0b. actor:", actor.id, "role =", repr(actor.role))

            # 1. Service layer
            client = await scheduling_service.get_session_client(db, sid, actor)
            print("1. service OK:", client.id, getattr(client, "full_name", None))

            # 2. Pydantic validation (what response_model does first)
            resp = ClientResponse.model_validate(client, from_attributes=True)
            print("2. schema OK:", resp.model_dump())

            # 3. JSON serialization (what FastAPI does before sending the response)
            print("3. json OK:", jsonable_encoder(resp))
        except Exception:
            traceback.print_exc()
    await close_db()


asyncio.run(main(sys.argv[1]))