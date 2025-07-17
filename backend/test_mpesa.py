"""
Standalone M-PESA Integration Test Script.
Tests token generation and STK Push without requiring the Flask application.
"""
import base64
import json
import requests
from datetime import datetime
import os

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
            print(f"Token generation failed with status code {response.status_code}")
            print(f"Response: {response.text}")
            return None

        # Parse the response
        response_data = response.json()

        # Extract the access token
        if "access_token" in response_data:
            return response_data["access_token"]
        else:
            print(f"Token generation failed: {response_data}")
            return None

    except Exception as e:
        print(f"Error generating access token: {str(e)}")
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
        print(f"Request URL: {STK_PUSH_URL}")
        print(f"Request Headers: {headers}")
        print(f"Request Data: {json.dumps(request_data, indent=2)}")

        response = requests.post(STK_PUSH_URL, json=request_data, headers=headers)

        print(f"Response Status: {response.status_code}")
        print(f"Response Text: {response.text}")

        # Check if the request was successful
        if response.status_code != 200:
            print(f"STK Push failed with status code {response.status_code}")
            print(f"Response: {response.text}")
            return None

        # Parse the response
        try:
            response_data = response.json()
            return response_data
        except json.JSONDecodeError:
            print(f"Failed to parse JSON response: {response.text}")
            return None

    except Exception as e:
        print(f"Error initiating STK Push: {str(e)}")
        return None

def main():
    """Run the M-PESA integration test."""
    print("=== Testing M-PESA Integration ===\n")

    # 1. Test token generation
    print("1. Testing token generation...")
    token = generate_access_token()

    if token:
        print(f"Success! Token: {token[:10]}...\n")
    else:
        print("Failed to generate access token")
        return

    # 2. Test STK Push
    print("2. Testing STK Push...")
    phone_number = input("Enter phone number (format: 254XXXXXXXXX): ") or "254746741719"  # Replace with a valid phone number

    response = initiate_stk_push(token, phone_number)

    if response:
        print(f"Success! Response: {json.dumps(response, indent=2)}")
    else:
        print("Failed to initiate STK Push")

if __name__ == "__main__":
    main()
