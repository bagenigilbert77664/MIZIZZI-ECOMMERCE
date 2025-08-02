"""
Pesapal Payment Utilities
Handles Pesapal API integration, authentication, and payment processing
"""

import os
import json
import logging
import requests
import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Optional, Any, Union
from urllib.parse import urlencode

# Configuration
try:
    from app.configuration.payment_config import PaymentConfig
except ImportError:
    try:
        from app.configuration.payment_config import PaymentConfig
    except ImportError:
        # Fallback configuration
        class PaymentConfig:
            @classmethod
            def get_pesapal_config(cls):
                return {
                    'consumer_key': os.getenv('PESAPAL_CONSUMER_KEY', 'test_key'),
                    'consumer_secret': os.getenv('PESAPAL_CONSUMER_SECRET', 'test_secret'),
                    'environment': os.getenv('PESAPAL_ENVIRONMENT', 'sandbox'),
                    'base_url': 'https://cybqa.pesapal.com/pesapalv3',
                    'callback_url': 'https://example.com/callback',
                    'ipn_url': 'https://example.com/ipn',
                    'min_amount': 1.0,
                    'max_amount': 1000000.0,
                    'supported_currencies': ['KES', 'USD', 'EUR', 'GBP']
                }

# Setup logging
logger = logging.getLogger(__name__)

# Cache for access tokens
_token_cache = {}

