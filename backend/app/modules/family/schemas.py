from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class ServiceRequestCreate(BaseModel):
    client_id: uuid.UUID
    description: str = Field(min_length=3)


class ServiceRequestUpdate(BaseModel):
    status: Optional[str] = None
    resulting_session_id: Optional[uuid.UUID] = None


class ServiceRequestResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    requested_by: uuid.UUID
    description: str
    status: str
    resulting_session_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FamilyMemberResponse(BaseModel):
    user_id: uuid.UUID
    relationship_to_client: Optional[str] = None

    model_config = {"from_attributes": True}
