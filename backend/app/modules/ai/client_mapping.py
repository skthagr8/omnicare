# modules/ai/client_mapping.py
"""Map an OmniCare client onto the LSTM's NHATS feature encoding.

NHATS conventions used by the training data (see checkpoints/*.csv and cohort_prior.npy):
  * Yes/No items: 1 = yes, 2 = no. 0 is reserved for "structurally missing" (item not asked),
    so "no" must be sent as 2, never 0.
  * Age Category: 1 = 65-69, 2 = 70-74, 3 = 75-79, 4 = 80-84, 5 = 85-89, 6 = 90+.
The training cohort is adults aged 65+. Every client is scored: clients under 65 are mapped to
the youngest category (1), the closest the model can represent.
"""
from datetime import date
from typing import Optional, Protocol

from app.core.enums import ClientDiagnosisCategory

NHATS_YES = 1.0
NHATS_NO = 2.0
YOUNGEST_COHORT_AGE = 65  # clients younger than this are scored as category 1 (65-69)

AGE_CATEGORY_LABELS = {
    1: "65–69",
    2: "70–74",
    3: "75–79",
    4: "80–84",
    5: "85–89",
    6: "90+",
}


class ClientLike(Protocol):
    date_of_birth: date
    diagnoses: list


def age_in_years(dob: date, today: Optional[date] = None) -> int:
    today = today or date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def age_bucket(dob: date, today: Optional[date] = None) -> Optional[float]:
    """NHATS age category; under-65s fall into the youngest category (1)."""
    if dob is None:
        return None
    years = age_in_years(dob, today)
    if years < 70:
        return 1.0
    if years < 75:
        return 2.0
    if years < 80:
        return 3.0
    if years < 85:
        return 4.0
    if years < 90:
        return 5.0
    return 6.0


def has_active_category(diagnoses: list, category: ClientDiagnosisCategory) -> float:
    """NHATS yes/no code for an active diagnosis in this category."""
    active = any(d.is_active and d.category == category for d in diagnoses)
    return NHATS_YES if active else NHATS_NO


def ineligibility_reason(client: ClientLike) -> Optional[str]:
    """Why no prediction can be made for this client, or None if one can."""
    if client.date_of_birth is None:
        return "No date of birth on record."
    return None


def client_to_feature_overlay(
    client: ClientLike,
    feature_columns: list[str],
) -> dict[str, float]:
    """
    Return {feature_name: value} for every LSTM feature the client supplies.

    Returns {} when the client is not eligible (see ineligibility_reason).
    Only features the checkpoint expects are returned; absent features use the cohort prior.
    """
    if ineligibility_reason(client):
        return {}

    diagnoses = list(client.diagnoses or [])
    candidate: dict[str, Optional[float]] = {
        "Age Category":         age_bucket(client.date_of_birth),
        "Stroke":               has_active_category(diagnoses, ClientDiagnosisCategory.POST_STROKE),
        "Dementia/Alzheimer's": has_active_category(diagnoses, ClientDiagnosisCategory.DEMENTIA),
    }

    return {
        name: float(value)
        for name, value in candidate.items()
        if value is not None and name in feature_columns
    }
