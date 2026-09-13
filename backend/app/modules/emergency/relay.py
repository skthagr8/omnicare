import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.database import async_session_factory
from app.modules.emergency.models import EmergencyOutbox
from app.modules.emergency.service import EmergencyService

logger = logging.getLogger(__name__)


async def emergency_relay_loop():
    """
    Background worker that processes the emergency outbox.
    
    This runs continuously, polling for pending outbox entries
    and attempting to deliver them.
    """
    logger.info("Emergency relay worker started")
    
    while True:
        try:
            async with async_session_factory() as session:
                # Get pending entries
                # Skip entries that have a future retry time
                now = datetime.utcnow()
                result = await session.execute(
                    select(EmergencyOutbox)
                    .where(
                        and_(
                            EmergencyOutbox.status == "pending",
                            or_(
                                EmergencyOutbox.next_retry_at.is_(None),
                                EmergencyOutbox.next_retry_at <= now
                            )
                        )
                    )
                    .order_by(EmergencyOutbox.created_at)
                    .limit(20)
                    .with_for_update(skip_locked=True)  # Prevent double-processing
                )
                
                pending_entries = result.scalars().all()
                
                if pending_entries:
                    logger.info(f"Processing {len(pending_entries)} outbox entries")
                    
                    for entry in pending_entries:
                        success = await EmergencyService.process_outbox_entry(
                            session,
                            entry
                        )
                        
                        if success:
                            logger.info(
                                f"Outbox entry {entry.id} delivered successfully"
                            )
                        else:
                            logger.warning(
                                f"Outbox entry {entry.id} failed, "
                                f"retry {entry.retry_count}/5"
                            )
            
        except Exception as e:
            logger.error(f"Error in emergency relay loop: {e}", exc_info=True)
        
        # Wait before next poll
        await asyncio.sleep(2)  # Poll every 2 seconds
