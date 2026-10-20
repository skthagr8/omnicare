from enum import Enum

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


class AssessmentState(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    REFUSED = "refused"
    SKIPPED = "skipped"

class UserRole(str, Enum):
    ADMIN = "admin"
    CAREGIVER = "caregiver"
    FAMILY = "family"
