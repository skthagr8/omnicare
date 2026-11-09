from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class ServiceRequestCreate(BaseModel):
    client_id: uuid.UUID
    description: str = Field(min_length=3)


class ServiceRequestUpdate(BaseModel):
    status: Optional[str] = None
    resulting_session_id: Optional[uuid.UUID] = None


class ServiceRequestResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    requested_by: uuid.UUID
    description: str
    status: str
    resulting_session_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FamilyMemberResponse(BaseModel):
    user_id: uuid.UUID
    relationship_to_client: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Family portal read models (scoped to clients linked to the family member)
# ---------------------------------------------------------------------------

from datetime import date  # noqa: E402


class LinkedClientResponse(BaseModel):
    client_id: uuid.UUID
    full_name: str
    date_of_birth: date
    gender: str
    relationship_to_client: Optional[str] = None
    is_primary_contact: bool
    organization_name: Optional[str] = None


class FamilyVisitResponse(BaseModel):
    id: uuid.UUID
    status: str
    scheduled_start: datetime
    scheduled_end: datetime
    check_in_at: Optional[datetime] = None
    check_out_at: Optional[datetime] = None
    caregiver_id: uuid.UUID
    caregiver_name: str


class CareTeamMemberResponse(BaseModel):
    caregiver_id: uuid.UUID
    full_name: str
    status: str
    certifications: list[str]
    certified_since: Optional[date] = None
    visit_count: int
    completed_visit_count: int
    next_visit_at: Optional[datetime] = None
    last_visit_at: Optional[datetime] = None


class VisitTaskItem(BaseModel):
    title: str
    status: str
    was_skipped: bool
    skip_reason: Optional[str] = None
    completed_at: Optional[datetime] = None


class VisitMedicationItem(BaseModel):
    name: str
    dosage: str
    status: str
    administered_at: Optional[datetime] = None
    missed_reason: Optional[str] = None


class VisitObservationItem(BaseModel):
    note: str
    is_flagged: bool
    created_at: datetime


class VisitAssessmentItem(BaseModel):
    assessment_type: str
    state: str
    administered_at: Optional[datetime] = None


class VisitDetailResponse(FamilyVisitResponse):
    client_id: uuid.UUID
    client_name: str
    caregiver_certifications: list[str]
    tasks: list[VisitTaskItem]
    medications: list[VisitMedicationItem]
    observations: list[VisitObservationItem]
    assessments: list[VisitAssessmentItem]


class MedicationDay(BaseModel):
    date: date
    administered: int
    missed: int


class ScorePoint(BaseModel):
    date: date
    value: float


class HealthSummaryResponse(BaseModel):
    client_id: uuid.UUID
    client_name: str
    period_start: date
    period_end: date
    medication_days: list[MedicationDay]
    tug_seconds: list[ScorePoint]
    cmai_scores: list[ScorePoint]
    visits_completed: int
    visits_scheduled: int
    care_hours: float
    tasks_completed: int
    tasks_total: int
    flagged_observations: int
