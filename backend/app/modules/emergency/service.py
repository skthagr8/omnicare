import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import redis_client
from app.modules.emergency.models import EmergencyEvent, EmergencyOutbox
from app.modules.clients.models import Client
from app.modules.caregivers.models import Caregiver


class EmergencyService:
    """Emergency service with transactional outbox pattern."""
    
    @staticmethod
    async def raise_emergency(
        db: AsyncSession,
        client_id: uuid.UUID,
        caregiver_id: Optional[uuid.UUID],
        event_type: str,
        severity: str,
        location: Optional[Dict[str, float]] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> EmergencyEvent:
        """
        Raise an emergency with guaranteed notification delivery.
        
        This method uses the transactional outbox pattern:
        1. Write emergency event and outbox entry in a single transaction
        2. A background worker processes the outbox
        3. If the system crashes between steps, the outbox entry is still there
        """
        
        # Validate client exists
        client = await db.get(Client, client_id)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        
        # Create emergency event
        event = EmergencyEvent(
            client_id=client_id,
            caregiver_id=caregiver_id,
            event_type=event_type,
            severity=severity,
            details=details or {},
            status="active"
        )
        
        # Set location if provided
        if location:
            from geoalchemy2.elements import WKTElement
            event.location = WKTElement(
                f"POINT({location['lon']} {location['lat']})",
                srid=4326
            )
        
        db.add(event)
        await db.flush()  # Get event.id without committing
        
        # Create outbox entry in the same transaction
        notification_payload = {
            "event_id": str(event.id),
            "client_id": str(client_id),
            "client_name": f"{client.first_name} {client.last_name}",
            "caregiver_id": str(caregiver_id) if caregiver_id else None,
            "event_type": event_type,
            "severity": severity,
            "location": location,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
            "emergency_contact": {
                "name": client.emergency_contact_name,
                "phone": client.emergency_contact_phone
            }
        }
        
        outbox_entry = EmergencyOutbox(
            event_id=event.id,
            payload=notification_payload,
            status="pending",
            retry_count=0
        )
        
        db.add(outbox_entry)
        
        # Both entries will be committed atomically
        await db.commit()
        await db.refresh(event)
        
        # Publish to Redis for real-time WebSocket updates
        # This happens AFTER commit to ensure data is persisted
        await redis_client.publish(
            "emergency_updates",
            json.dumps({
                "type": "emergency_raised",
                "event_id": str(event.id),
                "client_id": str(client_id),
                "severity": severity,
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        
        return event
    
    @staticmethod
    async def get_active_emergencies(
        db: AsyncSession,
        limit: int = 50
    ) -> list[EmergencyEvent]:
        """Get all active emergencies."""
        result = await db.execute(
            select(EmergencyEvent)
            .where(EmergencyEvent.status == "active")
            .order_by(EmergencyEvent.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def resolve_emergency(
        db: AsyncSession,
        event_id: uuid.UUID,
        resolution_details: Optional[Dict[str, Any]] = None
    ) -> EmergencyEvent:
        """Resolve an emergency."""
        event = await db.get(EmergencyEvent, event_id)
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emergency event not found"
            )
        
        event.status = "resolved"
        event.resolved_at = datetime.utcnow()
        if resolution_details:
            event.details = {**(event.details or {}), **resolution_details}
        
        await db.commit()
        await db.refresh(event)
        
        # Publish update
        await redis_client.publish(
            "emergency_updates",
            json.dumps({
                "type": "emergency_resolved",
                "event_id": str(event.id),
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        
        return event
    
    @staticmethod
    async def process_outbox_entry(
        db: AsyncSession,
        entry: EmergencyOutbox
    ) -> bool:
        """
        Process a single outbox entry.
        
        Returns True if delivered successfully, False if retry needed.
        """
        try:
            # Import here to avoid circular imports
            from app.modules.emergency.notifier import EmergencyNotifier
            
            # Send notification
            message_sid = await EmergencyNotifier.send_notification(
                entry.payload
            )
            
            # Update entry status
            entry.status = "delivered"
            entry.twilio_message_sid = message_sid
            entry.processed_at = datetime.utcnow()
            entry.error_message = None
            
            await db.commit()
            return True
            
        except Exception as e:
            # Update retry count
            entry.retry_count += 1
            entry.error_message = str(e)
            
            if entry.retry_count >= 5:
                entry.status = "failed"
            else:
                entry.status = "pending"
                entry.next_retry_at = datetime.utcnow() + timedelta(
                    minutes=2 ** entry.retry_count  # Exponential backoff
                )
            
            await db.commit()
            return False
