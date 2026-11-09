from __future__ import annotations

"""Seed OmniCare care-plan reference data.

Revision ID: 7c1e5a90b2d4
Revises: <SET THIS to your current alembic head before running>
Create Date: 2026-11-01

What this does
--------------
* Seeds: diagnosis_definitions, client_acuity_tiers, client_diagnoses,
  dementia_diagnoses, parkinsons_diagnoses, post_stroke_diagnoses,
  medications, tasks, diagnosis_assessment_requirements,
  diagnosis_medication_requirements, diagnosis_task_requirements.
* NEVER writes to `clients`. Every client_id used is read from `clients`.
  Three DISTINCT real clients are picked at random to play Margaret / Harold /
  Ama; medications get one randomly chosen real client per row.
* WIPES `tasks` and `medications` first (as requested). To make that possible
  the two requirement tables that point at them are wiped too (they are
  re-seeded below). If any OTHER table still holds rows pointing at tasks or
  medications, the migration aborts instead of silently deleting them.
* Schema-defensive: tables are reflected, unknown columns are skipped with a
  warning, enum labels are matched case-insensitively, id column types
  (UUID or string) are detected, and required columns that we cannot fill
  raise a clear error before anything is half-written.
* Ids are deterministic (uuid5 / symbolic keys) so downgrade() can remove
  exactly what upgrade() inserted.
* medication_schedules: one or more rows per seeded medication (default = its
  window_start_local, every day; see SCHEDULE_OVERRIDES). Uses the SAME
  medication ids seeded here.
* medication_administrations: a small sample history (administered / refused /
  missed / pending) linked to the seeded medication AND its schedule row.
  session_id and recorded_by are read from existing caregiver_sessions /
  caregivers rows (never created here). If either table is empty or missing,
  administrations are skipped with a warning; everything else still seeds.
* Administrations are clinical history (FK RESTRICT on medications). The wipe
  of `medications` therefore ABORTS if any administration exists that this
  migration did not create.

Source-document inconsistencies handled (see MED_REQS / TASK_REQS below):
  - "d1/d2/d3" in the assessment table == dd1/dd2/dd3 in diagnosis_definitions.
  - Symbolic ids such as med_donepezil / task_orient do not exist in the data
    given; they are mapped to the closest real medication / task by NAME.
    Requirements with no real counterpart (statin, quetiapine, continence
    task) are skipped with a logged warning, unless SEED_SUPPLEMENTAL_MEDS
    is True (adds atorvastatin + quetiapine rows).
"""


import datetime as dt
import logging
import random
import uuid

import sqlalchemy as sa
from alembic import op

revision = "7c1e5a90b2d4"
down_revision = "20261102_expand_drug_class"
  # TODO: set to your current head, e.g. "a1b2c3d4e5f6"
branch_labels = None
depends_on = None

log = logging.getLogger("alembic.runtime.migration")

NS = uuid.UUID("6f0f5d0e-3a52-4c55-9d52-0c8e7c1b9a11")
SEED_SUPPLEMENTAL_MEDS = False  # see module docstring

REQUIRED_TABLES = [
    "clients",
    "diagnosis_definitions",
    "client_acuity_tiers",
    "client_diagnoses",
    "dementia_diagnoses",
    "parkinsons_diagnoses",
    "post_stroke_diagnoses",
    "medications",
    "tasks",
    "diagnosis_assessment_requirements",
    "diagnosis_medication_requirements",
    "diagnosis_task_requirements",
    "medication_schedules",
    "medication_administrations",
]
# Read-only lookups (never written). Needed only for administrations.
OPTIONAL_TABLES = ["caregiver_sessions", "caregivers"]
# Tables this migration is allowed to touch while wiping tasks/medications.
MANAGED = set(REQUIRED_TABLES)

ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]  # ISO weekdays, 1 = Monday
EAT = dt.timezone(dt.timedelta(hours=3))  # Africa/Nairobi

# Source-document value -> your DB enum label, per (table, column).
# client_acuity_tiers.level is a traffic-light enum in the DB (green/amber/red).
ENUM_ALIASES = {
    ("client_acuity_tiers", "level"): {"HIGH": "red", "MEDIUM": "amber", "LOW": "green"},
}

# --------------------------------------------------------------------------
# SEED DATA
# --------------------------------------------------------------------------
TS = "2024-01-01 00:00:00"
DEFINITIONS = [
    ("dd1", "DEMENTIA", "Dementia",
     "Progressive cognitive decline affecting memory, reasoning, and daily function"),
    ("dd2", "POST_STROKE", "PostStroke",
     "Recovery and rehabilitation following a cerebrovascular event"),
    ("dd3", "PARKINSONS", "Parkinson's Disease",
     "Neurodegenerative movement disorder with motor and non-motor symptoms"),
    ("dd4", "OTHER", "Other",
     "Catch-all for diagnoses outside the specialized templates"),
]

# persona keys: m = Margaret, h = Harold, a = Ama
ACUITY = [
    ("ac1", "m", "HIGH", "Wandering risk; needs 24h supervision", "2024-01-01", "2024-06-01"),
    ("ac2", "m", "MEDIUM", "Improved stability after medication adjustment", "2024-06-01", None),
    ("ac3", "h", "MEDIUM", "Mobility assistance required, swallow precautions", "2023-02-01", None),
    ("ac4", "a", "HIGH", "Frequent falls; medication timing critical", "2023-05-01", "2024-01-01"),
    ("ac5", "a", "LOW", "Stable on adjusted levodopa regimen", "2024-01-01", None),
]

CLIENT_DX = [
    ("cd1", "m", "dd1", "DEMENTIA", "2022-06-01", True, "Moderate stage; evening confusion"),
    ("cd2", "h", "dd2", "POST_STROKE", "2023-01-15", True, "Left-side weakness, swallow risk"),
    ("cd3", "a", "dd3", "PARKINSONS", "2021-09-10", True, "Motor fluctuations, on/off"),
    ("cd4", "m", "dd2", "POST_STROKE", "2024-02-20", True, "Secondary diagnosis after minor stroke"),
    ("cd5", "h", "dd4", "OTHER", "2024-03-01", False, "Historical; resolved"),
]
DEMENTIA_DX = [("cd1", "Moderate")]
PARKINSONS_DX = [("cd3",)]
POST_STROKE_DX = [("cd2", "Left"), ("cd4", "Right")]