class PesapalClient:
    """Pesapal API client for payment processing"""

    def __init__(self):
        """Initialize Pesapal client with configuration"""
        self.config = PaymentConfig.get_pesapal_config()
        self.consumer_key = self.config['consumer_key']
        self.consumer_secret = self.config['consumer_secret']
        self.base_url = self.config['base_url']
        self.environment = self.config['environment']

        # API endpoints
        self.auth_url = f"{self.base_url}/api/Auth/RequestToken"
        self.register_ipn_url = f"{self.base_url}/api/URLSetup/RegisterIPN"
        self.submit_order_url = f"{self.base_url}/api/Transactions/SubmitOrderRequest"
        self.transaction_status_url = f"{self.base_url}/api/Transactions/GetTransactionStatus"

        # Request session
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def get_access_token(self) -> Optional[str]:
        """
        Get access token from Pesapal API with caching

        Returns:
            Access token string or None if failed
        """
        try:
            # Check cache first
            cache_key = f"pesapal_token_{self.environment}"
            if cache_key in _token_cache:
                token_data = _token_cache[cache_key]
                if datetime.utcnow() < token_data['expires_at']:
                    return token_data['token']

            # Request new token
            auth_data = {
                'consumer_key': self.consumer_key,
                'consumer_secret': self.consumer_secret
            }

            logger.info(f"Requesting Pesapal access token for {self.environment}")

            response = self.session.post(
                self.auth_url,
                json=auth_data,
                timeout=30
            )

            if response.status_code == 200:
                token_response = response.json()

                if token_response.get('status') == '200':
                    access_token = token_response.get('token')
                    expires_in = token_response.get('expiryDate', 3600)  # Default 1 hour

                    # Cache token
                    _token_cache[cache_key] = {
                        'token': access_token,
                        'expires_at': datetime.utcnow() + timedelta(seconds=expires_in - 300)  # 5 min buffer
                    }

                    logger.info("Pesapal access token obtained successfully")
                    return access_token
                else:
                    logger.error(f"Pesapal auth failed: {token_response.get('message', 'Unknown error')}")
                    return None
            else:
                logger.error(f"Pesapal auth request failed: {response.status_code} - {response.text}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Pesapal auth request exception: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting Pesapal token: {str(e)}")
            return None

    def register_ipn_url(self, ipn_url: str) -> Optional[str]:
        """
        Register IPN URL with Pesapal

        Args:
            ipn_url: IPN callback URL

        Returns:
            IPN ID or None if failed
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return None

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            ipn_data = {
                'url': ipn_url,
                'ipn_notification_type': 'GET'
            }

            response = self.session.post(
                self.register_ipn_url,
                json=ipn_data,
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                ipn_response = response.json()
                if ipn_response.get('status') == '200':
                    return ipn_response.get('ipn_id')

            logger.error(f"IPN registration failed: {response.text}")
            return None

        except Exception as e:
            logger.error(f"Error registering IPN URL: {str(e)}")
            return None

    def submit_order_request(self, order_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Submit order request to Pesapal

        Args:
            order_data: Order information dictionary

        Returns:
            Order response dictionary or None if failed
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return None

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            logger.info(f"Submitting order to Pesapal: {order_data.get('id', 'Unknown')}")

            response = self.session.post(
                self.submit_order_url,
                json=order_data,
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                order_response = response.json()

                if order_response.get('status') == '200':
                    logger.info(f"Order submitted successfully: {order_response.get('order_tracking_id')}")
                    return {
                        'status': 'success',
                        'order_tracking_id': order_response.get('order_tracking_id'),
                        'redirect_url': order_response.get('redirect_url'),
                        'message': 'Order submitted successfully'
                    }
                else:
                    logger.error(f"Order submission failed: {order_response.get('message', 'Unknown error')}")
                    return {
                        'status': 'error',
                        'message': order_response.get('message', 'Order submission failed'),
                        'error_code': order_response.get('error', {}).get('code')
                    }
            else:
                logger.error(f"Order submission request failed: {response.status_code} - {response.text}")
                return {
                    'status': 'error',
                    'message': f'Request failed with status {response.status_code}',
                    'error_code': 'HTTP_ERROR'
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Order submission request exception: {str(e)}")
            return {
                'status': 'error',
                'message': 'Network error occurred',
                'error_code': 'NETWORK_ERROR'
            }
        except Exception as e:
            logger.error(f"Unexpected error submitting order: {str(e)}")
            return {
                'status': 'error',
                'message': 'Internal error occurred',
                'error_code': 'INTERNAL_ERROR'
            }

    def get_transaction_status(self, order_tracking_id: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction status from Pesapal

        Args:
            order_tracking_id: Pesapal order tracking ID

        Returns:
            Status response dictionary or None if failed
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return None

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            params = {'orderTrackingId': order_tracking_id}

            response = self.session.get(
                self.transaction_status_url,
                params=params,
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                status_response = response.json()

                if status_response.get('status') == '200':
                    return {
                        'status': 'success',
                        'payment_status': status_response.get('payment_status_description', 'PENDING'),
                        'payment_method': status_response.get('payment_method'),
                        'payment_account': status_response.get('payment_account'),
                        'confirmation_code': status_response.get('confirmation_code'),
                        'amount': status_response.get('amount'),
                        'currency': status_response.get('currency'),
                        'description': status_response.get('description'),
                        'message': status_response.get('message', 'Status retrieved successfully')
                    }
                else:
                    logger.error(f"Status query failed: {status_response.get('message', 'Unknown error')}")
                    return {
                        'status': 'error',
                        'message': status_response.get('message', 'Status query failed')
                    }
            else:
                logger.error(f"Status query request failed: {response.status_code} - {response.text}")
                return {
                    'status': 'error',
                    'message': f'Request failed with status {response.status_code}'
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Status query request exception: {str(e)}")
            return {
                'status': 'error',
                'message': 'Network error occurred'
            }
        except Exception as e:
            logger.error(f"Unexpected error querying status: {str(e)}")
            return {
                'status': 'error',
                'message': 'Internal error occurred'
            }


# Global client instance
_pesapal_client = None

def get_pesapal_client() -> PesapalClient:
    """Get global Pesapal client instance"""
    global _pesapal_client
    if _pesapal_client is None:
        _pesapal_client = PesapalClient()
    return _pesapal_client


def create_payment_request(amount: float, currency: str, description: str,
                         customer_email: str, customer_phone: str,
                         callback_url: str, merchant_reference: str,
                         **kwargs) -> Optional[Dict[str, Any]]:
    """
    Create payment request with Pesapal

    Args:
        amount: Payment amount
        currency: Currency code (KES, USD, etc.)
        description: Payment description
        customer_email: Customer email address
        customer_phone: Customer phone number
        callback_url: Payment callback URL
        merchant_reference: Unique merchant reference
        **kwargs: Additional parameters

    Returns:
        Payment response dictionary or None if failed
    """
    try:
        client = get_pesapal_client()

        # Validate amount
        if not validate_amount(amount, currency):
            return {
                'status': 'error',
                'message': f'Invalid amount: {amount}. Must be between {client.config["min_amount"]} and {client.config["max_amount"]}',
                'error_code': 'INVALID_AMOUNT'
            }

        # Validate currency
        if currency not in client.config['supported_currencies']:
            return {
                'status': 'error',
                'message': f'Unsupported currency: {currency}',
                'error_code': 'INVALID_CURRENCY'
            }

        # Prepare order data
        order_data = {
            'id': merchant_reference,
            'currency': currency,
            'amount': float(amount),
            'description': description[:100],  # Limit description length
            'callback_url': callback_url,
            'notification_id': kwargs.get('notification_id', ''),
            'billing_address': {
                'email_address': customer_email,
                'phone_number': format_phone_number(customer_phone),
                'country_code': kwargs.get('country_code', 'KE'),
                'first_name': kwargs.get('first_name', ''),
                'last_name': kwargs.get('last_name', ''),
                'line_1': kwargs.get('address_line_1', ''),
                'line_2': kwargs.get('address_line_2', ''),
                'city': kwargs.get('city', ''),
                'state': kwargs.get('state', ''),
                'postal_code': kwargs.get('postal_code', ''),
                'zip_code': kwargs.get('zip_code', '')
            }
        }

        # Submit order
        return client.submit_order_request(order_data)

    except Exception as e:
        logger.error(f"Error creating payment request: {str(e)}")
        return {
            'status': 'error',
            'message': 'Failed to create payment request',
            'error_code': 'INTERNAL_ERROR'
        }


def get_transaction_status(order_tracking_id: str) -> Optional[Dict[str, Any]]:
    """
    Get transaction status from Pesapal

    Args:
        order_tracking_id: Pesapal order tracking ID

    Returns:
        Status response dictionary or None if failed
    """
    try:
        client = get_pesapal_client()
        return client.get_transaction_status(order_tracking_id)

    except Exception as e:
        logger.error(f"Error getting transaction status: {str(e)}")
        return {
            'status': 'error',
            'message': 'Failed to get transaction status'
        }


def validate_pesapal_ipn(ipn_data: Dict[str, Any]) -> bool:
    """
    Validate Pesapal IPN data

    Args:
        ipn_data: IPN callback data

    Returns:
        True if valid, False otherwise
    """
    try:
        # Basic validation
        required_fields = ['OrderTrackingId', 'OrderMerchantReference']

        for field in required_fields:
            if field not in ipn_data or not ipn_data[field]:
                logger.warning(f"Missing required IPN field: {field}")
                return False

        # Additional validation can be added here
        # e.g., signature verification, timestamp validation, etc.

        return True

    except Exception as e:
        logger.error(f"Error validating IPN data: {str(e)}")
        return False


def get_payment_status_message(status: str) -> str:
    """
    Get user-friendly payment status message

    Args:
        status: Payment status code

    Returns:
        User-friendly status message
    """
    status_messages = {
        'PENDING': 'Payment is being processed',
        'COMPLETED': 'Payment completed successfully',
        'FAILED': 'Payment failed',
        'CANCELLED': 'Payment was cancelled',
        'INVALID': 'Invalid payment',
        'REVERSED': 'Payment was reversed'
    }

    return status_messages.get(status, f'Payment status: {status}')


def validate_amount(amount: Union[int, float, str], currency: str = 'KES') -> bool:
    """
    Validate payment amount

    Args:
        amount: Amount to validate
        currency: Currency code

    Returns:
        True if valid, False otherwise
    """
    try:
        amount = float(amount)
        config = PaymentConfig.get_pesapal_config()

        return config['min_amount'] <= amount <= config['max_amount']

    except (ValueError, TypeError):
        return False


def format_phone_number(phone: str) -> str:
    """
    Format phone number for Pesapal

    Args:
        phone: Phone number string

    Returns:
        Formatted phone number
    """
    try:
        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, phone))

        # Handle different formats
        if digits.startswith('254'):
            return f'+{digits}'
        elif digits.startswith('0'):
            return f'+254{digits[1:]}'
        elif len(digits) == 9:
            return f'+254{digits}'
        else:
            return f'+{digits}'

    except Exception:
        return phone  # Return original if formatting fails


def generate_merchant_reference(prefix: str = 'MIZIZZI') -> str:
    """
    Generate unique merchant reference

    Args:
        prefix: Reference prefix

    Returns:
        Unique merchant reference
    """
    import uuid
    timestamp = int(datetime.utcnow().timestamp())
    unique_id = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_id}"


def calculate_transaction_fee(amount: float, currency: str = 'KES') -> float:
    """
    Calculate transaction fee (if applicable)

    Args:
        amount: Transaction amount
        currency: Currency code

    Returns:
        Transaction fee amount
    """
    # This would depend on Pesapal's fee structure
    # For now, return 0 (fees might be handled by Pesapal)
    return 0.0


def is_valid_currency(currency: str) -> bool:
    """
    Check if currency is supported

    Args:
        currency: Currency code

    Returns:
        True if supported, False otherwise
    """
    config = PaymentConfig.get_pesapal_config()
    return currency in config['supported_currencies']


def get_supported_currencies() -> list:
    """
    Get list of supported currencies

    Returns:
        List of supported currency codes
    """
    config = PaymentConfig.get_pesapal_config()
    return config['supported_currencies']


def cleanup_expired_tokens():
    """Clean up expired tokens from cache"""
    global _token_cache
    current_time = datetime.utcnow()

    expired_keys = [
        key for key, data in _token_cache.items()
        if current_time >= data['expires_at']
    ]

    for key in expired_keys:
        del _token_cache[key]

    if expired_keys:
        logger.info(f"Cleaned up {len(expired_keys)} expired tokens")


# Export public functions
__all__ = [
    'PesapalClient',
    'get_pesapal_client',
    'create_payment_request',
    'get_transaction_status',
    'validate_pesapal_ipn',
    'get_payment_status_message',
    'validate_amount',
    'format_phone_number',
    'generate_merchant_reference',
    'calculate_transaction_fee',
    'is_valid_currency',
    'get_supported_currencies',
    'cleanup_expired_tokens'
]
