"""A client's care plan, resolved from their active diagnoses.

Care plans are not stored per client: client_diagnoses -> diagnosis_definitions ->
diagnosis_{task,assessment,medication}_requirements. Visits pick these up automatically
(tasks via TaskService.ensure_diagnosis_tasks, assessments and medications per session).
Assigning a diagnosis therefore assigns its care plan; this module only makes it visible.
"""
import uuid
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.clients.models import (
    ClientDiagnosis,
    DiagnosisAssessmentRequirement,
    DiagnosisDefinition,
    DiagnosisMedicationRequirement,
    DiagnosisTaskRequirement,
)
from app.modules.medications.models import Medication
from app.modules.tasks.models import Task


class CarePlanDiagnosis(BaseModel):
    category: str
    name: str


class CarePlanTask(BaseModel):
    task_id: uuid.UUID
    name: str
    description: Optional[str] = None
    priority: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_required: bool
    instructions: Optional[str] = None
    from_diagnoses: list[str]


class CarePlanAssessment(BaseModel):
    assessment_type: str
    is_required: bool
    frequency_days: Optional[int] = None
    instructions: Optional[str] = None
    from_diagnoses: list[str]


class CarePlanMedication(BaseModel):
    medication_id: uuid.UUID
    name: str
    dosage: str
    drug_class: Optional[str] = None
    is_required: bool
    instructions: Optional[str] = None
    from_diagnoses: list[str]


class CarePlanSummary(BaseModel):
    tasks: int
    assessments: int
    medications: int


class CarePlan(BaseModel):
    client_id: uuid.UUID
    diagnoses: list[CarePlanDiagnosis]
    tasks: list[CarePlanTask]
    assessments: list[CarePlanAssessment]
    medications: list[CarePlanMedication]
    summary: CarePlanSummary


def _merge(items: dict, key, build, diagnosis_name: str, required: bool):
    """One entry per item; required if any diagnosis requires it; remembers which diagnoses ask for it."""
    if key in items:
        items[key].is_required = items[key].is_required or required
        if diagnosis_name not in items[key].from_diagnoses:
            items[key].from_diagnoses.append(diagnosis_name)
    else:
        items[key] = build()


async def resolve_care_plan(db: AsyncSession, client_id: uuid.UUID) -> CarePlan:
    active = (
        await db.execute(
            select(DiagnosisDefinition.id, DiagnosisDefinition.category, DiagnosisDefinition.name)
            .join(ClientDiagnosis, ClientDiagnosis.diagnosis_definition_id == DiagnosisDefinition.id)
            .where(
                ClientDiagnosis.client_id == client_id,
                ClientDiagnosis.is_active.is_(True),
                DiagnosisDefinition.is_active.is_(True),
            )
            .distinct()
        )
    ).all()
    def_ids = [d.id for d in active]
    names = {d.id: d.name for d in active}

    tasks: dict = {}
    assessments: dict = {}
    medications: dict = {}
    if def_ids:
        for req, task in await db.execute(
            select(DiagnosisTaskRequirement, Task)
            .join(Task, Task.id == DiagnosisTaskRequirement.task_id)
            .where(
                DiagnosisTaskRequirement.diagnosis_definition_id.in_(def_ids),
                Task.is_active.is_(True),
                Task.deleted_at.is_(None),
            )
            .order_by(DiagnosisTaskRequirement.sequence_order)
        ):
            dname = names[req.diagnosis_definition_id]
            _merge(tasks, task.id, lambda: CarePlanTask(
                task_id=task.id, name=task.name, description=task.description,
                priority=getattr(task.priority, "value", task.priority),
                duration_minutes=task.anticipated_duration_minutes, is_required=req.is_required,
                instructions=req.instructions, from_diagnoses=[dname],
            ), dname, req.is_required)

        for (req,) in await db.execute(
            select(DiagnosisAssessmentRequirement)
            .where(DiagnosisAssessmentRequirement.diagnosis_definition_id.in_(def_ids))
        ):
            dname = names[req.diagnosis_definition_id]
            atype = getattr(req.assessment_type, "value", req.assessment_type)
            _merge(assessments, atype, lambda: CarePlanAssessment(
                assessment_type=atype, is_required=req.is_required, frequency_days=req.frequency_days,
                instructions=req.instructions, from_diagnoses=[dname],
            ), dname, req.is_required)
            # Most frequent requirement wins when two diagnoses ask for the same assessment.
            current = assessments[atype]
            if req.frequency_days and (current.frequency_days is None or req.frequency_days < current.frequency_days):
                current.frequency_days = req.frequency_days

        for req, med in await db.execute(
            select(DiagnosisMedicationRequirement, Medication)
            .join(Medication, Medication.id == DiagnosisMedicationRequirement.medication_id)
            .where(
                DiagnosisMedicationRequirement.diagnosis_definition_id.in_(def_ids),
                Medication.is_active.is_(True),
            )
        ):
            dname = names[req.diagnosis_definition_id]
            _merge(medications, med.id, lambda: CarePlanMedication(
                medication_id=med.id, name=med.name, dosage=med.dosage,
                drug_class=getattr(med.drug_class, "value", med.drug_class), is_required=req.is_required,
                instructions=req.instructions, from_diagnoses=[dname],
            ), dname, req.is_required)

    task_list = list(tasks.values())
    assessment_list = sorted(assessments.values(), key=lambda a: (not a.is_required, a.assessment_type))
    medication_list = sorted(medications.values(), key=lambda m: (not m.is_required, m.name.lower()))
    return CarePlan(
        client_id=client_id,
        diagnoses=[CarePlanDiagnosis(category=getattr(d.category, "value", d.category), name=d.name) for d in active],
        tasks=task_list,
        assessments=assessment_list,
        medications=medication_list,
        summary=CarePlanSummary(tasks=len(task_list), assessments=len(assessment_list), medications=len(medication_list)),
    )
