# Import all ORM models to populate SQLAlchemy's registry
import app.modules.registry  # noqa: F401

import asyncio
import sys
import traceback
import uuid

import app.db.base  # noqa: F401
from app.core.database import async_session_factory, close_db
from app.core.enums import AssessmentType
from app.modules.clients.schemas import (
    DiagnosisAssessmentRequirementCreate,
    DiagnosisAssessmentRequirementResponse,
    DiagnosisDefinitionResponse,
    DiagnosisDefinitionUpdate,
    DiagnosisMedicationRequirementCreate,
    DiagnosisMedicationRequirementResponse,
    DiagnosisTaskRequirementCreate,
    DiagnosisTaskRequirementResponse,
)
from app.modules.clients.service import diagnosis_definition_service


async def debug_definitions(
    diagnosis_definition_id_str: str,
    task_id_str: str,
    med_id_str: str,
) -> None:
    diagnosis_definition_id = uuid.UUID(diagnosis_definition_id_str)
    task_id = uuid.UUID(task_id_str)
    med_id = uuid.UUID(med_id_str)

    async with async_session_factory() as db:
        try:
            print("=== 1. Diagnosis Definition CRUD (existing definition) ===")
            fetched = await diagnosis_definition_service.get(db, diagnosis_definition_id)
            print("[OK] Fetched Definition Name:", DiagnosisDefinitionResponse.model_validate(fetched).name)

            updated = await diagnosis_definition_service.update(
                db, diagnosis_definition_id, DiagnosisDefinitionUpdate(description="Updated description instructions.")
            )
            print("[OK] Updated Definition:", DiagnosisDefinitionResponse.model_validate(updated).description)

            definitions = await diagnosis_definition_service.list(db, only_active=True)
            print(f"[OK] Listed {len(definitions)} active definitions")

            print("\n=== 2. Adding Requirement Mappings ===")
            task_req = await diagnosis_definition_service.add_task_requirement(
                db,
                diagnosis_definition_id,
                DiagnosisTaskRequirementCreate(
                    task_id=task_id, is_required=True, sequence_order=1, instructions="Gait evaluation"
                ),
            )
            print("[OK] Task Requirement:", DiagnosisTaskRequirementResponse.model_validate(task_req).model_dump())

            assessment_req = await diagnosis_definition_service.add_assessment_requirement(
                db,
                diagnosis_definition_id,
                DiagnosisAssessmentRequirementCreate(
                    assessment_type=AssessmentType.TUG,
                    is_required=True,
                    frequency_days=14,
                    instructions="Bi-weekly Timed Up & Go",
                ),
            )
            print("[OK] Assessment Requirement:", DiagnosisAssessmentRequirementResponse.model_validate(assessment_req).model_dump())

            med_req = await diagnosis_definition_service.add_medication_requirement(
                db,
                diagnosis_definition_id,
                DiagnosisMedicationRequirementCreate(
                    medication_id=med_id, is_required=True, instructions="Administer with breakfast"
                ),
            )
            print("[OK] Medication Requirement:", DiagnosisMedicationRequirementResponse.model_validate(med_req).model_dump())

        except Exception:
            traceback.print_exc()

    await close_db()


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python debug_definitions.py <DIAGNOSIS_DEFINITION_UUID> <TASK_UUID> <MEDICATION_UUID>")
        sys.exit(1)
    asyncio.run(debug_definitions(sys.argv[1], sys.argv[2], sys.argv[3]))