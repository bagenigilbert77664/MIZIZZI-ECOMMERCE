"""
M-PESA utility functions and client for Mizizzi E-commerce Platform
"""

import json
import base64
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import re

logger = logging.getLogger(__name__)

class MpesaClient:
    """M-PESA Daraja API Client"""

    def __init__(self, config=None):
        """Initialize M-PESA client with configuration"""
        if config:
            # Use provided config object
            credentials = config.get_credentials()
            endpoints = config.get_endpoints()

            self.consumer_key = credentials['consumer_key']
            self.consumer_secret = credentials['consumer_secret']
            self.business_short_code = credentials['business_short_code']
            self.passkey = credentials['passkey']

            self.auth_url = endpoints['auth_url']
            self.stk_push_url = endpoints['stk_push_url']
            self.stk_query_url = endpoints['stk_query_url']
            self.base_url = endpoints['base_url']

            self.environment = config.environment
        else:
            # Fallback to environment variables (original behavior)
            import os
            self.consumer_key = os.getenv('MPESA_CONSUMER_KEY', 'qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n')
            self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET', 'MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7')
            self.business_short_code = os.getenv('MPESA_BUSINESS_SHORT_CODE', '174379')
            self.passkey = os.getenv('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')

            # Environment settings
            self.environment = os.getenv('MPESA_ENVIRONMENT', 'sandbox')

            if self.environment == 'production':
                self.base_url = 'https://api.safaricom.co.ke'
            else:
                self.base_url = 'https://sandbox.safaricom.co.ke'

            # API endpoints
            self.auth_url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
            self.stk_push_url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
            self.stk_query_url = f"{self.base_url}/mpesa/stkpushquery/v1/query"

        # Cache for access token
        self._access_token = None
        self._token_expires_at = None

    def get_access_token(self) -> Optional[str]:
        """Get M-PESA access token"""
        try:
            # Check if we have a valid cached token
            if (self._access_token and self._token_expires_at and
                datetime.now(timezone.utc) < self._token_expires_at):
                return self._access_token

            # Create authorization header
            credentials = f"{self.consumer_key}:{self.consumer_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()

            headers = {
                'Authorization': f'Basic {encoded_credentials}',
                'Content-Type': 'application/json'
            }

            response = requests.get(self.auth_url, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get('access_token')
                # Cache token for 55 minutes (tokens expire in 1 hour)
                self._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=55)
                logger.info("M-PESA access token obtained successfully")
                return self._access_token
            else:
                logger.error(f"Failed to get M-PESA access token: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error getting M-PESA access token: {str(e)}")
            return None

    def generate_password(self) -> tuple[str, str]:
        """Generate password for STK push"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password_string = f"{self.business_short_code}{self.passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        return password, timestamp

    def stk_push(self, phone_number: str, amount: int, account_reference: str,
                 transaction_desc: str, callback_url: str) -> Dict[str, Any]:
        """
        Initiate STK Push payment

        Args:
            phone_number: Customer phone number (254XXXXXXXXX)
            amount: Amount to charge
            account_reference: Reference for the transaction
            transaction_desc: Description of the transaction
            callback_url: URL to receive callback

        Returns:
            Dict with STK push response
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return {"ResponseCode": "1", "errorMessage": "Failed to get access token"}

            password, timestamp = self.generate_password()

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone_number,
                "PartyB": self.business_short_code,
                "PhoneNumber": phone_number,
                "CallBackURL": callback_url,
                "AccountReference": account_reference,
                "TransactionDesc": transaction_desc
            }

            logger.info(f"Initiating STK push for {phone_number}, amount: {amount}")
            response = requests.post(self.stk_push_url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"STK push response: {data}")
                return data
            else:
                error_msg = f"STK push failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"ResponseCode": "1", "errorMessage": error_msg}

        except Exception as e:
            error_msg = f"STK push error: {str(e)}"
            logger.error(error_msg)
            return {"ResponseCode": "1", "errorMessage": error_msg}

    def query_stk_status(self, checkout_request_id: str) -> Dict[str, Any]:
        """
        Query STK push status

        Args:
            checkout_request_id: CheckoutRequestID from STK push response

        Returns:
            Dict with status query response
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return {"ResponseCode": "1", "errorMessage": "Failed to get access token"}

            password, timestamp = self.generate_password()

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            payload = {
                "BusinessShortCode": self.business_short_code,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_request_id
            }

            response = requests.post(self.stk_query_url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                data = response.json()
                logger.info(f"STK status query response: {data}")
                return data
            else:
                error_msg = f"STK status query failed: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"ResponseCode": "1", "errorMessage": error_msg}

        except Exception as e:
            error_msg = f"STK status query error: {str(e)}"
            logger.error(error_msg)
            return {"ResponseCode": "1", "errorMessage": error_msg}

    def validate_callback(self, callback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate M-PESA callback data

        Args:
            callback_data: Callback data from M-PESA

        Returns:
            Dict with validation result and parsed data
        """
        try:
            if not callback_data:
                return {"valid": False, "error": "No callback data"}

            stk_callback = callback_data.get('Body', {}).get('stkCallback', {})

            if not stk_callback:
                return {"valid": False, "error": "Invalid callback structure"}

            checkout_request_id = stk_callback.get('CheckoutRequestID')
            result_code = stk_callback.get('ResultCode')
            result_desc = stk_callback.get('ResultDesc')

            if not checkout_request_id:
                return {"valid": False, "error": "Missing CheckoutRequestID"}

            parsed_data = {
                "checkout_request_id": checkout_request_id,
                "result_code": result_code,
                "result_desc": result_desc,
                "merchant_request_id": stk_callback.get('MerchantRequestID'),
                "callback_metadata": {}
            }

            # Parse callback metadata if present
            callback_metadata = stk_callback.get('CallbackMetadata', {})
            items = callback_metadata.get('Item', [])

            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict):
                        name = item.get('Name')
                        value = item.get('Value')
                        if name:
                            parsed_data["callback_metadata"][name] = value

            return {"valid": True, "data": parsed_data}

        except Exception as e:
            logger.error(f"Callback validation error: {str(e)}")
            return {"valid": False, "error": f"Validation error: {str(e)}"}

    def format_phone_number(self, phone: str) -> str:
        """
        Format phone number for M-PESA

        Args:
            phone: Phone number in various formats

        Returns:
            Formatted phone number (254XXXXXXXXX)
        """
        try:
            # Handle None or invalid input
            if phone is None:
                return None

            # Convert to string and remove all non-digit characters
            clean_phone = re.sub(r'\D', '', str(phone))

            # If no digits found, return original input
            if not clean_phone:
                return str(phone)

            if clean_phone.startswith('0'):
                # Convert 0712345678 to 254712345678
                return '254' + clean_phone[1:]
            elif clean_phone.startswith('254'):
                # Already in correct format
                return clean_phone
            elif len(clean_phone) == 9:
                # Add country code
                return '254' + clean_phone
            else:
                return clean_phone

        except Exception as e:
            logger.error(f"Phone formatting error: {str(e)}")
            return str(phone) if phone is not None else None

    def is_valid_amount(self, amount: float) -> bool:
        """
        Check if amount is valid for M-PESA

        Args:
            amount: Amount to validate

        Returns:
            True if valid, False otherwise
        """
        try:
            return 1.0 <= float(amount) <= 70000.0
        except (ValueError, TypeError):
            return False

    def get_transaction_status_description(self, result_code: int) -> str:
        """
        Get human-readable description for M-PESA result codes

        Args:
            result_code: M-PESA result code

        Returns:
            Description string
        """
        status_codes = {
            0: "Success - Payment completed successfully",
            1: "Insufficient Funds",
            1001: "Invalid Phone Number",
            1019: "Dialing the number failed",
            1025: "Unable to lock subscriber, a transaction is already in process for the current subscriber",
            1032: "Request cancelled by user",
            1037: "DS timeout user cannot be reached",
            2001: "Invalid Amount",
            4999: "Transaction is still under processing",
            9999: "Request failed"
        }
        return status_codes.get(result_code, f"Unknown status code: {result_code}")

    def get_config_info(self) -> Dict[str, Any]:
        """Get configuration information (without sensitive data)"""
        return {
            'environment': self.environment,
            'base_url': self.base_url,
            'business_short_code': self.business_short_code,
            'is_production': self.environment.lower() == 'production'
        }