# (name, drug_class, dosage, instructions, window_start, window_end, description)
MEDICATIONS = [
    # --- Post-stroke ---
    ("Clopidogrel", "ANTIPLATELETS_SECONDARY_STROKE_PREVENTION", "75mg",
     "Monitor for bruising, bleeding, or dark, tarry stools.", "08:00", "10:00",
     "Brand: Plavix. Commonly prescribed for ischemic stroke patients who cannot tolerate aspirin."),
    ("Aspirin / Extended-Release Dipyridamole", "ANTIPLATELETS_COMBINATION_THERAPY", "25mg/200mg",
     "Headaches are a very frequent side effect early in treatment.", "08:00", "10:00",
     "Brand: Aggrenox. Combines two antiplatelet mechanisms to prevent recurrent ischemic stroke."),
    ("Apixaban", "DIRECT_ORAL_ANTICOAGULANTS_DOACS", "5mg",
     "Must be given consistently twice daily.", "08:00", "10:00",
     "Brand: Eliquis. Highly specific for secondary stroke prevention in patients diagnosed with atrial fibrillation (AFib)."),
    ("Rivaroxaban", "DIRECT_ORAL_ANTICOAGULANTS_DOACS", "20mg",
     "Higher strengths must be taken strictly with the evening meal to ensure proper bioavailability.", "18:00", "20:00",
     "Brand: Xarelto. Prescribed for cardioembolic stroke prevention."),
    ("Baclofen", "GABA_B_RECEPTOR_AGONISTS_POST_STROKE_SPASTICITY", "10mg",
     "Abrupt withdrawal must be avoided to prevent seizures.", "08:00", "10:00",
     "Brand: Lioresal. Prescribed to treat severe hypertonia and limb muscle spasms caused by stroke lesions."),
    ("Tizanidine", "CENTRAL_ALPHA_2_ADRENERGIC_AGONISTS_SPASTICITY", "4mg",
     "Can cause profound, acute drowsiness and dry mouth; check blood pressure for orthostatic drops.", "20:00", "22:00",
     "Brand: Zanaflex. Used to manage upper motor neuron muscle tone following a stroke."),
    ("Dantrolene", "PERIPHERALLY_ACTING_MUSCLE_RELAXANTS", "25mg",
     "Requires baseline and ongoing liver function monitoring due to hepatotoxicity risk.", "08:00", "10:00",
     "Brand: Dantrium. Acts directly on the muscle cells to relieve spasticity after stroke."),
    # --- Dementia ---
    ("Donepezil", "CHOLINOMIMETICS_CHOLINESTERASE_INHIBITORS", "5mg",
     "Routinely given at bedtime to minimize nausea. Monitor for bradycardia and fainting risks.", "21:00", "22:00",
     "Brand: Aricept. Indicated for mild, moderate, and severe Alzheimer's dementia."),
    ("Galantamine", "CHOLINOMIMETICS_CHOLINESTERASE_INHIBITORS", "8mg",
     "Extended-release version is taken once daily with the morning meal to help reduce severe GI distress.", "08:00", "09:00",
     "Brand: Razadyne. Indicated for mild-to-moderate Alzheimer's disease."),
    ("Memantine", "NMDA_RECEPTOR_ANTAGONISTS", "10mg",
     "Can be administered with or without food.", "08:00", "10:00",
     "Brand: Namenda. Prescribed for moderate-to-severe Alzheimer's disease. Protects neurons against toxic levels of glutamate."),
    ("Memantine / Donepezil", "DUAL_MECHANISM_COMBINATIONS", "14mg/10mg",
     "Once-daily capsule to lower pill burden and improve compliance in advanced stages.", "21:00", "22:00",
     "Brand: Namzaric. Combines an NMDA antagonist and a cholinesterase inhibitor."),
    ("Brexpiprazole", "SEROTONIN_DOPAMINE_ACTIVITY_MODULATORS_SDAMS", "1mg",
     "Assess carefully for elevated fall risks.", "08:00", "10:00",
     "Brand: Rexulti. Explicitly FDA-approved to treat severe agitation and behavioral symptoms associated with Alzheimer's disease dementia."),
    ("Lecanemab", "AMYLOID_BETA_DIRECTED_ANTIBODIES_DISEASE_MODIFYING", "10mg/kg IV",
     "Requires serial MRI monitoring for ARIA side effects.", "09:00", "11:00",
     "Brand: Leqembi. Intravenous infusion targeting amyloid plaques in patients with early Alzheimer's or Mild Cognitive Impairment."),
    ("Donanemab", "AMYLOID_BETA_DIRECTED_ANTIBODIES_DISEASE_MODIFYING", "700mg IV",
     "Requires meticulous neuro-imaging monitoring.", "09:00", "11:00",
     "Brand: Kisunla. Monoclonal antibody infusion targeting specific amyloid plaques to slow clinical decline in early Alzheimer's."),
    # --- Parkinson's ---
    ("Carbidopa-Levodopa", "DECARBOXYLASE_INHIBITOR_DOPAMINE_PRECURSOR", "25mg/100mg",
     "Must be given on a strict, unyielding time schedule. High-protein meals interfere with gut absorption and must be separated by 60 minutes.",
     "08:00", "08:15", "Brand: Sinemet. The gold-standard treatment."),
    ("Carbidopa-Levodopa ER", "EXTENDED_RELEASE_DOPAMINE_PRECURSORS", "23.75mg/95mg",
     "Designed to prolong 'on' time and smooth out severe motor fluctuations.", "08:00", "08:15",
     "Brand: Rytary. A specialized capsule containing an immediate/extended bead ratio."),
    ("Pramipexole", "NON_ERGOT_DOPAMINE_RECEPTOR_AGONISTS", "0.25mg",
     "Monitor for impulse control disorders (e.g., hyper-shopping, gambling) and sudden daytime 'sleep attacks'.", "08:00", "10:00",
     "Brand: Mirapex. Directly stimulates dopamine receptors."),
    ("Ropinirole", "NON_ERGOT_DOPAMINE_RECEPTOR_AGONISTS", "0.25mg",
     "Often titrated slowly due to risks of severe orthostatic hypotension and nausea. Hallucinations can occur in older patients.", "08:00", "10:00",
     "Brand: Requip. Mimics dopamine actions."),
    ("Entacapone", "CATECHOL_O_METHYLTRANSFERASE_COMT_INHIBITORS", "200mg",
     "Must always be administered concurrently with Carbidopa-Levodopa. Harmlessly discolors urine brownish-orange.", "08:00", "08:15",
     "Brand: Comtan. Extends the half-life of Carbidopa-Levodopa and prevents premature breakdown."),
    ("Rasagiline", "SELECTIVE_IRREVERSIBLE_MAO_B_INHIBITORS", "1mg",
     "Requires caution regarding tyramine-rich food and drug interactions.", "08:00", "10:00",
     "Brand: Azilect. Used as monotherapy or an adjunct to Levodopa to increase dopamine levels in the brain synaptic cleft."),
    ("Safinamide", "REVERSIBLE_MAO_B_INHIBITORS_GLUTAMATE_MODULATORS", "50mg",
     "Screen for severe optical or retinal changes during therapy.", "08:00", "10:00",
     "Brand: Xadago. Prescribed specifically to treat 'off' episodes in patients taking Carbidopa-Levodopa."),
    ("Rivastigmine", "CHOLINOMIMETICS_PARKINSONS_DEMENTIA_SPECIFIC", "1.5mg",
     "Transdermal patches help bypass severe GI nausea.", "08:00", "10:00",
     "Brand: Exelon. The only cholinesterase inhibitor specifically indicated for dementia associated with Parkinson's disease."),
    ("Pimavanserin", "INVERSE_SEROTONIN_AGONISTS_PD_PSYCHOSIS_SPECIFIC", "34mg",
     "Uniquely does not worsen motor symptoms because it avoids blocking dopamine.", "21:00", "22:00",
     "Brand: Nuplazid. Indicated strictly for hallucinations and delusions associated with Parkinson's disease psychosis."),
]

