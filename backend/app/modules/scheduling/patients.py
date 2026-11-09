"""Admin patients table, built from caregiver sessions in a fixed number of queries.

caregiver_sessions -> client_id    -> clients, client_diagnoses, client_acuity_tiers
                   -> caregiver_id -> caregivers (status) + users (name)

Not scoped by organisation: returns every client; clients without sessions have no caregiver.
Client records sharing a name are collapsed into one row (see _dedupe_by_name).
"""
from datetime import datetime, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import SessionStatus
from app.modules.auth.models import User
from app.modules.caregivers.models import Caregiver
from app.modules.clients.models import Client, ClientAcuityTier, ClientDiagnosis
from app.modules.scheduling.models import CaregiverSession
from app.modules.scheduling.schemas import (
    ReassignCaregiverResponse,
    SessionPatient,
    SessionPatientCaregiver,
)


def _assignment_key(s, now: datetime):
    if s.status == SessionStatus.IN_PROGRESS:
        return (0, 0.0)
    if s.status == SessionStatus.SCHEDULED and s.scheduled_end >= now:
        return (1, s.scheduled_start.timestamp())  # soonest first
    return (2, -s.scheduled_start.timestamp())  # latest first


def _pick_assignment(sessions, now: datetime):
    """In progress > next upcoming scheduled visit > most recent other visit. Cancelled are ignored."""
    candidates = [s for s in sessions if s.status != SessionStatus.CANCELLED]
    return min(candidates, key=lambda s: _assignment_key(s, now), default=None)


def _normalise_name(name: str) -> str:
    return " ".join(name.split()).casefold()


def _dedupe_by_name(patients: list[SessionPatient]) -> list[SessionPatient]:
    """Keep one row per client name.

    Preference: active record > has clinical data (acuity or diagnoses) > has a visit in progress
    > has an upcoming visit > more sessions > most recent visit.
    """
    def visit_rank(p: SessionPatient) -> int:
        if p.visit_status == SessionStatus.IN_PROGRESS:
            return 0
        return 1 if p.upcoming_visits else 2

    def preference(p: SessionPatient):
        return (
            not p.is_active,
            p.acuity is None and not p.diagnoses,
            visit_rank(p),
            -p.session_count,
            -(p.visit_start.timestamp() if p.visit_start else 0),
            str(p.id),
        )

    groups: dict[str, list[SessionPatient]] = {}
    for p in patients:
        groups.setdefault(_normalise_name(p.full_name), []).append(p)

    return [min(group, key=preference) for group in groups.values()]


async def list_session_patients(db: AsyncSession) -> list[SessionPatient]:
    now = datetime.now(timezone.utc)

    # 1. Sessions (only the columns needed; no geography).
    session_rows = (
        await db.execute(
            select(
                CaregiverSession.client_id,
                CaregiverSession.caregiver_id,
                CaregiverSession.status,
                CaregiverSession.scheduled_start,
                CaregiverSession.scheduled_end,
                CaregiverSession.check_in_at,
            )
        )
    ).all()

    sessions_by_client: dict[uuid.UUID, list] = {}
    for row in session_rows:
        sessions_by_client.setdefault(row.client_id, []).append(row)
    caregiver_ids = {row.caregiver_id for row in session_rows}

    # 2. Client details: every client, including newly registered ones with no visits yet
    #    (they appear as "Unassigned" until a visit is scheduled).
    clients = (
        await db.execute(
            select(
                Client.id,
                Client.full_name,
                Client.date_of_birth,
                Client.gender,
                Client.address_text,
                Client.is_active,
            )
        )
    ).all()
    if not clients:
        return []
    client_ids = [c.id for c in clients]

    # 3. Active diagnoses, by client.
    diagnoses: dict[uuid.UUID, list] = {}
    for client_id, category in await db.execute(
        select(ClientDiagnosis.client_id, ClientDiagnosis.category)
        .where(ClientDiagnosis.client_id.in_(client_ids), ClientDiagnosis.is_active.is_(True))
        .order_by(ClientDiagnosis.diagnosed_at)
    ):
        bucket = diagnoses.setdefault(client_id, [])
        if category not in bucket:
            bucket.append(category)

    # 4. Current acuity tier, by client (newest tier in effect now).
    acuity: dict[uuid.UUID, object] = {}
    for client_id, level in await db.execute(
        select(ClientAcuityTier.client_id, ClientAcuityTier.level)
        .where(
            ClientAcuityTier.client_id.in_(client_ids),
            ClientAcuityTier.effective_from <= now,
            or_(ClientAcuityTier.effective_to.is_(None), ClientAcuityTier.effective_to > now),
        )
        .order_by(ClientAcuityTier.effective_from.desc())
    ):
        acuity.setdefault(client_id, level)

    # 5. Caregiver name and live status.
    caregivers = {
        row.user_id: row
        for row in await db.execute(
            select(Caregiver.user_id, Caregiver.status, User.full_name)
            .join(User, User.id == Caregiver.user_id)
            .where(Caregiver.user_id.in_(caregiver_ids))
        )
    }

    patients: list[SessionPatient] = []
    for client in clients:
        sessions = sessions_by_client.get(client.id, [])
        chosen = _pick_assignment(sessions, now)
        caregiver = caregivers.get(chosen.caregiver_id) if chosen else None
        patients.append(
            SessionPatient(
                id=client.id,
                full_name=client.full_name,
                date_of_birth=client.date_of_birth,
                gender=client.gender,
                address_text=client.address_text,
                is_active=client.is_active,
                diagnoses=diagnoses.get(client.id, []),
                acuity=acuity.get(client.id),
                caregiver=(
                    SessionPatientCaregiver(id=chosen.caregiver_id, full_name=caregiver.full_name, status=caregiver.status)
                    if chosen and caregiver
                    else None
                ),
                visit_start=(
                    (chosen.check_in_at if chosen.status == SessionStatus.IN_PROGRESS else None)
                    or chosen.scheduled_start
                    if chosen
                    else None
                ),
                visit_status=chosen.status if chosen else None,
                session_count=len(sessions),
                upcoming_visits=sum(
                    1 for s in sessions if s.status == SessionStatus.SCHEDULED and s.scheduled_end >= now
                ),
            )
        )

    patients = _dedupe_by_name(patients)
    patients.sort(key=lambda p: (p.full_name.lower(), str(p.id)))
    return patients


async def reassign_caregiver(
    db: AsyncSession, client_id: uuid.UUID, caregiver_id: uuid.UUID
) -> ReassignCaregiverResponse:
    """Move all of a client's upcoming scheduled visits to another caregiver.

    Visits in progress, completed or cancelled are left untouched.
    """
    if await db.get(Client, client_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")

    caregiver_active = await db.scalar(
        select(User.is_active)
        .join(Caregiver, Caregiver.user_id == User.id)
        .where(Caregiver.user_id == caregiver_id)
    )
    if caregiver_active is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Caregiver not found")
    if not caregiver_active:
        raise HTTPException(status.HTTP_409_CONFLICT, "Caregiver account is inactive")

    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(CaregiverSession)
        .where(
            CaregiverSession.client_id == client_id,
            CaregiverSession.status == SessionStatus.SCHEDULED,
            CaregiverSession.scheduled_end >= now,
        )
        .values(caregiver_id=caregiver_id)
    )
    if result.rowcount == 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This patient has no upcoming scheduled visits to reassign.",
        )
    return ReassignCaregiverResponse(
        client_id=client_id, caregiver_id=caregiver_id, sessions_updated=result.rowcount
    )
