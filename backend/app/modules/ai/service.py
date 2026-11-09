# app/modules/ai/services.py
import hashlib
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from uuid import UUID
from sqlalchemy.orm import selectinload

import numpy as np
import torch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ai.model_definition import CognitiveLSTM
from app.modules.ai.models import CognitiveDeclinePrediction
from app.modules.ai.schemas import DeclineSeverity
from app.modules.ai.client_mapping import client_to_feature_overlay, ineligibility_reason
from app.modules.clients.models import Client

logger = logging.getLogger(__name__)

CHECKPOINT_DIR    = Path(__file__).parent / "checkpoints"
MODEL_FILE        = CHECKPOINT_DIR / "cognitive_lstm.pt"
CHECKSUM_FILE     = CHECKPOINT_DIR / "cognitive_lstm.md5"
COHORT_PRIOR_PATH = CHECKPOINT_DIR / "cohort_prior.npy"

# v1.0.1: same checkpoint, corrected feature mapping (NHATS 1 = yes / 2 = no, age category 6 = 90+,
# under-65 excluded). Predictions stored under v1.0.0 used the old mapping and are flagged as outdated.
MODEL_VERSION = "v1.0.1"
MAX_ANCHOR    = 13
DEVICE        = "cpu"

# Lower bound (exclusive) of decline_rate for each band, most severe first; anything lower is IMPROVEMENT.
SEVERITY_BANDS: tuple[tuple[float, DeclineSeverity, str], ...] = (
    (0.15,  DeclineSeverity.SIGNIFICANT, "Urgent cognitive assessment recommended"),
    (0.08,  DeclineSeverity.MODERATE,    "Schedule follow-up within 3 months"),
    (0.03,  DeclineSeverity.MILD,        "Monitor closely, routine follow-up"),
    (-0.03, DeclineSeverity.STABLE,      "Continue routine monitoring"),
)
IMPROVEMENT_RECOMMENDATION = "Continue current care"


@dataclass(frozen=True)
class PreparedSequence:
    seq:           np.ndarray
    mask:          np.ndarray
    used_features: tuple[str, ...]


class ModelRegistry:
    def __init__(
        self,
        model,
        scaler_mean,
        scaler_scale,
        feature_columns,
        cohort_prior,
        target_definition: str | None = None,
    ) -> None:
        self.target_definition = target_definition
        self.model           = model
        self.scaler_mean     = scaler_mean
        self.scaler_scale    = scaler_scale
        self.feature_columns = feature_columns
        self.cohort_prior    = cohort_prior
        self.version         = MODEL_VERSION
        self.device          = DEVICE

    @classmethod
    def load(cls) -> "ModelRegistry":
        if CHECKSUM_FILE.exists():
            expected = CHECKSUM_FILE.read_text().strip()
            actual   = hashlib.md5(MODEL_FILE.read_bytes()).hexdigest()
            if actual != expected:
                raise RuntimeError("Checkpoint corruption detected.")

        ckpt  = torch.load(MODEL_FILE, map_location=DEVICE, weights_only=False)
        model = CognitiveLSTM(input_dim=len(ckpt["feature_columns"]))
        model.load_state_dict(ckpt["model_state_dict"])
        model.to(DEVICE).eval()

        prior          = np.load(COHORT_PRIOR_PATH).astype(np.float32)
        expected_shape = (MAX_ANCHOR, len(ckpt["feature_columns"]))
        if prior.shape != expected_shape:
            raise RuntimeError(
                f"Cohort prior shape {prior.shape} != expected {expected_shape}. "
                f"Re-run scripts/build_cohort_prior.py."
            )

        logger.info(
            "ModelRegistry loaded (version=%s, F=%d)",
            MODEL_VERSION,
            prior.shape[1],
        )
        return cls(
            model=model,
            scaler_mean=np.asarray(ckpt["scaler_mean"],  dtype=np.float32),
            scaler_scale=np.asarray(ckpt["scaler_scale"], dtype=np.float32),
            feature_columns=list(ckpt["feature_columns"]),
            cohort_prior=prior,
            target_definition=ckpt.get("target_definition"),
        )


