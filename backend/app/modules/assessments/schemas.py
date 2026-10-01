from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid

from pydantic import BaseModel, model_validator

from app.core.enums import AssessmentState, AssessmentType


class TugScore(BaseModel):
    completion_time_sec: Optional[Decimal] = None
    hesitation_flag: bool = False
    freezing_flag: bool = False


class CmaiScore(BaseModel):
    total_score: Optional[int] = None
    physical_nonaggressive: Optional[int] = None
    physical_aggressive: Optional[int] = None
    verbal_agitation: Optional[int] = None


class BradenScore(BaseModel):
    total_score: Optional[int] = None
    skin_inspection_notes: Optional[str] = None


class DeliriumScore(BaseModel):
    cam_positive: Optional[bool] = None
    risk_score: Optional[Decimal] = None
    threshold_breached: bool = False


class AssessmentCreate(BaseModel):
    session_id: uuid.UUID
    client_id: uuid.UUID
    assessment_type: AssessmentType
    state: AssessmentState = AssessmentState.PENDING
    refused_reason: Optional[str] = None
    administered_at: Optional[datetime] = None
    tug: Optional[TugScore] = None
    cmai: Optional[CmaiScore] = None
    braden: Optional[BradenScore] = None
    delirium: Optional[DeliriumScore] = None

    @model_validator(mode="after")
    def state_rules(self):
        if self.state == AssessmentState.REFUSED and not self.refused_reason:
            raise ValueError("refused_reason is required when state is refused")
        if self.state == AssessmentState.COMPLETED and not self.administered_at:
            raise ValueError("administered_at is required when state is completed")
        return self


class AssessmentResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    client_id: uuid.UUID
    assessment_type: AssessmentType
    state: AssessmentState
    refused_reason: Optional[str] = None
    administered_by: uuid.UUID
    administered_at: Optional[datetime] = None
    created_at: datetime
    tug: Optional[TugScore] = None
    cmai: Optional[CmaiScore] = None
    braden: Optional[BradenScore] = None
    delirium: Optional[DeliriumScore] = None

    model_config = {"from_attributes": True}


class ObservationCreate(BaseModel):
    session_id: uuid.UUID
    client_id: uuid.UUID
    note: str
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    triggered_assessment_id: Optional[uuid.UUID] = None


class ObservationResponse(ObservationCreate):
    id: uuid.UUID
    recorded_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
