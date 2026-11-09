import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Literal, Optional, Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    model_validator,
    field_validator,
)

from app.core.enums import MedicationAdminStatus, MedicationClass

# Built from values, so this doesn't depend on member names in the enum.
OUTCOME_VALUES = ("administered", "refused", "missed")
OUTCOMES = tuple(MedicationAdminStatus(v) for v in OUTCOME_VALUES)


def _validate_days(days: Optional[list[int]]) -> Optional[list[int]]:
    if days is None:
        return None
    if not days or any(d < 1 or d > 7 for d in days):
        raise ValueError("days_of_week must be ISO weekdays 1-7 (1 = Monday)")
    return sorted(set(days))


# ---------------------------------------------------------------------------
# Medication
# ---------------------------------------------------------------------------
class MedicationBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    drug_class: MedicationClass = MedicationClass.OTHER
    dosage: str = Field(min_length=1, max_length=100)
    instructions: Optional[str] = Field(default=None, max_length=2000)
    requires_glucose_check: bool = False
    window_start_local: time
    window_end_local: time


class MedicationCreate(MedicationBase):
    @model_validator(mode="after")
    def window_not_empty(self):
        # end < start is allowed: the window wraps past midnight.
        if self.window_end_local == self.window_start_local:
            raise ValueError("window_end_local must differ from window_start_local")
        return self


class MedicationResponse(MedicationBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("window_start_local", "window_end_local")
    def _hh_mm(self, value: time) -> str:
        return value.strftime("%H:%M")


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------
class MedicationScheduleCreate(BaseModel):
    scheduled_time: time
    days_of_week: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6, 7])

    _days = field_validator("days_of_week")(_validate_days)


class MedicationScheduleUpdate(BaseModel):
    scheduled_time: Optional[time] = None
    days_of_week: Optional[list[int]] = None

    _days = field_validator("days_of_week")(_validate_days)

    @model_validator(mode="after")
    def not_empty(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        return self


class MedicationScheduleResponse(BaseModel):
    id: uuid.UUID
    medication_id: uuid.UUID
    scheduled_time: time
    days_of_week: list[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Administrations
# ---------------------------------------------------------------------------
class MedicationAdministrationCreate(BaseModel):
    session_id: uuid.UUID
    medication_id: uuid.UUID
    schedule_id: Optional[uuid.UUID] = None
    status: MedicationAdminStatus
    glucose_check_value: Optional[Annotated[Decimal, Field(max_digits=5, decimal_places=1)]] = None
    administered_at: Optional[datetime] = None
    missed_reason: Optional[str] = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def check_outcome(self):
        if self.status not in OUTCOMES:
            raise ValueError(f"status must be one of: {', '.join(OUTCOME_VALUES)}")

        if self.status.value == "administered":
            if self.administered_at is None:
                raise ValueError("administered_at is required when status is administered")
            moment = self.administered_at
            if moment.tzinfo is None:
                moment = moment.replace(tzinfo=timezone.utc)
            if moment > datetime.now(timezone.utc) + timedelta(minutes=1):
                raise ValueError("administered_at cannot be in the future")
            self.administered_at = moment
            if (self.missed_reason or "").strip():
                raise ValueError("A reason is only allowed for refused or missed doses")
            self.missed_reason = None
        else:
            reason = (self.missed_reason or "").strip()
            if not reason:
                raise ValueError("A reason is required for refused or missed doses")
            if self.administered_at is not None or self.glucose_check_value is not None:
                raise ValueError(
                    "administered_at and glucose_check_value are only for administered doses"
                )
            self.missed_reason = reason
        return self


class MedicationAdministrationUpdate(BaseModel):
    status: Optional[MedicationAdminStatus] = None
    glucose_check_value: Optional[Decimal] = None
    administered_at: Optional[datetime] = None
    missed_reason: Optional[str] = None

    @model_validator(mode="after")
    def not_empty(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        return self


class MedicationAdministrationResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    medication_id: uuid.UUID
    schedule_id: Optional[uuid.UUID] = None
    status: MedicationAdminStatus
    glucose_check_value: Optional[Decimal] = None
    administered_at: Optional[datetime] = None
    missed_reason: Optional[str] = None
    recorded_by: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("glucose_check_value")
    def _glucose(self, value: Optional[Decimal]) -> Optional[float]:
        return float(value) if value is not None else None


# ---------------------------------------------------------------------------
# Weekly view (shape matches the frontend's weeklySchema)
# ---------------------------------------------------------------------------
class WeeklyDose(BaseModel):
    id: str
    client_id: uuid.UUID
    medication_id: uuid.UUID
    medication_name: str
    dosage: str
    scheduled_at: datetime
    window_start: datetime
    window_end: datetime
    status: Literal["scheduled", "administered", "missed", "refused", "unrecorded"]
    administered_at: Optional[datetime] = None
    reason: Optional[str] = None
    recorded_by_name: Optional[str] = None


class WeeklyScheduleResponse(BaseModel):
    client_id: uuid.UUID
    week_start: date
    timezone: str
    doses: list[WeeklyDose]