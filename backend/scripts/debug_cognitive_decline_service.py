# scripts/debug_cognitive_decline_service.py
#
# Direct-service test for the cognitive decline predictor.
#
# This bypasses HTTP and calls CognitiveDeclinePredictor.predict_for_client directly.
# It verifies:
#   - the model loads
#   - the predictor dependency resolves
#   - inference runs on a real client row
#   - the response validates against CognitiveDeclinePredictionOut
#
# It does NOT verify the HTTP route /api/ai/clients/{id}/cognitive-decline/latest.
# For that, use scripts/debug_cognitive_decline_http.py (Option 2) or curl.

import asyncio
import sys
import traceback
import uuid

import app.modules.registry  # noqa: F401
import app.db.base  # noqa: F401

from app.core.database import async_session_factory, close_db
from app.modules.ai.dependencies import init_ai_services, get_predictor
from app.modules.ai.schemas import CognitiveDeclinePredictionOut


async def debug_predictor_flow(client_id_str: str) -> None:
    client_id = uuid.UUID(client_id_str)

    print("--- 0. Initialising AI services ---")
    await init_ai_services()
    print("[OK] Model loaded.")

    async with async_session_factory() as db:
        try:
            print("\n--- 1. Resolving Predictor Dependency ---")
            predictor = get_predictor()
            print(f"[OK] Predictor Loaded: {predictor.__class__.__name__}")

            print("\n--- 2. Executing Model Prediction ---")
            # This is the same call the HTTP route makes:
            #   GET /api/ai/clients/{client_id}/cognitive-decline/latest
            # → router handler → predictor.predict_for_client(db, client.id)
            result = await predictor.predict_for_client(db, client_id)
            print(f"[OK] Raw Prediction Result: {result}")

            print("\n--- 3. Validating Schema (CognitiveDeclinePredictionOut) ---")
            validated = CognitiveDeclinePredictionOut.model_validate(result)
            print("[OK] Schema Validation Passed:")
            print(validated.model_dump_json(indent=2))

        except LookupError as e:
            print(f"[CATCH 404] LookupError raised as expected: {e}")
        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.debug_cognitive_decline_service <CLIENT_UUID>")
        print("Example:")
        print("  python -m scripts.debug_cognitive_decline_service \\")
        print("    2a7e33d5-34d3-5d4f-8adf-4e10317ed3df")
        sys.exit(1)
    asyncio.run(debug_predictor_flow(sys.argv[1]))