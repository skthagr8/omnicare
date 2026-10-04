from datetime import date, datetime
from typing import Optional
import uuid

from pydantic import BaseModel, model_validator

from app.core.enums import SessionStatus
from app.schemas.common import GeoPoint


class SessionCreate(BaseModel):
    client_id: uuid.UUID
    caregiver_id: uuid.UUID
    scheduled_start: datetime
    scheduled_end: datetime

    @model_validator(mode="after")
    def end_after_start(self):
        if self.scheduled_end <= self.scheduled_start:
            raise ValueError("scheduled_end must be after scheduled_start")
        return self


class SessionCheckIn(BaseModel):
    location: GeoPoint
    geofence_verified: bool = True


class SessionCheckOut(BaseModel):
    location: GeoPoint


class SessionResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    client_id: uuid.UUID
    caregiver_id: uuid.UUID
    scheduled_start: datetime
    scheduled_end: datetime
    visit_date: Optional[date] = None
    status: SessionStatus
    check_in_at: Optional[datetime] = None
    check_in_location: Optional[GeoPoint] = None
    check_in_geofence_verified: Optional[bool] = None
    check_out_at: Optional[datetime] = None
    check_out_location: Optional[GeoPoint] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}
