from enum import Enum

class DeclineSeverity(str, Enum):
    IMPROVEMENT = "improvement"
    STABLE = "stable"
    MILD = "mild_decline"
    MODERATE = "moderate_decline"
    SIGNIFICANT = "significant_decline"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class CaregiverStatus(str, Enum):
    OFF_SHIFT = "off_shift"
    AVAILABLE = "available"
    EN_ROUTE = "en_route"
    IN_SERVICE = "in_service"
    EMERGENCY = "emergency"

class DiagnosisCategory(str, Enum):
    DEMENTIA = "dementia"
    POST_STROKE = "post_stroke"
    PARKINSONS = "parkinsons"
    OTHER = "other"


# ---------------------------------------------------------------------------
# Medication Enums
# ---------------------------------------------------------------------------

class MedicationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"


class MedicationAdminStatus(str, Enum):
    PENDING = "pending"
    ADMINISTERED = "administered"
    REFUSED = "refused"
    MISSED = "missed"
    CANCELLED = "cancelled"


class MedicationClass(str, Enum):
    ANTIBIOTIC = "antibiotic"
    ANALGESIC = "analgesic"
    ANTIDEPRESSANT = "antidepressant"
    ANTIPSYCHOTIC = "antipsychotic"
    OTHER = "other"
    # Added to the Postgres enum by migration 20261102_expand_drug_class.
    # Values must equal the database labels exactly (pg_enum maps by value).
    # Post-stroke
    ANTIPLATELETS_SECONDARY_STROKE_PREVENTION = "ANTIPLATELETS_SECONDARY_STROKE_PREVENTION"
    ANTIPLATELETS_COMBINATION_THERAPY = "ANTIPLATELETS_COMBINATION_THERAPY"
    DIRECT_ORAL_ANTICOAGULANTS_DOACS = "DIRECT_ORAL_ANTICOAGULANTS_DOACS"
    GABA_B_RECEPTOR_AGONISTS_POST_STROKE_SPASTICITY = "GABA_B_RECEPTOR_AGONISTS_POST_STROKE_SPASTICITY"
    CENTRAL_ALPHA_2_ADRENERGIC_AGONISTS_SPASTICITY = "CENTRAL_ALPHA_2_ADRENERGIC_AGONISTS_SPASTICITY"
    PERIPHERALLY_ACTING_MUSCLE_RELAXANTS = "PERIPHERALLY_ACTING_MUSCLE_RELAXANTS"
    # Dementia
    CHOLINOMIMETICS_CHOLINESTERASE_INHIBITORS = "CHOLINOMIMETICS_CHOLINESTERASE_INHIBITORS"
    NMDA_RECEPTOR_ANTAGONISTS = "NMDA_RECEPTOR_ANTAGONISTS"
    DUAL_MECHANISM_COMBINATIONS = "DUAL_MECHANISM_COMBINATIONS"
    SEROTONIN_DOPAMINE_ACTIVITY_MODULATORS_SDAMS = "SEROTONIN_DOPAMINE_ACTIVITY_MODULATORS_SDAMS"
    AMYLOID_BETA_DIRECTED_ANTIBODIES_DISEASE_MODIFYING = "AMYLOID_BETA_DIRECTED_ANTIBODIES_DISEASE_MODIFYING"
    # Parkinson's
    DECARBOXYLASE_INHIBITOR_DOPAMINE_PRECURSOR = "DECARBOXYLASE_INHIBITOR_DOPAMINE_PRECURSOR"
    EXTENDED_RELEASE_DOPAMINE_PRECURSORS = "EXTENDED_RELEASE_DOPAMINE_PRECURSORS"
    NON_ERGOT_DOPAMINE_RECEPTOR_AGONISTS = "NON_ERGOT_DOPAMINE_RECEPTOR_AGONISTS"
    CATECHOL_O_METHYLTRANSFERASE_COMT_INHIBITORS = "CATECHOL_O_METHYLTRANSFERASE_COMT_INHIBITORS"
    SELECTIVE_IRREVERSIBLE_MAO_B_INHIBITORS = "SELECTIVE_IRREVERSIBLE_MAO_B_INHIBITORS"
    REVERSIBLE_MAO_B_INHIBITORS_GLUTAMATE_MODULATORS = "REVERSIBLE_MAO_B_INHIBITORS_GLUTAMATE_MODULATORS"
    CHOLINOMIMETICS_PARKINSONS_DEMENTIA_SPECIFIC = "CHOLINOMIMETICS_PARKINSONS_DEMENTIA_SPECIFIC"
    INVERSE_SEROTONIN_AGONISTS_PD_PSYCHOSIS_SPECIFIC = "INVERSE_SEROTONIN_AGONISTS_PD_PSYCHOSIS_SPECIFIC"


class CompletionStatus(str, Enum):
    COMPLETED = "completed"
    NOT_COMPLETED = "not_completed"
    PARTIALLY_COMPLETED = "partially_completed"
    REFUSED = "refused"


class SessionStatus(str, Enum): 
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ClientDiagnosisCategory(str, Enum):
    DEMENTIA = "dementia"
    POST_STROKE = "post_stroke"
    PARKINSONS = "parkinsons"
    OTHER = "other"


class AcuityLevel(str, Enum):
    GREEN = "green"
    AMBER = "amber"
    RED = "red"

    
class PriorityRanking(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AssessmentType(str, Enum):
    TUG = "tug"
    CMAI = "cmai"
    BRADEN = "braden"
    DELIRIUM = "delirium"
    IADL = "iadl"


class AssessmentState(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    REFUSED = "refused"
    SKIPPED = "skipped"

class UserRole(str, Enum):
    ADMIN = "admin"
    CAREGIVER = "caregiver"
    FAMILY = "family"
