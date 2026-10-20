import resend

# Ensure you initialize your API Key from your environment configs
# Import from env.local.example
import os
from dotenv import load_dotenv
load_dotenv('.env.example')

resend.api_key = os.getenv("RESEND_API_KEY")

async def send_resend_email_task(
    invitation_id: str, 
    recipient_email: str, 
    caregiver_name: str
):
    """Fires non-blocking asynchronous email delivery payloads via Resend."""
    registration_link = f"https://"
    
    try:
        resend.Emails.send({
            "from": "Onboarding Team <onboarding@yourverifieddomain.com>",
            "to": [recipient_email],
            "subject": f"Complete Your Caregiver Registration - {caregiver_name}",
            "html": f"""
                <h3>Welcome, {caregiver_name}!</h3>
                <p>You have been formally invited to join our healthcare network.</p>
                <p>Click below to configure your password and unlock your profile:</p>
                <p><a href="{registration_link}">Set Up My Professional Account</a></p>
                <br/>
                <small>This onboarding invite securely expires in 48 hours.</small>
            """,
            # Native headers provide infrastructure-level protection against double-sends
            "headers": {
                "Idempotency-Key": invitation_id,
                "X-Entity-Ref-ID": invitation_id
            }
        })
    except Exception as e:
        # Standard warning/logging to ensure api errors don't crash live operations
        print(f"[RECOVERY LOG] Resend processing failed for invitation {invitation_id}: {str(e)}")
