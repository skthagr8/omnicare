"""Admin intake: register a new client with diagnoses, initial acuity and emergency contacts.

Everything is written in the request's single transaction (get_db commits once at the end),
so a failure at any step leaves no partially-registered client behind.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ClientDiagnosisCategory
from app.modules.auth.models import User
from app.modules.clients.care_plan import resolve_care_plan
from app.modules.clients.models import Client, DiagnosisDefinition
from app.modules.clients.schemas import (
    IntakeCarePlanSummary,
    AcuityTierCreate,
    ClientCreate,
    ClientIntakeCreate,
    ClientIntakeResponse,
    ClientResponse,
    DementiaDiagnosisCreate,
    DiagnosisDefinitionResponse,
    EmergencyContactCreate,
    IntakeOptions,
    IntakeOrganization,
    OtherDiagnosisCreate,
    ParkinsonsDiagnosisCreate,
    PostStrokeDiagnosisCreate,
)
from app.modules.clients.service import client_service
from app.modules.organisations.models import Organization


async def intake_options(db: AsyncSession, actor: User) -> IntakeOptions:
    orgs = (await db.execute(select(Organization.id, Organization.name).order_by(Organization.name))).all()
    definitions = (
        await db.execute(
            select(DiagnosisDefinition)
            .where(DiagnosisDefinition.is_active.is_(True))
            .order_by(DiagnosisDefinition.category, DiagnosisDefinition.name)
        )
    ).scalars().all()
    return IntakeOptions(
        organizations=[IntakeOrganization(id=o.id, name=o.name) for o in orgs],
        default_org_id=actor.org_id,
        diagnosis_definitions=[DiagnosisDefinitionResponse.model_validate(d) for d in definitions],
    )


def _diagnosis_payload(definition: DiagnosisDefinition, item):
    common = dict(diagnosis_definition_id=definition.id, notes=item.notes)
    category = definition.category
    if category == ClientDiagnosisCategory.DEMENTIA:
        return DementiaDiagnosisCreate(**common, stage=item.stage)
    if category == ClientDiagnosisCategory.POST_STROKE:
        return PostStrokeDiagnosisCreate(**common, affected_side=item.affected_side)
    if category == ClientDiagnosisCategory.PARKINSONS:
        return ParkinsonsDiagnosisCreate(**common)
    return OtherDiagnosisCreate(**common)


async def register_client(db: AsyncSession, actor: User, data: ClientIntakeCreate) -> ClientIntakeResponse:
    if await db.get(Organization, data.org_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organisation not found")

    # Diagnosis definitions must exist and be active; the category comes from the definition.
    def_ids = {d.diagnosis_definition_id for d in data.diagnoses}
    if len(def_ids) != len(data.diagnoses):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "The same diagnosis was added twice")
    definitions = {
        d.id: d
        for d in (
            await db.execute(
                select(DiagnosisDefinition).where(
                    DiagnosisDefinition.id.in_(def_ids), DiagnosisDefinition.is_active.is_(True)
                )
            )
        ).scalars()
    }
    if missing := def_ids - definitions.keys():
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown or inactive diagnosis: {', '.join(map(str, missing))}")

    # Guard against registering the same person twice (same name + date of birth).
    if not data.allow_duplicate:
        existing = await db.scalar(
            select(Client.id).where(
                func.lower(Client.full_name) == data.full_name.lower(),
                Client.date_of_birth == data.date_of_birth,
            ).limit(1)
        )
        if existing:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail={
                    "code": "possible_duplicate",
                    "message": f"A client named {data.full_name} with this date of birth is already registered.",
                    "client_id": str(existing),
                },
            )

    client = await client_service.create_client(
        db,
        ClientCreate(
            full_name=data.full_name,
            date_of_birth=data.date_of_birth,
            address_text=data.address_text,
            gender=data.gender,
            location=data.location,
            residence=data.residence,
            assessment_observations=data.assessment_observations,
        ),
        org_id=data.org_id,
        actor_user_id=actor.id,
    )

    for item in data.diagnoses:
        await client_service.add_diagnosis(db, client.id, _diagnosis_payload(definitions[item.diagnosis_definition_id], item))

    await client_service.add_acuity_tier(
        db,
        client.id,
        AcuityTierCreate(level=data.acuity.level, reason_notes=data.acuity.reason_notes),
        actor_user_id=actor.id,
    )

    for contact in data.emergency_contacts:
        await client_service.add_emergency_contact(
            db,
            client.id,
            EmergencyContactCreate(
                full_name=contact.full_name.strip(),
                relationship_type=contact.relationship_type.strip(),
                phone=contact.phone.strip(),
                is_primary=contact.is_primary,
            ),
        )

    plan = await resolve_care_plan(db, client.id)
    return ClientIntakeResponse(
        client=ClientResponse.model_validate(client),
        diagnoses_created=len(data.diagnoses),
        contacts_created=len(data.emergency_contacts),
        acuity=data.acuity.level,
        care_plan=IntakeCarePlanSummary(**plan.summary.model_dump()),
    )
