from datetime import datetime, time
from decimal import Decimal
from typing import Optional
import uuid

from pydantic import BaseModel, Field, model_validator

from app.core.enums import MedicationAdminStatus, MedicationClass


class MedicationCreate(BaseModel):
    client_id: uuid.UUID
    name: str
    drug_class: MedicationClass = MedicationClass.OTHER
    dosage: str
    instructions: Optional[str] = None
    requires_glucose_check: bool = False
    window_start_local: time
    window_end_local: time

    @model_validator(mode="after")
    def window_order(self):
        if self.window_end_local <= self.window_start_local:
            raise ValueError("window_end_local must be after window_start_local")
        return self


class MedicationResponse(MedicationCreate):
    id: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicationScheduleCreate(BaseModel):
    scheduled_time: time
    days_of_week: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6, 7])

    @model_validator(mode="after")
    def valid_days(self):
        if not self.days_of_week or any(d < 1 or d > 7 for d in self.days_of_week):
            raise ValueError("days_of_week must be ISO weekdays 1-7")
        return self


class MedicationScheduleResponse(MedicationScheduleCreate):
    id: uuid.UUID
    medication_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicationAdministrationCreate(BaseModel):
    session_id: uuid.UUID
    medication_id: uuid.UUID
    schedule_id: Optional[uuid.UUID] = None
    status: MedicationAdminStatus
    glucose_check_value: Optional[Decimal] = None
    administered_at: Optional[datetime] = None
    missed_reason: Optional[str] = None


class MedicationAdministrationResponse(MedicationAdministrationCreate):
    id: uuid.UUID
    recorded_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