# Only used when SEED_SUPPLEMENTAL_MEDS is True (NOT in the source document).
SUPPLEMENTAL_MEDICATIONS = [
    ("Atorvastatin", "HMG_COA_REDUCTASE_INHIBITORS_STATINS", "80mg",
     "Secondary stroke prevention; report unexplained muscle pain.", "20:00", "22:00",
     "Brand: Lipitor. Supplemental row so the post-stroke statin requirement can be linked."),
    ("Quetiapine", "ATYPICAL_ANTIPSYCHOTICS_PD_PSYCHOSIS", "12.5mg",
     "Lowest possible dose at bedtime; avoid haloperidol.", "21:00", "22:00",
     "Brand: Seroquel. Supplemental row so the Parkinson's psychosis requirement can be linked."),
]

# (name, description, minutes, priority, group)
TASKS = [
    # Post-stroke
    ("Skin Integrity & Baseline Check",
     "08:00-08:30 (Arrival & Assessment): Inspect skin on the affected/hemiplegic side for redness or pressure sores from overnight positioning. Assess for acute changes in facial symmetry or worsening dysarthria (slurred speech).",
     30, "high"),
    ("Hemiplegic Dressing & Morning Med Pass",
     "08:30-10:00 (Morning ADLs & Meds): Dress the patient by putting clothing onto the affected (weak) limb first; reverse the order when undressing. Administer antiplatelet (Aspirin/Plavix) and blood pressure medications as scheduled.",
     90, "high"),
    ("Therapeutic ROM & Speech Exercises",
     "10:00-11:30 (Mid-Morning Activity): Perform passive or active-assisted ROM exercises on the affected upper and lower limbs to prevent contractures. Conduct 15 minutes of prescribed facial/speech therapeutic exercises.",
     90, "medium"),
    ("Aspiration Prevention Feeding",
     "11:30-13:00 (Lunch & Feeding Safety): Position the patient at a strict 90-degree upright angle. Place food on the unaffected side of the mouth. Visually check the affected cheek for 'pocketing' of unswallowed food after every bite. Keep upright for 30 minutes post-meal.",
     90, "high"),
    ("Unilateral Neglect Spatial Cueing",
     "13:00-14:30 (Rest & Safety Walk): Approach, speak, and place high-contrast items on the patient's affected side to actively counteract left/right spatial neglect. Guide a supervised safety walk using a gait belt, standing on their weaker side.",
     90, "medium"),
    # Dementia
    ("Cognitive Baseline & Delirium Screen",
     "08:00-08:30 (Arrival & Assessment): Assess current cognitive baseline through casual conversation. Screen for sudden behavioral spikes, acute confusion, or signs of hidden physical pain/UTI discomfort.",
     30, "high"),
    ("Single-Step Guided Grooming",
     "08:30-10:00 (Morning ADLs & Meds): Give single-step verbal instructions during bathing (e.g., 'Hold the washcloth'). Lay out clothing sequentially. Administer morning cognitive stabilizers (Donepezil) hidden in applesauce if swallowing is resisted.",
     90, "high"),
    ("Failure-Free Reminiscence Therapy",
     "10:00-11:30 (Mid-Morning Activity): Engage the patient in failure-free cognitive activities. Use tactile matching games, sorting familiar objects, looking at historical photos, or playing familiar music from their youth to encourage positive recall.",
     90, "medium"),
    ("High-Contrast Visual Feeding",
     "11:30-13:00 (Lunch & Nutritional Intake): Serve food on a solid, highly contrasting plate (e.g., bright red or blue) so the patient can visually isolate the food from the dish. Limit table settings to one utensil at a time to reduce choice paralysis.",
     90, "medium"),
    ("Environmental De-escalation & Validation",
     "13:00-14:30 (Rest & Sundowning Mitigation): Ensure indoor lighting remains highly illuminated to prevent early shadows that trigger sundowning. If the patient displays exit-seeking behavior or anxiety, use validation therapy rather than arguing or correcting reality.",
     90, "medium"),
    # Parkinson's
    ("Motor Fluctuations & Rigidity Screen",
     "08:00-08:30 (Arrival & Assessment): Evaluate 'on/off' motor tracking status upon waking. Measure the degree of limb rigidity, tremor severity, and presence of orthostatic hypotension before initiating the first transfer.",
     30, "high"),
    ("Strictly Timed Dopamine Pass",
     "08:30-09:30 (Morning Med Pass): Administer Carbidopa-Levodopa precisely at the scheduled minute. Delay high-protein food intake by at least 30-60 minutes to ensure optimal gut absorption of the medication.",
     60, "high"),
    ("Adaptive Dressing & Adaptive Dining",
     "09:30-11:30 (Morning ADLs & Mobility): Assist with adaptive garments utilizing Velcro/magnetic closures instead of buttons. Provide heavily weighted utensils, deep-walled plates, and dual-handled cups during breakfast to manage active tremors.",
     120, "medium"),
    ("Timed Med Pass 2 & Dysphagia Feeding",
     "11:30-13:00 (Lunch & Mid-Day Meds): Administer the second precisely timed dose of Carbidopa-Levodopa. Serve lunch modified to a safe consistency (e.g., minced or thickened liquids) to accommodate Parkinson's-related swallowing difficulties.",
     90, "high"),
    ("Rhythmic Auditory Gait Cueing",
     "13:00-14:30 (Rest & Mobility Exercises): Guide a planned walking exercise utilizing rhythmic auditory commands (e.g., metronome beats or structured verbal chanting '1, 2, 3, step') to actively bypass and break sudden gait-freezing episodes.",
     90, "medium"),
]

