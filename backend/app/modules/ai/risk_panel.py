"""Admin risk panel: cognitive decline predictions for every patient.

Reading the panel never runs the model; predictions are produced explicitly by run_predictions()
(one batched forward pass) and stored in cognitive_decline_predictions.
The patient set is the same as the Patients page (all clients, one row per name).
"""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ClientDiagnosisCategory
from app.modules.ai.client_mapping import (
    AGE_CATEGORY_LABELS,
    YOUNGEST_COHORT_AGE,
    age_bucket,
    age_in_years,
)
from app.modules.ai.models import CognitiveDeclinePrediction
from app.modules.ai.schemas import (
    PredictionPoint,
    RiskEngineInfo,
    RiskPanelInputs,
    RiskPanelPatient,
    RiskPanelPrediction,
    RiskPanelResponse,
    RiskPanelRunResponse,
    SeverityBand,
)
from app.modules.ai.service import (
    IMPROVEMENT_RECOMMENDATION,
    MODEL_VERSION,
    SEVERITY_BANDS,
    CognitiveDeclinePredictor,
    ModelRegistry,
)
from app.core.enums import DeclineSeverity
from app.modules.scheduling.patients import list_session_patients

HISTORY_LENGTH = 6
CLIENT_FEATURES = ["Age Category", "Stroke", "Dementia/Alzheimer's"]


def _utc(dt: datetime) -> datetime:
    # predicted_at is stored as naive UTC.
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _bands() -> list[SeverityBand]:
    bands, upper = [], None
    for lower, severity, recommendation in SEVERITY_BANDS:
        bands.append(SeverityBand(severity=severity, min_rate=lower, max_rate=upper, recommendation=recommendation))
        upper = lower
    bands.append(SeverityBand(severity=DeclineSeverity.IMPROVEMENT, min_rate=None, max_rate=upper,
                              recommendation=IMPROVEMENT_RECOMMENDATION))
    return bands


async def _recent_predictions(db: AsyncSession, client_ids: list[UUID]) -> dict[UUID, list[CognitiveDeclinePrediction]]:
    """Up to HISTORY_LENGTH most recent predictions per client, newest first."""
    if not client_ids:
        return {}
    ranked = (
        select(
            CognitiveDeclinePrediction,
            func.row_number()
            .over(partition_by=CognitiveDeclinePrediction.client_id, order_by=CognitiveDeclinePrediction.predicted_at.desc())
            .label("rn"),
        )
        .where(CognitiveDeclinePrediction.client_id.in_(client_ids))
        .subquery()
    )
    pred = CognitiveDeclinePrediction
    rows = (
        await db.execute(
            select(pred)
            .join(ranked, ranked.c.id == pred.id)
            .where(ranked.c.rn <= HISTORY_LENGTH)
            .order_by(pred.client_id, pred.predicted_at.desc())
        )
    ).scalars().all()
    out: dict[UUID, list[CognitiveDeclinePrediction]] = {}
    for row in rows:
        out.setdefault(row.client_id, []).append(row)
    return out


async def build_panel(db: AsyncSession, registry: ModelRegistry) -> RiskPanelResponse:
    patients = await list_session_patients(db)
    history = await _recent_predictions(db, [p.id for p in patients])

    rows: list[RiskPanelPatient] = []
    for p in patients:
        age = age_in_years(p.date_of_birth)
        category = age_bucket(p.date_of_birth)
        eligible = category is not None  # every client with a date of birth
        age_group = (
            f"Under {YOUNGEST_COHORT_AGE}" if age < YOUNGEST_COHORT_AGE
            else AGE_CATEGORY_LABELS.get(int(category)) if category else None
        )
        preds = history.get(p.id, [])
        latest = preds[0] if preds else None
        rows.append(
            RiskPanelPatient(
                id=p.id,
                full_name=p.full_name,
                age=age,
                gender=p.gender,
                is_active=p.is_active,
                diagnoses=[d.value for d in p.diagnoses],
                acuity=p.acuity.value if p.acuity else None,
                caregiver_name=p.caregiver.full_name if p.caregiver else None,
                eligible=eligible,
                ineligible_reason=None if eligible else "No date of birth on record.",
                inputs=RiskPanelInputs(
                    age_category=int(category) if category else None,
                    age_group=age_group,
                    stroke=ClientDiagnosisCategory.POST_STROKE in p.diagnoses,
                    dementia=ClientDiagnosisCategory.DEMENTIA in p.diagnoses,
                ),
                latest=RiskPanelPrediction(
                    id=latest.id,
                    decline_rate=latest.decline_rate,
                    severity=latest.severity,
                    recommendation=latest.recommendation,
                    confidence=latest.confidence,
                    data_source=latest.data_source,
                    mapped_features=latest.mapped_features,
                    model_version=latest.model_version,
                    predicted_at=_utc(latest.predicted_at),
                    outdated=latest.model_version != MODEL_VERSION,
                ) if latest else None,
                previous_rate=preds[1].decline_rate if len(preds) > 1 else None,
                history=[
                    PredictionPoint(
                        decline_rate=h.decline_rate,
                        severity=h.severity,
                        model_version=h.model_version,
                        predicted_at=_utc(h.predicted_at),
                    )
                    for h in preds
                ],
            )
        )

    return RiskPanelResponse(
        engine=RiskEngineInfo(
            version=MODEL_VERSION,
            target_definition=registry.target_definition,
            feature_count=len(registry.feature_columns),
            client_features=[f for f in CLIENT_FEATURES if f in registry.feature_columns],
            data_source="population_prior",
            bands=_bands(),
        ),
        generated_at=datetime.now(timezone.utc),
        patients=rows,
    )


async def run_predictions(
    db: AsyncSession, predictor: CognitiveDeclinePredictor, *, scope: str
) -> RiskPanelRunResponse:
    """Score patients shown on the panel. scope='missing_or_outdated' skips patients with a current prediction."""
    patients = await list_session_patients(db)
    ids = [p.id for p in patients if age_bucket(p.date_of_birth) is not None]
    if scope == "missing_or_outdated":
        current = set(
            (
                await db.execute(
                    select(CognitiveDeclinePrediction.client_id)
                    .where(
                        CognitiveDeclinePrediction.client_id.in_(ids),
                        CognitiveDeclinePrediction.model_version == MODEL_VERSION,
                    )
                    .distinct()
                )
            ).scalars()
        )
        ids = [i for i in ids if i not in current]

    records, skipped = await predictor.predict_for_clients(db, ids)
    return RiskPanelRunResponse(scored=len(records), skipped=len(skipped), model_version=MODEL_VERSION)
