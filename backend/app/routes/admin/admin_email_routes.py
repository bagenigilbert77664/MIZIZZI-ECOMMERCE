"""
Admin Email Routes
Provides API endpoints for sending emails to users from the admin panel.
"""

from flask import Blueprint, request, jsonify, current_app
from app.validations.validation import admin_required
from app.models.models import User, db
import requests
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

logger.info("=" * 60)
logger.info("📧 ADMIN EMAIL ROUTES MODULE LOADED")
logger.info("=" * 60)

# Create blueprint
admin_email_routes = Blueprint('admin_email_routes', __name__)
logger.info(f"✅ Blueprint 'admin_email_routes' created successfully")


def send_email_brevo(to, subject, html_content):
    """Send email using Brevo API directly since we know it works."""
    try:
        # Get the Brevo API key from configuration
        brevo_api_key = current_app.config.get('BREVO_API_KEY', 'REDACTED-BREVO-KEY')

        if not brevo_api_key:
            logger.error("BREVO_API_KEY not configured")
            return False

        url = "https://api.brevo.com/v3/smtp/email"

        # Prepare the payload for Brevo API
        payload = {
            "sender": {
                "name": "MIZIZZI Admin",
                "email": "REDACTED-SENDER-EMAIL"  # Use the verified sender email
            },
            "to": [{"email": to}],
            "subject": subject,
            "htmlContent": html_content,
            "headers": {
                "X-Priority": "1",
                "X-MSMail-Priority": "High",
                "Importance": "High"
            }
        }

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": brevo_api_key
        }

        logger.info(f"Sending email via Brevo API to {to}")
        response = requests.post(url, json=payload, headers=headers)

        if response.status_code >= 200 and response.status_code < 300:
            logger.info(f"Email sent via Brevo API. Status: {response.status_code}")
            return True
        else:
            logger.error(f"Failed to send email via Brevo API. Status: {response.status_code}. Response: {response.text}")
            return False

    except Exception as e:
        logger.error(f"Error sending email via Brevo: {str(e)}")
        return False


@admin_email_routes.route('/send-email', methods=['POST', 'OPTIONS'])
@admin_required
def send_email_to_user():
    """
    Send an email to a user from the admin panel.

    Expected JSON body:
    {
        "to": "user@example.com",
        "subject": "Email subject",
        "message": "Email message body",
        "user_id": 123  # optional, for logging purposes
    }
    """
    logger.info(f"[v0] Email route hit: {request.method} {request.path}")
    logger.info(f"[v0] Request data: {request.get_json()}")

    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.get_json()

        # Validate required fields
        if not data:
            logger.error("[v0] No data provided in request")
            return jsonify({'error': 'No data provided'}), 400

        to_email = data.get('to')
        subject = data.get('subject')
        message = data.get('message')
        user_id = data.get('user_id')

        logger.info(f"[v0] Processing email to: {to_email}, subject: {subject}")

        if not to_email or not subject or not message:
            logger.error("[v0] Missing required fields")
            return jsonify({'error': 'Missing required fields: to, subject, message'}), 400

        # Verify user exists if user_id provided
        if user_id:
            user = User.query.get(user_id)
            if not user:
                logger.error(f"[v0] User not found: {user_id}")
                return jsonify({'error': 'User not found'}), 404

        html_message = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{subject}</title>
            <style>
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    background-color: #f5f5f7;
                    color: #1d1d1f;
                    line-height: 1.6;
                }}
                .email-wrapper {{
                    max-width: 600px;
                    margin: 40px auto;
                    background: #ffffff;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                }}
                .email-header {{
                    background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                    padding: 40px 30px;
                    text-align: center;
                }}
                .email-header h1 {{
                    color: #ffffff;
                    font-size: 28px;
                    font-weight: 600;
                    letter-spacing: -0.5px;
                    margin: 0;
                }}
                .email-body {{
                    padding: 40px 30px;
                }}
                .message-content {{
                    color: #1d1d1f;
                    font-size: 16px;
                    line-height: 1.8;
                    white-space: pre-wrap;
                }}
                .email-footer {{
                    background: #f5f5f7;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e5e5e7;
                }}
                .email-footer p {{
                    color: #86868b;
                    font-size: 13px;
                    margin: 5px 0;
                }}
                @media only screen and (max-width: 600px) {{
                    .email-wrapper {{
                        margin: 20px;
                    }}
                    .email-header {{
                        padding: 30px 20px;
                    }}
                    .email-body {{
                        padding: 30px 20px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="email-header">
                    <h1>MIZIZZI</h1>
                </div>
                <div class="email-body">
                    <div class="message-content">{message}</div>
                </div>
                <div class="email-footer">
                    <p>&copy; {datetime.utcnow().year} MIZIZZI. All rights reserved.</p>
                    <p>This email was sent from the MIZIZZI Admin Panel.</p>
                </div>
            </div>
        </body>
        </html>
        """

        email_sent = send_email_brevo(to_email, subject, html_message)

        if email_sent:
            logger.info(f'Email sent successfully to {to_email}')

            if user_id:
                try:
                    from app.models.admin_email_log import AdminEmailLog
                    admin_id = request.current_user.id if hasattr(request, 'current_user') else None

                    email_log = AdminEmailLog(
                        user_id=user_id,
                        admin_id=admin_id,
                        subject=subject,
                        content=message,
                        status='sent'
                    )
                    db.session.add(email_log)
                    db.session.commit()
                except Exception as log_error:
                    logger.error(f'Failed to log email: {str(log_error)}')

            return jsonify({
                'success': True,
                'message': 'Email sent successfully',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({'error': 'Failed to send email'}), 500

    except Exception as e:
        logger.error(f'Error in send_email_to_user: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500


logger.info(f"✅ Route registered: POST /send-email (will be /api/admin/send-email with prefix)")

# Export the blueprint
__all__ = ['admin_email_routes']
