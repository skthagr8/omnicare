from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_client, require_role
from app.modules.ai import schemas
from app.modules.ai.dependencies import get_model_registry, get_predictor
from app.modules.ai.risk_panel import build_panel, run_predictions
from app.modules.ai.service import CognitiveDeclinePredictor, ModelRegistry
from app.modules.auth.models import User
from app.modules.clients.models import Client

router = APIRouter(prefix="/ai", tags=["ai"])


# GET /api/ai/risk-panel: every patient with their latest stored prediction (read-only).
@router.get("/risk-panel", response_model=schemas.RiskPanelResponse)
async def get_risk_panel(
    db: AsyncSession = Depends(get_db),
    registry: ModelRegistry = Depends(get_model_registry),
    _: User = Depends(require_role("admin")),
):
    return await build_panel(db, registry)


# POST /api/ai/risk-panel/run: score patients in one batch and store the predictions.
@router.post("/risk-panel/run", response_model=schemas.RiskPanelRunResponse)
async def run_risk_panel(
    data: schemas.RiskPanelRunRequest,
    db: AsyncSession = Depends(get_db),
    predictor: CognitiveDeclinePredictor = Depends(get_predictor),
    _: User = Depends(require_role("admin")),
):
    return await run_predictions(db, predictor, scope=data.scope)


# GET /api/ai/clients/{client_id}/cognitive-decline/latest
@router.get(
    "/clients/{client_id}/cognitive-decline/latest",
    response_model=schemas.CognitiveDeclinePredictionOut,
)
async def get_latest_cognitive_decline(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
    predictor: CognitiveDeclinePredictor = Depends(get_predictor),
):
    try:
        return await predictor.predict_for_client(db, client.id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
