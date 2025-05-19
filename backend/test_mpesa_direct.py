"""
Standalone M-PESA Integration Test Script for direct testing.
This script can be imported and used directly in the Flask routes.
"""
import base64
import json
import requests
from datetime import datetime
import logging

# Set up logger
logger = logging.getLogger(__name__)

# M-PESA API Credentials
CONSUMER_KEY = "qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n"
CONSUMER_SECRET = "MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7"
BUSINESS_SHORT_CODE = "174379"  # Default sandbox shortcode
PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"  # Default sandbox passkey

# API Endpoints
TOKEN_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
STK_PUSH_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

def generate_access_token():
    """Generate an access token for the Safaricom M-PESA API."""
    # Encode credentials
    auth_string = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
    encoded_credentials = base64.b64encode(auth_string.encode()).decode()

    # Set up headers
    headers = {
        "Authorization": f"Basic {encoded_credentials}",
    }

    # Make the request
    try:
        response = requests.get(TOKEN_URL, headers=headers)

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"Token generation failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None

        # Parse the response
        response_data = response.json()

        # Extract the access token
        if "access_token" in response_data:
            return response_data["access_token"]
        else:
            logger.error(f"Token generation failed: {response_data}")
            return None

    except Exception as e:
        logger.error(f"Error generating access token: {str(e)}")
        return None

def initiate_stk_push(token, phone_number, amount=1, account_reference="TEST-ACCOUNT", transaction_desc="Test Transaction"):
    """Initiate an STK Push request to the customer's phone."""
    # Format phone number (ensure it starts with 254)
    if phone_number.startswith("+"):
        phone_number = phone_number[1:]
    if phone_number.startswith("0"):
        phone_number = "254" + phone_number[1:]

    # Generate timestamp
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    # Generate password
    password_str = f"{BUSINESS_SHORT_CODE}{PASSKEY}{timestamp}"
    password = base64.b64encode(password_str.encode()).decode()

    # Set up headers
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Set up request body
    request_data = {
        "BusinessShortCode": BUSINESS_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": BUSINESS_SHORT_CODE,
        "PhoneNumber": phone_number,
        "CallBackURL": "https://webhook.site/your-webhook-id",  # Replace with your webhook URL
        "AccountReference": account_reference,
        "TransactionDesc": transaction_desc
    }

    # Make the request
    try:
        logger.info(f"Request URL: {STK_PUSH_URL}")
        logger.info(f"Request Headers: {headers}")
        logger.info(f"Request Data: {json.dumps(request_data, indent=2)}")

        response = requests.post(STK_PUSH_URL, json=request_data, headers=headers)

        logger.info(f"Response Status: {response.status_code}")
        logger.info(f"Response Text: {response.text}")

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"STK Push failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None

        # Parse the response
        try:
            response_data = response.json()
            return response_data
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON response: {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error initiating STK Push: {str(e)}")
        return None
