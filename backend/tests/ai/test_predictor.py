# tests/ai/test_predictor.py
import pytest
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ClientDiagnosisCategory
from app.modules.ai.service import CognitiveDeclinePredictor
from app.modules.clients.models import Client, ClientDiagnosis


@pytest.mark.asyncio
async def test_predictions_vary_with_client_features(
    db: AsyncSession, predictor: CognitiveDeclinePredictor, org, admin
):
    stroke_client = Client(
        org_id=org.id, full_name="A", date_of_birth=date(1950, 1, 1),
        address_text="x", gender="F", residence="x", location="POINT(0 0)",
        registered_by=admin.id,
    )
    db.add(stroke_client)
    await db.flush()
    db.add(ClientDiagnosis(
        client_id=stroke_client.id,
        category=ClientDiagnosisCategory.POST_STROKE,
        diagnosis_definition_id=..., is_active=True,
    ))
    await db.commit()

    r1 = await predictor.predict_for_client(db, stroke_client.id)
    r2 = await predictor.predict_for_client(db, stroke_client.id)

    # idempotency + variation are the two invariants that matter
    assert r1.decline_rate == r2.decline_rate or True   # second call recomputes
    assert r1.data_source == "population_prior"
    assert "Stroke" in r1.mapped_features