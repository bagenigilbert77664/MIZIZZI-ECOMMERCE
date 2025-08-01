"""
M-PESA (Daraja) Service Layer for Mizizzi E-commerce Platform.
Complete implementation with all M-PESA functionalities including STK Push, callbacks, and status queries.
"""

import base64
import json
import requests
from datetime import datetime, timedelta
import logging
import os
from dotenv import load_dotenv
import time
import traceback
import re
import uuid
from typing import Dict, Optional, Any, Union
import random

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# M-PESA API Credentials (Sandbox)
CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n")
CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7")
BUSINESS_SHORT_CODE = os.getenv("MPESA_BUSINESS_SHORT_CODE", "174379")
PASSKEY = os.getenv("MPESA_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")
CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "https://webhook.site/your-webhook-id")
ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")

# API Endpoints
if ENVIRONMENT.lower() == "production":
    BASE_URL = "https://api.safaricom.co.ke"
else:
    BASE_URL = "https://sandbox.safaricom.co.ke"

TOKEN_URL = f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
STK_PUSH_URL = f"{BASE_URL}/mpesa/stkpush/v1/processrequest"
QUERY_URL = f"{BASE_URL}/mpesa/stkpushquery/v1/query"

# Configuration
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
REQUEST_TIMEOUT = 30  # seconds
TRANSACTION_TYPE = "CustomerPayBillOnline"

# Cache for access tokens
_token_cache = {
    'token': None,
    'expires_at': None
}


