from typing import TYPE_CHECKING

# 1. OUTSIDE TYPE_CHECKING: These are needed at runtime to build columns
from app.core.enums import ClientDiagnosisCategory, AcuityLevel, AssessmentType

# 2. INSIDE TYPE_CHECKING: These are ONLY for type hints to prevent circular imports
if TYPE_CHECKING:
    from app.modules.family.models import FamilyMember
    from app.modules.tasks.models import Task
    from app.modules.medications.models import Medication


import uuid
from datetime import date, datetime
from typing import Optional
from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.db_types import pg_enum
from sqlalchemy import UniqueConstraint, CheckConstraint
from sqlalchemy import func

# ============================================================
# CLIENT
# ============================================================

class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "organizations.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    date_of_birth: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    address_text: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    gender: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    location: Mapped[object] = mapped_column(
        Geography(
            geometry_type="POINT",
            srid=4326,
        ),
        nullable=False,
    )

    residence: Mapped[str] = mapped_column(
        String(300),
        nullable=False,
    )

    assessment_observations: Mapped[Optional[str]] = mapped_column(
        Text,
    )

    # user.role must be administrator to register a client
    registered_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    diagnoses: Mapped[list["ClientDiagnosis"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
    )

    acuity_tiers: Mapped[list["ClientAcuityTier"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
        order_by="desc(ClientAcuityTier.effective_from)",
    )

    emergency_contacts: Mapped[list["ClientEmergencyContact"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
    )

    family_links: Mapped[list["ClientFamilyLink"]] = relationship(
        back_populates="client",
        cascade="all, delete-orphan",
    )
    sessions = relationship("CaregiverSession", back_populates="client")

   
# ============================================================
# DIAGNOSIS DEFINITION
# ============================================================
#
# This is the reusable clinical configuration/template.
#
# Example:
#
# Dementia
#   ├── Tasks
#   ├── Assessments
#   └── Medications
#
# It is NOT tied to a particular client.
# ============================================================

class DiagnosisDefinition(Base):
    __tablename__ = "diagnosis_definitions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    category: Mapped[ClientDiagnosisCategory] = mapped_column(
        pg_enum(
            ClientDiagnosisCategory,
            name="client_diagnosis_category",
        ),
        nullable=False,
        unique=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    client_diagnoses: Mapped[list["ClientDiagnosis"]] = relationship(
        back_populates="definition",
    )

    task_requirements: Mapped[
        list["DiagnosisTaskRequirement"]
    ] = relationship(
        back_populates="diagnosis_definition",
        cascade="all, delete-orphan",
        order_by="DiagnosisTaskRequirement.sequence_order",
    )

    assessment_requirements: Mapped[
        list["DiagnosisAssessmentRequirement"]
    ] = relationship(
        back_populates="diagnosis_definition",
        cascade="all, delete-orphan",
    )

    medication_requirements: Mapped[
        list["DiagnosisMedicationRequirement"]
    ] = relationship(
        back_populates="diagnosis_definition",
        cascade="all, delete-orphan",
    )


# ============================================================
# CLIENT DIAGNOSIS
# ============================================================
#
# This represents:
#
# "Client X has Dementia."
#
# It points to the reusable DiagnosisDefinition.
# ============================================================

class ClientDiagnosis(Base):
    __tablename__ = "client_diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    diagnosis_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "diagnosis_definitions.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    category: Mapped[ClientDiagnosisCategory] = mapped_column(
        pg_enum(
            ClientDiagnosisCategory,
            name="client_diagnosis_category",
        ),
        nullable=False,
        index=True,
    )

    diagnosed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    client: Mapped["Client"] = relationship(
        back_populates="diagnoses",
    )

    definition: Mapped["DiagnosisDefinition"] = relationship(
        back_populates="client_diagnoses",
    )

    __mapper_args__ = {
        "polymorphic_on": "category",
        "polymorphic_identity": ClientDiagnosisCategory.OTHER,
    }


# ============================================================
# DEMENTIA DIAGNOSIS
# ============================================================

class DementiaDiagnosis(ClientDiagnosis):
    __tablename__ = "dementia_diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "client_diagnoses.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    stage: Mapped[Optional[str]] = mapped_column(
        String(50),
    )

    __mapper_args__ = {
        "polymorphic_identity": ClientDiagnosisCategory.DEMENTIA,
    }


# ============================================================
# POST-STROKE DIAGNOSIS
# ============================================================

class PostStrokeDiagnosis(ClientDiagnosis):
    __tablename__ = "post_stroke_diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "client_diagnoses.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    affected_side: Mapped[Optional[str]] = mapped_column(
        String(20),
    )

    __mapper_args__ = {
        "polymorphic_identity": ClientDiagnosisCategory.POST_STROKE,
    }


# ============================================================
# PARKINSON'S DIAGNOSIS
# ============================================================

class ParkinsonsDiagnosis(ClientDiagnosis):
    __tablename__ = "parkinsons_diagnoses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "client_diagnoses.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    __mapper_args__ = {
        "polymorphic_identity": ClientDiagnosisCategory.PARKINSONS,
    }


# ============================================================
# DIAGNOSIS -> TASK REQUIREMENT
# ============================================================
#
# Defines which tasks belong to a diagnosis.
#
# Example:
#
# Dementia
#   -> Memory Orientation
#   -> ADL Assistance
#   -> Medication Supervision
# ============================================================

class DiagnosisTaskRequirement(Base):
    __tablename__ = "diagnosis_task_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    diagnosis_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "diagnosis_definitions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    is_required: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    sequence_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    instructions: Mapped[Optional[str]] = mapped_column(Text)

    diagnosis_definition: Mapped["DiagnosisDefinition"] = relationship(
        back_populates="task_requirements",
    )

    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="diagnosis_requirements",
    )

    __table_args__ = (
        UniqueConstraint(
            "diagnosis_definition_id",
            "task_id",
            name="uq_diagnosis_task_requirement",
        ),
        CheckConstraint(
            "sequence_order >= 0",
            name="ck_diagnosis_task_sequence_nonnegative",
        ),
    )

# ============================================================
# DIAGNOSIS -> ASSESSMENT REQUIREMENT
# ============================================================
#
# Defines which assessments apply to a diagnosis.
#
# Example:
#
# Dementia
#   -> CMAI
#   -> DELIRIUM
# ============================================================

class DiagnosisAssessmentRequirement(Base):
    __tablename__ = "diagnosis_assessment_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    diagnosis_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "diagnosis_definitions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    assessment_type: Mapped[AssessmentType] = mapped_column(
        pg_enum(
            AssessmentType,
            name="assessment_type",
        ),
        nullable=False,
    )

    is_required: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    frequency_days: Mapped[Optional[int]] = mapped_column(
        Integer,
    )

    instructions: Mapped[Optional[str]] = mapped_column(
        Text,
    )

    diagnosis_definition: Mapped["DiagnosisDefinition"] = relationship(
        back_populates="assessment_requirements",
    )


# ============================================================
# DIAGNOSIS -> MEDICATION REQUIREMENT
# ============================================================
#
# Defines which medications are part of the diagnosis
# configuration.
# ============================================================

class DiagnosisMedicationRequirement(Base):
    __tablename__ = "diagnosis_medication_requirements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    diagnosis_definition_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "diagnosis_definitions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    medication_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "medications.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    is_required: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    instructions: Mapped[Optional[str]] = mapped_column(
        Text,
    )

    diagnosis_definition: Mapped["DiagnosisDefinition"] = relationship(
        back_populates="medication_requirements",
    )

    medication: Mapped["Medication"] = relationship()


# ============================================================
# CLIENT ACUITY
# ============================================================

class ClientAcuityTier(Base):
    __tablename__ = "client_acuity_tiers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    level: Mapped[AcuityLevel] = mapped_column(
        pg_enum(
            AcuityLevel,
            name="acuity_level",
        ),
        nullable=False,
    )

    reason_notes: Mapped[Optional[str]] = mapped_column(
        Text,
    )

    # No users table.
    # Administrator who assigned the acuity level.
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    effective_to: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
    )

    client: Mapped["Client"] = relationship(
        back_populates="acuity_tiers",
    )


