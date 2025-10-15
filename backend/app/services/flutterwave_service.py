"""
Flutterwave Card Payment Service Layer for Mizizzi E-commerce Platform.
Complete implementation with all Flutterwave card payment functionalities.
"""

import json
import requests
from datetime import datetime, timedelta
import logging
import os
from dotenv import load_dotenv
import time
import traceback
import uuid
from typing import Dict, Optional, Any, Union
import hashlib
import hmac

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Flutterwave API Credentials (Sandbox)
CLIENT_ID = os.getenv("FLUTTERWAVE_CLIENT_ID", "132c1c88-904a-4ec3-85de-9a00df361ff2")
CLIENT_SECRET = os.getenv("FLUTTERWAVE_CLIENT_SECRET", "VinqIbrCvTuK6uzroDTY5Wpl4TWIJK3U")
ENCRYPTION_KEY = os.getenv("FLUTTERWAVE_ENCRYPTION_KEY", "XEW7sTa0Nx60GCN1wRer48IZ4pzsSoqkeyBVdxC8qi0=")
ENVIRONMENT = os.getenv("FLUTTERWAVE_ENVIRONMENT", "sandbox")

# API Endpoints
if ENVIRONMENT.lower() == "production":
    BASE_URL = "https://api.flutterwave.com/v3"
else:
    BASE_URL = "https://api.flutterwave.com/v3"  # Same URL for sandbox

CHARGE_URL = f"{BASE_URL}/charges"
VERIFY_URL = f"{BASE_URL}/transactions"
REFUND_URL = f"{BASE_URL}/transactions"

# Configuration
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
REQUEST_TIMEOUT = 30  # seconds


