import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.emergency.models import EmergencyEvent
from app.modules.emergency.service import EmergencyService

router = APIRouter()


class EmergencyCreate(BaseModel):
    """Schema for creating an emergency."""
    client_id: uuid.UUID
    event_type: str = Field(
        description="Type of emergency (fall_detected, medical_emergency, etc.)"
    )
    severity: str = Field(
        pattern="^(low|medium|high|critical)$"
    )
    location: Optional[Dict[str, float]] = Field(
        default=None,
        description="GPS coordinates {lat, lon}"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional emergency details"
    )


class EmergencyResponse(BaseModel):
    """Schema for emergency response."""
    id: uuid.UUID
    client_id: uuid.UUID
    caregiver_id: Optional[uuid.UUID]
    event_type: str
    severity: str
    status: str
    details: Optional[Dict[str, Any]]
    created_at: datetime
    
    model_config = {"from_attributes": True}


@router.post("/raise", response_model=EmergencyResponse, status_code=status.HTTP_201_CREATED)
async def raise_emergency(
    emergency_data: EmergencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Raise an emergency.
    
    This endpoint is called by caregivers when they need immediate assistance.
    The emergency event and notification are saved atomically using the
    outbox pattern to guarantee delivery.
    """
    # Get caregiver ID if current user is a caregiver
    caregiver_id = None
    if current_user.role == "caregiver":
        caregiver_id = current_user.caregiver.id if current_user.caregiver else None
    
    event = await EmergencyService.raise_emergency(
        db=db,
        client_id=emergency_data.client_id,
        caregiver_id=caregiver_id,
        event_type=emergency_data.event_type,
        severity=emergency_data.severity,
        location=emergency_data.location,
        details=emergency_data.details
    )
    
    return event


@router.get("/active", response_model=list[EmergencyResponse])
async def get_active_emergencies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Get all active emergencies (admin only)."""
    return await EmergencyService.get_active_emergencies(db)


@router.post("/{event_id}/resolve", response_model=EmergencyResponse)
async def resolve_emergency(
    event_id: uuid.UUID,
    resolution_details: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Resolve an emergency (admin only)."""
    return await EmergencyService.resolve_emergency(
        db,
        event_id,
        resolution_details
    )
