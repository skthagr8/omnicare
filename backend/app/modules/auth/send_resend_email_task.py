import html
import logging
from urllib.parse import urlencode

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)

# Key and sender come from backend/.env (see app/core/config.py).
resend.api_key = settings.resend_api_key


async def send_resend_email_task(
    invitation_id: str,
    recipient_email: str,
    caregiver_name: str,
    token: str,
):
    """Sends the caregiver invitation email via Resend (runs as a background task)."""
    if not settings.resend_api_key:
        logger.error("RESEND_API_KEY is not set; invitation %s email not sent.", invitation_id)
        return

    registration_link = (
        f"{settings.caregiver_app_url.rstrip('/')}/caregiver-invitation?{urlencode({'token': token})}"
    )
    name = html.escape(caregiver_name)
    hours = settings.caregiver_invitation_ttl_hours

    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": [recipient_email],
            "subject": f"Complete Your Caregiver Registration - {caregiver_name}",
            "html": f"""
                <h3>Welcome, {name}!</h3>
                <p>You have been invited to join the OmniCare care team.</p>
                <p>Click below to set your password and activate your account:</p>
                <p><a href="{registration_link}">Set Up My Professional Account</a></p>
                <p style="color:#64748b;font-size:12px">If the button doesn't work, paste this link into your browser:<br/>{registration_link}</p>
                <br/>
                <small>This invitation expires in {hours} hours.</small>
            """,
            # Same id for the same token, so retries don't double-send; a renewed invite gets a new key.
            "headers": {
                "Idempotency-Key": f"{invitation_id}-{token[:12]}",
                "X-Entity-Ref-ID": invitation_id,
            },
        })
        logger.info("Invitation %s email sent to %s", invitation_id, recipient_email)
    except Exception as e:
        logger.error("Resend failed for invitation %s: %s", invitation_id, e)
