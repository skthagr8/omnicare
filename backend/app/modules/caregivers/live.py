"""Admin live operations view: caregivers on shift and the clients they serve today."""
from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import AcuityLevel, CaregiverStatus, SessionStatus
from app.modules.auth.models import User
from app.modules.caregivers.models import Caregiver
from app.modules.caregivers.schemas import OnShiftCaregiver, ShiftAssignment, ShiftClient
from app.modules.clients.models import Client, ClientAcuityTier, ClientDiagnosis
from app.modules.scheduling.models import CaregiverSession
from app.schemas.common import GeoPoint

_OPEN_STATUSES = (SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS)


# Geography columns come back as WKB; read coordinates in SQL instead.
def _lat(column):
    return func.ST_Y(func.geometry(column))


def _lng(column):
    return func.ST_X(func.geometry(column))


def _point(lat, lng) -> Optional[GeoPoint]:
    if lat is None or lng is None:
        return None
    return GeoPoint(latitude=lat, longitude=lng)


async def list_on_shift(db: AsyncSession, org_id: Optional[uuid.UUID] = None) -> list[OnShiftCaregiver]:
    """Caregivers currently on shift, with their location and today's open visits.

    Pass org_id to restrict to one organisation; None returns all organisations.

    A caregiver is on shift when either
      * their stored status is anything other than ``off_shift``, or
      * they have a visit in progress, or
      * now falls inside today's shift window (first visit start -> last visit end)
        and they still have a visit that is scheduled or in progress.

    Location is the most recent of: the explicitly confirmed location, or the
    check-in / check-out point of one of today's visits.
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    # 1. Caregivers, with their confirmed location.
    caregiver_stmt = (
        select(
            Caregiver.user_id,
            Caregiver.status,
            Caregiver.last_confirmed_at,
            _lat(Caregiver.last_confirmed_location).label("lat"),
            _lng(Caregiver.last_confirmed_location).label("lng"),
            User.full_name,
        )
        .join(User, User.id == Caregiver.user_id)
        .where(User.is_active.is_(True))
    )
    if org_id:
        caregiver_stmt = caregiver_stmt.where(User.org_id == org_id)
    caregiver_rows = (await db.execute(caregiver_stmt)).all()
    if not caregiver_rows:
        return []

    # 2. Today's visits (cancelled excluded) of those caregivers, with the client's details.
    caregiver_ids = [row.user_id for row in caregiver_rows]
    session_rows = (
        await db.execute(
            select(
                CaregiverSession,
                Client.full_name.label("client_name"),
                Client.date_of_birth,
                Client.address_text,
                _lat(Client.location).label("client_lat"),
                _lng(Client.location).label("client_lng"),
                _lat(CaregiverSession.check_in_location).label("in_lat"),
                _lng(CaregiverSession.check_in_location).label("in_lng"),
                _lat(CaregiverSession.check_out_location).label("out_lat"),
                _lng(CaregiverSession.check_out_location).label("out_lng"),
            )
            .join(Client, Client.id == CaregiverSession.client_id)
            .where(
                CaregiverSession.caregiver_id.in_(caregiver_ids),
                CaregiverSession.visit_date == today,
                CaregiverSession.status != SessionStatus.CANCELLED,
            )
            .order_by(CaregiverSession.scheduled_start)
        )
    ).all()

    client_ids = {row.CaregiverSession.client_id for row in session_rows}

    # 3. Current acuity tier and active diagnoses for those clients.
    acuity: dict[uuid.UUID, AcuityLevel] = {}
    diagnoses: dict[uuid.UUID, list] = {}
    if client_ids:
        tiers = await db.execute(
            select(ClientAcuityTier.client_id, ClientAcuityTier.level)
            .where(
                ClientAcuityTier.client_id.in_(client_ids),
                ClientAcuityTier.effective_from <= now,
                or_(ClientAcuityTier.effective_to.is_(None), ClientAcuityTier.effective_to > now),
            )
            .order_by(ClientAcuityTier.effective_from.desc())
        )
        for client_id, level in tiers:
            acuity.setdefault(client_id, level)  # first row is the most recent tier

        diag_rows = await db.execute(
            select(ClientDiagnosis.client_id, ClientDiagnosis.category).where(
                ClientDiagnosis.client_id.in_(client_ids),
                ClientDiagnosis.is_active.is_(True),
            )
        )
        for client_id, category in diag_rows:
            bucket = diagnoses.setdefault(client_id, [])
            if category not in bucket:
                bucket.append(category)

    sessions_by_caregiver: dict[uuid.UUID, list] = {}
    for row in session_rows:
        sessions_by_caregiver.setdefault(row.CaregiverSession.caregiver_id, []).append(row)

    result: list[OnShiftCaregiver] = []
    for cg in caregiver_rows:
        rows = sessions_by_caregiver.get(cg.user_id, [])
        open_rows = [r for r in rows if r.CaregiverSession.status in _OPEN_STATUSES]
        in_progress = any(r.CaregiverSession.status == SessionStatus.IN_PROGRESS for r in rows)
        within_shift_window = bool(open_rows) and (
            min(r.CaregiverSession.scheduled_start for r in rows)
            <= now
            <= max(r.CaregiverSession.scheduled_end for r in rows)
        )
        stored_on_shift = cg.status != CaregiverStatus.OFF_SHIFT

        if not (stored_on_shift or in_progress or within_shift_window):
            continue

        if stored_on_shift:
            effective_status = cg.status
        elif in_progress:
            effective_status = CaregiverStatus.IN_SERVICE
        else:
            effective_status = CaregiverStatus.EN_ROUTE  # between visits, heading to the next one

        # Most recent known position.
        candidates = [("confirmed", cg.last_confirmed_at, cg.lat, cg.lng)]
        for r in rows:
            s = r.CaregiverSession
            candidates.append(("check_in", s.check_in_at, r.in_lat, r.in_lng))
            candidates.append(("check_out", s.check_out_at, r.out_lat, r.out_lng))
        candidates = [c for c in candidates if c[1] is not None and c[2] is not None]
        source, located_at, lat, lng = max(
            candidates, key=lambda c: c[1], default=(None, None, None, None)
        )

        result.append(
            OnShiftCaregiver(
                caregiver_id=cg.user_id,
                full_name=cg.full_name,
                status=effective_status,
                location=_point(lat, lng),
                location_source=source,
                location_at=located_at,
                assignments=[
                    ShiftAssignment(
                        session_id=r.CaregiverSession.id,
                        status=r.CaregiverSession.status,
                        scheduled_start=r.CaregiverSession.scheduled_start,
                        scheduled_end=r.CaregiverSession.scheduled_end,
                        check_in_at=r.CaregiverSession.check_in_at,
                        client=ShiftClient(
                            id=r.CaregiverSession.client_id,
                            full_name=r.client_name,
                            date_of_birth=r.date_of_birth,
                            address_text=r.address_text,
                            location=_point(r.client_lat, r.client_lng),
                            acuity=acuity.get(r.CaregiverSession.client_id),
                            diagnoses=diagnoses.get(r.CaregiverSession.client_id, []),
                        ),
                    )
                    for r in open_rows
                ],
            )
        )

    result.sort(key=lambda c: (c.status != CaregiverStatus.EMERGENCY, c.full_name or ""))
    return result
