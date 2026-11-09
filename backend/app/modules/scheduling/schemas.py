from datetime import date, datetime, timedelta
from typing import Optional
from datetime import timezone
import uuid
from pydantic import BaseModel, model_validator, field_validator
from app.core.enums import (
    AcuityLevel,
    AssessmentType,
    CaregiverStatus,
    ClientDiagnosisCategory,
    SessionStatus,
)
from app.modules.assessments.schemas import AssessmentResponse
from app.modules.medications.schemas import (
    MedicationAdministrationResponse,
    MedicationResponse,
)
from app.schemas.common import GeoPoint


class SessionCreate(BaseModel):
    client_id: uuid.UUID
    caregiver_id: uuid.UUID
    scheduled_start: datetime
    scheduled_end: datetime

    @model_validator(mode="after")
    def end_after_start(self):
        if self.scheduled_end <= self.scheduled_start:
            raise ValueError("scheduled_end must be after scheduled_start")
        return self

    @model_validator(mode="after")
    def validate_session_window(self) -> "SessionCreate":
        if self.scheduled_end <= self.scheduled_start:
            raise ValueError("scheduled_end must be strictly after scheduled_start")
        if (self.scheduled_end - self.scheduled_start) < timedelta(minutes=15):
            raise ValueError("Session duration must be at least 15 minutes")
        return self

class SessionUpdate(BaseModel):
    caregiver_id: Optional[uuid.UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    status: Optional[SessionStatus] = None

class SessionCheckIn(BaseModel):
    location: GeoPoint
    # Optional: the server records check_in_at from its own clock.
    time: Optional[datetime] = None
    geofence_verified: bool = True # for testing purposes

class SessionCheckOut(BaseModel):
    # Optional: the server records check_out_at from its own clock.
    time: Optional[datetime] = None
    location: GeoPoint

    @field_validator("time")
    @classmethod
    def time_not_in_future(cls, v: Optional[datetime]) -> Optional[datetime]:
        # Prevent check-out times set far in the future
        if v is None:
            return v
        now = datetime.now(timezone.utc)
        if v > now:
            raise ValueError("Check-out time cannot be in the future")
        return v

class SessionResponse(BaseModel):

    model_config = {"from_attributes": True}

    id: uuid.UUID
    client_id: uuid.UUID
    caregiver_id: uuid.UUID
    scheduled_start: datetime
    scheduled_end: datetime
    visit_date: Optional[date] = None
    status: SessionStatus
    check_in_at: Optional[datetime] = None
    check_in_location: Optional[GeoPoint] = None
    check_in_geofence_verified: Optional[bool] = None
    check_out_at: Optional[datetime] = None
    check_out_location: Optional[GeoPoint] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime

class ClientResponse(BaseModel):

    model_config = {"from_attributes": True}

    id: uuid.UUID
    org_id: uuid.UUID
    full_name: str
    date_of_birth: date
    address_text: str
    gender: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Session care plan (derived from the client's active diagnoses)
#
#   session.client_id -> client_diagnoses -> diagnosis_definitions
#       -> diagnosis_assessment_requirements / diagnosis_medication_requirements
#       -> assessments / medication_administrations recorded in this session
# ---------------------------------------------------------------------------

class SessionAssessmentItem(BaseModel):
    assessment_type: AssessmentType
    is_required: bool
    frequency_days: Optional[int] = None
    instructions: Optional[str] = None
    # The assessment recorded for this type in this session, if any
    completed: Optional[AssessmentResponse] = None


class SessionMedicationItem(BaseModel):
    medication: MedicationResponse
    is_required: bool
    instructions: Optional[str] = None
    # The administration recorded for this medication in this session, if any
    administration: Optional[MedicationAdministrationResponse] = None


# ---------------------------------------------------------------------------
# Admin patients table: one row per client that has caregiver sessions
# ---------------------------------------------------------------------------

class SessionPatientCaregiver(BaseModel):
    id: uuid.UUID
    full_name: Optional[str] = None
    status: CaregiverStatus


class SessionPatient(BaseModel):
    id: uuid.UUID
    full_name: str
    date_of_birth: date
    gender: str
    address_text: str
    is_active: bool
    diagnoses: list[ClientDiagnosisCategory] = []
    # Current acuity tier; None when the client has not been assessed.
    acuity: Optional[AcuityLevel] = None
    # From the representative session: in progress > next scheduled > most recent.
    caregiver: Optional[SessionPatientCaregiver] = None
    visit_start: Optional[datetime] = None
    visit_status: Optional[SessionStatus] = None
    session_count: int = 0
    # Scheduled visits that have not ended yet; these are what "reassign caregiver" moves.
    upcoming_visits: int = 0


class ReassignCaregiverRequest(BaseModel):
    caregiver_id: uuid.UUID


class ReassignCaregiverResponse(BaseModel):
    client_id: uuid.UUID
    caregiver_id: uuid.UUID
    sessions_updated: int
