"""
API routes for the clients module.

Covers endpoints for:
  - Client management & detail inspection
  - Emergency contacts
  - Family member links
  - Acuity tiers
  - Client diagnoses (polymorphic)
  - Diagnosis definitions (clinical templates) and requirement mappings
"""
from __future__ import annotations

import uuid
from typing import Annotated, Any, Union

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.clients.care_plan import CarePlan, resolve_care_plan
from app.modules.clients.intake import intake_options, register_client
from app.modules.clients.schemas import ClientIntakeCreate, ClientIntakeResponse, IntakeOptions
from app.modules.clients.schemas import (
    AcuityTierCreate,
    AcuityTierResponse,
    AcuityTierUpdate,
    ClientCreate,
    ClientDiagnosisResponse,
    ClientDiagnosisUpdate,
    ClientFamilyLinkCreate,
    ClientFamilyLinkResponse,
    ClientResponse,
    ClientUpdate,
    DementiaDiagnosisCreate,
    DiagnosisAssessmentRequirementCreate,
    DiagnosisAssessmentRequirementResponse,
    DiagnosisDefinitionCreate,
    DiagnosisDefinitionResponse,
    DiagnosisDefinitionUpdate,
    DiagnosisMedicationRequirementCreate,
    DiagnosisMedicationRequirementResponse,
    DiagnosisTaskRequirementCreate,
    DiagnosisTaskRequirementResponse,
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyContactUpdate,
    OtherDiagnosisCreate,
    ParkinsonsDiagnosisCreate,
    PostStrokeDiagnosisCreate,
)
from app.modules.clients.service import (
    client_service,
    diagnosis_definition_service,
)

router = APIRouter()

# Discriminated payload union for polymorphic diagnosis creation
DiagnosisCreatePayload = Union[
    DementiaDiagnosisCreate,
    PostStrokeDiagnosisCreate,
    ParkinsonsDiagnosisCreate,
    OtherDiagnosisCreate,
]


# ============================================================
# DIAGNOSIS DEFINITIONS (CLINICAL TEMPLATES)
# ============================================================
# ROUTE ORDER MATTERS: this block must stay ABOVE `GET /{client_id}`.
# The router is mounted at /api/clients, so `GET /diagnosis-definitions` and
# `GET /{client_id}` have the same shape (one segment after the prefix).
# FastAPI matches in declaration order and does NOT fall through on a
# validation error, so if `/{client_id}` came first, "diagnosis-definitions"
# would be parsed as a UUID and the request would fail with 422.