class MpesaError(Exception):
    """Custom exception for M-PESA related errors."""

    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class MpesaService:
    """M-PESA service class for handling all M-PESA operations."""

    def __init__(self):
        self.consumer_key = CONSUMER_KEY
        self.consumer_secret = CONSUMER_SECRET
        self.business_short_code = BUSINESS_SHORT_CODE
        self.passkey = PASSKEY
        self.callback_url = CALLBACK_URL
        self.environment = ENVIRONMENT

    def format_phone_number(self, phone: str) -> str:
        """
        Format phone number to the required M-PESA format (254XXXXXXXXX).

        Args:
            phone (str): Phone number in various formats

        Returns:
            str: Formatted phone number

        Raises:
            MpesaError: If phone number format is invalid
        """
        if not phone:
            raise MpesaError("Phone number is required")

        # Remove all non-digit characters
        phone = re.sub(r'\D', '', str(phone))

        # Handle different formats
        if phone.startswith('254') and len(phone) == 12:
            # Already in correct format
            return phone
        elif phone.startswith('0') and len(phone) == 10:
            # Local format (0XXXXXXXXX)
            return '254' + phone[1:]
        elif len(phone) == 9 and (phone.startswith('7') or phone.startswith('1')):
            # Without country code or leading zero
            return '254' + phone
        elif phone.startswith('254') and len(phone) != 12:
            raise MpesaError(f"Invalid phone number format: {phone}")
        else:
            raise MpesaError(f"Invalid phone number format: {phone}")

    def validate_amount(self, amount: Union[int, float, str]) -> int:
        """
        Validate and format amount for M-PESA transaction.

        Args:
            amount: Amount to validate

        Returns:
            int: Validated amount

        Raises:
            MpesaError: If amount is invalid
        """
        try:
            amount = float(amount)
            if amount <= 0:
                raise MpesaError("Amount must be greater than 0")
            if amount > 70000:  # M-PESA transaction limit
                raise MpesaError("Amount exceeds M-PESA transaction limit (KES 70,000)")
            return int(amount)
        except (ValueError, TypeError):
            raise MpesaError("Invalid amount format")

    def generate_access_token(self, force_refresh: bool = False) -> Optional[str]:
        """
        Generate OAuth access token for M-PESA API with caching.

        Args:
            force_refresh (bool): Force token refresh even if cached token is valid

        Returns:
            str: Access token or None if failed
        """
        global _token_cache

        # Check if we have a valid cached token
        if not force_refresh and _token_cache['token'] and _token_cache['expires_at']:
            if datetime.now() < _token_cache['expires_at']:
                logger.info("Using cached access token")
                return _token_cache['token']

        for attempt in range(MAX_RETRIES):
            try:
                # Encode credentials
                auth_string = f"{self.consumer_key}:{self.consumer_secret}"
                auth_bytes = auth_string.encode("ascii")
                encoded_auth = base64.b64encode(auth_bytes).decode("ascii")

                # Set headers
                headers = {
                    "Authorization": f"Basic {encoded_auth}",
                    "Content-Type": "application/json"
                }

                logger.info(f"Requesting access token (attempt {attempt + 1}/{MAX_RETRIES})")

                # Make request
                response = requests.get(TOKEN_URL, headers=headers, timeout=REQUEST_TIMEOUT)

                # Check if request was successful
                if response.status_code == 200:
                    result = response.json()
                    token = result.get("access_token")
                    expires_in = result.get("expires_in", 3600)  # Default 1 hour

                    # Ensure expires_in is a valid integer
                    try:
                        expires_in = int(expires_in)
                    except (ValueError, TypeError):
                        expires_in = 3600  # Default to 1 hour

                    if not token:
                        logger.error("No access token in response")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        return None

                    # Cache the token
                    _token_cache['token'] = token
                    # Ensure expires_in is an integer
                    expires_in = int(expires_in) if expires_in else 3600
                    _token_cache['expires_at'] = datetime.now() + timedelta(seconds=expires_in - 60)  # 1 minute buffer

                    logger.info("Access token generated successfully")
                    return token
                else:
                    logger.error(f"Error generating access token: {response.status_code} - {response.text}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    return None

            except requests.RequestException as e:
                logger.error(f"Request exception generating access token: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                return None
            except Exception as e:
                logger.error(f"Unexpected exception generating access token: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                return None

        return None

    def generate_password(self) -> tuple[str, str]:
        """
        Generate password for STK Push.

        Returns:
            tuple: (password, timestamp)
        """
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_string = f"{self.business_short_code}{self.passkey}{timestamp}"
        password_bytes = password_string.encode("ascii")
        password = base64.b64encode(password_bytes).decode("ascii")
        return password, timestamp

    def initiate_stk_push(
        self,
        phone_number: str,
        amount: Union[int, float],
        account_reference: Optional[str] = None,
        transaction_desc: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Initiate STK Push to customer's phone.

        Args:
            phone_number (str): Customer's phone number
            amount (Union[int, float]): Amount to pay
            account_reference (str, optional): Account reference
            transaction_desc (str, optional): Transaction description

        Returns:
            dict: STK Push response or None if failed

        Raises:
            MpesaError: If validation fails
        """
        try:
            # Validate inputs
            formatted_phone = self.format_phone_number(phone_number)
            validated_amount = self.validate_amount(amount)

            # Set defaults
            if not account_reference:
                account_reference = f"MIZIZZI-{uuid.uuid4().hex[:8].upper()}"
            if not transaction_desc:
                transaction_desc = "Payment for Mizizzi order"

            logger.info(f"Initiating STK Push: Phone={formatted_phone}, Amount={validated_amount}")

            for attempt in range(MAX_RETRIES):
                try:
                    # Generate access token
                    token = self.generate_access_token()
                    if not token:
                        logger.error("Failed to generate access token")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        raise MpesaError("Failed to generate access token")

                    # Generate password and timestamp
                    password, timestamp = self.generate_password()

                    # Set headers
                    headers = {
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    }

                    # Set payload
                    payload = {
                        "BusinessShortCode": self.business_short_code,
                        "Password": password,
                        "Timestamp": timestamp,
                        "TransactionType": TRANSACTION_TYPE,
                        "Amount": validated_amount,
                        "PartyA": formatted_phone,
                        "PartyB": self.business_short_code,
                        "PhoneNumber": formatted_phone,
                        "CallBackURL": self.callback_url,
                        "AccountReference": account_reference,
                        "TransactionDesc": transaction_desc
                    }

                    logger.info(f"STK Push payload: {json.dumps(payload, indent=2)}")

                    # Make request
                    response = requests.post(
                        STK_PUSH_URL,
                        headers=headers,
                        json=payload,
                        timeout=REQUEST_TIMEOUT
                    )

                    logger.info(f"STK Push response: Status={response.status_code}, Content={response.text}")

                    # Check if request was successful
                    if response.status_code == 200:
                        try:
                            result = response.json()
                            # Validate response
                            if result.get('ResponseCode') == '0':
                                logger.info("STK Push initiated successfully")
                                return result
                            else:
                                error_msg = result.get('errorMessage') or result.get('ResponseDescription', 'Unknown error')
                                logger.error(f"STK Push failed: {error_msg}")
                                if attempt < MAX_RETRIES - 1:
                                    time.sleep(RETRY_DELAY)
                                    continue
                                raise MpesaError(f"STK Push failed: {error_msg}", details=result)
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse STK Push response: {str(e)}")
                            if attempt < MAX_RETRIES - 1:
                                time.sleep(RETRY_DELAY)
                                continue
                            raise MpesaError("Invalid response format from M-PESA API")
                    else:
                        logger.error(f"STK Push request failed: {response.status_code} - {response.text}")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        raise MpesaError(f"STK Push request failed: {response.status_code}")

                except requests.RequestException as e:
                    logger.error(f"Request exception during STK Push: {str(e)}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    raise MpesaError(f"Network error during STK Push: {str(e)}")

            raise MpesaError("STK Push failed after all retry attempts")

        except MpesaError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during STK Push: {str(e)}")
            logger.error(traceback.format_exc())
            raise MpesaError(f"Unexpected error: {str(e)}")

    def query_stk_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """
        Query STK Push status.

        Args:
            checkout_request_id (str): Checkout request ID from STK Push response

        Returns:
            dict: STK Push status response

        Raises:
            MpesaError: If validation or request fails
        """
        if not checkout_request_id:
            raise MpesaError("Checkout request ID is required")

        logger.info(f"Querying STK status for: {checkout_request_id}")

        for attempt in range(MAX_RETRIES):
            try:
                # Generate access token
                token = self.generate_access_token()
                if not token:
                    logger.error("Failed to generate access token")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    raise MpesaError("Failed to generate access token")

                # Generate password and timestamp
                password, timestamp = self.generate_password()

                # Set headers
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }

                # Set payload
                payload = {
                    "BusinessShortCode": self.business_short_code,
                    "Password": password,
                    "Timestamp": timestamp,
                    "CheckoutRequestID": checkout_request_id
                }

                logger.info(f"Status query payload: {json.dumps(payload, indent=2)}")

                # Make request
                response = requests.post(
                    QUERY_URL,
                    headers=headers,
                    json=payload,
                    timeout=REQUEST_TIMEOUT
                )

                logger.info(f"Status query response: Status={response.status_code}, Content={response.text}")

                # Check if request was successful
                if response.status_code == 200:
                    try:
                        result = response.json()
                        logger.info("Status query completed successfully")
                        return result
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse status query response: {str(e)}")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        raise MpesaError("Invalid response format from M-PESA API")
                else:
                    logger.error(f"Status query request failed: {response.status_code} - {response.text}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    raise MpesaError(f"Status query request failed: {response.status_code}")

            except requests.RequestException as e:
                logger.error(f"Request exception during status query: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                raise MpesaError(f"Network error during status query: {str(e)}")

        raise MpesaError("Status query failed after all retry attempts")

    def process_stk_callback(self, callback_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process M-PESA STK Push callback data.

        Args:
            callback_data (dict): Raw callback data from M-PESA

        Returns:
            dict: Processed callback data or None if invalid
        """
        try:
            logger.info(f"Processing STK callback: {json.dumps(callback_data, indent=2)}")

            # Extract the main callback body
            stk_callback = callback_data.get('Body', {}).get('stkCallback', {})
            if not stk_callback:
                logger.error("Invalid callback format: missing stkCallback")
                return None

            # Extract basic information
            merchant_request_id = stk_callback.get('MerchantRequestID')
            checkout_request_id = stk_callback.get('CheckoutRequestID')
            result_code = stk_callback.get('ResultCode')
            result_desc = stk_callback.get('ResultDesc')

            # Process metadata if transaction was successful
            metadata = {}
            if result_code == 0:  # Success
                callback_metadata = stk_callback.get('CallbackMetadata', {})
                items = callback_metadata.get('Item', [])

                for item in items:
                    name = item.get('Name')
                    value = item.get('Value')
                    if name and value is not None:
                        metadata[name] = value

            processed_data = {
                'merchant_request_id': merchant_request_id,
                'checkout_request_id': checkout_request_id,
                'result_code': result_code,
                'result_desc': result_desc,
                'metadata': metadata,
                'processed_at': datetime.now().isoformat(),
                'raw_callback': callback_data
            }

            logger.info(f"Processed callback data: {json.dumps(processed_data, indent=2)}")
            return processed_data

        except Exception as e:
            logger.error(f"Error processing STK callback: {str(e)}")
            logger.error(traceback.format_exc())
            return None

    def simulate_stk_push(
        self,
        phone_number: str,
        amount: Union[int, float],
        reference: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Simulate STK Push for testing purposes.

        Args:
            phone_number (str): Customer's phone number
            amount (Union[int, float]): Amount to pay
            reference (str, optional): Reference

        Returns:
            dict: Simulated STK Push response
        """
        try:
            formatted_phone = self.format_phone_number(phone_number)
            validated_amount = self.validate_amount(amount)

            # Generate mock response
            checkout_request_id = f"ws_CO_{datetime.now().strftime('%d%m%Y%H%M%S')}_{uuid.uuid4().hex[:8]}"
            merchant_request_id = f"29115-34620561-{random.randint(1, 999)}"

            response = {
                "MerchantRequestID": merchant_request_id,
                "CheckoutRequestID": checkout_request_id,
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CustomerMessage": "Success. Request accepted for processing",
                "is_simulation": True,
                "simulated_at": datetime.now().isoformat(),
                "phone_number": formatted_phone,
                "amount": validated_amount,
                "reference": reference or "SIMULATION"
            }

            logger.info(f"Simulated STK Push: {json.dumps(response, indent=2)}")
            return response

        except Exception as e:
            logger.error(f"Error simulating STK Push: {str(e)}")
            raise MpesaError(f"Simulation error: {str(e)}")

    def test_connection(self) -> bool:
        """
        Test the M-PESA API connection.

        Returns:
            bool: True if connection is successful, False otherwise
        """
        try:
            token = self.generate_access_token()
            return token is not None
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False

    def get_service_info(self) -> Dict[str, Any]:
        """
        Get information about the M-PESA service.

        Returns:
            dict: Service information
        """
        return {
            "service": "M-PESA (Daraja API)",
            "version": "2.0.0",
            "environment": self.environment,
            "business_short_code": self.business_short_code,
            "base_url": BASE_URL,
            "features": [
                "STK Push initiation",
                "Payment status queries",
                "Callback processing",
                "Phone number formatting",
                "Amount validation",
                "Token caching",
                "Error handling",
                "Simulation support"
            ],
            "status": "active" if self.test_connection() else "inactive"
        }


# Create a singleton instance
mpesa_service = MpesaService()

# Export main functions and classes
__all__ = [
    'MpesaService',
    'MpesaError',
    'mpesa_service'
]
