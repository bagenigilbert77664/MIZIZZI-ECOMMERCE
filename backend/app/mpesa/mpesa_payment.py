"""
M-PESA Payment Integration for Mizizzi E-commerce Platform.
Provides functions for initiating STK Push and querying transaction status.
"""
import requests
import base64
import json
from datetime import datetime
import logging
import os
import uuid
import random

from .mpesa_auth import generate_access_token
from .mpesa_credentials import (
    BUSINESS_SHORT_CODE, PASSKEY,
    STK_PUSH_URL, QUERY_URL, IS_PRODUCTION
)

# Set up logger
logger = logging.getLogger(__name__)

def initiate_stk_push(phone_number, amount, account_reference="MIZIZZI", transaction_desc="Payment", callback_url=None):
    """
    Initiate an M-PESA STK Push request to the customer's phone.

    Args:
        phone_number: Customer's phone number (format: 254XXXXXXXXX)
        amount: Amount to pay
        account_reference: Reference for the transaction
        transaction_desc: Description of the transaction
        callback_url: URL to receive the callback (optional)

    Returns:
        JSON response from the M-PESA API
    """
    try:
        # Format phone number (ensure it starts with 254)
        if phone_number.startswith("+"):
            phone_number = phone_number[1:]
        if phone_number.startswith("0"):
            phone_number = "254" + phone_number[1:]
        if (phone_number.startswith("7") or phone_number.startswith("1")) and len(phone_number) == 9:
            phone_number = "254" + phone_number

        # Log the formatted phone number
        logger.info(f"Formatted phone number for STK push: {phone_number}")

        # Check if we're in test/development mode
        is_test_mode = os.environ.get('FLASK_ENV') == 'development' or not IS_PRODUCTION

        # If in test mode and MPESA_SIMULATE is set, return a mock response
        if is_test_mode and os.environ.get('MPESA_SIMULATE') == 'true':
            logger.info(f"SIMULATION MODE: Simulating STK Push for phone={phone_number}, amount={amount}")

            # Generate a mock checkout request ID
            checkout_request_id = f"ws_CO_DMO_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
            merchant_request_id = f"19455-{random.randint(100000, 999999)}-1"

            # Return a simulated successful response
            return {
                "MerchantRequestID": merchant_request_id,
                "CheckoutRequestID": checkout_request_id,
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CustomerMessage": "Success. Request accepted for processing",
                "_simulated": True
            }

        # Generate access token
        token = generate_access_token()

        if not token:
            logger.error("Failed to generate access token for STK Push")
            return None

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
            "CallBackURL": callback_url or "https://webhook.site/your-webhook-id",  # Replace with your webhook URL
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }

        # Log the request
        logger.info(f"Initiating STK Push: phone={phone_number}, amount={amount}, reference={account_reference}")
        logger.debug(f"STK Push request data: {json.dumps(request_data)}")

        # Make the request
        response = requests.post(STK_PUSH_URL, json=request_data, headers=headers)

        # Log the response status
        logger.info(f"STK Push response status: {response.status_code}")

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"STK Push failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None

        # Parse the response
        try:
            response_data = response.json()
            logger.info(f"STK Push successful: {response_data.get('ResponseDescription')}")
            logger.debug(f"STK Push response: {json.dumps(response_data)}")
            return response_data
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON response: {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error initiating STK Push: {str(e)}")
        return None

def query_stk_status(checkout_request_id):
    """
    Query the status of an M-PESA STK Push transaction.

    Args:
        checkout_request_id: The CheckoutRequestID from the STK Push response

    Returns:
        JSON response from the M-PESA API
    """
    try:
        # Generate access token
        token = generate_access_token()

        if not token:
            logger.error("Failed to generate access token for STK Query")
            return None

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
            "CheckoutRequestID": checkout_request_id
        }

        # Log the request
        logger.info(f"Querying STK status: checkout_request_id={checkout_request_id}")

        # Make the request
        response = requests.post(QUERY_URL, json=request_data, headers=headers)

        # Log the response status
        logger.info(f"STK Query response status: {response.status_code}")

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(f"STK Query failed with status code {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None

        # Parse the response
        try:
            response_data = response.json()
            logger.info(f"STK Query successful: {response_data.get('ResponseDescription')}")
            return response_data
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON response: {response.text}")
            return None

    except Exception as e:
        logger.error(f"Error querying STK status: {str(e)}")
        return None
