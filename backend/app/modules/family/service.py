import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_client
from app.core.enums import UserRole
from app.modules.auth.models import User
from app.modules.family.models import FamilyMember, ServiceRequest
from app.modules.family.schemas import ServiceRequestCreate, ServiceRequestUpdate


class FamilyService:
    @staticmethod
    async def list_members(db: AsyncSession, org_id: uuid.UUID) -> list[FamilyMember]:
        result = await db.execute(
            select(FamilyMember).join(User, User.id == FamilyMember.user_id).where(
                User.org_id == org_id
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_service_request(
        db: AsyncSession, actor: User, data: ServiceRequestCreate
    ) -> ServiceRequest:
        if actor.role != UserRole.FAMILY:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Requires family role")
        # Family members may only raise requests for clients they are linked to.
        await get_current_client(client_id=data.client_id, current_user=actor, db=db)
        request = ServiceRequest(
            client_id=data.client_id,
            requested_by=actor.id,
            description=data.description,
        )
        db.add(request)
        await db.commit()
        await db.refresh(request)
        return request

    @staticmethod
    async def list_service_requests(
        db: AsyncSession, actor: User, client_id: uuid.UUID | None = None
    ) -> list[ServiceRequest]:
        from app.modules.clients.models import Client, ClientFamilyLink

        stmt = (
            select(ServiceRequest)
            .join(Client, Client.id == ServiceRequest.client_id)
            .where(Client.org_id == actor.org_id)
            .order_by(ServiceRequest.created_at)
        )
        if actor.role == UserRole.FAMILY:
            # Only requests for the family member's own linked clients.
            stmt = stmt.join(
                ClientFamilyLink,
                (ClientFamilyLink.client_id == ServiceRequest.client_id)
                & (ClientFamilyLink.family_member_id == actor.id),
            )
        if client_id:
            stmt = stmt.where(ServiceRequest.client_id == client_id)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update_service_request(
        db: AsyncSession, request_id: uuid.UUID, data: ServiceRequestUpdate
    ) -> ServiceRequest:
        request = await db.get(ServiceRequest, request_id)
        if not request:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Service request not found")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(request, key, value)
        await db.commit()
        await db.refresh(request)
        return request


# ---------------------------------------------------------------------------
# Family portal reads. Every query is scoped to one client the caller is
# authorised for (see app.core.deps.get_current_client).
# ---------------------------------------------------------------------------


def _value(enum_or_str) -> str:
    return getattr(enum_or_str, "value", enum_or_str)


class FamilyPortalService:
    @staticmethod
    async def list_linked_clients(db: AsyncSession, user: User) -> list[dict]:
        from app.modules.clients.models import Client, ClientFamilyLink
        from app.modules.organisations.models import Organization

        rows = await db.execute(
            select(Client, ClientFamilyLink, FamilyMember.relationship_to_client, Organization.name)
            .join(ClientFamilyLink, ClientFamilyLink.client_id == Client.id)
            .join(FamilyMember, FamilyMember.user_id == ClientFamilyLink.family_member_id)
            .outerjoin(Organization, Organization.id == Client.org_id)
            .where(ClientFamilyLink.family_member_id == user.id, Client.is_active.is_(True))
            .order_by(ClientFamilyLink.is_primary_contact.desc(), Client.full_name)
        )
        return [
            {
                "client_id": client.id,
                "full_name": client.full_name,
                "date_of_birth": client.date_of_birth,
                "gender": client.gender,
                "relationship_to_client": relationship,
                "is_primary_contact": link.is_primary_contact,
                "organization_name": org_name,
            }
            for client, link, relationship, org_name in rows.all()
        ]

    @staticmethod
    def _visit_dict(session, caregiver_name: str) -> dict:
        return {
            "id": session.id,
            "status": _value(session.status),
            "scheduled_start": session.scheduled_start,
            "scheduled_end": session.scheduled_end,
            "check_in_at": session.check_in_at,
            "check_out_at": session.check_out_at,
            "caregiver_id": session.caregiver_id,
            "caregiver_name": caregiver_name,
        }

    @staticmethod
    async def list_visits(db: AsyncSession, client_id: uuid.UUID, limit: int = 50) -> list[dict]:
        from app.modules.scheduling.models import CaregiverSession

        rows = await db.execute(
            select(CaregiverSession, User.full_name)
            .join(User, User.id == CaregiverSession.caregiver_id)
            .where(CaregiverSession.client_id == client_id)
            .order_by(CaregiverSession.scheduled_start.desc())
            .limit(limit)
        )
        return [FamilyPortalService._visit_dict(s, name) for s, name in rows.all()]

    @staticmethod
    async def _certifications(db: AsyncSession, caregiver_ids: list[uuid.UUID]) -> dict:
        from app.modules.caregivers.models import CaregiverCertification

        certs: dict[uuid.UUID, list] = defaultdict(list)
        if caregiver_ids:
            rows = await db.execute(
                select(CaregiverCertification).where(CaregiverCertification.caregiver_id.in_(caregiver_ids))
            )
            for cert in rows.scalars().all():
                certs[cert.caregiver_id].append(cert)
        return certs

    @staticmethod
    async def list_care_team(db: AsyncSession, client_id: uuid.UUID) -> list[dict]:
        from app.modules.caregivers.models import Caregiver
        from app.modules.scheduling.models import CaregiverSession

        now = datetime.now(timezone.utc)
        rows = await db.execute(
            select(
                Caregiver.user_id,
                User.full_name,
                Caregiver.status,
                func.count(),
                func.count().filter(CaregiverSession.status == "completed"),
                func.min(CaregiverSession.scheduled_start).filter(
                    CaregiverSession.scheduled_start >= now, CaregiverSession.status == "scheduled"
                ),
                func.max(CaregiverSession.scheduled_start).filter(CaregiverSession.status == "completed"),
            )
            .join(CaregiverSession, CaregiverSession.caregiver_id == Caregiver.user_id)
            .join(User, User.id == Caregiver.user_id)
            .where(CaregiverSession.client_id == client_id)
            .group_by(Caregiver.user_id, User.full_name, Caregiver.status)
            .order_by(func.count().desc())
        )
        team = rows.all()
        certs = await FamilyPortalService._certifications(db, [r[0] for r in team])
        return [
            {
                "caregiver_id": cid,
                "full_name": name,
                "status": _value(cg_status),
                "certifications": [_value(c.diagnosis_category) for c in certs[cid]],
                "certified_since": min((c.certified_at for c in certs[cid]), default=None),
                "visit_count": total,
                "completed_visit_count": done,
                "next_visit_at": next_at,
                "last_visit_at": last_at,
            }
            for cid, name, cg_status, total, done, next_at, last_at in team
        ]

    @staticmethod
    async def get_visit_detail(db: AsyncSession, user: User, session_id: uuid.UUID) -> dict:
        from app.modules.assessments.models import Assessment, Observation
        from app.modules.medications.models import Medication, MedicationAdministration
        from app.modules.scheduling.models import CaregiverSession
        from app.modules.tasks.models import Task, TaskCompletion

        session = await db.get(CaregiverSession, session_id)
        if session is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Visit not found")
        client = await get_current_client(client_id=session.client_id, current_user=user, db=db)

        caregiver = await db.get(User, session.caregiver_id)
        certs = await FamilyPortalService._certifications(db, [session.caregiver_id])

        tasks = await db.execute(
            select(TaskCompletion, Task.name)
            .join(Task, Task.id == TaskCompletion.task_id)
            .where(TaskCompletion.session_id == session_id, TaskCompletion.deleted_at.is_(None))
            .order_by(TaskCompletion.completed_at.nulls_last(), Task.name)
        )
        meds = await db.execute(
            select(MedicationAdministration, Medication.name, Medication.dosage)
            .join(Medication, Medication.id == MedicationAdministration.medication_id)
            .where(MedicationAdministration.session_id == session_id)
            .order_by(MedicationAdministration.administered_at.nulls_last())
        )
        observations = await db.execute(
            select(Observation).where(Observation.session_id == session_id).order_by(Observation.created_at)
        )
        assessments = await db.execute(
            select(Assessment).where(Assessment.session_id == session_id).order_by(Assessment.assessment_type)
        )

        return {
            **FamilyPortalService._visit_dict(session, caregiver.full_name if caregiver else "Caregiver"),
            "client_id": client.id,
            "client_name": client.full_name,
            "caregiver_certifications": [_value(c.diagnosis_category) for c in certs[session.caregiver_id]],
            "tasks": [
                {
                    "title": tc.title_override or name,
                    "status": _value(tc.completed_status),
                    "was_skipped": tc.was_skipped,
                    "skip_reason": tc.skip_reason,
                    "completed_at": tc.completed_at,
                }
                for tc, name in tasks.all()
            ],
            "medications": [
                {
                    "name": name,
                    "dosage": dosage,
                    "status": _value(ma.status),
                    "administered_at": ma.administered_at,
                    "missed_reason": ma.missed_reason,
                }
                for ma, name, dosage in meds.all()
            ],
            "observations": [
                {"note": o.note, "is_flagged": o.is_flagged, "created_at": o.created_at}
                for o in observations.scalars().all()
            ],
            "assessments": [
                {
                    "assessment_type": _value(a.assessment_type),
                    "state": _value(a.state),
                    "administered_at": a.administered_at,
                }
                for a in assessments.scalars().all()
            ],
        }

    @staticmethod
    async def get_health_summary(db: AsyncSession, client, days: int = 30) -> dict:
        from app.modules.assessments.models import Assessment, CmaiAssessment, Observation, TugAssessment
        from app.modules.medications.models import MedicationAdministration
        from app.modules.scheduling.models import CaregiverSession
        from app.modules.tasks.models import TaskCompletion

        end = date.today()
        start = end - timedelta(days=days - 1)
        start_dt = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc)
        in_period = (
            CaregiverSession.client_id == client.id,
            CaregiverSession.visit_date >= start,
            CaregiverSession.visit_date <= end,
        )

        # Medication outcomes per visit day ("missed" includes refusals).
        med_rows = await db.execute(
            select(CaregiverSession.visit_date, MedicationAdministration.status, func.count())
            .join(MedicationAdministration, MedicationAdministration.session_id == CaregiverSession.id)
            .where(*in_period)
            .group_by(CaregiverSession.visit_date, MedicationAdministration.status)
        )
        med_days: dict[date, dict] = defaultdict(lambda: {"administered": 0, "missed": 0})
        for visit_date, med_status, count in med_rows.all():
            key = _value(med_status)
            if key == "administered":
                med_days[visit_date]["administered"] += count
            elif key in ("missed", "refused"):
                med_days[visit_date]["missed"] += count

        async def scores(detail_model, column) -> list[dict]:
            rows = await db.execute(
                select(Assessment.administered_at, column)
                .join(detail_model, detail_model.assessment_id == Assessment.id)
                .where(
                    Assessment.client_id == client.id,
                    Assessment.state == "completed",
                    Assessment.administered_at >= start_dt,
                    column.is_not(None),
                )
                .order_by(Assessment.administered_at)
            )
            return [{"date": at.date(), "value": float(v)} for at, v in rows.all() if at]

        visit_rows = await db.execute(
            select(CaregiverSession.status, CaregiverSession.check_in_at, CaregiverSession.check_out_at).where(
                *in_period
            )
        )
        visits_completed = visits_scheduled = 0
        care_seconds = 0.0
        for v_status, check_in, check_out in visit_rows.all():
            if _value(v_status) == "completed":
                visits_completed += 1
                if check_in and check_out:
                    care_seconds += (check_out - check_in).total_seconds()
            elif _value(v_status) == "scheduled":
                visits_scheduled += 1

        tasks_completed, tasks_total = (
            await db.execute(
                select(func.count().filter(TaskCompletion.completed_status == "completed"), func.count())
                .join(CaregiverSession, CaregiverSession.id == TaskCompletion.session_id)
                .where(*in_period, TaskCompletion.deleted_at.is_(None))
            )
        ).one()

        flagged = await db.scalar(
            select(func.count())
            .select_from(Observation)
            .where(
                Observation.client_id == client.id,
                Observation.is_flagged.is_(True),
                Observation.created_at >= start_dt,
            )
        )

        return {
            "client_id": client.id,
            "client_name": client.full_name,
            "period_start": start,
            "period_end": end,
            "medication_days": [{"date": d, **counts} for d, counts in sorted(med_days.items())],
            "tug_seconds": await scores(TugAssessment, TugAssessment.completion_time_sec),
            "cmai_scores": await scores(CmaiAssessment, CmaiAssessment.total_score),
            "visits_completed": visits_completed,
            "visits_scheduled": visits_scheduled,
            "care_hours": round(care_seconds / 3600, 1),
            "tasks_completed": tasks_completed,
            "tasks_total": tasks_total,
            "flagged_observations": flagged or 0,
        }
