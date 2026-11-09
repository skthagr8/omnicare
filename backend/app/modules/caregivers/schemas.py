from datetime import date, datetime
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field

from app.core.enums import (
    AcuityLevel,
    CaregiverStatus,
    ClientDiagnosisCategory,
    DiagnosisCategory,
    SessionStatus,
)
from app.schemas.common import GeoPoint


class CaregiverCertificationCreate(BaseModel):
    diagnosis_category: DiagnosisCategory
    certified_at: Optional[date] = None


class CaregiverCertificationResponse(BaseModel):
    caregiver_id: uuid.UUID
    diagnosis_category: DiagnosisCategory
    certified_at: date

    model_config = {"from_attributes": True}


class CaregiverUpdate(BaseModel):
    status: Optional[CaregiverStatus] = None
    last_confirmed_location: Optional[GeoPoint] = None


class CaregiverResponse(BaseModel):
    user_id: uuid.UUID
    full_name: Optional[str] = None
    status: CaregiverStatus
    last_confirmed_location: Optional[GeoPoint] = None
    last_confirmed_at: Optional[datetime] = None
    certifications: list[CaregiverCertificationResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Admin live operations view: caregivers on shift + the clients they serve
# ---------------------------------------------------------------------------

class ShiftClient(BaseModel):
    id: uuid.UUID
    full_name: str
    date_of_birth: date
    address_text: str
    location: Optional[GeoPoint] = None
    acuity: Optional[AcuityLevel] = None
    diagnoses: list[ClientDiagnosisCategory] = Field(default_factory=list)


class ShiftAssignment(BaseModel):
    session_id: uuid.UUID
    status: SessionStatus
    scheduled_start: datetime
    scheduled_end: datetime
    check_in_at: Optional[datetime] = None
    client: ShiftClient


class OnShiftCaregiver(BaseModel):
    caregiver_id: uuid.UUID
    full_name: Optional[str] = None
    # Effective status: the stored status when set, otherwise derived from today's sessions.
    status: CaregiverStatus
    location: Optional[GeoPoint] = None
    # Where the location came from: an explicit confirmation, or a visit check-in/check-out.
    location_source: Optional[Literal["confirmed", "check_in", "check_out"]] = None
    location_at: Optional[datetime] = None
    # Today's open visits (scheduled or in progress), earliest first.
    assignments: list[ShiftAssignment] = Field(default_factory=list)
