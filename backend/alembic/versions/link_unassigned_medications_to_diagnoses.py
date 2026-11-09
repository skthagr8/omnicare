"""Link the 20 catalog medications that no diagnosis requires.

Revision ID: l1nk3dm3d520
Revises: d3c0u9l3m3d5
Create Date: 2026-11-08

After decouple_medications_from_clients, a client only receives a medication
through diagnosis_medication_requirements. Only 4 of the 24 catalog drugs had
a requirement, so the other 20 reached nobody. This adds one requirement per
drug to the diagnosis it is indicated for.

All 20 are inserted with is_required = false. Many are ALTERNATIVES to each
other or to an existing required drug (e.g. Apixaban vs Rivaroxaban, Clopidogrel
vs Aggrenox, Memantine/Donepezil vs the two single drugs). They are optional
options for the diagnosis, not drugs every patient with it must take. The
`instructions` text says when each one applies.

REVIEW BEFORE RUNNING: the backend currently lists every linked medication for
every patient with that diagnosis, whatever is_required says.

Diagnoses are looked up by category, medications by name, so the migration does
not depend on generated ids. Pairs that already exist are skipped. Ids are
uuid5, so downgrade() removes exactly the rows this upgrade() inserted.
"""
from __future__ import annotations

import logging
import uuid

import sqlalchemy as sa
from alembic import op

revision = "l1nk3dm3d520"
down_revision = "d3c0u9l3m3d5"
branch_labels = None
depends_on = None

log = logging.getLogger("alembic.runtime.migration")

_NAMESPACE = uuid.UUID("6f1f6a52-3c1e-4a8e-9d1e-2b7f0c9a4d20")

# (diagnosis category, medication name, instructions)
LINKS: list[tuple[str, str, str]] = [
    # --- Post-stroke ---------------------------------------------------------
    ("post_stroke", "Clopidogrel",
     "Antiplatelet alternative to Aspirin/Dipyridamole when that is not tolerated. Give only if prescribed; do not combine with another antiplatelet unless directed."),
    ("post_stroke", "Aspirin",
     "Low-dose antiplatelet. Give only if prescribed; the Aspirin/Dipyridamole combination already contains aspirin, so do not give both."),
    ("post_stroke", "Apixaban",
     "Anticoagulant for stroke with atrial fibrillation. Give only if prescribed; an alternative to Rivaroxaban, never together."),
    ("post_stroke", "Rivaroxaban",
     "Anticoagulant for stroke with atrial fibrillation. Give only if prescribed; an alternative to Apixaban, never together. Give with the evening meal."),
    ("post_stroke", "Baclofen",
     "For post-stroke spasticity, only if prescribed. Never stop abruptly."),
    ("post_stroke", "Tizanidine",
     "For post-stroke spasticity, only if prescribed. Check for drowsiness and low blood pressure on standing."),
    ("post_stroke", "Dantrolene",
     "For post-stroke spasticity, only if prescribed. Requires liver function monitoring."),
    # --- Dementia --------------------------------------------------------------
    ("dementia", "Galantamine",
     "Cholinesterase inhibitor alternative to Donepezil. Give only if prescribed; never together with Donepezil or Rivastigmine."),
    ("dementia", "Memantine / Donepezil",
     "Combination capsule replacing separate Memantine and Donepezil. Give only if prescribed; never with either single drug."),
    ("dementia", "Brexpiprazole",
     "For agitation in Alzheimer's dementia, only if prescribed. Assess fall risk."),
    ("dementia", "Lecanemab",
     "IV infusion for early Alzheimer's, administered under specialist care only. Requires MRI monitoring."),
    ("dementia", "Donanemab",
     "IV infusion for early Alzheimer's, administered under specialist care only. Requires neuro-imaging monitoring."),
    # --- Parkinson's -----------------------------------------------------------
    ("parkinsons", "Carbidopa-Levodopa ER",
     "Extended-release alternative to Carbidopa-Levodopa. Give only if prescribed; never both."),
    ("parkinsons", "Pramipexole",
     "Dopamine agonist, only if prescribed. Watch for impulse-control problems and sudden sleep."),
    ("parkinsons", "Ropinirole",
     "Dopamine agonist alternative to Pramipexole. Give only if prescribed; never both."),
    ("parkinsons", "Entacapone",
     "Add-on only: always given at the same time as Carbidopa-Levodopa, only if prescribed."),
    ("parkinsons", "Rasagiline",
     "MAO-B inhibitor, only if prescribed. Avoid tyramine-rich food. Never with Safinamide."),
    ("parkinsons", "Safinamide",
     "MAO-B inhibitor for 'off' episodes on Carbidopa-Levodopa, only if prescribed. Never with Rasagiline."),
    ("parkinsons", "Rivastigmine",
     "For dementia associated with Parkinson's disease, only if prescribed."),
    ("parkinsons", "Pimavanserin",
     "For hallucinations or delusions in Parkinson's psychosis, only if prescribed."),
]


def _link_id(category: str, medication: str) -> uuid.UUID:
    return uuid.uuid5(_NAMESPACE, f"{category}:{medication}")


def upgrade() -> None:
    bind = op.get_bind()
    diagnoses = dict(bind.execute(sa.text(
        "SELECT category::text, id FROM diagnosis_definitions"
    )).all())
    medications = dict(bind.execute(sa.text("SELECT name, id FROM medications")).all())
    existing = set(bind.execute(sa.text(
        "SELECT diagnosis_definition_id, medication_id FROM diagnosis_medication_requirements"
    )).all())

    inserted = 0
    for category, name, instructions in LINKS:
        diagnosis_id = diagnoses.get(category)
        medication_id = medications.get(name)
        if diagnosis_id is None or medication_id is None:
            log.warning("Skipping %s -> %s: %s not found.", category, name,
                        "diagnosis" if diagnosis_id is None else "medication")
            continue
        if (diagnosis_id, medication_id) in existing:
            log.info("Skipping %s -> %s: already linked.", category, name)
            continue
        bind.execute(
            sa.text("""
                INSERT INTO diagnosis_medication_requirements
                    (id, diagnosis_definition_id, medication_id, is_required, instructions)
                VALUES (:id, :diagnosis_id, :medication_id, false, :instructions)
            """),
            {"id": _link_id(category, name), "diagnosis_id": diagnosis_id,
             "medication_id": medication_id, "instructions": instructions},
        )
        inserted += 1
    log.info("Linked %s medication(s) to diagnoses.", inserted)


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM diagnosis_medication_requirements WHERE id = ANY(:ids)"),
        {"ids": [_link_id(category, name) for category, name, _ in LINKS]},
    )
