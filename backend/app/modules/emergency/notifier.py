from typing import Dict, Any, Optional
from twilio.rest import Client
from app.core.config import settings


class EmergencyNotifier:
    """Handles emergency notifications via Twilio."""
    
    _twilio_client: Optional[Client] = None
    
    @classmethod
    def get_twilio_client(cls) -> Client:
        """Get or create Twilio client."""
        if cls._twilio_client is None and settings.twilio_account_sid:
            cls._twilio_client = Client(
                settings.twilio_account_sid,
                settings.twilio_auth_token
            )
        return cls._twilio_client
    
    @classmethod
    async def send_notification(cls, payload: Dict[str, Any]) -> str:
        """
        Send emergency notification.
        
        Returns Twilio message SID if sent, empty string if no Twilio configured.
        """
        client = cls.get_twilio_client()
        
        if client is None:
            # In development, just log the notification
            import logging
            logging.info(f"Emergency notification (no Twilio): {payload}")
            return "dev_message_sid"
        
        # Format emergency message
        message = cls.format_emergency_message(payload)
        
        # Send to emergency contact
        emergency_contact = payload.get("emergency_contact", {})
        if emergency_contact.get("phone"):
            message = client.messages.create(
                body=message,
                from_=settings.twilio_phone_number,
                to=emergency_contact["phone"]
            )
            return message.sid
        
        return ""
    
    @staticmethod
    def format_emergency_message(payload: Dict[str, Any]) -> str:
        """Format emergency message for SMS."""
        severity = payload.get("severity", "unknown").upper()
        event_type = payload.get("event_type", "unknown").replace("_", " ").title()
        client_name = payload.get("client_name", "Client")
        
        message = (
            f"OMNICARE {severity} ALERT\n"
            f"{event_type} for {client_name}\n"
            f"Time: {payload.get('timestamp', '')}\n"
        )
        
        if payload.get("location"):
            message += f"Location: {payload['location'].get('lat')}, {payload['location'].get('lon')}\n"
        
        if payload.get("details"):
            for key, value in payload["details"].items():
                message += f"{key}: {value}\n"
        
        message += "\nPlease respond immediately."
        
        return message
