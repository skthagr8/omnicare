from datetime import date, datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field

from app.core.enums import AcuityTier, DiagnosisCategory
from app.schemas.common import GeoPoint


class ClientCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    date_of_birth: date
    address_text: str = Field(max_length=300)
    location: GeoPoint
    diagnosis_category: DiagnosisCategory
    acuity_tier: AcuityTier = AcuityTier.GREEN


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    address_text: Optional[str] = None
    location: Optional[GeoPoint] = None
    diagnosis_category: Optional[DiagnosisCategory] = None
    acuity_tier: Optional[AcuityTier] = None
    is_active: Optional[bool] = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    full_name: str
    date_of_birth: date
    address_text: str
    location: Optional[GeoPoint] = None
    diagnosis_category: DiagnosisCategory
    acuity_tier: AcuityTier
    registered_by: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmergencyContactCreate(BaseModel):
    full_name: str
    relationship: str
    phone: str
    is_primary: bool = False


class EmergencyContactResponse(EmergencyContactCreate):
    id: uuid.UUID
    client_id: uuid.UUID

    model_config = {"from_attributes": True}


class FamilyLinkCreate(BaseModel):
    family_member_id: uuid.UUID
    is_primary_contact: bool = False


class FamilyLinkResponse(BaseModel):
    client_id: uuid.UUID
    family_member_id: uuid.UUID
    is_primary_contact: bool
    linked_at: datetime

    model_config = {"from_attributes": True}


class CarePlanCreate(BaseModel):
    description: str
    is_active: bool = True


class CarePlanResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    description: str
    created_by: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
