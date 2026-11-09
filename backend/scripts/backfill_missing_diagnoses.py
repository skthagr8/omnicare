"""Backfill diagnoses and initial acuity for clients that have no active diagnosis.

Care plans in OmniCare are derived from diagnoses (diagnosis -> task / assessment / medication
requirements, picked up by every visit), so assigning a diagnosis assigns its care plan.

Usage (inside the backend container, from /app):
    PYTHONPATH=/app python scripts/backfill_missing_diagnoses.py              # dry run (default)
    PYTHONPATH=/app python scripts/backfill_missing_diagnoses.py --apply      # write changes
    ... --actor-email admin@example.com    # admin recorded as assigner (default below)

How decisions are made (deterministic: same data -> same result, no randomness):

Diagnosis ("evidence" basis), from the client's latest recorded assessments:
    IADL diagnosis_stroke              -> Post-Stroke
    IADL diagnosis_dementia_alzheimers -> Dementia
    TUG freezing of gait               -> Parkinson's
Diagnosis ("inferred" basis) for clients with no such evidence, balanced so the three conditions
end up as even as possible across the backfilled group. Each client gets the condition with the
strongest weaker signal that still has room under the per-condition target:
    Parkinson's : TUG hesitation (2), TUG >= 14 s (1), fear of falling (1)
    Dementia    : memory POOR (2) / FAIR (1), needs help with medications (1), CMAI >= median (1)
    Post-Stroke : dependent mobility (1), dependent transferring (1), fall in last 12 months (1)
    Ties are broken by a stable hash of (client id, condition), not by chance.

Acuity, from a risk score over the same evidence, split into even thirds (High / Medium / Low):
    falls: last 12 months (1), last month (1), multiple (1)
    Katz ADL dependence (value 0 = dependent): bathing (1), transferring (1), mobility (1)
    needs help with medications (1)
    memory POOR (2) / FAIR (1)
    TUG >= 20 s (2) / >= 14 s (1), freezing (1)
    Braden <= 12 (2) / <= 18 (1)            (lower Braden = higher risk)
    two or more diagnoses (1)
    Equal scores are ordered by slower TUG, then lower Braden, before the stable hash.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
import math
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import select, text

import app.main  # noqa: F401  (registers every model)
from app.core.database import async_session_factory
from app.core.enums import AcuityLevel, ClientDiagnosisCategory
from app.modules.auth.models import User
from app.modules.clients.models import ClientDiagnosis, ClientMissingDiagnosis, DiagnosisDefinition
from app.modules.clients.schemas import (
    AcuityTierCreate,
    DementiaDiagnosisCreate,
    ParkinsonsDiagnosisCreate,
    PostStrokeDiagnosisCreate,
)
from app.modules.clients.service import client_service

logging.disable(logging.WARNING)

DEFAULT_ACTOR_EMAIL = "samuelkahiga@omnicare.com"
CONDITIONS = (ClientDiagnosisCategory.DEMENTIA, ClientDiagnosisCategory.POST_STROKE, ClientDiagnosisCategory.PARKINSONS)
LABEL = {
    ClientDiagnosisCategory.DEMENTIA: "Dementia",
    ClientDiagnosisCategory.POST_STROKE: "Post-Stroke",
    ClientDiagnosisCategory.PARKINSONS: "Parkinson's",
}
ACUITY_LABEL = {AcuityLevel.RED: "High", AcuityLevel.AMBER: "Medium", AcuityLevel.GREEN: "Low"}


def stable_rank(*parts: object) -> str:
    """Deterministic tie-breaker (not random): same inputs always sort the same way."""
    return hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()


@dataclass
class Candidate:
    client_id: object
    name: str
    iadl: dict
    tug: dict | None
    braden: int | None
    cmai: int | None
    categories: list = field(default_factory=list)
    basis: str = ""
    signals: dict = field(default_factory=dict)
    score: int = 0
    score_parts: dict = field(default_factory=dict)
    acuity: AcuityLevel | None = None


EVIDENCE_SQL = text("""
with missing as (
    select c.id, c.full_name from clients c
    where not exists (select 1 from client_diagnoses d where d.client_id = c.id and d.is_active)
      and not exists (select 1 from clients_with_missing_diagnosis m where m.client_id = c.id and m.resolved_at is not null)
),
iadl as (
    select distinct on (patient_id) * from iadl_assessments order by patient_id, created_at desc
),
tug as (
    select distinct on (a.client_id) a.client_id, t.completion_time_sec, t.hesitation_flag, t.freezing_flag
    from assessments a join tug_assessments t on t.assessment_id = a.id
    where a.state = 'completed' order by a.client_id, coalesce(a.administered_at, a.created_at) desc
),
braden as (
    select distinct on (a.client_id) a.client_id, b.total_score
    from assessments a join braden_assessments b on b.assessment_id = a.id
    where a.state = 'completed' order by a.client_id, coalesce(a.administered_at, a.created_at) desc
),
cmai as (
    select distinct on (a.client_id) a.client_id, c.total_score
    from assessments a join cmai_assessments c on c.assessment_id = a.id
    where a.state = 'completed' order by a.client_id, coalesce(a.administered_at, a.created_at) desc
)
select m.id, m.full_name,
       to_jsonb(i) - 'id' - 'patient_id' - 'created_at' - 'updated_at' as iadl,
       case when t.client_id is null then null else jsonb_build_object(
           'seconds', t.completion_time_sec, 'hesitation', t.hesitation_flag, 'freezing', t.freezing_flag) end as tug,
       b.total_score as braden, cm.total_score as cmai
