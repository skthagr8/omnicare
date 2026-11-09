from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field
from app.core.enums import DeclineSeverity
from typing import Literal


class CognitiveDeclinePredictionOut(BaseModel):
    id:           UUID
    client_id:    UUID

    anchor_round: int | None      # always None here
    target_round: int | None      # always None here

    decline_rate:   float
    severity:       DeclineSeverity
    recommendation: str

    data_source:     Literal["nhats_history", "population_prior"]   # always "population_prior"
    confidence:      Literal["high", "low"]
    mapped_features: list[str] | None

    model_version: str
    predicted_at:  datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Admin risk panel: every patient with their latest cognitive decline prediction
# ---------------------------------------------------------------------------

class SeverityBand(BaseModel):
    severity:       DeclineSeverity
    min_rate:       float | None   # exclusive lower bound; None = no lower bound
    max_rate:       float | None   # inclusive upper bound; None = no upper bound
    recommendation: str


class RiskEngineInfo(BaseModel):
    version:           str
    target_definition: str | None
    feature_count:     int
    # The only features taken from the client record; every other feature uses the cohort prior.
    client_features:   list[str]
    data_source:       str
    bands:             list[SeverityBand]


class PredictionPoint(BaseModel):
    decline_rate:  float
    severity:      DeclineSeverity
    model_version: str
    predicted_at:  datetime


class RiskPanelPrediction(PredictionPoint):
    id:              UUID
    recommendation:  str
    confidence:      Literal["high", "low"]
    data_source:     str
    mapped_features: list[str] | None
    # Produced by an older model/mapping version; re-run to refresh.
    outdated:        bool


class RiskPanelInputs(BaseModel):
    age_category: int | None
    age_group:    str | None
    stroke:       bool
    dementia:     bool


class RiskPanelPatient(BaseModel):
    id:                UUID
    full_name:         str
    age:               int
    gender:            str
    is_active:         bool
    diagnoses:         list[str]
    acuity:            str | None
    caregiver_name:    str | None
    eligible:          bool
    ineligible_reason: str | None
    inputs:            RiskPanelInputs
    latest:            RiskPanelPrediction | None
    previous_rate:     float | None
    history:           list[PredictionPoint]   # newest first, up to 6


class RiskPanelResponse(BaseModel):
    engine:       RiskEngineInfo
    generated_at: datetime
    patients:     list[RiskPanelPatient]


class RiskPanelRunRequest(BaseModel):
    # "missing_or_outdated": only patients without a current prediction; "all": re-score everyone eligible.
    scope: Literal["missing_or_outdated", "all"] = "missing_or_outdated"


class RiskPanelRunResponse(BaseModel):
    scored:        int
    skipped:       int
    model_version: str