# (id, definition, assessment_type, is_required, frequency_days, instructions)
ASSESSMENT_REQS = [
    # Mapped to 'delirium' (cognitive & delirium screening)
    ("dar1", "dd1", "delirium", True, 30,
     "Assess orientation, memory, and ability to follow instructions."),
    # Mapped to 'cmai' (agitation / behavior tracking)
    ("dar2", "dd1", "cmai", True, 7,
     "Use CMAI scale to identify triggers and effective responses for agitation/wandering."),
    # Mapped to 'braden' (fall/pressure risk or general mobility/safety screening)
    ("dar3", "dd1", "braden", True, 30,
     "Assess skin and fall risk; monitor for delirium (acute changes in attention)."),
    # Mapped to 'tug' (Timed Up and Go for neurological status/mobility)
    ("dar4", "dd2", "tug", True, 1,
     "Monitor TUG and mobility q8h and with any change in neurological condition."),
    # Mapped to 'braden' (skin/score tracking)
    ("dar5", "dd2", "braden", False, 7,
     "Use Braden scale on Day 4 if patient has appropriate cognition; report scores."),
    # Mapped to 'tug' (motor symptoms / functional mobility tracking)
    ("dar6", "dd3", "tug", True, 90,
     "Track motor symptoms and functional mobility staging accurately."),
    # Mapped to 'tug' (mobility / disease staging)
    ("dar7", "dd3", "tug", True, 90,
     "Assess disease stage to guide care planning and goals."),
    # Mapped to 'braden' / 'tug' (fall and risk screening)
    ("dar8", "dd3", "braden", True, 30,
     "Screen for high-risk factors like frequent falls and swallowing difficulties."),
]

# (id, definition, medication NAME, is_required, instructions)
MED_REQS = [
    ("dmr1", "dd1", "Donepezil", True,
     "For mild-to-moderate dementia: start 5 mg/day, can increase to 10 mg/day after 4 weeks."),
    ("dmr2", "dd1", "Memantine", False,
     "For moderate-to-severe: start 5 mg/day, titrate up to 20 mg/day. May be added to AChE inhibitor."),
    # med_aspirin -> only aspirin-containing product in the supplied med list
    ("dmr3", "dd2", "Aspirin / Extended-Release Dipyridamole", True,
     "Antiplatelet for secondary prevention (unless contraindicated)."),
    # med_statin -> not in supplied med list (needs SEED_SUPPLEMENTAL_MEDS)
    ("dmr4", "dd2", "Atorvastatin", True,
     "Use simvastatin 40mg or atorvastatin 80mg for ischemic stroke, regardless of baseline LDL."),
    ("dmr5", "dd3", "Carbidopa-Levodopa", True,
     "Do not crush modified-release preparations. Give on an empty stomach (30 min before food) for best absorption."),
    # med_quetiapine -> not in supplied med list (needs SEED_SUPPLEMENTAL_MEDS)
    ("dmr6", "dd3", "Quetiapine", False,
     "If antipsychotic needed for hallucinations/psychosis, use quetiapine at lowest possible dose (12.5 mg QHS). Avoid haloperidol."),
]

# (id, definition, task NAME or None, is_required, sequence_order, instructions)
# None = the source's symbolic task has no counterpart in the supplied task list.
TASK_REQS = [
    # task_orient
    ("dtr1", "dd1", "Cognitive Baseline & Delirium Screen", True, 1,
     "Provide clocks/calendars; use consistent routines; offer simple explanations before care."),
    # task_fall_prev (dementia flavour: wandering / exit-seeking safety)
    ("dtr2", "dd1", "Environmental De-escalation & Validation", True, 2,
     "Non-slip footwear, bed low, remove hazards; for wanderers, secure exits and use ID bracelets."),
    # task_behavior
    ("dtr3", "dd1", "Failure-Free Reminiscence Therapy", True, 3,
     "Identify unmet needs (pain, hunger); reduce triggers; redirect to structured activities."),
    # task_rom
    ("dtr4", "dd2", "Therapeutic ROM & Speech Exercises", True, 1,
     "Limit ROM of hemiplegic shoulder to 90 degrees; use sling for transfers; encourage ADL participation."),
    # task_continent -> no counterpart in supplied tasks
    ("dtr5", "dd2", None, False, 2,
     "Promote continence using timed voiding: offer toileting q2h and prn."),
    # task_med_timing
    ("dtr6", "dd3", "Strictly Timed Dopamine Pass", True, 1,
     "Ensure strict medication timing; a missed dose is critical. Use medication diaries to track ON/OFF cycles."),
    # task_fall_prev (Parkinson's flavour: gait)
    ("dtr7", "dd3", "Rhythmic Auditory Gait Cueing", True, 2,
     "Screen for falls; use assistive devices; teach safe walking (rock back and forth, pick feet up)."),
    # task_swallow
    ("dtr8", "dd3", "Timed Med Pass 2 & Dysphagia Feeding", True, 3,
     "Assess swallow; upright position during feeding; remain upright 30 min after eating."),
]


# Medication schedules. Default for any medication not listed here:
# a single dose at its window_start_local, every day.
# ASSUMPTIONS (not in the source PDF): twice-daily apixaban, a midday
# levodopa dose (matches the "Timed Med Pass 2" task) and weekly-Monday
# infusions (the table cannot express every-2/4-week cadence).
SCHEDULE_OVERRIDES = {
    "Apixaban": [("08:00", ALL_DAYS), ("20:00", ALL_DAYS)],
    "Carbidopa-Levodopa": [("08:00", ALL_DAYS), ("12:00", ALL_DAYS)],
    "Lecanemab": [("09:00", [1])],
    "Donanemab": [("09:00", [1])],
}

