"""
Schemas for the clients module.

Covers:
  - Client (create / update / response)
  - ClientDiagnosis (polymorphic: Dementia, PostStroke, Parkinsons)
  - DiagnosisDefinition + requirement tables
  - ClientAcuityTier
  - ClientEmergencyContact
  - ClientFamilyLink
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional, Literal

from geoalchemy2.shape import to_shape
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.enums import (
    AcuityLevel,
    AssessmentType,
    ClientDiagnosisCategory,
)


# ============================================================
# GEO HELPERS
# ============================================================

class GeoPoint(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


def _geometry_to_lat_long(v):
    """Convert a WKBElement / WKTElement / shapely geometry to GeoPoint dict."""
    if v is None or isinstance(v, (dict, GeoPoint)):
        return v
    try:
        shape = to_shape(v)
        return {"longitude": shape.x, "latitude": shape.y}
    except Exception:
        # if it can't be parsed, let pydantic fail loudly
        return v


# ============================================================
# EMERGENCY CONTACT
# ============================================================
# NOTE: ORM attribute is `relationship_type`, mapped to DB column
# `relationship`. Schemas intentionally expose `relationship_type`.

class EmergencyContactCreate(BaseModel):
    full_name: str = Field(..., max_length=150)
    relationship_type: str = Field(..., max_length=50)
    phone: str = Field(..., max_length=30)
    is_primary: bool = False


class EmergencyContactUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=150)
    relationship_type: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=30)
    is_primary: Optional[bool] = None


class EmergencyContactResponse(EmergencyContactCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    client_id: uuid.UUID


# ============================================================
# ACUITY TIER
# ============================================================
# `assigned_by` is set by the service from the authenticated admin,
# NOT from client input.

class AcuityTierCreate(BaseModel):
    level: AcuityLevel
    reason_notes: Optional[str] = None


class AcuityTierUpdate(BaseModel):
    level: Optional[AcuityLevel] = None
    reason_notes: Optional[str] = None
    effective_to: Optional[datetime] = None


class AcuityTierResponse(AcuityTierCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    client_id: uuid.UUID
    assigned_by: uuid.UUID
    effective_from: datetime
    effective_to: Optional[datetime] = None


# ============================================================
# CLIENT DIAGNOSIS (polymorphic)
# ============================================================

class ClientDiagnosisBase(BaseModel):
    diagnosis_definition_id: uuid.UUID
    category: ClientDiagnosisCategory
    notes: Optional[str] = None


class ClientDiagnosisUpdate(BaseModel):
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class DementiaDiagnosisCreate(ClientDiagnosisBase):
    category: Literal[ClientDiagnosisCategory.DEMENTIA] = ClientDiagnosisCategory.DEMENTIA
    stage: Optional[str] = Field(None, max_length=50)


class PostStrokeDiagnosisCreate(ClientDiagnosisBase):
    category: Literal[ClientDiagnosisCategory.POST_STROKE] = ClientDiagnosisCategory.POST_STROKE
    affected_side: Optional[str] = Field(None, max_length=20)


class ParkinsonsDiagnosisCreate(ClientDiagnosisBase):
    category: Literal[ClientDiagnosisCategory.PARKINSONS] = ClientDiagnosisCategory.PARKINSONS


class OtherDiagnosisCreate(ClientDiagnosisBase):
    category: Literal[ClientDiagnosisCategory.OTHER] = ClientDiagnosisCategory.OTHER


class ClientDiagnosisResponse(ClientDiagnosisBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    diagnosed_at: datetime
    is_active: bool

    # polymorphic extras — only present on matching subclass instances
    stage: Optional[str] = None
    affected_side: Optional[str] = None


# ============================================================
# DIAGNOSIS DEFINITION (clinical template)
# ============================================================

class DiagnosisDefinitionCreate(BaseModel):
    category: ClientDiagnosisCategory
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    is_active: bool = True


class DiagnosisDefinitionUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DiagnosisDefinitionResponse(DiagnosisDefinitionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ============================================================
# DIAGNOSIS -> TASK REQUIREMENT
# ============================================================

class DiagnosisTaskRequirementCreate(BaseModel):
    task_id: uuid.UUID
    is_required: bool = True
    sequence_order: int = Field(0, ge=0)
    instructions: Optional[str] = None


class DiagnosisTaskRequirementResponse(DiagnosisTaskRequirementCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    diagnosis_definition_id: uuid.UUID


# ============================================================
# DIAGNOSIS -> ASSESSMENT REQUIREMENT
# ============================================================

class DiagnosisAssessmentRequirementCreate(BaseModel):
    assessment_type: AssessmentType
    is_required: bool = True
    frequency_days: Optional[int] = Field(None, ge=1)
    instructions: Optional[str] = None


class DiagnosisAssessmentRequirementResponse(
    DiagnosisAssessmentRequirementCreate
):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    diagnosis_definition_id: uuid.UUID


# ============================================================
# DIAGNOSIS -> MEDICATION REQUIREMENT
# ============================================================

class DiagnosisMedicationRequirementCreate(BaseModel):
    medication_id: uuid.UUID
    is_required: bool = True
    instructions: Optional[str] = None


class DiagnosisMedicationRequirementResponse(
    DiagnosisMedicationRequirementCreate
):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    diagnosis_definition_id: uuid.UUID


# ============================================================
# CLIENT <-> FAMILY LINK
# ============================================================

class ClientFamilyLinkCreate(BaseModel):
    family_member_id: uuid.UUID
    is_primary_contact: bool = False


class ClientFamilyLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    client_id: uuid.UUID
    family_member_id: uuid.UUID
    is_primary_contact: bool
    linked_at: datetime


# ============================================================
# CLIENT
# ============================================================
# Create excludes org_id/registered_by — those are derived by the
# service from the authenticated user's context.

class ClientCreate(BaseModel):
    full_name: str = Field(..., max_length=150)
    date_of_birth: date
    address_text: str = Field(..., max_length=300)
    gender: str = Field(..., max_length=20)
    location: GeoPoint
    residence: str = Field(..., max_length=300)
    assessment_observations: Optional[str] = None


class ClientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=150)
    date_of_birth: Optional[date] = None
    address_text: Optional[str] = Field(None, max_length=300)
    gender: Optional[str] = Field(None, max_length=20)
    residence: Optional[str] = Field(None, max_length=300)
    assessment_observations: Optional[str] = None
    is_active: Optional[bool] = None
    location: Optional[GeoPoint] = None


class ClientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    org_id: uuid.UUID
    full_name: str
    date_of_birth: date
    address_text: str
    gender: str
    residence: str
    assessment_observations: Optional[str] = None
    is_active: bool
    registered_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    location: Optional[GeoPoint] = None

    @field_validator("location", mode="before")
    @classmethod
    def _geometry_to_lat_long(cls, v):
        return _geometry_to_lat_long(v)


class ClientDetailResponse(ClientResponse):
    """Optional richer response when relations are eager-loaded."""
    diagnoses: list[ClientDiagnosisResponse] = Field(default_factory=list)
    acuity_tiers: list[AcuityTierResponse] = Field(default_factory=list)
    emergency_contacts: list[EmergencyContactResponse] = Field(
        default_factory=list
    )


# ============================================================
# INTAKE (admin "register new patient" flow, one transaction)
# ============================================================

class IntakeOrganization(BaseModel):
    id: uuid.UUID
    name: str


class IntakeOptions(BaseModel):
    organizations: list[IntakeOrganization]
    # The admin's own organisation, pre-selected in the form (None if the admin has none).
    default_org_id: Optional[uuid.UUID] = None
    diagnosis_definitions: list[DiagnosisDefinitionResponse]


class IntakeDiagnosis(BaseModel):
    diagnosis_definition_id: uuid.UUID
    notes: Optional[str] = Field(None, max_length=1000)
    stage: Optional[str] = Field(None, max_length=50)  # dementia only
    affected_side: Optional[str] = Field(None, max_length=20)  # post-stroke only


class IntakeAcuity(BaseModel):
    level: AcuityLevel
    reason_notes: Optional[str] = Field(None, max_length=1000)


class IntakeContact(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    relationship_type: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=5, max_length=30)
    is_primary: bool = False


class ClientIntakeCreate(BaseModel):
    org_id: uuid.UUID
    full_name: str = Field(..., min_length=2, max_length=150)
    date_of_birth: date
    gender: str = Field(..., min_length=1, max_length=20)
    address_text: str = Field(..., min_length=3, max_length=300)
    residence: str = Field(..., min_length=1, max_length=300)
    location: GeoPoint
    assessment_observations: Optional[str] = Field(None, max_length=5000)
    diagnoses: list[IntakeDiagnosis] = Field(..., min_length=1)
    acuity: IntakeAcuity
    emergency_contacts: list[IntakeContact] = Field(..., min_length=1)
    attestation: bool
    # Set after the admin confirms they are not registering an existing patient again.
    allow_duplicate: bool = False

    @field_validator("full_name", "address_text", "residence", "gender")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def _dob_in_range(cls, v: date) -> date:
        today = date.today()
        if v > today:
            raise ValueError("Date of birth cannot be in the future")
        if (today.year - v.year) > 120:
            raise ValueError("Date of birth is more than 120 years ago")
        return v

    @field_validator("emergency_contacts")
    @classmethod
    def _one_primary(cls, v: list[IntakeContact]) -> list[IntakeContact]:
        if sum(c.is_primary for c in v) != 1:
            raise ValueError("Exactly one emergency contact must be marked as primary")
        return v

    @field_validator("attestation")
    @classmethod
    def _attested(cls, v: bool) -> bool:
        if not v:
            raise ValueError("The HIPAA & clinical attestation must be confirmed")
        return v


class IntakeCarePlanSummary(BaseModel):
    tasks: int
    assessments: int
    medications: int


class ClientIntakeResponse(BaseModel):
    client: ClientResponse
    diagnoses_created: int
    contacts_created: int
    acuity: AcuityLevel
    # Care plan assigned through the diagnoses (derived; see clients/care_plan.py).
    care_plan: IntakeCarePlanSummary

