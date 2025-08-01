"""
Pesapal utility functions for card payment processing
"""

import os
import json
import logging
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import requests
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

class PesapalClient:
    """Pesapal API client for card payments"""

    def __init__(self):
        """Initialize Pesapal client with configuration"""
        self.environment = os.getenv('PESAPAL_ENVIRONMENT', 'sandbox')
        self.consumer_key = os.getenv('PESAPAL_CONSUMER_KEY', '')
        self.consumer_secret = os.getenv('PESAPAL_CONSUMER_SECRET', '')

        # Set API URLs based on environment
        if self.environment == 'production':
            self.base_url = 'https://pay.pesapal.com/v3'
        else:
            self.base_url = 'https://cybqa.pesapal.com/pesapalv3'

        self.access_token = None
        self.token_expires_at = None

        logger.info(f"Pesapal Client initialized for {self.environment} environment")

    def get_access_token(self) -> Optional[str]:
        """
        Get OAuth access token from Pesapal API

        Returns:
            Access token string or None if failed
        """
        try:
            # Check if current token is still valid
            if self.access_token and self.token_expires_at:
                if datetime.now().timestamp() < self.token_expires_at:
                    return self.access_token

            url = f"{self.base_url}/api/Auth/RequestToken"

            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }

            payload = {
                'consumer_key': self.consumer_key,
                'consumer_secret': self.consumer_secret
            }

            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('token')
                expires_in = int(token_data.get('expiryDate', 3600))
                self.token_expires_at = datetime.now().timestamp() + expires_in - 60  # 1 minute buffer

                logger.info("Pesapal access token obtained successfully")
                return self.access_token
            else:
                logger.error(f"Failed to get Pesapal access token: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Error getting Pesapal access token: {str(e)}")
            return None

    def register_ipn_url(self, ipn_url: str, notification_type: str = 'GET') -> Dict[str, Any]:
        """
        Register IPN URL with Pesapal

        Args:
            ipn_url: IPN URL to register
            notification_type: GET or POST

        Returns:
            Dictionary containing registration response
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return {'status': 'error', 'message': 'Failed to get access token'}

            url = f"{self.base_url}/api/URLSetup/RegisterIPN"

            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            }

            payload = {
                'url': ipn_url,
                'ipn_notification_type': notification_type
            }

            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response_data = response.json()

            if response.status_code == 200:
                logger.info(f"IPN URL registered successfully: {ipn_url}")
            else:
                logger.error(f"Failed to register IPN URL: {response.status_code} - {response_data}")

            return response_data

        except Exception as e:
            logger.error(f"Error registering IPN URL: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    def get_ipn_list(self) -> Dict[str, Any]:
        """
        Get list of registered IPN URLs

        Returns:
            Dictionary containing IPN URLs
        """
        try:
            access_token = self.get_access_token()
            if not access_token:
                return {'status': 'error', 'message': 'Failed to get access token'}

            url = f"{self.base_url}/api/URLSetup/GetIpnList"

            headers = {
                'Accept': 'application/json',
                'Authorization': f'Bearer {access_token}'
            }

            response = requests.get(url, headers=headers, timeout=30)
            response_data = response.json()

            logger.info(f"Retrieved IPN list: {len(response_data)} URLs")

            return response_data

        except Exception as e:
            logger.error(f"Error getting IPN list: {str(e)}")
            return {'status': 'error', 'message': str(e)}

def create_payment_request(amount: float, currency: str, description: str,
                         customer_email: str, customer_phone: str,
                         callback_url: str, merchant_reference: str) -> Dict[str, Any]:
    """
    Create payment request with Pesapal

    Args:
        amount: Payment amount
        currency: Currency code (e.g., 'KES')
        description: Payment description
        customer_email: Customer email
        customer_phone: Customer phone
        callback_url: Callback URL
        merchant_reference: Merchant reference

    Returns:
        Dictionary containing payment request response
    """
    try:
        client = PesapalClient()
        access_token = client.get_access_token()

        if not access_token:
            return {'status': 'error', 'message': 'Failed to get access token'}

        url = f"{client.base_url}/api/Transactions/SubmitOrderRequest"

        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }

        payload = {
            'id': merchant_reference,
            'currency': currency,
            'amount': amount,
            'description': description,
            'callback_url': callback_url,
            'notification_id': os.getenv('PESAPAL_IPN_ID', ''),
            'billing_address': {
                'email_address': customer_email,
                'phone_number': customer_phone,
                'country_code': 'KE',
                'first_name': customer_email.split('@')[0],
                'middle_name': '',
                'last_name': '',
                'line_1': '',
                'line_2': '',
                'city': '',
                'state': '',
                'postal_code': '',
                'zip_code': ''
            }
        }

        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response_data = response.json()

        if response.status_code == 200:
            logger.info(f"Payment request created successfully: {merchant_reference}")
            return {
                'status': 'success',
                'order_tracking_id': response_data.get('order_tracking_id'),
                'redirect_url': response_data.get('redirect_url'),
                'merchant_reference': response_data.get('merchant_reference')
            }
        else:
            logger.error(f"Failed to create payment request: {response.status_code} - {response_data}")
            return {
                'status': 'error',
                'message': response_data.get('error', {}).get('message', 'Payment request failed')
            }

    except Exception as e:
        logger.error(f"Error creating payment request: {str(e)}")
        return {'status': 'error', 'message': str(e)}

def get_transaction_status(order_tracking_id: str) -> Dict[str, Any]:
    """
    Get transaction status from Pesapal

    Args:
        order_tracking_id: Order tracking ID

    Returns:
        Dictionary containing transaction status
    """
    try:
        client = PesapalClient()
        access_token = client.get_access_token()

        if not access_token:
            return {'status': 'error', 'message': 'Failed to get access token'}

        url = f"{client.base_url}/api/Transactions/GetTransactionStatus"

        headers = {
            'Accept': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }

        params = {'orderTrackingId': order_tracking_id}

        response = requests.get(url, headers=headers, params=params, timeout=30)

        if response.status_code == 200:
            response_data = response.json()
            logger.info(f"Transaction status retrieved: {order_tracking_id}")

            return {
                'status': 'success',
                'payment_status': response_data.get('payment_status_description'),
                'payment_method': response_data.get('payment_method'),
                'payment_account': response_data.get('payment_account'),
                'confirmation_code': response_data.get('confirmation_code'),
                'merchant_reference': response_data.get('merchant_reference'),
                'amount': response_data.get('amount'),
                'currency': response_data.get('currency')
            }
        else:
            logger.error(f"Failed to get transaction status: {response.status_code} - {response.text}")
            return {'status': 'error', 'message': 'Failed to get transaction status'}

    except Exception as e:
        logger.error(f"Error getting transaction status: {str(e)}")
        return {'status': 'error', 'message': str(e)}

def validate_pesapal_ipn(ipn_data: Dict[str, Any]) -> bool:
    """
    Validate Pesapal IPN data

    Args:
        ipn_data: IPN data to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        # Basic validation - check for required fields
        required_fields = ['pesapal_transaction_tracking_id', 'pesapal_merchant_reference']

        for field in required_fields:
            if field not in ipn_data:
                logger.warning(f"Missing required field in IPN: {field}")
                return False

        # Additional validation can be added here
        # For example, signature verification if Pesapal provides it

        return True

    except Exception as e:
        logger.error(f"Error validating Pesapal IPN: {str(e)}")
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

    return status_messages.get(status, 'Unknown payment status')

