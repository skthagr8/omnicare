from datetime import date, datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field

from app.core.enums import CaregiverStatus, DiagnosisCategory
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