class CognitiveDeclinePredictor:
    def __init__(self, registry: ModelRegistry) -> None:
        self._reg = registry

    async def predict_for_client(
        self,
        db: AsyncSession,
        client_id: UUID,
    ) -> CognitiveDeclinePrediction:
        client = await db.get(Client, client_id, options=[selectinload(Client.diagnoses)],)
        if client is None:
            raise LookupError("Client not found")

        if reason := ineligibility_reason(client):
            raise LookupError(f"No prediction available: {reason}")
        overlay = client_to_feature_overlay(client, self._reg.feature_columns)

        prepared = self._sequence_from_prior(overlay)
        rate     = self._run_inference(prepared.seq, prepared.mask)
        record   = self._record(client.id, rate, prepared.used_features, datetime.utcnow())
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record

    async def predict_for_clients(
        self,
        db: AsyncSession,
        client_ids: list[UUID],
    ) -> tuple[list[CognitiveDeclinePrediction], dict[UUID, str]]:
        """Score many clients in one forward pass and stage the records (caller commits).

        Returns (records, {client_id: reason}) for clients that could not be scored.
        """
        if not client_ids:
            return [], {}
        clients = (
            await db.execute(
                select(Client).options(selectinload(Client.diagnoses)).where(Client.id.in_(client_ids))
            )
        ).scalars().all()

        skipped: dict[UUID, str] = {}
        prepared: list[tuple[UUID, PreparedSequence]] = []
        for client in clients:
            if reason := ineligibility_reason(client):
                skipped[client.id] = reason
                continue
            overlay = client_to_feature_overlay(client, self._reg.feature_columns)
            prepared.append((client.id, self._sequence_from_prior(overlay)))

        if not prepared:
            return [], skipped

        seqs  = np.stack([p.seq for _, p in prepared])
        masks = np.stack([p.mask for _, p in prepared])
        rates = self._run_inference_batch(seqs, masks)

        now = datetime.utcnow()
        records = [
            self._record(client_id, float(rate), p.used_features, now)
            for (client_id, p), rate in zip(prepared, rates)
        ]
        db.add_all(records)
        await db.flush()
        return records, skipped

    def _record(self, client_id: UUID, rate: float, used_features, predicted_at: datetime) -> CognitiveDeclinePrediction:
        severity, recommendation = _severity(rate)
        return CognitiveDeclinePrediction(
            client_id       = client_id,
            anchor_round    = None,
            target_round    = None,
            decline_rate    = rate,
            severity        = severity.value,
            recommendation  = recommendation,
            data_source     = "population_prior",
            confidence      = "low" if len(used_features) < 5 else "high",
            mapped_features = list(used_features),
            model_version   = self._reg.version,
            predicted_at    = predicted_at,
        )

    def _sequence_from_prior(self, overlay: dict[str, float]) -> PreparedSequence:
        seq  = self._reg.cohort_prior.copy()
        mask = np.ones(MAX_ANCHOR, dtype=np.float32)
        index_of = {name: i for i, name in enumerate(self._reg.feature_columns)}

        used: list[str] = []
        for name, value in overlay.items():
            i = index_of.get(name)
            if i is None:
                continue
            seq[:, i] = float(value)
            used.append(name)

        return PreparedSequence(seq=seq, mask=mask, used_features=tuple(used))

    def _run_inference(self, seq_unscaled: np.ndarray, mask: np.ndarray) -> float:
        return float(self._run_inference_batch(seq_unscaled[None], mask[None])[0])

    def _run_inference_batch(self, seqs_unscaled: np.ndarray, masks: np.ndarray) -> np.ndarray:
        """seqs: (N, MAX_ANCHOR, F), masks: (N, MAX_ANCHOR) -> (N,) decline rates."""
        seq_scaled = (
            (seqs_unscaled - self._reg.scaler_mean) / self._reg.scaler_scale
        ).astype(np.float32)
        with torch.no_grad():
            X = torch.from_numpy(seq_scaled).to(self._reg.device)
            M = torch.from_numpy(masks.astype(np.float32)).to(self._reg.device)
            out = self._reg.model(X, M)
        return out.cpu().numpy().reshape(-1)


def _severity(rate: float) -> tuple[DeclineSeverity, str]:
    for lower_bound, severity, recommendation in SEVERITY_BANDS:
        if rate > lower_bound:
            return severity, recommendation
    return DeclineSeverity.IMPROVEMENT, IMPROVEMENT_RECOMMENDATION