def format_pesapal_amount(amount: float) -> float:
    """
    Format amount for Pesapal (ensure 2 decimal places)

    Args:
        amount: Amount to format

    Returns:
        Formatted amount
    """
    return round(float(amount), 2)

def validate_pesapal_currency(currency: str) -> bool:
    """
    Validate currency code for Pesapal

    Args:
        currency: Currency code to validate

    Returns:
        True if valid, False otherwise
    """
    valid_currencies = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS']
    return currency.upper() in valid_currencies

def generate_merchant_reference(prefix: str = 'MIZIZZI') -> str:
    """
    Generate unique merchant reference

    Args:
        prefix: Prefix for the reference

    Returns:
        Unique merchant reference
    """
    import uuid
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    unique_id = str(uuid.uuid4())[:8].upper()
    return f"{prefix}_{timestamp}_{unique_id}"

def calculate_pesapal_fees(amount: float) -> Dict[str, float]:
    """
    Calculate estimated Pesapal transaction fees
    Note: Actual fees may vary based on payment method and merchant agreement

    Args:
        amount: Transaction amount

    Returns:
        Dictionary containing fee breakdown
    """
    # Pesapal typically charges a percentage fee
    # This is an estimate - actual fees should be confirmed with Pesapal
    fee_percentage = 0.035  # 3.5%
    min_fee = 10.0  # Minimum fee

    calculated_fee = amount * fee_percentage
    transaction_fee = max(calculated_fee, min_fee)

    return {
        'transaction_fee': round(transaction_fee, 2),
        'total_amount': round(amount + transaction_fee, 2),
        'net_amount': round(amount, 2),
        'fee_percentage': fee_percentage * 100
    }

def health_check_pesapal() -> Dict[str, Any]:
    """
    Perform health check on Pesapal service

    Returns:
        Dictionary containing health status
    """
    try:
        client = PesapalClient()
        token = client.get_access_token()

        return {
            'status': 'healthy' if token else 'unhealthy',
            'environment': client.environment,
            'token_valid': bool(token),
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        return {
            'status': 'unhealthy',
            'environment': os.getenv('PESAPAL_ENVIRONMENT', 'sandbox'),
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

# Utility functions for common operations
def format_pesapal_phone(phone: str) -> Optional[str]:
    """
    Format phone number for Pesapal

    Args:
        phone: Phone number to format

    Returns:
        Formatted phone number or None if invalid
    """
    if not phone:
        return None

    import re
    # Remove all non-digit characters
    phone = re.sub(r'\D', '', phone)

    # Format to international format
    if len(phone) == 9 and phone.startswith('7'):
        return f"+254{phone}"
    elif len(phone) == 10 and phone.startswith('07'):
        return f"+254{phone[1:]}"
    elif len(phone) == 12 and phone.startswith('254'):
        return f"+{phone}"
    elif len(phone) == 13 and phone.startswith('+254'):
        return phone

    return None

def validate_pesapal_email(email: str) -> bool:
    """
    Validate email format for Pesapal

    Args:
        email: Email to validate

    Returns:
        True if valid, False otherwise
    """
    if not email:
        return False

    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def create_pesapal_signature(data: Dict[str, Any], secret: str) -> str:
    """
    Create signature for Pesapal API requests (if required)

    Args:
        data: Data to sign
        secret: Secret key

    Returns:
        Generated signature
    """
    try:
        # Sort data by keys
        sorted_data = dict(sorted(data.items()))

        # Create query string
        query_string = urlencode(sorted_data)

        # Create HMAC signature
        signature = hmac.new(
            secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        return signature

    except Exception as e:
        logger.error(f"Error creating Pesapal signature: {str(e)}")
        return ""
