import json
import logging
from typing import Dict, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
from enum import Enum

logger = logging.getLogger(__name__)


class ConnectionType(str, Enum):
    """Type of WebSocket connection."""
    ADMIN_DASHBOARD = "admin_dashboard"
    CAREGIVER_APP = "caregiver_app"
    FAMILY_PORTAL = "family_portal"


class ConnectionManager:
    """
    Manages WebSocket connections.
    
    Handles connection lifecycle, broadcasting, and targeted messaging.
    """
    
    def __init__(self):
        # Store connections by user ID and type
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        
        # Store user metadata
        self.user_info: Dict[str, dict] = {}
    
    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        connection_type: ConnectionType,
        user_info: Optional[dict] = None
    ):
        """Accept and register a new connection."""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        
        # Close existing connection of same type if exists
        if connection_type.value in self.active_connections[user_id]:
            old_ws = self.active_connections[user_id][connection_type.value]
            try:
                await old_ws.close(code=4000, reason="New connection established")
            except:
                pass
        
        self.active_connections[user_id][connection_type.value] = websocket
        
        if user_info:
            self.user_info[user_id] = user_info
        
        logger.info(
            f"WebSocket connected: user={user_id}, type={connection_type.value}"
        )
    
    def disconnect(self, user_id: str, connection_type: ConnectionType):
        """Remove a connection."""
        if user_id in self.active_connections:
            if connection_type.value in self.active_connections[user_id]:
                del self.active_connections[user_id][connection_type.value]
            
            # Clean up if no more connections
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.user_info:
                    del self.user_info[user_id]
        
        logger.info(
            f"WebSocket disconnected: user={user_id}, type={connection_type.value}"
        )
    
    async def send_personal_message(
        self,
        message: dict,
        user_id: str,
        connection_type: Optional[ConnectionType] = None
    ):
        """Send a message to a specific user."""
        if user_id not in self.active_connections:
            return
        
        connections = self.active_connections[user_id]
        
        if connection_type:
            # Send to specific connection type
            if connection_type.value in connections:
                try:
                    await connections[connection_type.value].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to {user_id}: {e}")
                    self.disconnect(user_id, connection_type)
        else:
            # Send to all connections for this user
            for conn_type, ws in list(connections.items()):
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to {user_id}/{conn_type}: {e}")
                    self.disconnect(user_id, ConnectionType(conn_type))
    
    async def broadcast_to_admins(self, message: dict):
        """Broadcast a message to all admin dashboard connections."""
        for user_id, connections in list(self.active_connections.items()):
            user_info = self.user_info.get(user_id, {})
            if user_info.get("role") == "admin":
                for conn_type, ws in list(connections.items()):
                    if conn_type == ConnectionType.ADMIN_DASHBOARD.value:
                        try:
                            await ws.send_json(message)
                        except Exception as e:
                            logger.error(f"Error broadcasting to admin {user_id}: {e}")
                            self.disconnect(
                                user_id,
                                ConnectionType.ADMIN_DASHBOARD
                            )
    
    async def broadcast_to_caregivers(self, message: dict, caregiver_ids: Optional[List[str]] = None):
        """Broadcast a message to caregiver connections."""
        for user_id, connections in list(self.active_connections.items()):
            user_info = self.user_info.get(user_id, {})
            
            # Filter by specific caregivers if provided
            if caregiver_ids and user_id not in caregiver_ids:
                continue
            
            if user_info.get("role") == "caregiver":
                for conn_type, ws in list(connections.items()):
                    if conn_type == ConnectionType.CAREGIVER_APP.value:
                        try:
                            await ws.send_json(message)
                        except Exception as e:
                            logger.error(
                                f"Error broadcasting to caregiver {user_id}: {e}"
                            )
                            self.disconnect(
                                user_id,
                                ConnectionType.CAREGIVER_APP
                            )
    
    async def broadcast_to_family(self, message: dict, client_ids: Optional[List[str]] = None):
        """Broadcast a message to family portal connections."""
        for user_id, connections in list(self.active_connections.items()):
            user_info = self.user_info.get(user_id, {})
            
            # Filter by specific clients if provided
            if client_ids and user_info.get("client_id") not in client_ids:
                continue
            
            if user_info.get("role") == "family":
                for conn_type, ws in list(connections.items()):
                    if conn_type == ConnectionType.FAMILY_PORTAL.value:
                        try:
                            await ws.send_json(message)
                        except Exception as e:
                            logger.error(f"Error broadcasting to family {user_id}: {e}")
                            self.disconnect(
                                user_id,
                                ConnectionType.FAMILY_PORTAL
                            )
    
    def get_connection_count(self) -> int:
        """Get total number of active connections."""
        count = 0
        for connections in self.active_connections.values():
            count += len(connections)
        return count
    
    def get_user_count(self) -> int:
        """Get number of unique users connected."""
        return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()
