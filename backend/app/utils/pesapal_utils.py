"""
Pesapal Payment Utilities for MIZIZZI E-commerce
Handles payment request creation, validation, and processing
"""

import os
import json
import logging
import requests
import hashlib
import hmac
import base64
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Optional, Any, Union
from urllib.parse import urlencode
import uuid
import time

# Import the new auth module
from .pesapal_auth import PesapalAuthManager, get_auth_manager
from ..config.pesapal_config import get_pesapal_config

# Setup logging
logger = logging.getLogger(__name__)

class PesapalConfig:
    """Pesapal configuration class"""

    def __init__(self):
        # Environment settings
        self.environment = os.getenv('PESAPAL_ENVIRONMENT', 'production')

        # Credentials based on environment
        if self.environment == 'production':
            # Production credentials
            self.consumer_key = os.getenv('PESAPAL_CONSUMER_KEY', 'MneI7qziaBzoGPuRhd1QZNTjZedp5Eqh')
            self.consumer_secret = os.getenv('PESAPAL_CONSUMER_SECRET', 'Iy98/30kmlhg3/pjG1Wsneay9/Y=')
            self.base_url = "https://pay.pesapal.com/v3"
        else:
            # Sandbox credentials - use correct demo credentials
            self.consumer_key = os.getenv('PESAPAL_CONSUMER_KEY', 'qkio1BGGYAXTu2JOfm7XSXNjRrK5NpUJ')
            self.consumer_secret = os.getenv('PESAPAL_CONSUMER_SECRET', 'osGQ364R49cXKeOYSPaOnT++rHs=')
            self.base_url = "https://cybqa.pesapal.com/pesapalv3"

        # API URLs
        self.auth_url = f"{self.base_url}/api/Auth/RequestToken"
        self.register_ipn_url = f"{self.base_url}/api/URLSetup/RegisterIPN"
        self.list_ipn_url = f"{self.base_url}/api/URLSetup/GetIpnList"
        self.submit_order_url = f"{self.base_url}/api/Transactions/SubmitOrderRequest"
        self.transaction_status_url = f"{self.base_url}/api/Transactions/GetTransactionStatus"

        # Callback URLs
        self.callback_url = os.getenv('PESAPAL_CALLBACK_URL', 'https://mizizzi.com/api/pesapal/callback')
        self.ipn_url = os.getenv('PESAPAL_IPN_URL', 'https://mizizzi.com/api/pesapal/ipn')

        # Payment limits
        self.min_amount = 1.0
        self.max_amount = 1000000.0

        # Supported currencies
        self.supported_currencies = ['KES', 'USD', 'EUR', 'GBP']

        # Transaction settings
        self.transaction_timeout = timedelta(hours=24)
        self.max_retry_attempts = 3
        self.token_cache_duration = timedelta(minutes=55)

    def get_config(self):
        """Get configuration dictionary"""
        return {
            'consumer_key': self.consumer_key,
            'consumer_secret': self.consumer_secret,
            'environment': self.environment,
            'base_url': self.base_url,
            'callback_url': self.callback_url,
            'ipn_url': self.ipn_url,
            'min_amount': self.min_amount,
            'max_amount': self.max_amount,
            'supported_currencies': self.supported_currencies
        }

    def generate_reference(self, prefix: str = 'MIZIZZI') -> str:
        """Generate unique merchant reference"""
        timestamp = int(datetime.now(timezone.utc).timestamp())
        unique_id = str(uuid.uuid4())[:8]
        return f"{prefix}_{timestamp}_{unique_id}"

# Global IPN ID cache
_ipn_cache = {}