# ============================================================
# EMERGENCY CONTACT
# ============================================================

class ClientEmergencyContact(Base):
    __tablename__ = "client_emergency_contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    relationship_type: Mapped[str] = mapped_column(
        "relationship",
        String(50),
        nullable=False,
    )

    phone: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    client: Mapped["Client"] = relationship(
        back_populates="emergency_contacts",
    )


# ============================================================
# CLIENT <-> FAMILY MEMBER
# ============================================================

class ClientFamilyLink(Base):
    __tablename__ = "client_family_links"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "clients.id",
            ondelete="CASCADE",
        ),
        primary_key=True,

    )

    family_member_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "family_members.user_id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    is_primary_contact: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    client: Mapped["Client"] = relationship(
        back_populates="family_links",
    )

    family_member: Mapped["FamilyMember"] = relationship(
        back_populates="client_links",
    )


# ============================================================
# BACKFILL AUDIT: clients found with no active diagnosis
# ============================================================

class ClientMissingDiagnosis(Base):
    """One row per client found without an active diagnosis, and how the gap was filled.

    Written by scripts/backfill_missing_diagnoses.py. `diagnosis_basis` separates diagnoses
    supported by recorded evidence ("evidence") from ones inferred to balance the caseload
    ("inferred"), so inferred diagnoses can be reviewed by a clinician.
    """
    __tablename__ = "clients_with_missing_diagnosis"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True,
    )
    client_name: Mapped[str] = mapped_column(String(150), nullable=False)  # snapshot at detection
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Diagnosis assigned to fill the gap
    assigned_category: Mapped[Optional[str]] = mapped_column(String(32))
    diagnosis_basis: Mapped[Optional[str]] = mapped_column(String(16))  # "evidence" | "inferred"
    client_diagnosis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_diagnoses.id", ondelete="SET NULL"),
    )

    # Initial acuity assigned from the evidence-based risk score
    acuity_level: Mapped[Optional[str]] = mapped_column(String(8))
    acuity_score: Mapped[Optional[int]] = mapped_column(Integer)
    acuity_tier_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_acuity_tiers.id", ondelete="SET NULL"),
    )

    # Inputs behind both decisions (IADL flags, TUG, Braden, CMAI, score breakdown)
    evidence: Mapped[Optional[dict]] = mapped_column(JSONB)

    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
    )

    __table_args__ = (
        CheckConstraint("diagnosis_basis IN ('evidence', 'inferred')", name="ck_cwmd_diagnosis_basis"),
        CheckConstraint("acuity_level IN ('red', 'amber', 'green')", name="ck_cwmd_acuity_level"),
    )