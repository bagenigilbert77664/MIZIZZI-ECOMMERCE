import requests
import random
import string
from datetime import datetime

def generate_verification_code(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_email_via_brevo_api(api_key, sender_email, sender_name, recipient_email):
    verification_code = generate_verification_code()

    url = "https://api.brevo.com/v3/smtp/email"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MIZIZZI API Email Test</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
            .container {{ border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px; }}
            .header {{ text-align: center; margin-bottom: 20px; }}
            h1 {{ color: #333; font-size: 24px; margin-bottom: 20px; }}
            .verification-code {{ background-color: #f5f5f5; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 5px; }}
            .button {{ display: inline-block; background-color: #4CAF50; color: white; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: bold; margin: 20px 0; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #777; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>MIZIZZI API Email Test</h1>
            </div>
            <p>Hello,</p>
            <p>This is a direct API test email to verify that the email delivery system is working correctly.</p>

            <p>Your test verification code is:</p>
            <div class="verification-code">{verification_code}</div>

            <p>Test sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

            <p>If you received this email, your email delivery system is working correctly!</p>

            <div class="footer">
                <p>&copy; {datetime.now().year} MIZIZZI. All rights reserved.</p>
                <p>This is an automated test message.</p>
            </div>
        </div>
    </body>
    </html>
    """

    payload = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [{"email": recipient_email}],
        "subject": f"MIZIZZI - {datetime.now().strftime('%H:%M:%S')}",
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
        "api-key": api_key
    }

    print(f"\nSending API email to {recipient_email}...")
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code >= 200 and response.status_code < 300:
        print(f"✅ Email sent successfully to {recipient_email} via API!")
        print(f"📋 Verification code: {verification_code}")
        print(f"⏰ Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        return True, verification_code, response.json()
    else:
        print(f"❌ Failed to send email via API: {response.status_code} - {response.text}")
        return False, None, response.text

def main():
    print("=" * 80)
    print("MIZIZZI ")
    print("=" * 80)

    api_key = "REDACTED-BREVO-KEY"
    sender_email = "REDACTED-SENDER-EMAIL"  # Verified email
    sender_name = "MIZIZZI"

    recipients = [
        "REDACTED-SENDER-EMAIL",
        "gilbertwilber0@gmail.com"
    ]

    custom_recipient = input("Enter additional recipient email (optional): ")
    if custom_recipient:
        recipients.append(custom_recipient)

    print("\n" + "=" * 80)
    print("Starting API email tests...")
    print("=" * 80)

    results = {}

    for recipient in recipients:
        success, code, response = send_email_via_brevo_api(
            api_key, sender_email, sender_name, recipient
        )
        results[recipient] = {"success": success, "code": code}

        if recipient != recipients[-1]:
            print("Waiting 5 seconds before sending next email...")
            import time
            time.sleep(5)

    # Print summary
    print("\n" + "=" * 80)
    print("API TEST SUMMARY")
    print("=" * 80)

    all_success = True
    for recipient, result in results.items():
        status = "✅ SUCCESS" if result["success"] else "❌ FAILED"
        code = result["code"] if result["success"] else "N/A"
        print(f"{recipient}: {status} - Code: {code}")
        if not result["success"]:
            all_success = False

    print("\n" + "=" * 80)
    if all_success:
        print("🎉 All API emails sent successfully! Check your inboxes for verification codes.")
        print("If you don't see the emails, check your spam/junk folders.")
    else:
        print("⚠️ Some API emails failed to send. Review the errors above.")
    print("=" * 80)

if __name__ == "__main__":
    main()