from missing m
left join iadl i on i.patient_id = m.id
left join tug t on t.client_id = m.id
left join braden b on b.client_id = m.id
left join cmai cm on cm.client_id = m.id
order by m.full_name, m.id
""")


async def load_candidates(db) -> list[Candidate]:
    rows = (await db.execute(EVIDENCE_SQL)).mappings().all()
    return [Candidate(r["id"], r["full_name"], r["iadl"] or {}, r["tug"], r["braden"], r["cmai"]) for r in rows]


def assign_diagnoses(cands: list[Candidate]) -> None:
    # 1. Evidence-based diagnoses.
    for c in cands:
        if c.iadl.get("diagnosis_stroke"):
            c.categories.append(ClientDiagnosisCategory.POST_STROKE)
        if c.iadl.get("diagnosis_dementia_alzheimers"):
            c.categories.append(ClientDiagnosisCategory.DEMENTIA)
        if not c.categories and c.tug and c.tug.get("freezing"):
            c.categories.append(ClientDiagnosisCategory.PARKINSONS)
        if c.categories:
            c.basis = "evidence"

    # 2. Inferred diagnoses, balanced towards an even split.
    target = math.ceil(len(cands) / len(CONDITIONS))
    taken = Counter(cat for c in cands for cat in c.categories[:1])
    room = {cat: max(target - taken[cat], 0) for cat in CONDITIONS}

    cmai_values = sorted(c.cmai for c in cands if c.cmai is not None)
    cmai_median = cmai_values[len(cmai_values) // 2] if cmai_values else None

    def signals(c: Candidate) -> dict:
        i, t = c.iadl, c.tug or {}
        memory = i.get("memory_status")
        return {
            ClientDiagnosisCategory.PARKINSONS: 2 * bool(t.get("hesitation"))
            + (float(t.get("seconds") or 0) >= 14) + bool(i.get("fear_of_falling")),
            ClientDiagnosisCategory.DEMENTIA: {"POOR": 2, "FAIR": 1}.get(memory, 0)
            + (i.get("medication_management") == 0)
            + (cmai_median is not None and c.cmai is not None and c.cmai >= cmai_median),
            ClientDiagnosisCategory.POST_STROKE: (i.get("mobility") == 0) + (i.get("transferring") == 0)
            + bool(i.get("fell_last_12_months")),
        }

    open_cands = [c for c in cands if not c.categories]
    pairs = []
    for c in open_cands:
        c.signals = {cat.value: int(v) for cat, v in signals(c).items()}
        for cat in CONDITIONS:
            pairs.append((-c.signals[cat.value], stable_rank(c.client_id, cat.value), c, cat))
    for _, _, c, cat in sorted(pairs, key=lambda p: (p[0], p[1])):
        if not c.categories and room[cat] > 0:
            c.categories.append(cat)
            room[cat] -= 1
    for c in open_cands:  # only if every target is full
        if not c.categories:
            cat = max(CONDITIONS, key=lambda k: (room[k], k.value))
            c.categories.append(cat)
            room[cat] -= 1
        c.basis = "inferred"


def assign_acuity(cands: list[Candidate]) -> None:
    for c in cands:
        i, t = c.iadl, c.tug or {}
        seconds = float(t.get("seconds") or 0)
        parts = {
            "falls": int(bool(i.get("fell_last_12_months"))) + int(bool(i.get("fell_last_month"))) + int(bool(i.get("multiple_falls"))),
            "adl_dependence": sum(int(i.get(k) == 0) for k in ("bathing", "transferring", "mobility")),
            "medication_help": int(i.get("medication_management") == 0),
            "memory": {"POOR": 2, "FAIR": 1}.get(i.get("memory_status"), 0),
            "gait": (2 if seconds >= 20 else 1 if seconds >= 14 else 0) + int(bool(t.get("freezing"))),
            "pressure_injury": 2 if c.braden is not None and c.braden <= 12 else 1 if c.braden is not None and c.braden <= 18 else 0,
            "multimorbidity": int(len(c.categories) >= 2),
        }
        c.score_parts = parts
        c.score = sum(parts.values())

    # Equal scores are ordered by further evidence before the stable hash:
    # slower TUG first, then lower Braden (higher pressure-injury risk).
    def tie_break(c: Candidate):
        seconds = float((c.tug or {}).get("seconds") or 0)
        braden = c.braden if c.braden is not None else 99
        return (-c.score, -seconds, braden, stable_rank(c.client_id, "acuity"))

    ranked = sorted(cands, key=tie_break)
    third = math.ceil(len(ranked) / 3)
    for idx, c in enumerate(ranked):
        c.acuity = AcuityLevel.RED if idx < third else AcuityLevel.AMBER if idx < 2 * third else AcuityLevel.GREEN


def diagnosis_payload(category, definition_id, c: Candidate, today: str):
    if c.basis == "evidence":
        why = "recorded evidence (" + ", ".join(
            k for k, v in (("IADL stroke flag", c.iadl.get("diagnosis_stroke")),
                           ("IADL dementia flag", c.iadl.get("diagnosis_dementia_alzheimers")),
                           ("TUG gait freezing", (c.tug or {}).get("freezing"))) if v) + ")"
    else:
        why = f"inferred to balance caseload, signals {c.signals}; clinician review recommended"
    notes = f"Backfilled {today} from {why}."[:1000]
    if category == ClientDiagnosisCategory.DEMENTIA:
        stage = {"POOR": "Moderate", "FAIR": "Mild"}.get(c.iadl.get("memory_status"))
        return DementiaDiagnosisCreate(diagnosis_definition_id=definition_id, notes=notes, stage=stage)
    if category == ClientDiagnosisCategory.POST_STROKE:
        return PostStrokeDiagnosisCreate(diagnosis_definition_id=definition_id, notes=notes)
    return ParkinsonsDiagnosisCreate(diagnosis_definition_id=definition_id, notes=notes)


async def main(apply: bool, actor_email: str, verbose: bool) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    async with async_session_factory() as db:
        actor = (await db.execute(select(User).where(User.email == actor_email, User.role == "admin"))).scalar_one_or_none()
        if actor is None:
            raise SystemExit(f"No admin user with email {actor_email!r}; pass --actor-email.")
        definitions = {
            d.category: d.id
            for d in (await db.execute(select(DiagnosisDefinition).where(DiagnosisDefinition.is_active.is_(True)))).scalars()
        }
        missing_defs = [LABEL[c] for c in CONDITIONS if c not in definitions]
        if missing_defs:
            raise SystemExit(f"No active diagnosis definition for: {', '.join(missing_defs)}")

        cands = await load_candidates(db)
        if not cands:
            print("Nothing to do: every client already has an active diagnosis.")
            return
        no_evidence = [c.name for c in cands if not c.iadl]
        assign_diagnoses(cands)
        assign_acuity(cands)

        # ---- report ----
        print(f"{'APPLY' if apply else 'DRY RUN'}: {len(cands)} clients without an active diagnosis")
        if no_evidence:
            print(f"  ({len(no_evidence)} have no IADL assessment; scored on other evidence only)")
        dist = Counter((LABEL[c.categories[0]], c.basis) for c in cands)
        for cat in CONDITIONS:
            ev, inf = dist[(LABEL[cat], "evidence")], dist[(LABEL[cat], "inferred")]
            print(f"  {LABEL[cat]:<12} {ev + inf:>3}  (evidence {ev}, inferred {inf})")
        multi = sum(len(c.categories) > 1 for c in cands)
        if multi:
            print(f"  {multi} client(s) receive two diagnoses")
        acu = Counter(c.acuity for c in cands)
        print("  acuity: " + ", ".join(f"{ACUITY_LABEL[a]} {acu[a]}" for a in (AcuityLevel.RED, AcuityLevel.AMBER, AcuityLevel.GREEN)))
        for a in (AcuityLevel.RED, AcuityLevel.AMBER, AcuityLevel.GREEN):
            scores = [c.score for c in cands if c.acuity == a]
            print(f"    {ACUITY_LABEL[a]:<6} risk score {min(scores)}–{max(scores)}")
        if verbose:
            for c in sorted(cands, key=lambda c: c.name):
                print(f"    {c.name:<22} {'+'.join(LABEL[k] for k in c.categories):<24} {c.basis:<9} "
                      f"acuity {ACUITY_LABEL[c.acuity]:<6} score {c.score} {c.score_parts}")

        if not apply:
            print("No changes written. Re-run with --apply to write them.")
            return

        # ---- write (one transaction) ----
        now = datetime.now(timezone.utc)
        third_label = {AcuityLevel.RED: "top", AcuityLevel.AMBER: "middle", AcuityLevel.GREEN: "bottom"}
        for c in cands:
            diag_ids = []
            for cat in c.categories:
                diag = await client_service.add_diagnosis(db, c.client_id, diagnosis_payload(cat, definitions[cat], c, today))
                diag_ids.append(diag.id)
            tier = await client_service.add_acuity_tier(
                db, c.client_id,
                AcuityTierCreate(
                    level=c.acuity,
                    reason_notes=f"Initial acuity (backfill {today}): risk score {c.score}, {third_label[c.acuity]} third "
                                 f"of {len(cands)} backfilled clients. Breakdown: {c.score_parts}.",
                ),
                actor_user_id=actor.id,
            )
            db.add(ClientMissingDiagnosis(
                client_id=c.client_id,
                client_name=c.name,
                assigned_category=",".join(k.value for k in c.categories),
                diagnosis_basis=c.basis,
                client_diagnosis_id=diag_ids[0],
                acuity_level=c.acuity.value,
                acuity_score=c.score,
                acuity_tier_id=tier.id,
                evidence={
                    "iadl": c.iadl, "tug": c.tug, "braden": c.braden, "cmai": c.cmai,
                    "inferred_signals": c.signals or None, "risk_score_breakdown": c.score_parts,
                },
                resolved_at=now,
                resolved_by=actor.id,
            ))
        await db.commit()

        left = await db.scalar(text(
            "select count(*) from clients c where not exists "
            "(select 1 from client_diagnoses d where d.client_id = c.id and d.is_active)"))
        print(f"Written. Clients still without an active diagnosis: {left}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
    parser.add_argument("--actor-email", default=DEFAULT_ACTOR_EMAIL, help="admin recorded as assigner")
    parser.add_argument("--verbose", action="store_true", help="print every client's decision")
    args = parser.parse_args()
    asyncio.run(main(args.apply, args.actor_email, args.verbose))
