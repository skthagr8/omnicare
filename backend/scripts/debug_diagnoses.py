# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401

import asyncio
import sys
import traceback
import uuid

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.modules.clients.schemas import (
    ClientDiagnosisResponse,
    ClientDiagnosisUpdate,
    DementiaDiagnosisCreate,
    PostStrokeDiagnosisCreate,
)
from app.modules.clients.service import client_service


async def debug_diagnoses(client_id_str: str, def_id_str: str) -> None:
    client_id = uuid.UUID(client_id_str)
    def_id = uuid.UUID(def_id_str)

    async with async_session_factory() as db:
        try:
            print("=== 1. Adding Polymorphic Diagnoses ===")
            dementia = await client_service.add_diagnosis(
                db,
                client_id,
                DementiaDiagnosisCreate(
                    diagnosis_definition_id=def_id,
                    stage="Moderate",
                    notes="Memory gaps during late afternoon.",
                ),
            )
            print("[OK] Dementia Diagnosis:", ClientDiagnosisResponse.model_validate(dementia).model_dump())

            stroke = await client_service.add_diagnosis(
                db,
                client_id,
                PostStrokeDiagnosisCreate(
                    diagnosis_definition_id=def_id,
                    affected_side="Left",
                    notes="Hemiparesis noted.",
                ),
            )
            print("[OK] Post-Stroke Diagnosis:", ClientDiagnosisResponse.model_validate(stroke).model_dump())

            print("\n=== 2. Listing & Updating Client Diagnoses ===")
            diagnoses = await client_service.list_diagnoses(db, client_id)
            print(f"[OK] Listed {len(diagnoses)} diagnoses for client")

            updated = await client_service.update_diagnosis(
                db, dementia.id, ClientDiagnosisUpdate(notes="Updated clinical observation.")
            )
            print("[OK] Updated Diagnosis Notes:", ClientDiagnosisResponse.model_validate(updated).notes)

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python debug_diagnoses.py <CLIENT_UUID> <DIAGNOSIS_DEFINITION_UUID>")
        sys.exit(1)
    asyncio.run(debug_diagnoses(sys.argv[1], sys.argv[2]))