# Sample administration history:
# (id, medication name, scheduled time, days ago, status, missed_reason)
ADMINISTRATIONS = [
    ("adm1", "Donepezil", "21:00", 1, "administered", None),
    ("adm2", "Donepezil", "21:00", 2, "refused", "Patient refused; agitated at bedtime."),
    ("adm3", "Carbidopa-Levodopa", "08:00", 1, "administered", None),
    ("adm4", "Carbidopa-Levodopa", "08:00", 2, "missed", "Caregiver arrived after the dose window."),
    ("adm5", "Carbidopa-Levodopa", "12:00", 1, "administered", None),
    ("adm6", "Clopidogrel", "08:00", 1, "administered", None),
    ("adm7", "Apixaban", "08:00", 1, "administered", None),
    ("adm8", "Apixaban", "20:00", 1, "pending", None),
    ("adm9", "Memantine", "08:00", 3, "administered", None),
    ("adm10", "Rivaroxaban", "18:00", 2, "refused", "Reported nausea; declined evening dose."),
    ("adm11", "Pramipexole", "08:00", 1, "administered", None),
    ("adm12", "Baclofen", "08:00", 3, "missed", "Medication not available at the visit."),
]


def _schedule_plan(med_rows):
    """-> [(key, medication name, 'HH:MM', [iso weekdays])], validated."""
    plan = []
    for m in med_rows:
        name, window_start = m[0], m[4]
        for t, days in SCHEDULE_OVERRIDES.get(name) or [(window_start, ALL_DAYS)]:
            days = sorted(set(days))
            if not days or not set(days) <= set(ALL_DAYS):
                raise RuntimeError(f"Invalid days_of_week {days} for {name}")
            plan.append((f"sched:{name}:{t}", name, t, days))
    return plan


# --------------------------------------------------------------------------
# HELPERS
# --------------------------------------------------------------------------
def _tbl(bind, name):
    return sa.Table(name, sa.MetaData(), autoload_with=bind)


def _is_uuid(col):
    return "UUID" in type(col.type).__name__.upper() or "UNIQUEIDENTIFIER" in type(col.type).__name__.upper()


def _make_id(table, key, force_uuid=False):
    """Deterministic id for `key`, shaped for table.c.id's type."""
    col = table.c["id"]
    u = uuid.uuid5(NS, key)
    if _is_uuid(col):
        return u if getattr(col.type, "as_uuid", True) else str(u)
    if isinstance(col.type, sa.String):
        return str(u) if force_uuid else key
    raise RuntimeError(
        f"{table.name}.id has unsupported type {col.type!r}; expected UUID or string"
    )


def _now_for(col):
    now = dt.datetime.now(dt.timezone.utc)
    return now if getattr(col.type, "timezone", False) else now.replace(tzinfo=None)


def _coerce(col, v):
    if v is None:
        return None
    t = col.type
    if _is_uuid(col):
        u = v if isinstance(v, uuid.UUID) else uuid.UUID(str(v))
        return u if getattr(t, "as_uuid", True) else str(u)
    if isinstance(t, sa.Enum) and getattr(t, "enums", None):
        v = ENUM_ALIASES.get((col.table.name, col.name), {}).get(str(v), v)
        for label in t.enums:
            if label.lower() == str(v).lower():
                return label
        raise ValueError(f"{col.table.name}.{col.name}: {v!r} not in enum {list(t.enums)}")
    if isinstance(t, sa.Time) and isinstance(v, str):
        h, m = (int(x) for x in v.split(":")[:2])
        return dt.time(h, m)
    if isinstance(t, sa.DateTime):
        if isinstance(v, str):
            v = dt.datetime.fromisoformat(v)
        if isinstance(v, dt.datetime):
            if getattr(t, "timezone", False) and v.tzinfo is None:
                v = v.replace(tzinfo=dt.timezone.utc)
            elif not getattr(t, "timezone", False) and v.tzinfo is not None:
                v = v.astimezone(dt.timezone.utc).replace(tzinfo=None)
        return v
    if isinstance(t, sa.Date) and isinstance(v, str):
        return dt.date.fromisoformat(v[:10])
    return v


def _is_required(col):
    return (
        not col.nullable
        and col.default is None
        and col.server_default is None
        and not getattr(col, "identity", None)
    )


def _insert(bind, table, rows):
    for row in rows:
        out = {}
        for k, v in row.items():
            if k not in table.c:
                log.warning("seed: %s has no column %r - skipped", table.name, k)
                continue
            out[k] = _coerce(table.c[k], v)
        for col in table.c:
            if col.name in out:
                continue
            if col.name in ("created_at", "updated_at") and col.server_default is None:
                out[col.name] = _now_for(col)
            elif _is_required(col):
                raise RuntimeError(
                    f"{table.name}.{col.name} is NOT NULL with no default and the "
                    f"seed data has no value for it; extend the migration."
                )
        bind.execute(table.insert().values(**out))


def _delete_ids(bind, table, ids):
    if ids:
        bind.execute(sa.delete(table).where(table.c.id.in_(ids)))


def _resolve_fk_value(bind, insp, table, column, desired):
    """If `table.column` is an FK, make sure the value exists in the parent;
    otherwise fall back to any existing parent row (or None)."""
    for fk in insp.get_foreign_keys(table.name):
        if fk["constrained_columns"] == [column]:
            ref = _tbl(bind, fk["referred_table"])
            rc = ref.c[fk["referred_columns"][0]]
            try:
                hit = bind.execute(
                    sa.select(rc).where(rc == _coerce(rc, desired)).limit(1)
                ).first()
            except (ValueError, TypeError):
                hit = None
            if hit:
                return hit[0]
            any_row = bind.execute(sa.select(rc).limit(1)).first()
            if any_row:
                log.warning("seed: %s.%s=%r not found in %s; using %r",
                            table.name, column, desired, ref.name, any_row[0])
                return any_row[0]
            return None
    return desired


def _guard_references(bind, insp, target):
    """Abort if tables outside our managed set still reference `target` rows."""
    for name in insp.get_table_names():
        if name in MANAGED:
            continue
        for fk in insp.get_foreign_keys(name):
            if fk["referred_table"] != target:
                continue
            t = _tbl(bind, name)
            c = t.c[fk["constrained_columns"][0]]
            n = bind.execute(
                sa.select(sa.func.count()).select_from(t).where(c.isnot(None))
            ).scalar()
            if n:
                raise RuntimeError(
                    f"Refusing to wipe '{target}': table '{name}' has {n} row(s) "
                    f"referencing it via {c.name}. Clear or migrate them first."
                )