class FlutterwaveError(Exception):
    """Custom exception for Flutterwave related errors."""

    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class FlutterwaveService:
    """Flutterwave service class for handling all card payment operations."""

    def __init__(self):
        self.client_id = CLIENT_ID
        self.client_secret = CLIENT_SECRET
        self.encryption_key = ENCRYPTION_KEY
        self.environment = ENVIRONMENT
        self.base_url = BASE_URL

    def get_headers(self) -> Dict[str, str]:
        """
        Get headers for Flutterwave API requests.

        Returns:
            dict: Headers for API requests
        """
        return {
            "Authorization": f"Bearer {self.client_secret}",
            "Content-Type": "application/json"
        }

    def validate_amount(self, amount: Union[int, float, str]) -> float:
        """
        Validate and format amount for Flutterwave transaction.

        Args:
            amount: Amount to validate

        Returns:
            float: Validated amount

        Raises:
            FlutterwaveError: If amount is invalid
        """
        try:
            amount = float(amount)
            if amount <= 0:
                raise FlutterwaveError("Amount must be greater than 0")
            if amount > 1000000:  # Reasonable limit
                raise FlutterwaveError("Amount exceeds maximum transaction limit")
            return round(amount, 2)
        except (ValueError, TypeError):
            raise FlutterwaveError("Invalid amount format")

    def validate_email(self, email: str) -> str:
        """
        Validate email format.

        Args:
            email (str): Email to validate

        Returns:
            str: Validated email

        Raises:
            FlutterwaveError: If email is invalid
        """
        import re

        if not email:
            raise FlutterwaveError("Email is required")

        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise FlutterwaveError("Invalid email format")

        return email.lower()

    def generate_tx_ref(self) -> str:
        """
        Generate a unique transaction reference.

        Returns:
            str: Unique transaction reference
        """
        return f"MIZIZZI-{uuid.uuid4().hex[:12].upper()}-{int(datetime.now().timestamp())}"

    def initiate_card_payment(
        self,
        amount: Union[int, float],
        email: str,
        phone_number: str,
        name: str,
        tx_ref: Optional[str] = None,
        currency: str = "KES",
        redirect_url: Optional[str] = None,
        card_details: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Initiate a card payment with Flutterwave.

        Args:
            amount (Union[int, float]): Amount to charge
            email (str): Customer's email
            phone_number (str): Customer's phone number
            name (str): Customer's name
            tx_ref (str, optional): Transaction reference
            currency (str): Currency code (default: KES)
            redirect_url (str, optional): Redirect URL after payment
            card_details (dict, optional): Card details for direct charge

        Returns:
            dict: Payment initiation response

        Raises:
            FlutterwaveError: If validation or request fails
        """
        try:
            # Validate inputs
            validated_amount = self.validate_amount(amount)
            validated_email = self.validate_email(email)

            if not tx_ref:
                tx_ref = self.generate_tx_ref()

            if not name:
                raise FlutterwaveError("Customer name is required")

            if not phone_number:
                raise FlutterwaveError("Phone number is required")

            logger.info(f"Initiating card payment: Amount={validated_amount}, Email={validated_email}")

            # Prepare payload
            payload = {
                "tx_ref": tx_ref,
                "amount": validated_amount,
                "currency": currency,
                "email": validated_email,
                "phone_number": phone_number,
                "name": name,
                "redirect_url": redirect_url or "https://example.com/callback",
                "meta": {
                    "consumer_id": tx_ref,
                    "consumer_mac": "92a3-912ba-1192a"
                },
                "customizations": {
                    "title": "Mizizzi Payment",
                    "description": "Payment for Mizizzi order",
                    "logo": "https://example.com/logo.png"
                }
            }

            # Add card details if provided (for direct charge)
            if card_details:
                payload.update({
                    "card": {
                        "number": card_details.get("number"),
                        "cvv": card_details.get("cvv"),
                        "expiry_month": card_details.get("expiry_month"),
                        "expiry_year": card_details.get("expiry_year")
                    }
                })

            for attempt in range(MAX_RETRIES):
                try:
                    headers = self.get_headers()

                    logger.info(f"Card payment payload: {json.dumps({k: v for k, v in payload.items() if k != 'card'}, indent=2)}")

                    # Make request
                    response = requests.post(
                        CHARGE_URL,
                        headers=headers,
                        json=payload,
                        timeout=REQUEST_TIMEOUT
                    )

                    logger.info(f"Card payment response: Status={response.status_code}")

                    if response.status_code in [200, 201]:
                        try:
                            result = response.json()

                            if result.get('status') == 'success':
                                logger.info("Card payment initiated successfully")
                                return result
                            else:
                                error_msg = result.get('message', 'Unknown error')
                                logger.error(f"Card payment failed: {error_msg}")
                                if attempt < MAX_RETRIES - 1:
                                    time.sleep(RETRY_DELAY)
                                    continue
                                raise FlutterwaveError(f"Card payment failed: {error_msg}", details=result)

                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse card payment response: {str(e)}")
                            if attempt < MAX_RETRIES - 1:
                                time.sleep(RETRY_DELAY)
                                continue
                            raise FlutterwaveError("Invalid response format from Flutterwave API")
                    else:
                        logger.error(f"Card payment request failed: {response.status_code} - {response.text}")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        raise FlutterwaveError(f"Card payment request failed: {response.status_code}")

                except requests.RequestException as e:
                    logger.error(f"Request exception during card payment: {str(e)}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    raise FlutterwaveError(f"Network error during card payment: {str(e)}")

            raise FlutterwaveError("Card payment failed after all retry attempts")

        except FlutterwaveError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during card payment: {str(e)}")
            logger.error(traceback.format_exc())
            raise FlutterwaveError(f"Unexpected error: {str(e)}")

    def verify_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """
        Verify a Flutterwave transaction.

        Args:
            transaction_id (str): Transaction ID to verify

        Returns:
            dict: Transaction verification response

        Raises:
            FlutterwaveError: If verification fails
        """
        if not transaction_id:
            raise FlutterwaveError("Transaction ID is required")

        logger.info(f"Verifying transaction: {transaction_id}")

        for attempt in range(MAX_RETRIES):
            try:
                headers = self.get_headers()
                url = f"{VERIFY_URL}/{transaction_id}/verify"

                # Make request
                response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)

                logger.info(f"Transaction verification response: Status={response.status_code}")

                if response.status_code == 200:
                    try:
                        result = response.json()
                        logger.info("Transaction verification completed successfully")
                        return result
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse verification response: {str(e)}")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        raise FlutterwaveError("Invalid response format from Flutterwave API")
                else:
                    logger.error(f"Transaction verification failed: {response.status_code} - {response.text}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    raise FlutterwaveError(f"Transaction verification failed: {response.status_code}")

            except requests.RequestException as e:
                logger.error(f"Request exception during verification: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                raise FlutterwaveError(f"Network error during verification: {str(e)}")

        raise FlutterwaveError("Transaction verification failed after all retry attempts")

    def initiate_refund(
        self,
        transaction_id: str,
        amount: Optional[Union[int, float]] = None
    ) -> Dict[str, Any]:
        """
        Initiate a refund for a Flutterwave transaction.

        Args:
            transaction_id (str): Transaction ID to refund
            amount (Union[int, float], optional): Amount to refund (full refund if not specified)

        Returns:
            dict: Refund initiation response

        Raises:
            FlutterwaveError: If refund fails
        """
        if not transaction_id:
            raise FlutterwaveError("Transaction ID is required")

        logger.info(f"Initiating refund for transaction: {transaction_id}")

        payload = {}
        if amount:
            validated_amount = self.validate_amount(amount)
            payload["amount"] = validated_amount

        for attempt in range(MAX_RETRIES):
            try:
                headers = self.get_headers()
                url = f"{REFUND_URL}/{transaction_id}/refund"

                # Make request
                response = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=REQUEST_TIMEOUT
                )

                logger.info(f"Refund response: Status={response.status_code}")

                if response.status_code in [200, 201]:
                    try:
                        result = response.json()

                        if result.get('status') == 'success':
                            logger.info("Refund initiated successfully")
                            return result
                        else:
                            error_msg = result.get('message', 'Unknown error')
                            logger.error(f"Refund failed: {error_msg}")
                            if attempt < MAX_RETRIES - 1:
                                time.sleep(RETRY_DELAY)
                                continue
                            raise FlutterwaveError(f"Refund failed: {error_msg}", details=result)

                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse refund response: {str(e)}")
                        if attempt < MAX_RETRIES - 1:
                            time.sleep(RETRY_DELAY)
                            continue
                        raise FlutterwaveError("Invalid response format from Flutterwave API")
                else:
                    logger.error(f"Refund request failed: {response.status_code} - {response.text}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY)
                        continue
                    raise FlutterwaveError(f"Refund request failed: {response.status_code}")

            except requests.RequestException as e:
                logger.error(f"Request exception during refund: {str(e)}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY)
                    continue
                raise FlutterwaveError(f"Network error during refund: {str(e)}")

        raise FlutterwaveError("Refund failed after all retry attempts")

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify Flutterwave webhook signature.

        Args:
            payload (str): Raw webhook payload
            signature (str): Webhook signature

        Returns:
            bool: True if signature is valid, False otherwise
        """
        try:
            # Create HMAC signature
            expected_signature = hmac.new(
                self.client_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False

    def process_webhook(self, webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process Flutterwave webhook data.

        Args:
            webhook_data (dict): Raw webhook data from Flutterwave

        Returns:
            dict: Processed webhook data or None if invalid
        """
        try:
            logger.info(f"Processing Flutterwave webhook: {json.dumps(webhook_data, indent=2)}")

            # Extract event type and data
            event_type = webhook_data.get('event')
            data = webhook_data.get('data', {})

            if not event_type or not data:
                logger.error("Invalid webhook format: missing event or data")
                return None

            # Extract transaction information
            transaction_id = data.get('id')
            tx_ref = data.get('tx_ref')
            status = data.get('status')
            amount = data.get('amount')
            currency = data.get('currency')
            customer = data.get('customer', {})

            processed_data = {
                'event_type': event_type,
                'transaction_id': transaction_id,
                'tx_ref': tx_ref,
                'status': status,
                'amount': amount,
                'currency': currency,
                'customer_email': customer.get('email'),
                'customer_name': customer.get('name'),
                'customer_phone': customer.get('phone_number'),
                'processed_at': datetime.now().isoformat(),
                'raw_webhook': webhook_data
            }

            logger.info(f"Processed webhook data: {json.dumps(processed_data, indent=2)}")
            return processed_data

        except Exception as e:
            logger.error(f"Error processing Flutterwave webhook: {str(e)}")
            logger.error(traceback.format_exc())
            return None

    def simulate_card_payment(
        self,
        amount: Union[int, float],
        email: str,
        phone_number: str,
        name: str,
        success: bool = True
    ) -> Dict[str, Any]:
        """
        Simulate a card payment for testing purposes.

        Args:
            amount (Union[int, float]): Amount to charge
            email (str): Customer's email
            phone_number (str): Customer's phone number
            name (str): Customer's name
            success (bool): Whether to simulate success or failure

        Returns:
            dict: Simulated payment response
        """
        try:
            validated_amount = self.validate_amount(amount)
            validated_email = self.validate_email(email)
            tx_ref = self.generate_tx_ref()

            if success:
                response = {
                    "status": "success",
                    "message": "Charge initiated",
                    "data": {
                        "id": f"flw_{uuid.uuid4().hex[:12]}",
                        "tx_ref": tx_ref,
                        "flw_ref": f"FLW-{uuid.uuid4().hex[:8].upper()}",
                        "amount": validated_amount,
                        "currency": "KES",
                        "status": "successful",
                        "customer": {
                            "email": validated_email,
                            "name": name,
                            "phone_number": phone_number
                        },
                        "created_at": datetime.now().isoformat(),
                        "is_simulation": True
                    }
                }
            else:
                response = {
                    "status": "error",
                    "message": "Card payment failed",
                    "data": {
                        "id": f"flw_{uuid.uuid4().hex[:12]}",
                        "tx_ref": tx_ref,
                        "amount": validated_amount,
                        "currency": "KES",
                        "status": "failed",
                        "customer": {
                            "email": validated_email,
                            "name": name,
                            "phone_number": phone_number
                        },
                        "created_at": datetime.now().isoformat(),
                        "is_simulation": True
                    }
                }

            logger.info(f"Simulated card payment: {json.dumps(response, indent=2)}")
            return response

        except Exception as e:
            logger.error(f"Error simulating card payment: {str(e)}")
            raise FlutterwaveError(f"Simulation error: {str(e)}")

    def test_connection(self) -> bool:
        """
        Test the Flutterwave API connection.

        Returns:
            bool: True if connection is successful, False otherwise
        """
        try:
            headers = self.get_headers()
            # Test with a simple API call
            response = requests.get(f"{self.base_url}/banks/NG", headers=headers, timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False

    def get_service_info(self) -> Dict[str, Any]:
        """
        Get information about the Flutterwave service.

        Returns:
            dict: Service information
        """
        return {
            "service": "Flutterwave Card Payments",
            "version": "1.0.0",
            "environment": self.environment,
            "client_id": self.client_id,
            "base_url": self.base_url,
            "features": [
                "Card payment initiation",
                "Transaction verification",
                "Refund processing",
                "Webhook processing",
                "Signature verification",
                "Amount validation",
                "Error handling",
                "Simulation support"
            ],
            "status": "active" if self.test_connection() else "inactive"
        }


# Create a singleton instance
flutterwave_service = FlutterwaveService()

# Export main functions and classes
__all__ = [
    'FlutterwaveService',
    'FlutterwaveError',
    'flutterwave_service'
]
