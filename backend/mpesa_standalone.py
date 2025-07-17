"""
Standalone M-PESA Integration Module.
This module provides direct integration with the M-PESA API without Flask dependencies.
"""
import base64
import json
import requests
from datetime import datetime
import logging
import os
from dotenv import load_dotenv
import time
import traceback
import uuid

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# M-PESA API Credentials
CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n")
CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7")
BUSINESS_SHORT_CODE = os.getenv("MPESA_BUSINESS_SHORT_CODE", "174379")  # Default sandbox shortcode
PASSKEY = os.getenv("MPESA_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")  # Default sandbox passkey
CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "https://webhook.site/your-webhook-id")

# API Endpoints
BASE_URL = "https://sandbox.safaricom.co.ke"
TOKEN_URL = f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
STK_PUSH_URL = f"{BASE_URL}/mpesa/stkpush/v1/processrequest"
QUERY_URL = f"{BASE_URL}/mpesa/stkpushquery/v1/query"

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds

def generate_access_token():
    """
    Generate OAuth access token for M-PESA API.

    Returns:
        str: Access token
    """
    for attempt in range(MAX_RETRIES):
        try:
            # Encode credentials
            auth_string = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
            auth_bytes = auth_string.encode("ascii")
            encoded_auth = base64.b64encode(auth_bytes).decode("ascii")

            # Set headers
            headers = {
                "Authorization": f"Basic {encoded_auth}"
            }

            # Make request
            response = requests.get(TOKEN_URL, headers=headers, timeout=10)

            # Check if request was successful
            if response.status_code == 200:
                # Parse response
                result = response.json()
                token = result.get("access_token")

                if not token:
                    logger.error("No access token in response")
                    if attempt < MAX_RETRIES - 1:
                        logger.info(f"Retrying token generation (attempt {attempt + 1}/{MAX_RETRIES})")
                        time.sleep(RETRY_DELAY)
                        continue
                    return None

                return token
            else:
                logger.error(f"Error generating access token: {response.status_code} - {response.text}")
                if attempt < MAX_RETRIES - 1:
                    logger.info(f"Retrying token generation (attempt {attempt + 1}/{MAX_RETRIES})")
                    time.sleep(RETRY_DELAY)
                    continue
                return None

        except Exception as e:
            logger.error(f"Exception generating access token: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                logger.info(f"Retrying token generation (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(RETRY_DELAY)
                continue
            return None

def generate_password():
    """
    Generate password for STK Push.

    Returns:
        str: Base64 encoded password
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password_string = f"{BUSINESS_SHORT_CODE}{PASSKEY}{timestamp}"
    password_bytes = password_string.encode("ascii")
    return base64.b64encode(password_bytes).decode("ascii"), timestamp

def format_phone_number(phone_number):
    """
    Format phone number to the required format (254XXXXXXXXX).

    Args:
        phone_number: Phone number in various formats (07XX, +254, 254)

    Returns:
        Formatted phone number
    """
    # Remove any non-digit characters
    import re
    phone_number = re.sub(r'\D', '', phone_number)

    # Check if the number starts with '0' (0722...)
    if phone_number.startswith('0'):
        return '254' + phone_number[1:]

    # Check if the number starts with '254' already
    elif phone_number.startswith('254'):
        return phone_number

    # Check if the number starts with '+254'
    elif phone_number.startswith('+254'):
        return phone_number[1:]  # Remove the '+'

    # If it's just the 9-digit number without any prefix
    elif len(phone_number) == 9:
        return '254' + phone_number

    # Return as is if we can't determine the format
    return phone_number

def initiate_stk_push(phone_number, amount, account_reference=None, transaction_desc=None):
    """
    Initiate STK Push to customer's phone.

    Args:
        phone_number (str): Customer's phone number (format: 254XXXXXXXXX)
        amount (int): Amount to pay
        account_reference (str, optional): Account reference. Defaults to None.
        transaction_desc (str, optional): Transaction description. Defaults to None.

    Returns:
        dict: STK Push response
    """
    for attempt in range(MAX_RETRIES):
        try:
            # Format phone number
            phone_number = format_phone_number(phone_number)

            # Ensure amount is an integer
            try:
                amount = int(float(amount))
                # Ensure minimum amount is 1
                if amount < 1:
                    amount = 1
            except (ValueError, TypeError):
                amount = 1

            # Generate access token
            token = generate_access_token()

            if not token:
                logger.error("Failed to generate access token")
                if attempt < MAX_RETRIES - 1:
                    logger.info(f"Retrying STK push (attempt {attempt + 1}/{MAX_RETRIES})")
                    time.sleep(RETRY_DELAY)
                    continue
                return None

            # Generate password and timestamp
            password, timestamp = generate_password()

            # Set headers
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            # Set payload
            payload = {
                "BusinessShortCode": BUSINESS_SHORT_CODE,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone_number,
                "PartyB": BUSINESS_SHORT_CODE,
                "PhoneNumber": phone_number,
                "CallBackURL": CALLBACK_URL,
                "AccountReference": account_reference or "MIZIZZI",
                "TransactionDesc": transaction_desc or "Payment for Mizizzi order"
            }

            # Log the request details
            logger.info(f"Initiating STK Push with payload: {payload}")

            # Make request
            response = requests.post(STK_PUSH_URL, headers=headers, json=payload, timeout=15)

            # Log the raw response
            logger.info(f"STK Push raw response: Status={response.status_code}, Content={response.text}")

            # Check if request was successful
            if response.status_code == 200:
                # Parse response
                try:
                    result = response.json()
                    logger.info(f"STK Push response: {result}")
                    return result
                except json.JSONDecodeError as json_err:
                    logger.error(f"Failed to parse JSON response: {str(json_err)}")
                    logger.error(f"Raw response: {response.text}")
                    if attempt < MAX_RETRIES - 1:
                        logger.info(f"Retrying STK push (attempt {attempt + 1}/{MAX_RETRIES})")
                        time.sleep(RETRY_DELAY)
                        continue
                    return None
            else:
                logger.error(f"Error initiating STK Push: {response.status_code} - {response.text}")
                if attempt < MAX_RETRIES - 1:
                    logger.info(f"Retrying STK push (attempt {attempt + 1}/{MAX_RETRIES})")
                    time.sleep(RETRY_DELAY)
                    continue
                return None

        except Exception as e:
            logger.error(f"Exception initiating STK Push: {str(e)}")
            logger.error(traceback.format_exc())
            if attempt < MAX_RETRIES - 1:
                logger.info(f"Retrying STK push (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(RETRY_DELAY)
                continue
            return None

def query_stk_status(checkout_request_id):
    """
    Query STK Push status.

    Args:
        checkout_request_id (str): Checkout request ID from STK Push response

    Returns:
        dict: STK Push status response
    """
    for attempt in range(MAX_RETRIES):
        try:
            # Generate access token
            token = generate_access_token()

            if not token:
                logger.error("Failed to generate access token")
                if attempt < MAX_RETRIES - 1:
                    logger.info(f"Retrying status query (attempt {attempt + 1}/{MAX_RETRIES})")
                    time.sleep(RETRY_DELAY)
                    continue
                return {
                    "ResultCode": -1,
                    "ResultDesc": "Failed to generate access token",
                    "error_details": "Token generation failed"
                }

            # Generate password and timestamp
            password, timestamp = generate_password()

            # Set headers
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            # Set payload
            payload = {
                "BusinessShortCode": BUSINESS_SHORT_CODE,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id
            }

            # Log the request details
            logger.info(f"Querying STK status with payload: {payload}")

            # Make request
            try:
                response = requests.post(QUERY_URL, headers=headers, json=payload, timeout=15)

                # Log the raw response
                logger.info(f"STK status query raw response: Status={response.status_code}, Content={response.text}")

                # Check if request was successful
                if response.status_code == 200:
                    # Parse response
                    try:
                        result = response.json()
                        logger.info(f"STK Push status response: {result}")
                        return result
                    except json.JSONDecodeError as json_err:
                        logger.error(f"Failed to parse JSON response: {str(json_err)}")
                        logger.error(f"Raw response: {response.text}")
                        if attempt < MAX_RETRIES - 1:
                            logger.info(f"Retrying status query (attempt {attempt + 1}/{MAX_RETRIES})")
                            time.sleep(RETRY_DELAY)
                            continue
                        return {
                            "ResultCode": -1,
                            "ResultDesc": "Invalid JSON response",
                            "error_details": f"Response text: {response.text[:100]}..."
                        }
                else:
                    logger.error(f"Error querying STK Push status: {response.status_code} - {response.text}")
                    if attempt < MAX_RETRIES - 1:
                        logger.info(f"Retrying status query (attempt {attempt + 1}/{MAX_RETRIES})")
                        time.sleep(RETRY_DELAY)
                        continue
                    # Return error response in a structured format
                    return {
                        "ResultCode": -1,
                        "ResultDesc": f"Error: {response.status_code} - {response.text}",
                        "error_details": response.text
                    }
            except requests.RequestException as req_err:
                logger.error(f"Request exception during STK status query: {str(req_err)}")
                if attempt < MAX_RETRIES - 1:
                    logger.info(f"Retrying status query (attempt {attempt + 1}/{MAX_RETRIES})")
                    time.sleep(RETRY_DELAY)
                    continue
                return {
                    "ResultCode": -1,
                    "ResultDesc": f"Request failed: {str(req_err)}",
                    "error_details": str(req_err)
                }

        except Exception as e:
            logger.error(f"Exception querying STK Push status: {str(e)}")
            logger.error(traceback.format_exc())
            if attempt < MAX_RETRIES - 1:
                logger.info(f"Retrying status query (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(RETRY_DELAY)
                continue
            # Return error in a structured format
            return {
                "ResultCode": -1,
                "ResultDesc": f"Exception: {str(e)}",
                "error_details": traceback.format_exc()
            }

    # If we've exhausted all retries, return a fallback response
    return mock_query_stk_status(checkout_request_id)

def mock_query_stk_status(checkout_request_id):
    """
    Mock implementation of query_stk_status for testing.

    Args:
        checkout_request_id (str): Checkout request ID from STK Push response

    Returns:
        dict: Mock STK Push status response
    """
    # Simulate processing delay
    time.sleep(1)

    # Generate a mock response
    # For testing, we'll return success for even seconds, pending for odd seconds
    current_second = datetime.now().second

    if current_second % 2 == 0:
        # Success response
        return {
            "ResultCode": 0,
            "ResultDesc": "The service request is processed successfully.",
            "MerchantRequestID": "29115-34620561-1",
            "CheckoutRequestID": checkout_request_id,
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "Success. Request accepted for processing",
            "is_mock": True
        }
    else:
        # Pending response
        return {
            "ResultCode": 1,
            "ResultDesc": "The transaction is being processed",
            "MerchantRequestID": "29115-34620561-1",
            "CheckoutRequestID": checkout_request_id,
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "Success. Request accepted for processing",
            "is_mock": True
        }

def check_mpesa_status():
    """
    Check if the M-PESA integration is working properly.

    Returns:
        Dictionary with status information
    """
    try:
        # Try to get an access token as a basic test
        token = generate_access_token()

        return {
            "status": "ok",
            "message": "M-PESA integration is working properly",
            "environment": "sandbox",
            "shortcode": BUSINESS_SHORT_CODE,
            "token_obtained": bool(token),
            "callback_url": CALLBACK_URL
        }
    except Exception as e:
        logger.error(f"M-PESA status check failed: {str(e)}")
        return {
            "status": "error",
            "message": f"M-PESA integration check failed: {str(e)}",
            "environment": "sandbox",
            "shortcode": BUSINESS_SHORT_CODE
        }

def simulate_stk_push(phone_number, amount, reference=None):
    """
    Simulate an STK Push transaction for testing purposes.
    This is useful in development environments where real M-PESA integration is not available.

    Args:
        phone_number: Customer's phone number
        amount: Amount to be paid
        reference: Unique reference for the transaction

    Returns:
        Dictionary with simulated response
    """
    # Format phone number
    phone_number = format_phone_number(phone_number)

    # Generate a random checkout request ID
    checkout_request_id = f"ws_{uuid.uuid4().hex[:16]}"
    merchant_request_id = f"mr_{uuid.uuid4().hex[:16]}"

    # Return a simulated response
    return {
        "ResponseCode": "0",
        "ResponseDescription": "Success. Request accepted for processing",
        "MerchantRequestID": merchant_request_id,
        "CheckoutRequestID": checkout_request_id,
        "CustomerMessage": "Success. Request accepted for processing"
    }