def _load_tables(bind):
    insp = sa.inspect(bind)
    missing = [t for t in REQUIRED_TABLES if not insp.has_table(t)]
    if missing:
        raise RuntimeError(f"Missing required table(s): {missing}")
    T = {n: _tbl(bind, n) for n in REQUIRED_TABLES}
    for n in OPTIONAL_TABLES:
        if insp.has_table(n):
            T[n] = _tbl(bind, n)
    return insp, T


def _pick_clients(bind, T):
    clients = T["clients"]
    ids = list(bind.execute(sa.select(clients.c.id)).scalars())
    if len(ids) < 3:
        raise RuntimeError(
            f"Need at least 3 existing clients (found {len(ids)}): Margaret, Harold "
            "and Ama must be distinct clients so each keeps one open acuity tier."
        )
    tiers, dx = T["client_acuity_tiers"], T["client_diagnoses"]
    busy = set(bind.execute(
        sa.select(tiers.c.client_id).where(tiers.c.effective_to.is_(None))
    ).scalars())
    busy |= set(bind.execute(sa.select(dx.c.client_id)).scalars())
    rng = random.SystemRandom()
    clean = [c for c in ids if c not in busy]
    dirty = [c for c in ids if c in busy]
    rng.shuffle(clean)
    rng.shuffle(dirty)
    chosen = (clean + dirty)[:3]
    return dict(zip("mha", chosen)), ids


def _close_open_tiers(bind, T, client_ids):
    tiers = T["client_acuity_tiers"]
    if "effective_to" not in tiers.c:
        return
    today = _coerce(tiers.c.effective_to, dt.date.today().isoformat())
    res = bind.execute(
        sa.update(tiers)
        .where(tiers.c.client_id.in_(client_ids), tiers.c.effective_to.is_(None))
        .values(effective_to=today)
    )
    if res.rowcount:
        log.warning("seed: closed %s pre-existing open acuity tier(s) on chosen clients "
                    "to keep one open tier per client", res.rowcount)


def _guard_administrations(bind, T):
    """Abort if administrations exist that this migration did not create."""
    adm = T["medication_administrations"]
    seeded = [_make_id(adm, a[0], force_uuid=True) for a in ADMINISTRATIONS]
    n = bind.execute(
        sa.select(sa.func.count()).select_from(adm).where(adm.c.id.notin_(seeded))
    ).scalar()
    if n:
        raise RuntimeError(
            f"Refusing to wipe 'medications': {n} medication_administrations row(s) "
            "(clinical history) reference them and were not created by this migration."
        )


def _med_client_pool(bind, T, all_ids):
    """Prefer clients that have caregiver sessions so seeded administrations
    are coherent; fall back to every client."""
    s = T.get("caregiver_sessions")
    if s is not None and "client_id" in s.c:
        valid = set(all_ids)
        pool = [c for c in bind.execute(sa.select(s.c.client_id).distinct()).scalars()
                if c in valid]
        if pool:
            return pool
    return all_ids


def _seed_administrations(bind, insp, T, MED, SCHED):
    adm = T["medication_administrations"]
    sess_t, cg_t = T.get("caregiver_sessions"), T.get("caregivers")
    if sess_t is None or cg_t is None:
        log.warning("seed: caregiver_sessions/caregivers table missing - "
                    "administrations skipped")
        return 0
    sessions = list(bind.execute(sa.select(sess_t).limit(1000)).mappings())
    caregivers = list(bind.execute(sa.select(cg_t.c.user_id)).scalars())
    if not sessions or not caregivers:
        log.warning("seed: no existing caregiver sessions (%d) or caregivers (%d) - "
                    "administrations skipped", len(sessions), len(caregivers))
        return 0

    # Which column on caregiver_sessions points at caregivers (if any)?
    cg_col = None
    for fk in insp.get_foreign_keys("caregiver_sessions"):
        if fk["referred_table"] == "caregivers":
            cg_col = fk["constrained_columns"][0]
            break
    cg_set = set(caregivers)

    meds = T["medications"]
    med_client = dict(bind.execute(sa.select(meds.c.id, meds.c.client_id)).all())
    labels = {l.lower(): l for l in (getattr(adm.c.status.type, "enums", None) or [])}
    rng = random.SystemRandom()
    now = dt.datetime.now(EAT)
    rows = []
    for key, med_name, t, days_ago, status, reason in ADMINISTRATIONS:
        if med_name not in MED or (med_name, t) not in SCHED:
            log.warning("seed: %s skipped - no seeded medication/schedule %r @ %s",
                        key, med_name, t)
            continue
        if labels and status not in labels:
            log.warning("seed: %s skipped - status %r not in enum %s",
                        key, status, list(labels.values()))
            continue
        # Mirror the table's CHECK constraints.
        at = None
        if status == "administered":
            h, m = (int(x) for x in t.split(":"))
            at = (now - dt.timedelta(days=days_ago)).replace(
                hour=h, minute=m, second=0, microsecond=0)
        if status in ("refused", "missed") and not reason:
            raise RuntimeError(f"{key}: reason required for status {status}")

        mid = MED[med_name]
        same = [s for s in sessions
                if "client_id" in s and s["client_id"] == med_client.get(mid)]
        sess = rng.choice(same or sessions)
        recorder = sess.get(cg_col) if cg_col else None
        if recorder not in cg_set:
            recorder = rng.choice(caregivers)
        rows.append({
            "id": _make_id(adm, key, force_uuid=True), "session_id": sess["id"],
            "medication_id": mid, "schedule_id": SCHED[(med_name, t)],
            "status": status, "glucose_check_value": None,
            "administered_at": at, "missed_reason": reason, "recorded_by": recorder,
        })
    _insert(bind, adm, rows)
    return len(rows)


def _preflight_enums(T):
    """Check every enum-typed seed value up front and report ALL mismatches at once."""
    checks = [
        ("client_acuity_tiers", "level", [a[2] for a in ACUITY]),
        ("client_diagnoses", "category", [c[3] for c in CLIENT_DX]),
        ("diagnosis_definitions", "category", [d[1] for d in DEFINITIONS]),
        ("tasks", "priority", [t[3] for t in TASKS]),
        ("diagnosis_assessment_requirements", "assessment_type", [r[2] for r in ASSESSMENT_REQS]),
        ("dementia_diagnoses", "stage", [s for _, s in DEMENTIA_DX]),
        ("post_stroke_diagnoses", "affected_side", [s for _, s in POST_STROKE_DX]),
    ]
    problems = []
    for tname, cname, values in checks:
        if tname not in T or cname not in T[tname].c:
            continue
        typ = T[tname].c[cname].type
        labels = getattr(typ, "enums", None)
        if not (isinstance(typ, sa.Enum) and labels):
            continue
        ok = {l.lower() for l in labels}
        alias = ENUM_ALIASES.get((tname, cname), {})
        bad = sorted({str(v) for v in values if str(alias.get(str(v), v)).lower() not in ok})
        if bad:
            problems.append(f"{tname}.{cname}: {bad} not in {list(labels)}")
    if problems:
        raise RuntimeError(
            "Seed values do not match DB enum labels (nothing was written):\n  "
            + "\n  ".join(problems)
            + "\nAdd mappings to ENUM_ALIASES."
        )