class PesapalClient:
    """Pesapal API client for payment processing"""

    def __init__(self, config=None):
        """Initialize Pesapal client with configuration"""
        self.config = config or PesapalConfig()
        self.auth_manager = PesapalAuthManager(self.config)

        # Request session
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def get_access_token(self) -> Optional[str]:
        """
        Get access token using the auth manager

        Returns:
            Access token string or None if failed
        """
        return self.auth_manager.get_access_token()

    def get_existing_ipn_list(self) -> Optional[list]:
        """
        Get list of existing IPN URLs from Pesapal

        Returns:
            List of IPN configurations or None if failed
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                logger.error("Failed to get access token for IPN list")
                return None

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            logger.info("Fetching existing IPN list from Pesapal")

            response = self.session.get(
                self.config.list_ipn_url,
                headers=headers,
                timeout=30
            )

            logger.info(f"IPN list response: {response.status_code}")
            logger.info(f"IPN list response body: {response.text}")

            if response.status_code == 200:
                ipn_response = response.json()

                if ipn_response.get('status') == '200':
                    ipn_list = ipn_response.get('ipn_list', [])
                    logger.info(f"Found {len(ipn_list)} existing IPN configurations")
                    return ipn_list
                else:
                    logger.error(f"Failed to get IPN list: {ipn_response.get('message', 'Unknown error')}")
                    return None
            else:
                logger.error(f"IPN list request failed: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error getting IPN list: {str(e)}")
            return None

    def find_existing_ipn_id(self, ipn_url: str) -> Optional[str]:
        """
        Find existing IPN ID for a given URL

        Args:
            ipn_url: IPN URL to search for

        Returns:
            IPN ID if found, None otherwise
        """
        try:
            # Check cache first
            cache_key = f"{self.config.environment}_{ipn_url}"
            if cache_key in _ipn_cache:
                cached_ipn_id = _ipn_cache[cache_key]
                logger.info(f"Using cached IPN ID: {cached_ipn_id}")
                return cached_ipn_id

            # Get existing IPN list
            ipn_list = self.get_existing_ipn_list()
            if not ipn_list:
                return None

            # Search for matching URL
            for ipn_config in ipn_list:
                if ipn_config.get('url') == ipn_url and ipn_config.get('ipn_status') == 1:  # Active status
                    ipn_id = ipn_config.get('ipn_id')
                    if ipn_id:
                        logger.info(f"Found existing active IPN ID: {ipn_id} for URL: {ipn_url}")
                        # Cache the result
                        _ipn_cache[cache_key] = ipn_id
                        return ipn_id

            logger.info(f"No existing active IPN found for URL: {ipn_url}")
            return None

        except Exception as e:
            logger.error(f"Error finding existing IPN ID: {str(e)}")
            return None

    def register_ipn_url(self, ipn_url: str = None) -> Optional[str]:
        """
        Register IPN URL with Pesapal or get existing one

        Args:
            ipn_url: IPN callback URL (defaults to config IPN URL)

        Returns:
            IPN ID or None if failed
        """
        try:
            # Use provided URL or default
            ipn_url = ipn_url or self.config.ipn_url

            # First, try to find existing IPN ID
            existing_ipn_id = self.find_existing_ipn_id(ipn_url)
            if existing_ipn_id:
                return existing_ipn_id

            # If no existing IPN found, register a new one
            access_token = self.get_access_token()
            if not access_token:
                logger.error("Failed to get access token for IPN registration")
                return None

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            ipn_data = {
                'url': ipn_url,
                'ipn_notification_type': 'GET'
            }

            logger.info(f"Registering new IPN URL: {ipn_url}")
            logger.info(f"IPN registration data: {json.dumps(ipn_data, indent=2)}")

            response = self.session.post(
                self.config.register_ipn_url,
                json=ipn_data,
                headers=headers,
                timeout=30
            )

            logger.info(f"IPN registration response: {response.status_code}")
            logger.info(f"IPN registration response body: {response.text}")

            if response.status_code == 200:
                ipn_response = response.json()

                if ipn_response.get('status') == '200':
                    ipn_id = ipn_response.get('ipn_id')
                    if ipn_id:
                        logger.info(f"Successfully registered new IPN URL with ID: {ipn_id}")
                        # Cache the result
                        cache_key = f"{self.config.environment}_{ipn_url}"
                        _ipn_cache[cache_key] = ipn_id
                        return ipn_id
                    else:
                        logger.error(f"IPN registration successful but no IPN ID returned: {ipn_response}")
                        return None
                else:
                    error_msg = ipn_response.get('message', 'Unknown error')
                    logger.error(f"IPN registration failed: {error_msg}")
                    return None
            elif response.status_code == 409:
                # Conflict - URL might already be registered
                logger.warning("IPN registration returned 409 - URL might already be registered")
                # Try to find it again in case it was just registered
                time.sleep(1)  # Brief delay
                existing_ipn_id = self.find_existing_ipn_id(ipn_url)
                if existing_ipn_id:
                    return existing_ipn_id
                else:
                    logger.error("Could not find IPN ID after 409 response")
                    return None
            else:
                logger.error(f"IPN registration request failed: {response.status_code} - {response.text}")
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
                return {
                    'status': 'error',
                    'message': 'Failed to get access token',
                    'error_code': 'AUTH_ERROR'
                }

            # Ensure IPN is registered before submitting order
            ipn_id = self.register_ipn_url()
            if ipn_id:
                # Add IPN ID to order data
                order_data['notification_id'] = ipn_id
                logger.info(f"Using IPN ID: {ipn_id}")
            else:
                logger.warning("No IPN ID available - proceeding without notification_id")
                # Remove notification_id if it exists to avoid invalid ID error
                order_data.pop('notification_id', None)

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            logger.info(f"Submitting order to Pesapal: {order_data.get('id', 'Unknown')}")
            logger.info(f"Order data: {json.dumps(order_data, indent=2)}")

            response = self.session.post(
                self.config.submit_order_url,
                json=order_data,
                headers=headers,
                timeout=30
            )

            logger.info(f"Order submission response status: {response.status_code}")
            logger.info(f"Order submission response: {response.text}")

            if response.status_code == 200:
                try:
                    order_response = response.json()
                    logger.info(f"Order submission response: {order_response}")
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON response: {response.text}")
                    return {
                        'status': 'error',
                        'message': 'Invalid response format from Pesapal',
                        'error_code': 'INVALID_RESPONSE'
                    }

                # Check for successful response - handle different formats
                if (order_response.get('status') == '200' or
                    'order_tracking_id' in order_response or
                    'redirect_url' in order_response):

                    tracking_id = order_response.get('order_tracking_id') or order_response.get('OrderTrackingId')
                    redirect_url = order_response.get('redirect_url') or order_response.get('RedirectURL')

                    logger.info(f"Order submitted successfully: {tracking_id}")
                    return {
                        'status': 'success',
                        'order_tracking_id': tracking_id,
                        'redirect_url': redirect_url,
                        'message': 'Order submitted successfully'
                    }
                else:
                    # Check for error in response
                    error_info = order_response.get('error', {})
                    error_message = error_info.get('message') or order_response.get('message', 'Order submission failed')
                    error_code = error_info.get('code', 'SUBMISSION_FAILED')

                    logger.error(f"Order submission failed: {error_message} (Code: {error_code})")
                    return {
                        'status': 'error',
                        'message': error_message,
                        'error_code': error_code,
                        'response': order_response
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
                return {
                    'status': 'error',
                    'message': 'Failed to get access token',
                    'error_code': 'AUTH_ERROR'
                }

            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }

            params = {'orderTrackingId': order_tracking_id}

            logger.info(f"Querying transaction status for: {order_tracking_id}")

            response = self.session.get(
                self.config.transaction_status_url,
                params=params,
                headers=headers,
                timeout=30
            )

            logger.info(f"Transaction status response: {response.status_code}")
            logger.info(f"Transaction status response body: {response.text}")

            if response.status_code in [200, 500]:
                try:
                    status_response = response.json()
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON response: {response.text}")
                    return {
                        'status': 'error',
                        'message': 'Invalid response format from Pesapal',
                        'error_code': 'INVALID_RESPONSE'
                    }

                # --- PATCH: Handle "Pending Payment" error as PENDING status ---
                error_info = status_response.get('error', {})
                error_message = ""
                if error_info:
                    error_message = error_info.get('message', '') or status_response.get('message', '')
                    if 'pending payment' in error_message.lower():
                        payment_status = status_response.get('payment_status') or status_response.get('payment_status_description', 'PENDING')
                        if payment_status == 'INVALID':
                            payment_status = 'PENDING'
                        logger.info(f"Pesapal returned error with 'Pending Payment' - treating as PENDING status for tracking ID: {order_tracking_id}")
                        return {
                            'status': 'success',
                            'payment_status': payment_status,
                            'payment_method': status_response.get('payment_method'),
                            'payment_account': status_response.get('payment_account'),
                            'confirmation_code': status_response.get('confirmation_code'),
                            'amount': status_response.get('amount'),
                            'currency': status_response.get('currency'),
                            'description': status_response.get('description'),
                            'message': 'Transaction is pending',
                            'response': status_response
                        }
                    # If not "Pending Payment", treat as error
                    else:
                        return {
                            'status': 'error',
                            'message': error_message or 'Transaction status query failed',
                            'error_code': error_info.get('code', 'UNKNOWN_ERROR'),
                            'response': status_response
                        }
                # --- END PATCH ---

                # Handle 200 responses
                if response.status_code == 200:
                    # Check for error in response first
                    if status_response.get('error'):
                        # Already handled above
                        pass

                    # Check for successful response - handle multiple status formats
                    is_success = (
                        status_response.get('status') == '200' or
                        status_response.get('status') == 200 or
                        'payment_status_description' in status_response or
                        'payment_status' in status_response
                    )

                    if is_success:
                        # Get payment status from either field
                        payment_status = (
                            status_response.get('payment_status') or
                            status_response.get('payment_status_description', 'PENDING')
                        )

                        # Handle INVALID status - treat as pending for newly created transactions
                        if payment_status == 'INVALID':
                            payment_status = 'PENDING'
                            logger.info(f"Converted INVALID status to PENDING for tracking ID: {order_tracking_id}")

                        return {
                            'status': 'success',
                            'payment_status': payment_status,
                            'payment_method': status_response.get('payment_method'),
                            'payment_account': status_response.get('payment_account'),
                            'confirmation_code': status_response.get('confirmation_code'),
                            'amount': status_response.get('amount'),
                            'currency': status_response.get('currency'),
                            'description': status_response.get('description'),
                            'message': status_response.get('message', 'Status retrieved successfully'),
                            'response': status_response
                        }
                    else:
                        # Check if it's an error response with different format
                        error_message = status_response.get('message', 'Unknown error')
                        if 'invalid' in error_message.lower() or 'not found' in error_message.lower():
                            logger.info(f"Invalid tracking ID {order_tracking_id}, treating as pending transaction")
                            return {
                                'status': 'success',
                                'payment_status': 'PENDING',
                                'message': 'Transaction is pending',
                                'response': status_response
                            }
                        else:
                            logger.error(f"Status query failed: {error_message}")
                            return {
                                'status': 'error',
                                'message': error_message,
                                'error_code': 'QUERY_FAILED',
                                'response': status_response
                            }
            else:
                logger.error(f"Status query request failed: {response.status_code} - {response.text}")
                return {
                    'status': 'error',
                    'message': f'Request failed with status {response.status_code}',
                    'error_code': 'HTTP_ERROR'
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Status query request exception: {str(e)}")
            return {
                'status': 'error',
                'message': 'Network error occurred',
                'error_code': 'NETWORK_ERROR'
            }
        except Exception as e:
            logger.error(f"Unexpected error querying status: {str(e)}")
            return {
                'status': 'error',
                'message': 'Internal error occurred',
                'error_code': 'INTERNAL_ERROR'
            }

class PesapalPaymentManager:
    """Manages Pesapal payment operations"""

    def __init__(self, environment: str = None):
        """Initialize payment manager"""
        try:
            logger.info(f"=== INITIALIZING PESAPAL PAYMENT MANAGER ===")

            self.config = get_pesapal_config()
            self.environment = environment or self.config.environment

            logger.info(f"Environment: {self.environment}")
            logger.info(f"Consumer Key: {self.config.consumer_key[:10]}...")

            self.auth_manager = get_auth_manager(self.environment)

            # Set API URLs based on environment
            if self.environment == 'production':
                self.base_url = "https://pay.pesapal.com/v3"
            else:
                self.base_url = "https://cybqa.pesapal.com/pesapalv3"

            self.submit_order_url = f"{self.base_url}/api/Transactions/SubmitOrderRequest"
            self.transaction_status_url = f"{self.base_url}/api/Transactions/GetTransactionStatus"
            self.register_ipn_url = f"{self.base_url}/api/URLSetup/RegisterIPN"

            logger.info(f"Base URL: {self.base_url}")

            # Initialize Pesapal client
            self.client = PesapalClient(self.config)

            logger.info(f"PesapalPaymentManager initialized successfully for {self.environment}")

        except Exception as e:
            logger.error(f"=== ERROR INITIALIZING PESAPAL PAYMENT MANAGER ===")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")

            import traceback
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            raise

    def create_payment_request(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a payment request with Pesapal"""
        try:
            logger.info(f"=== CREATING PAYMENT REQUEST ===")
            logger.info(f"Payment data: {json.dumps(payment_data, indent=2)}")

            # Validate payment data
            validation_result = self.validate_payment_data(payment_data)
            if not validation_result['valid']:
                logger.error(f"Payment data validation failed: {validation_result['errors']}")
                return {
                    'status': 'error',
                    'message': 'Invalid payment data',
                    'errors': validation_result['errors'],
                    'error_code': 'VALIDATION_ERROR'
                }

            # Prepare request payload
            payload = self._prepare_payment_payload(payment_data)
            logger.info(f"Prepared payload: {json.dumps(payload, indent=2)}")

            logger.info(f"Creating payment request for amount: {payload['amount']} {payload['currency']}")

            # Submit order using client
            result = self.client.submit_order_request(payload)

            logger.info(f"Client submit_order_request result: {json.dumps(result, indent=2)}")

            if result and result.get('status') == 'success':
                return {
                    'status': 'success',
                    'order_tracking_id': result.get('order_tracking_id'),
                    'merchant_reference': payload.get('id'),
                    'redirect_url': result.get('redirect_url'),
                    'message': 'Payment request created successfully',
                    'response': result
                }
            else:
                logger.error(f"Payment request failed: {result}")
                return {
                    'status': 'error',
                    'message': result.get('message', 'Payment request failed') if result else 'Payment request failed',
                    'error_code': result.get('error_code', 'REQUEST_FAILED') if result else 'REQUEST_FAILED',
                    'response': result
                }

        except Exception as e:
            logger.error(f"=== ERROR CREATING PAYMENT REQUEST ===")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")

            import traceback
            logger.error(f"Full traceback:\n{traceback.format_exc()}")

            return {
                'status': 'error',
                'message': str(e),
                'error_code': 'EXCEPTION'
            }

    def _prepare_payment_payload(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare the payment payload for Pesapal API"""
        # Generate merchant reference if not provided
        merchant_reference = payment_data.get('merchant_reference')
        if not merchant_reference:
            merchant_reference = self.config.generate_reference('MIZIZZI')

        # Ensure callback URL is set
        callback_url = payment_data.get('callback_url')
        if not callback_url:
            callback_url = self.config.callback_url

        # Base payload
        payload = {
            'id': merchant_reference,
            'currency': payment_data.get('currency', 'KES'),
            'amount': float(payment_data['amount']),
            'description': payment_data.get('description', 'Payment for MIZIZZI order'),
            'callback_url': callback_url,
            'billing_address': payment_data.get('billing_address', {})
        }

        # Add customer information if provided
        if 'customer_email' in payment_data:
            payload['billing_address']['email_address'] = payment_data['customer_email']

        if 'customer_phone' in payment_data:
            payload['billing_address']['phone_number'] = payment_data['customer_phone']

        # Add first name and last name to billing address
        billing_address = payment_data.get('billing_address', {})
        if 'first_name' in billing_address:
            payload['billing_address']['first_name'] = billing_address['first_name']
        if 'last_name' in billing_address:
            payload['billing_address']['last_name'] = billing_address['last_name']
        if 'line_1' in billing_address:
            payload['billing_address']['line_1'] = billing_address['line_1']
        if 'city' in billing_address:
            payload['billing_address']['city'] = billing_address['city']
        if 'country_code' in billing_address:
            payload['billing_address']['country_code'] = billing_address['country_code']
        if 'postal_code' in billing_address:
            payload['billing_address']['postal_code'] = billing_address['postal_code']

        return payload

    def validate_payment_data(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate payment data"""
        errors = []

        # Required fields
        required_fields = ['amount']
        for field in required_fields:
            if field not in payment_data or not payment_data[field]:
                errors.append(f"Missing required field: {field}")

        # Validate amount
        if 'amount' in payment_data:
            try:
                amount = float(payment_data['amount'])
                if amount <= 0:
                    errors.append("Amount must be greater than 0")
                elif amount > self.config.max_amount:
                    errors.append(f"Amount exceeds maximum {self.config.max_amount}")
            except (ValueError, TypeError):
                errors.append("Invalid amount format")

        # Validate currency
        currency = payment_data.get('currency', 'KES')
        if currency not in self.config.supported_currencies:
            errors.append(f"Unsupported currency. Supported: {', '.join(self.config.supported_currencies)}")

        # Validate email if provided
        if 'customer_email' in payment_data:
            email = payment_data['customer_email']
            if email and '@' not in email:
                errors.append("Invalid email format")

        return {
            'valid': len(errors) == 0,
            'errors': errors
        }

    def get_transaction_status(self, order_tracking_id: str) -> Dict[str, Any]:
        """Get transaction status from Pesapal"""
        try:
            result = self.client.get_transaction_status(order_tracking_id)

            if result:
                return {
                    'status': result.get('status', 'error'),
                    'data': result
                }
            else:
                return {
                    'status': 'error',
                    'message': 'Failed to get transaction status'
                }

        except Exception as e:
            logger.error(f"Error getting transaction status: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }

# Global payment manager instances
_payment_managers = {}

def get_payment_manager(environment: str = None) -> PesapalPaymentManager:
    """Get payment manager instance"""
    config = get_pesapal_config()
    environment = environment or config.environment

    if environment not in _payment_managers:
        _payment_managers[environment] = PesapalPaymentManager(environment)

    return _payment_managers[environment]

# Convenience functions
def create_card_payment_request(
    amount: float,
    currency: str = 'KES',
    description: str = None,
    customer_email: str = None,
    customer_phone: str = None,
    callback_url: str = None,
    merchant_reference: str = None,
    billing_address: Dict[str, Any] = None,
    **kwargs
) -> Dict[str, Any]:
    """Create a card payment request"""

    try:
        logger.info(f"=== CREATING CARD PAYMENT REQUEST ===")
        logger.info(f"Amount: {amount} {currency}")
        logger.info(f"Customer: {customer_email} / {customer_phone}")
        logger.info(f"Merchant Reference: {merchant_reference}")

        payment_manager = get_payment_manager()

        payment_data = {
            'amount': amount,
            'currency': currency,
            'description': description or f'MIZIZZI payment - {amount} {currency}',
            'customer_email': customer_email,
            'customer_phone': customer_phone,
            'callback_url': callback_url,
            'merchant_reference': merchant_reference,
            'billing_address': billing_address or {},
            **kwargs
        }

        logger.info(f"Payment data: {json.dumps(payment_data, indent=2)}")

        result = payment_manager.create_payment_request(payment_data)

        logger.info(f"Payment manager result: {json.dumps(result, indent=2)}")

        return result

    except Exception as e:
        logger.error(f"=== ERROR IN CREATE_CARD_PAYMENT_REQUEST ===")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")

        import traceback
        logger.error(f"Full traceback:\n{traceback.format_exc()}")

        return {
            'status': 'error',
            'message': f'Payment request creation failed: {str(e)}',
            'error_code': 'CREATION_ERROR'
        }

def validate_card_payment_data(payment_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate card payment data"""
    payment_manager = get_payment_manager()
    return payment_manager.validate_payment_data(payment_data)

def get_transaction_status(order_tracking_id: str) -> Dict[str, Any]:
    """Get transaction status"""
    payment_manager = get_payment_manager()
    return payment_manager.get_transaction_status(order_tracking_id)

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
        if not ipn_data:
            return False

        # Check for required fields
        has_tracking_id = ipn_data.get('OrderTrackingId')
        has_merchant_ref = ipn_data.get('OrderMerchantReference')

        if not has_tracking_id and not has_merchant_ref:
            logger.warning("Missing both OrderTrackingId and OrderMerchantReference in IPN data")
            return False

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
        'REVERSED': 'Payment was reversed',
        'DECLINED': 'Payment was declined',
        'EXPIRED': 'Payment has expired',
        'declined': 'Payment was declined'
    }

    return status_messages.get(status, f'Payment status: {status}')

def process_card_payment_callback(callback_data: dict, transaction) -> dict:
    """
    Process card payment callback from Pesapal

    Args:
        callback_data: Callback data from Pesapal
        transaction: PesapalTransaction object

    Returns:
        Processing result dictionary
    """
    try:
        # Extract callback information
        order_tracking_id = callback_data.get('OrderTrackingId')
        merchant_reference = callback_data.get('OrderMerchantReference')

        if not order_tracking_id and not merchant_reference:
            return {
                'status': 'error',
                'message': 'Invalid callback data: missing tracking ID and merchant reference'
            }

        # Get current transaction status from Pesapal
        if hasattr(transaction, 'pesapal_tracking_id') and transaction.pesapal_tracking_id:
            status_response = get_transaction_status(transaction.pesapal_tracking_id)

            if status_response and status_response.get('status') == 'success':
                payment_status = status_response.get('payment_status', 'PENDING')

                # Update transaction based on payment status
                if payment_status == 'COMPLETED':
                    transaction.status = 'completed'
                    transaction.payment_method = status_response.get('payment_method', 'CARD')
                    if hasattr(transaction, 'pesapal_receipt_number'):
                        transaction.pesapal_receipt_number = status_response.get('confirmation_code')
                    if hasattr(transaction, 'transaction_date'):
                        transaction.transaction_date = datetime.now()

                    return {
                        'status': 'success',
                        'message': 'Card payment completed successfully',
                        'payment_status': 'completed',
                        'payment_method': transaction.payment_method,
                        'receipt_number': getattr(transaction, 'pesapal_receipt_number', None)
                    }

                elif payment_status == 'FAILED':
                    transaction.status = 'failed'
                    if hasattr(transaction, 'error_message'):
                        transaction.error_message = status_response.get('error_message', 'Card payment failed')

                    return {
                        'status': 'success',
                        'message': 'Card payment failed',
                        'payment_status': 'failed',
                        'error_message': getattr(transaction, 'error_message', 'Payment failed')
                    }

                elif payment_status == 'CANCELLED':
                    transaction.status = 'cancelled'

                    return {
                        'status': 'success',
                        'message': 'Card payment cancelled',
                        'payment_status': 'cancelled'
                    }

        return {
            'status': 'success',
            'message': 'Callback processed',
            'payment_status': 'pending'
        }

    except Exception as e:
        logger.error(f"Error processing card payment callback: {str(e)}")
        return {
            'status': 'error',
            'message': 'Failed to process callback'
        }

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
    timestamp = int(datetime.now(timezone.utc).timestamp())
    unique_id = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_id}"

# Export public functions
__all__ = [
    'PesapalClient',
    'PesapalConfig',
    'PesapalPaymentManager',
    'get_payment_manager',
    'create_card_payment_request',
    'validate_card_payment_data',
    'get_transaction_status',
    'validate_pesapal_ipn',
    'get_payment_status_message',
    'process_card_payment_callback',
    'format_phone_number',
    'generate_merchant_reference'
]