@router.get(
    "/diagnosis-definitions",
    response_model=list[DiagnosisDefinitionResponse],
    summary="List diagnosis definitions",
    tags=["Diagnosis Definitions"],
)
async def list_diagnosis_definitions(
    only_active: bool = Query(True, description="Filter active definitions only"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await diagnosis_definition_service.list(db, only_active=only_active)


@router.post(
    "/diagnosis-definitions",
    response_model=DiagnosisDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create diagnosis definition",
    tags=["Diagnosis Definitions"],
)
async def create_diagnosis_definition(
    payload: DiagnosisDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await diagnosis_definition_service.create(db, payload)


@router.get(
    "/diagnosis-definitions/{diagnosis_definition_id}",
    response_model=DiagnosisDefinitionResponse,
    summary="Get diagnosis definition by ID",
    tags=["Diagnosis Definitions"],
)
async def get_diagnosis_definition(
    diagnosis_definition_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = await diagnosis_definition_service.get(db, diagnosis_definition_id)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis definition '{diagnosis_definition_id}' not found.",
        )
    return obj


@router.patch(
    "/diagnosis-definitions/{diagnosis_definition_id}",
    response_model=DiagnosisDefinitionResponse,
    summary="Update diagnosis definition",
    tags=["Diagnosis Definitions"],
)
async def update_diagnosis_definition(
    diagnosis_definition_id: uuid.UUID,
    payload: DiagnosisDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obj = await diagnosis_definition_service.update(db, diagnosis_definition_id, payload)
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis definition '{diagnosis_definition_id}' not found.",
        )
    return obj


# --- Requirements Mappings ---

@router.post(
    "/diagnosis-definitions/{diagnosis_definition_id}/task-requirements",
    response_model=DiagnosisTaskRequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add task requirement to definition",
    tags=["Diagnosis Definitions"],
)
async def add_task_requirement(
    diagnosis_definition_id: uuid.UUID,
    payload: DiagnosisTaskRequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    definition = await diagnosis_definition_service.get(db, diagnosis_definition_id)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis definition '{diagnosis_definition_id}' not found.",
        )
    return await diagnosis_definition_service.add_task_requirement(
        db, diagnosis_definition_id, payload
    )


@router.post(
    "/diagnosis-definitions/{diagnosis_definition_id}/assessment-requirements",
    response_model=DiagnosisAssessmentRequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add assessment requirement to definition",
    tags=["Diagnosis Definitions"],
)
async def add_assessment_requirement(
    diagnosis_definition_id: uuid.UUID,
    payload: DiagnosisAssessmentRequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    definition = await diagnosis_definition_service.get(db, diagnosis_definition_id)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis definition '{diagnosis_definition_id}' not found.",
        )
    return await diagnosis_definition_service.add_assessment_requirement(
        db, diagnosis_definition_id, payload
    )


@router.post(
    "/diagnosis-definitions/{diagnosis_definition_id}/medication-requirements",
    response_model=DiagnosisMedicationRequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add medication requirement to definition",
    tags=["Diagnosis Definitions"],
)
async def add_medication_requirement(
    diagnosis_definition_id: uuid.UUID,
    payload: DiagnosisMedicationRequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    definition = await diagnosis_definition_service.get(db, diagnosis_definition_id)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis definition '{diagnosis_definition_id}' not found.",
        )
    return await diagnosis_definition_service.add_medication_requirement(
        db, diagnosis_definition_id, payload
    )


# ============================================================
# CLIENT ROUTES
# ============================================================
# Route strings omit "/clients": the prefix comes from the mount in main.py
# (prefix="/api/clients"). The list/create routes use "" rather than "/" so
# they answer /api/clients directly instead of 307-redirecting to /api/clients/.

@router.get(
    "",  # GET /api/clients (no trailing slash)
    response_model=list[ClientResponse],
    summary="List organization clients",
    tags=["Clients"],
)
async def list_clients(
    only_active: bool = Query(True, description="Filter for active clients only"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await client_service.list_clients(
        db, current_user.org_id, only_active=only_active, limit=limit, offset=offset
    )


# --- Intake (admin) ---------------------------------------------------------
# Must stay above `GET /{client_id}` (see ROUTE ORDER note above).

@router.get(
    "/intake/options",
    response_model=IntakeOptions,
    summary="Intake form options (organisations, diagnosis definitions)",
    tags=["Intake"],
)
async def get_intake_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return await intake_options(db, current_user)


@router.post(
    "/intake",
    response_model=ClientIntakeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new client: demographics, diagnoses, initial acuity and contacts in one transaction",
    tags=["Intake"],
)
async def create_client_intake(
    payload: ClientIntakeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return await register_client(db, current_user, payload)



@router.post(
    "",  # POST /api/clients (no trailing slash)
    response_model=ClientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create client",
    tags=["Clients"],
)
async def create_client(
    payload: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await client_service.create_client(
        db, payload, org_id=current_user.org_id, actor_user_id=current_user.id
    )


@router.get(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Get client details",
    tags=["Clients"],
)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.get_client(db, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return client


@router.patch(
    "/{client_id}",
    response_model=ClientResponse,
    summary="Update client details",
    tags=["Clients"],
)
async def update_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.update_client(db, client_id, payload)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return client


@router.delete(
    "/{client_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate client",
    tags=["Clients"],
)
async def deactivate_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = await client_service.deactivate_client(db, client_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================
# EMERGENCY CONTACTS
# ============================================================

@router.post(
    "/{client_id}/emergency-contacts",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add emergency contact",
    tags=["Emergency Contacts"],
)
async def add_emergency_contact(
    client_id: uuid.UUID,
    payload: EmergencyContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.get_client(db, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return await client_service.add_emergency_contact(db, client_id, payload)


@router.patch(
    "/emergency-contacts/{contact_id}",
    response_model=EmergencyContactResponse,
    summary="Update emergency contact",
    tags=["Emergency Contacts"],
)
async def update_emergency_contact(
    contact_id: uuid.UUID,
    payload: EmergencyContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = await client_service.update_emergency_contact(
        db, contact_id, payload
    )
    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency contact '{contact_id}' not found.",
        )
    return contact


@router.delete(
    "/emergency-contacts/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete emergency contact",
    tags=["Emergency Contacts"],
)
async def delete_emergency_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deleted = await client_service.delete_emergency_contact(db, contact_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Emergency contact '{contact_id}' not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================
# FAMILY LINKS
# ============================================================

@router.post(
    "/{client_id}/family-links",
    response_model=ClientFamilyLinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link family member",
    tags=["Family Links"],
)
async def link_family_member(
    client_id: uuid.UUID,
    payload: ClientFamilyLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.get_client(db, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return await client_service.link_family_member(
        db,
        client_id,
        payload.family_member_id,
        is_primary_contact=payload.is_primary_contact,
    )


@router.delete(
    "/{client_id}/family-links/{family_member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlink family member",
    tags=["Family Links"],
)
async def unlink_family_member(
    client_id: uuid.UUID,
    family_member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unlinked = await client_service.unlink_family_member(
        db, client_id, family_member_id
    )
    if not unlinked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Family link for client '{client_id}' and family member '{family_member_id}' not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================
# ACUITY TIERS
# ============================================================

@router.get(
    "/{client_id}/care-plan",
    response_model=CarePlan,
    summary="Client care plan (tasks, assessments, medications) resolved from active diagnoses",
    tags=["Clients"],
)
async def get_care_plan(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if await client_service.get_client(db, client_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Client '{client_id}' not found.")
    return await resolve_care_plan(db, client_id)


@router.get(
    "/{client_id}/acuity-tiers",
    response_model=list[AcuityTierResponse],
    summary="List acuity tiers for client",
    tags=["Acuity Tiers"],
)
async def list_acuity_tiers(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.get_client(db, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return await client_service.list_acuity_tiers(db, client_id)


@router.post(
    "/{client_id}/acuity-tiers",
    response_model=AcuityTierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add acuity tier to client",
    tags=["Acuity Tiers"],
)
async def add_acuity_tier(
    client_id: uuid.UUID,
    payload: AcuityTierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.get_client(db, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return await client_service.add_acuity_tier(
        db, client_id, payload, actor_user_id=current_user.id
    )


@router.patch(
    "/acuity-tiers/{tier_id}",
    response_model=AcuityTierResponse,
    summary="Update acuity tier",
    tags=["Acuity Tiers"],
)
async def update_acuity_tier(
    tier_id: uuid.UUID,
    payload: AcuityTierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tier = await client_service.update_acuity_tier(db, tier_id, payload)
    if tier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Acuity tier '{tier_id}' not found.",
        )
    return tier


# ============================================================
# CLIENT DIAGNOSES
# ============================================================

@router.get(
    "/{client_id}/diagnoses",
    response_model=list[ClientDiagnosisResponse],
    summary="List client diagnoses",
    tags=["Client Diagnoses"],
)
async def list_diagnoses(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.get_client(db, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return await client_service.list_diagnoses(db, client_id)


@router.post(
    "/{client_id}/diagnoses",
    response_model=ClientDiagnosisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add polymorphic diagnosis to client",
    tags=["Client Diagnoses"],
)
async def add_diagnosis(
    client_id: uuid.UUID,
    payload: Annotated[DiagnosisCreatePayload, Body(discriminator="category")],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = await client_service.get_client(db, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client '{client_id}' not found.",
        )
    return await client_service.add_diagnosis(db, client_id, payload)


@router.patch(
    "/diagnoses/{diagnosis_id}",
    response_model=ClientDiagnosisResponse,
    summary="Update client diagnosis",
    tags=["Client Diagnoses"],
)
async def update_diagnosis(
    diagnosis_id: uuid.UUID,
    payload: ClientDiagnosisUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diag = await client_service.update_diagnosis(db, diagnosis_id, payload)
    if diag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagnosis '{diagnosis_id}' not found.",
        )
    return diag
