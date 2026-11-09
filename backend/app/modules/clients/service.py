"""
Service layer for the clients module.

Design notes
------------
* All write methods receive ``actor_user_id`` and (where relevant)
  ``org_id`` — routes derive these from the authenticated user.
* ``location`` is stored as ``geography(POINT, 4326)``. We convert
  ``GeoPoint`` -> ``from_shape(Point(lng, lat), srid=4326)`` on write.
  Reading goes through ``ClientResponse``'s ``_geometry_to_lat_long``.
* Diagnosis creation is polymorphic: we dispatch on
  ``payload.category`` to build the correct subclass instance.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, Sequence

from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import select
from sqlalchemy.orm import with_polymorphic
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ClientDiagnosisCategory
from app.modules.clients.models import (
    Client,
    ClientAcuityTier,
    ClientDiagnosis,
    ClientEmergencyContact,
    ClientFamilyLink,
    DementiaDiagnosis,
    DiagnosisAssessmentRequirement,
    DiagnosisDefinition,
    DiagnosisMedicationRequirement,
    DiagnosisTaskRequirement,
    ParkinsonsDiagnosis,
    PostStrokeDiagnosis,
)
from app.modules.clients.schemas import (
    AcuityTierCreate,
    AcuityTierUpdate,
    ClientCreate,
    ClientDiagnosisUpdate,
    ClientUpdate,
    DementiaDiagnosisCreate,
    DiagnosisAssessmentRequirementCreate,
    DiagnosisDefinitionCreate,
    DiagnosisDefinitionUpdate,
    DiagnosisMedicationRequirementCreate,
    DiagnosisTaskRequirementCreate,
    EmergencyContactCreate,
    EmergencyContactUpdate,
    GeoPoint,
    OtherDiagnosisCreate,
    ParkinsonsDiagnosisCreate,
    PostStrokeDiagnosisCreate,
)


# ============================================================
# Helpers
# ============================================================

def _point_from_geo(p: GeoPoint):
    """GeoPoint -> PostGIS WKB element (SRID 4326)."""
    return from_shape(Point(p.longitude, p.latitude), srid=4326)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ============================================================
# Client service
# ============================================================

class ClientService:
    # --------------------------------------------------------
    # Reads
    # --------------------------------------------------------

    # Maps to router.get("/{client_id}", response_model=ClientResponse)
    async def get_client(
        self, db: AsyncSession, client_id: uuid.UUID
    ) -> Optional[Client]:
        stmt = select(Client).where(Client.id == client_id)
        return (await db.execute(stmt)).scalar_one_or_none()

    # Maps to router.get("/", response_model=list[ClientResponse])
    async def list_clients(
        self,
        db: AsyncSession,
        org_id: uuid.UUID,
        *,
        only_active: bool = True,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[Client]:
        stmt = (
            select(Client)
            .where(Client.org_id == org_id)
            .order_by(Client.full_name)
            .limit(limit)
            .offset(offset)
        )
        if only_active:
            stmt = stmt.where(Client.is_active.is_(True))
        return (await db.execute(stmt)).scalars().all()

    # --------------------------------------------------------
    # Writes
    # --------------------------------------------------------

    # Maps to router.post("/", response_model=ClientResponse)
    async def create_client(
        self,
        db: AsyncSession,
        payload: ClientCreate,
        *,
        org_id: uuid.UUID,
        actor_user_id: uuid.UUID,
    ) -> Client:
        client = Client(
            org_id=org_id,
            full_name=payload.full_name,
            date_of_birth=payload.date_of_birth,
            address_text=payload.address_text,
            gender=payload.gender,
            residence=payload.residence,
            assessment_observations=payload.assessment_observations,
            location=_point_from_geo(payload.location),
            registered_by=actor_user_id,
            is_active=True,
        )
        db.add(client)
        await db.flush()
        await db.refresh(client)
        return client

    # Maps to router.patch("/{client_id}", response_model=ClientResponse)
    async def update_client(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
        payload: ClientUpdate,
    ) -> Optional[Client]:
        client = await self.get_client(db, client_id)
        if client is None:
            return None

        data = payload.model_dump(exclude_unset=True)
        if "location" in data and data["location"] is not None:
            # pydantic already validated it into a GeoPoint shape
            geo = GeoPoint(**data["location"]) if isinstance(
                data["location"], dict
            ) else data["location"]
            client.location = _point_from_geo(geo)
            data.pop("location")

        for field, value in data.items():
            setattr(client, field, value)

        client.updated_at = _utcnow()
        await db.flush()
        await db.refresh(client)
        return client

    # Maps to router.delete("/{client_id}", response_model=ClientResponse)
    async def deactivate_client(
        self, db: AsyncSession, client_id: uuid.UUID
    ) -> bool:
        client = await self.get_client(db, client_id)
        if client is None:
            return False
        client.is_active = False
        client.updated_at = _utcnow()
        await db.flush()
        return True

    # --------------------------------------------------------
    # Emergency contacts
    # --------------------------------------------------------
    # Maps to router.post("/{client_id}/emergency-contacts", response_model=ClientEmergencyContact)
    async def add_emergency_contact(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
        payload: EmergencyContactCreate,
    ) -> ClientEmergencyContact:
        contact = ClientEmergencyContact(
            client_id=client_id,
            full_name=payload.full_name,
            # ORM attribute name; column is "relationship"
            relationship_type=payload.relationship_type,
            phone=payload.phone,
            is_primary=payload.is_primary,
        )
        db.add(contact)
        await db.flush()
        await db.refresh(contact)
        return contact

    # Maps to router.patch("/emergency-contacts/{contact_id}", response_model=ClientEmergencyContact)
    async def update_emergency_contact(
        self,
        db: AsyncSession,
        contact_id: uuid.UUID,
        payload: EmergencyContactUpdate,
    ) -> Optional[ClientEmergencyContact]:
        contact = await db.get(ClientEmergencyContact, contact_id)
        if contact is None:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(contact, field, value)
        await db.flush()
        await db.refresh(contact)
        return contact

    # Maps to router.delete("/emergency-contacts/{contact_id}", response_model=ClientEmergencyContact)
    async def delete_emergency_contact(
        self, db: AsyncSession, contact_id: uuid.UUID
    ) -> bool:
        contact = await db.get(ClientEmergencyContact, contact_id)
        if contact is None:
            return False
        await db.delete(contact)
        await db.flush()
        return True

    # --------------------------------------------------------
    # Family links
    # --------------------------------------------------------
    # Maps to router.post("/{client_id}/family-links", response_model=ClientFamilyLink)
    async def link_family_member(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
        family_member_id: uuid.UUID,
        *,
        is_primary_contact: bool = False,
    ) -> ClientFamilyLink:
        link = ClientFamilyLink(
            client_id=client_id,
            family_member_id=family_member_id,
            is_primary_contact=is_primary_contact,
        )
        db.add(link)
        await db.flush()
        await db.refresh(link)
        return link

    # Maps to router.delete("/{client_id}/family-links/{family_member_id}", response_model=ClientFamilyLink)
    async def unlink_family_member(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
        family_member_id: uuid.UUID,
    ) -> bool:
        link = await db.get(
            ClientFamilyLink, (client_id, family_member_id)
        )
        if link is None:
            return False
        await db.delete(link)
        await db.flush()
        return True

    # --------------------------------------------------------
    # Acuity tiers
    # --------------------------------------------------------
    # Maps to router.post("/{client_id}/acuity-tiers", response_model=ClientAcuityTier)
    async def add_acuity_tier(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
        payload: AcuityTierCreate,
        *,
        actor_user_id: uuid.UUID,
    ) -> ClientAcuityTier:
        tier = ClientAcuityTier(
            client_id=client_id,
            level=payload.level,
            reason_notes=payload.reason_notes,
            assigned_by=actor_user_id,
            effective_from=_utcnow(),
        )
        db.add(tier)
        await db.flush()
        await db.refresh(tier)
        return tier

    # Maps to router.patch("/acuity-tiers/{tier_id}", response_model=ClientAcuityTier)
    async def update_acuity_tier(
        self,
        db: AsyncSession,
        tier_id: uuid.UUID,
        payload: AcuityTierUpdate,
    ) -> Optional[ClientAcuityTier]:
        tier = await db.get(ClientAcuityTier, tier_id)
        if tier is None:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(tier, field, value)
        await db.flush()
        await db.refresh(tier)
        return tier

    # Maps to router.get("/{client_id}/acuity-tiers", response_model=list[ClientAcuityTier])
    async def list_acuity_tiers(
        self, db: AsyncSession, client_id: uuid.UUID
    ) -> Sequence[ClientAcuityTier]:
        stmt = (
            select(ClientAcuityTier)
            .where(ClientAcuityTier.client_id == client_id)
            .order_by(ClientAcuityTier.effective_from.desc())
        )
        return (await db.execute(stmt)).scalars().all()

    # --------------------------------------------------------
    # Diagnoses
    # --------------------------------------------------------

    # Maps to router.get("/{client_id}/diagnoses", response_model=list[ClientDiagnosis])
    async def list_diagnoses(
        self, db: AsyncSession, client_id: uuid.UUID
    ) -> Sequence[ClientDiagnosis]:
        # Load every subclass table (dementia_diagnoses, post_stroke_diagnoses, ...)
        # in the same query. Otherwise subtype columns such as `stage` are lazy-
        # loaded during serialization, which fails under AsyncSession.
        diagnosis = with_polymorphic(ClientDiagnosis, "*")
        stmt = (
            select(diagnosis)
            .where(diagnosis.client_id == client_id)
            .order_by(diagnosis.diagnosed_at.desc())
        )
        return (await db.execute(stmt)).scalars().all()

    # Maps to router.post("/{client_id}/diagnoses", response_model=ClientDiagnosis)
    async def add_diagnosis(
        self,
        db: AsyncSession,
        client_id: uuid.UUID,
        payload,
    ) -> ClientDiagnosis:
        """
        Dispatch by category to the correct polymorphic subclass.
        Caller must pass one of:
          DementiaDiagnosisCreate | PostStrokeDiagnosisCreate |
          ParkinsonsDiagnosisCreate | OtherDiagnosisCreate
        """
        common = dict(
            client_id=client_id,
            diagnosis_definition_id=payload.diagnosis_definition_id,
            category=payload.category,
            notes=payload.notes,
            is_active=True,
        )

        if isinstance(payload, DementiaDiagnosisCreate):
            obj: ClientDiagnosis = DementiaDiagnosis(
                **common, stage=payload.stage
            )
        elif isinstance(payload, PostStrokeDiagnosisCreate):
            obj = PostStrokeDiagnosis(
                **common, affected_side=payload.affected_side
            )
        elif isinstance(payload, ParkinsonsDiagnosisCreate):
            obj = ParkinsonsDiagnosis(**common)
        elif isinstance(payload, OtherDiagnosisCreate):
            obj = ClientDiagnosis(**common)
        else:
            raise TypeError(
                f"Unsupported diagnosis payload: {type(payload).__name__}"
            )

        db.add(obj)
        await db.flush()
        await db.refresh(obj)
        return obj

    # Maps to router.patch("/diagnoses/{diagnosis_id}", response_model=ClientDiagnosis)
    async def update_diagnosis(
        self,
        db: AsyncSession,
        diagnosis_id: uuid.UUID,
        payload: ClientDiagnosisUpdate,
    ) -> Optional[ClientDiagnosis]:
        diag = await db.get(ClientDiagnosis, diagnosis_id)
        if diag is None:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(diag, field, value)
        await db.flush()
        await db.refresh(diag)
        return diag


# ============================================================
# Diagnosis definition service (clinical templates)
# ============================================================

class DiagnosisDefinitionService:

    # Maps to router.get("/diagnosis-definitions/{def_id}", response_model=DiagnosisDefinition)
    async def get(
        self, db: AsyncSession, def_id: uuid.UUID
    ) -> Optional[DiagnosisDefinition]:
        return await db.get(DiagnosisDefinition, def_id)

    # Maps to router.get("/diagnosis-definitions", response_model=list[DiagnosisDefinition])
    async def list(
        self, db: AsyncSession, *, only_active: bool = True
    ) -> Sequence[DiagnosisDefinition]:
        stmt = select(DiagnosisDefinition).order_by(
            DiagnosisDefinition.name
        )
        if only_active:
            stmt = stmt.where(DiagnosisDefinition.is_active.is_(True))
        return (await db.execute(stmt)).scalars().all()

    # Maps to router.post("/diagnosis-definitions", response_model=DiagnosisDefinition)
    async def create(
        self, db: AsyncSession, payload: DiagnosisDefinitionCreate
    ) -> DiagnosisDefinition:
        obj = DiagnosisDefinition(
            category=payload.category,
            name=payload.name,
            description=payload.description,
            is_active=payload.is_active,
        )
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
        return obj

    # Maps to router.patch("/diagnosis-definitions/{def_id}", response_model=DiagnosisDefinition)
    async def update(
        self,
        db: AsyncSession,
        def_id: uuid.UUID,
        payload: DiagnosisDefinitionUpdate,
    ) -> Optional[DiagnosisDefinition]:
        obj = await db.get(DiagnosisDefinition, def_id)
        if obj is None:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(obj, field, value)
        obj.updated_at = _utcnow()
        await db.flush()
        await db.refresh(obj)
        return obj

    # --- requirements -------------------------------------
    # Maps to router.post("/diagnosis-definitions/{def_id}/task-requirements", response_model=DiagnosisTaskRequirement)
    async def add_task_requirement(
        self,
        db: AsyncSession,
        def_id: uuid.UUID,
        payload: DiagnosisTaskRequirementCreate,
    ) -> DiagnosisTaskRequirement:
        req = DiagnosisTaskRequirement(
            diagnosis_definition_id=def_id,
            task_id=payload.task_id,
            is_required=payload.is_required,
            sequence_order=payload.sequence_order,
            instructions=payload.instructions,
        )
        db.add(req)
        await db.flush()
        await db.refresh(req)
        return req

    # Maps to router.post("/diagnosis-definitions/{def_id}/assessment-requirements", response_model=DiagnosisAssessmentRequirement)
    async def add_assessment_requirement(
        self,
        db: AsyncSession,
        def_id: uuid.UUID,
        payload: DiagnosisAssessmentRequirementCreate,
    ) -> DiagnosisAssessmentRequirement:
        req = DiagnosisAssessmentRequirement(
            diagnosis_definition_id=def_id,
            assessment_type=payload.assessment_type,
            is_required=payload.is_required,
            frequency_days=payload.frequency_days,
            instructions=payload.instructions,
        )
        db.add(req)
        await db.flush()
        await db.refresh(req)
        return req

    # Maps to router.post("/diagnosis-definitions/{def_id}/medication-requirements", response_model=DiagnosisMedicationRequirement)
    async def add_medication_requirement(
        self,
        db: AsyncSession,
        def_id: uuid.UUID,
        payload: DiagnosisMedicationRequirementCreate,
    ) -> DiagnosisMedicationRequirement:
        req = DiagnosisMedicationRequirement(
            diagnosis_definition_id=def_id,
            medication_id=payload.medication_id,
            is_required=payload.is_required,
            instructions=payload.instructions,
        )
        db.add(req)
        await db.flush()
        await db.refresh(req)
        return req


# ============================================================
# Module-level singletons (matching your existing pattern)
# ============================================================
client_service = ClientService()
diagnosis_definition_service = DiagnosisDefinitionService()