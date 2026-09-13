import json
import logging
from app.core.redis import redis_client
from app.ws.manager import manager, ConnectionType

logger = logging.getLogger(__name__)


async def redis_listener_task():
    """
    Listen for Redis pub/sub messages and forward to WebSocket clients.
    
    This decouples event producers from WebSocket delivery:
    1. Application publishes events to Redis
    2. This listener receives them and broadcasts to WebSocket clients
    3. Multiple worker processes can all receive the same events
    """
    logger.info("Redis WebSocket listener started")
    
    try:
        pubsub = redis_client.pubsub()
        
        # Subscribe to all relevant channels
        await pubsub.subscribe(
            "emergency_updates",
            "visit_updates",
            "assessment_updates",
            "medication_updates",
            "client_updates",
            "caregiver_updates"
        )
        
        logger.info("Subscribed to Redis channels")
        
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    # Parse message
                    channel = message["channel"]
                    data = json.loads(message["data"])
                    
                    # Route based on channel
                    await route_message(channel, data)
                    
                except Exception as e:
                    logger.error(f"Error processing Redis message: {e}")
                    
    except asyncio.CancelledError:
        logger.info("Redis WebSocket listener cancelled")
        raise
    except Exception as e:
        logger.error(f"Redis listener error: {e}", exc_info=True)


async def route_message(channel: str, data: dict):
    """Route Redis messages to appropriate WebSocket clients."""
    
    message_type = data.get("type", "")
    
    # Emergency messages go to admins and relevant family
    if channel == "emergency_updates":
        # Broadcast to all admins
        await manager.broadcast_to_admins(data)
        
        # Broadcast to family of the affected client
        if "client_id" in data:
            await manager.broadcast_to_family(
                data,
                client_ids=[data["client_id"]]
            )
    
    # Visit updates go to admins, relevant family, and caregiver
    elif channel == "visit_updates":
        await manager.broadcast_to_admins(data)
        
        if "client_id" in data:
            await manager.broadcast_to_family(
                data,
                client_ids=[data["client_id"]]
            )
        
        if "caregiver_id" in data:
            await manager.broadcast_to_caregivers(
                data,
                caregiver_ids=[data["caregiver_id"]]
            )
    
    # Assessment updates go to admins and relevant family
    elif channel == "assessment_updates":
        await manager.broadcast_to_admins(data)
        
        if "client_id" in data:
            await manager.broadcast_to_family(
                data,
                client_ids=[data["client_id"]]
            )
    
    # Medication updates go to admins and relevant family
    elif channel == "medication_updates":
        await manager.broadcast_to_admins(data)
        
        if "client_id" in data:
            await manager.broadcast_to_family(
                data,
                client_ids=[data["client_id"]]
            )
    
    # Client updates go to admins only
    elif channel == "client_updates":
        await manager.broadcast_to_admins(data)
    
    # Caregiver updates go to admins
    elif channel == "caregiver_updates":
        await manager.broadcast_to_admins(data)