# --------------------------------------------------------------------------
# UPGRADE
# --------------------------------------------------------------------------
def upgrade() -> None:
    bind = op.get_bind()
    insp, T = _load_tables(bind)
    _preflight_enums(T)

    # ---- 1. Wipe tasks & medications (and their dependent requirement rows) ----
    _guard_references(bind, insp, "tasks")
    _guard_references(bind, insp, "medications")
    _guard_administrations(bind, T)
    bind.execute(sa.delete(T["medication_administrations"]))
    bind.execute(sa.delete(T["medication_schedules"]))
    bind.execute(sa.delete(T["diagnosis_task_requirements"]))
    bind.execute(sa.delete(T["diagnosis_medication_requirements"]))
    bind.execute(sa.delete(T["tasks"]))
    bind.execute(sa.delete(T["medications"]))

    # ---- 2. Diagnosis definitions (category is unique -> reuse existing rows) ----
    dd = T["diagnosis_definitions"]
    DD = {}
    for key, category, name, desc in DEFINITIONS:
        cat_val = _coerce(dd.c.category, category)
        row = bind.execute(sa.select(dd.c.id).where(dd.c.category == cat_val)).first()
        if row:
            DD[key] = row[0]
            upd = {"name": name, "description": desc, "is_active": True}
            if "updated_at" in dd.c:
                upd["updated_at"] = _now_for(dd.c.updated_at)
            bind.execute(sa.update(dd).where(dd.c.id == row[0]).values(
                **{k: v for k, v in upd.items() if k in dd.c}))
        else:
            DD[key] = _make_id(dd, key)
            _insert(bind, dd, [{
                "id": DD[key], "category": category, "name": name,
                "description": desc, "is_active": True,
                "created_at": TS, "updated_at": TS,
            }])

    # ---- 3. Clear any previously seeded client-scoped rows, then pick clients ----
    sub = {n: T[n] for n in ("dementia_diagnoses", "parkinsons_diagnoses", "post_stroke_diagnoses")}
    cdx, tiers = T["client_diagnoses"], T["client_acuity_tiers"]
    cd_ids = [_make_id(cdx, k[0]) for k in CLIENT_DX]
    for t in sub.values():
        _delete_ids(bind, t, cd_ids)
    _delete_ids(bind, cdx, cd_ids)
    _delete_ids(bind, tiers, [_make_id(tiers, a[0]) for a in ACUITY])

    who, all_client_ids = _pick_clients(bind, T)
    _close_open_tiers(bind, T, list(who.values()))
    log.info("seed: Margaret=%s Harold=%s Ama=%s", who["m"], who["h"], who["a"])

    # ---- 4. Acuity tiers ----
    assigned_by = "admin1"
    if "assigned_by" in tiers.c:
        assigned_by = _resolve_fk_value(bind, insp, tiers, "assigned_by", "admin1")
        if assigned_by is None and not tiers.c.assigned_by.nullable:
            raise RuntimeError("client_acuity_tiers.assigned_by is required and no parent user exists")
    _insert(bind, tiers, [{
        "id": _make_id(tiers, i), "client_id": who[p], "level": lvl,
        "reason_notes": notes, "assigned_by": assigned_by,
        "effective_from": f, "effective_to": to,
    } for i, p, lvl, notes, f, to in ACUITY])

    # ---- 5. Client diagnoses + polymorphic children ----
    _insert(bind, cdx, [{
        "id": _make_id(cdx, i), "client_id": who[p], "diagnosis_definition_id": DD[d],
        "category": cat, "diagnosed_at": when, "is_active": active, "notes": notes,
    } for i, p, d, cat, when, active, notes in CLIENT_DX])
    dem, par, ps = sub["dementia_diagnoses"], sub["parkinsons_diagnoses"], sub["post_stroke_diagnoses"]
    _insert(bind, dem, [{"id": _make_id(dem, i), "stage": s} for i, s in DEMENTIA_DX])
    _insert(bind, par, [{"id": _make_id(par, i)} for (i,) in PARKINSONS_DX])
    _insert(bind, ps, [{"id": _make_id(ps, i), "affected_side": s} for i, s in POST_STROKE_DX])

    # ---- 6. Medications (one random REAL client per row) ----
    meds = T["medications"]
    rng = random.SystemRandom()
    med_rows = list(MEDICATIONS) + (SUPPLEMENTAL_MEDICATIONS if SEED_SUPPLEMENTAL_MEDS else [])
    med_pool = _med_client_pool(bind, T, all_client_ids)
    MED = {}
    rows = []
    for name, drug_class, dosage, instr, ws, we, desc in med_rows:
        MED[name] = _make_id(meds, f"med:{name}", force_uuid=True)
        rows.append({
            "id": MED[name], "client_id": rng.choice(med_pool), "name": name,
            "drug_class": drug_class, "dosage": dosage, "instructions": instr,
            "requires_glucose_check": False, "window_start_local": ws,
            "window_end_local": we, "is_active": True, "description": desc,
        })
    _insert(bind, meds, rows)

    # ---- 7. Tasks ----
    tasks = T["tasks"]
    TASK = {}
    rows = []
    for name, desc, minutes, prio in TASKS:
        TASK[name] = _make_id(tasks, f"task:{name}", force_uuid=True)
        rows.append({"id": TASK[name], "name": name, "description": desc,
                     "anticipated_duration_minutes": minutes, "priority": prio})
    _insert(bind, tasks, rows)

    # ---- 8. Assessment requirements ----
    dar = T["diagnosis_assessment_requirements"]
    for i, d, atype, req, freq, instr in ASSESSMENT_REQS:
        bind.execute(sa.delete(dar).where(sa.or_(
            dar.c.id == _make_id(dar, i),
            sa.and_(dar.c.diagnosis_definition_id == DD[d],
                    dar.c.assessment_type == _coerce(dar.c.assessment_type, atype)),
        )))
        _insert(bind, dar, [{
            "id": _make_id(dar, i), "diagnosis_definition_id": DD[d],
            "assessment_type": atype, "is_required": req,
            "frequency_days": freq, "instructions": instr,
        }])

    # ---- 9. Medication requirements ----
    dmr = T["diagnosis_medication_requirements"]
    for i, d, med_name, req, instr in MED_REQS:
        if med_name not in MED:
            log.warning("seed: %s skipped - medication %r is not in the supplied "
                        "medication list (set SEED_SUPPLEMENTAL_MEDS=True to add it)", i, med_name)
            continue
        _insert(bind, dmr, [{
            "id": _make_id(dmr, i), "diagnosis_definition_id": DD[d],
            "medication_id": MED[med_name], "is_required": req, "instructions": instr,
        }])

    # ---- 10. Task requirements ----
    dtr = T["diagnosis_task_requirements"]
    for i, d, task_name, req, seq, instr in TASK_REQS:
        if task_name is None or task_name not in TASK:
            log.warning("seed: %s skipped - no matching task in the supplied task list", i)
            continue
        _insert(bind, dtr, [{
            "id": _make_id(dtr, i), "diagnosis_definition_id": DD[d],
            "task_id": TASK[task_name], "is_required": req,
            "sequence_order": seq, "instructions": instr,
        }])

    # ---- 11. Medication schedules (same medication ids as above) ----
    sch = T["medication_schedules"]
    plan = _schedule_plan(med_rows)
    SCHED = {}
    rows = []
    for key, med_name, t, days in plan:
        sid = _make_id(sch, key, force_uuid=True)
        SCHED[(med_name, t)] = sid
        rows.append({"id": sid, "medication_id": MED[med_name],
                     "scheduled_time": t, "days_of_week": days})
    _insert(bind, sch, rows)

    # ---- 12. Medication administrations ----
    n_adm = _seed_administrations(bind, insp, T, MED, SCHED)

    _verify(bind, T, len(plan), n_adm)


def _verify(bind, T, exp_sched, exp_adm):
    """Fail (and roll back) if any client_id seeded is not a real client."""
    clients = T["clients"]
    for name in ("client_acuity_tiers", "client_diagnoses", "medications"):
        t = T[name]
        orphans = bind.execute(
            sa.select(sa.func.count()).select_from(t)
            .where(t.c.client_id.notin_(sa.select(clients.c.id)))
        ).scalar()
        if orphans:
            raise RuntimeError(f"{name}: {orphans} row(s) reference non-existent clients")
    n_tasks = bind.execute(sa.select(sa.func.count()).select_from(T["tasks"])).scalar()
    n_meds = bind.execute(sa.select(sa.func.count()).select_from(T["medications"])).scalar()
    exp_meds = len(MEDICATIONS) + (len(SUPPLEMENTAL_MEDICATIONS) if SEED_SUPPLEMENTAL_MEDS else 0)
    if n_tasks != len(TASKS) or n_meds != exp_meds:
        raise RuntimeError(f"Unexpected counts: tasks={n_tasks} (want {len(TASKS)}), "
                           f"medications={n_meds} (want {exp_meds})")
    for name, want in (("medication_schedules", exp_sched),
                       ("medication_administrations", exp_adm)):
        t = T[name]
        got = bind.execute(sa.select(sa.func.count()).select_from(t)).scalar()
        if got != want:
            raise RuntimeError(f"{name}: {got} row(s), expected {want}")
    sch, adm, meds = (T["medication_schedules"], T["medication_administrations"],
                      T["medications"])
    for t in (sch, adm):
        orphans = bind.execute(
            sa.select(sa.func.count()).select_from(t)
            .where(t.c.medication_id.notin_(sa.select(meds.c.id)))
        ).scalar()
        if orphans:
            raise RuntimeError(f"{t.name}: {orphans} row(s) reference missing medications")
    bad = bind.execute(
        sa.select(sa.func.count()).select_from(adm).join(sch, adm.c.schedule_id == sch.c.id)
        .where(adm.c.medication_id != sch.c.medication_id)
    ).scalar()
    if bad:
        raise RuntimeError(f"{bad} administration(s) point at another medication's schedule")


# --------------------------------------------------------------------------
# DOWNGRADE
# --------------------------------------------------------------------------
def downgrade() -> None:
    """Remove exactly the rows this migration inserted (matched by deterministic id).

    NOTE: the tasks/medications rows that upgrade() wiped cannot be restored.
    Diagnosis definitions that already existed (matched by category) are left alone.
    """
    bind = op.get_bind()
    _, T = _load_tables(bind)

    def ids(table, keys, **kw):
        return [_make_id(T[table], k, **kw) for k in keys]

    _delete_ids(bind, T["diagnosis_task_requirements"], ids("diagnosis_task_requirements", [r[0] for r in TASK_REQS]))
    _delete_ids(bind, T["diagnosis_medication_requirements"], ids("diagnosis_medication_requirements", [r[0] for r in MED_REQS]))
    _delete_ids(bind, T["diagnosis_assessment_requirements"], ids("diagnosis_assessment_requirements", [r[0] for r in ASSESSMENT_REQS]))

    all_meds = list(MEDICATIONS) + SUPPLEMENTAL_MEDICATIONS
    # Administrations first (RESTRICT on medications), then schedules.
    _delete_ids(bind, T["medication_administrations"],
                ids("medication_administrations", [a[0] for a in ADMINISTRATIONS], force_uuid=True))
    _delete_ids(bind, T["medication_schedules"],
                ids("medication_schedules", [p[0] for p in _schedule_plan(all_meds)], force_uuid=True))
    _delete_ids(bind, T["medications"], ids("medications", [f"med:{m[0]}" for m in all_meds], force_uuid=True))
    _delete_ids(bind, T["tasks"], ids("tasks", [f"task:{t[0]}" for t in TASKS], force_uuid=True))

    cd = [k[0] for k in CLIENT_DX]
    for n in ("dementia_diagnoses", "parkinsons_diagnoses", "post_stroke_diagnoses"):
        _delete_ids(bind, T[n], ids(n, cd))
    _delete_ids(bind, T["client_diagnoses"], ids("client_diagnoses", cd))
    _delete_ids(bind, T["client_acuity_tiers"], ids("client_acuity_tiers", [a[0] for a in ACUITY]))
    _delete_ids(bind, T["diagnosis_definitions"], ids("diagnosis_definitions", [d[0] for d in DEFINITIONS]))
    log.warning("downgrade: previously wiped tasks/medications rows are NOT restored")