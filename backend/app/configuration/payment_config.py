"""
Payment configuration for Mizizzi E-commerce Platform
Contains M-PESA and Pesapal configuration settings
"""

import os
from datetime import timedelta

class PaymentConfig:
    """Payment system configuration"""

    # =====================
    # M-PESA Configuration
    # =====================

    # Your actual M-PESA Daraja API credentials
    MPESA_CONSUMER_KEY = "qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n"
    MPESA_CONSUMER_SECRET = "MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7"
    MPESA_BUSINESS_SHORT_CODE = "174379"
    MPESA_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"

    # Environment settings
    MPESA_ENVIRONMENT = os.getenv('MPESA_ENVIRONMENT', 'sandbox')  # 'sandbox' or 'production'

    # API URLs (automatically set based on environment)
    if MPESA_ENVIRONMENT == 'production':
        MPESA_BASE_URL = "https://api.safaricom.co.ke"
    else:
        MPESA_BASE_URL = "https://sandbox.safaricom.co.ke"

    MPESA_AUTH_URL = f"{MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
    MPESA_STK_PUSH_URL = f"{MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest"
    MPESA_STK_QUERY_URL = f"{MPESA_BASE_URL}/mpesa/stkpushquery/v1/query"

    # Callback URLs (update these with your actual domain)
    MPESA_CALLBACK_URL = os.getenv('MPESA_CALLBACK_URL', 'https://yourdomain.com/api/payments/mpesa/callback')
    MPESA_RESULT_URL = os.getenv('MPESA_RESULT_URL', 'https://yourdomain.com/api/payments/mpesa/result')
    MPESA_TIMEOUT_URL = os.getenv('MPESA_TIMEOUT_URL', 'https://yourdomain.com/api/payments/mpesa/timeout')

    # Payment limits
    MPESA_MIN_AMOUNT = 1.0
    MPESA_MAX_AMOUNT = 70000.0

    # Transaction settings
    MPESA_TRANSACTION_TIMEOUT = timedelta(minutes=5)  # STK Push timeout
    MPESA_MAX_RETRY_ATTEMPTS = 3
    MPESA_TOKEN_CACHE_DURATION = timedelta(minutes=55)  # M-PESA tokens expire in 1 hour

    # =====================
    # Pesapal Configuration
    # =====================

    # Pesapal API credentials (your actual credentials)
    PESAPAL_CONSUMER_KEY = "MneI7qziaBzoGPuRhd1QZNTjZedp5EqhConsumer Secret: Iy98/30kmlhg3/pjG1Wsneay9/Y="
    PESAPAL_CONSUMER_SECRET = "Iy98/30kmlhg3/pjG1Wsneay9/Y="

    # Environment settings
    PESAPAL_ENVIRONMENT = os.getenv('PESAPAL_ENVIRONMENT', 'production')  # Changed to production

    # API URLs
    if PESAPAL_ENVIRONMENT == 'production':
        PESAPAL_BASE_URL = "https://pay.pesapal.com/v3"
    else:
        PESAPAL_BASE_URL = "https://cybqa.pesapal.com/pesapalv3"

    PESAPAL_AUTH_URL = f"{PESAPAL_BASE_URL}/api/Auth/RequestToken"
    PESAPAL_REGISTER_IPN_URL = f"{PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN"
    PESAPAL_SUBMIT_ORDER_URL = f"{PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest"
    PESAPAL_TRANSACTION_STATUS_URL = f"{PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus"

    # Callback URLs (update these with your actual domain)
    PESAPAL_CALLBACK_URL = os.getenv('PESAPAL_CALLBACK_URL', 'https://mizizzi.com/api/pesapal/callback')
    PESAPAL_IPN_URL = os.getenv('PESAPAL_IPN_URL', 'https://mizizzi.com/api/pesapal/ipn')

    # Payment limits
    PESAPAL_MIN_AMOUNT = 1.0
    PESAPAL_MAX_AMOUNT = 1000000.0

    # Supported currencies
    PESAPAL_SUPPORTED_CURRENCIES = ['KES', 'USD', 'EUR', 'GBP']

    # Transaction settings
    PESAPAL_TRANSACTION_TIMEOUT = timedelta(hours=24)  # Pesapal payment timeout
    PESAPAL_MAX_RETRY_ATTEMPTS = 3
    PESAPAL_TOKEN_CACHE_DURATION = timedelta(minutes=55)

    # =====================
    # General Payment Settings
    # =====================

    # Supported payment methods
    SUPPORTED_PAYMENT_METHODS = [
        'mpesa',
        'pesapal',
        'cash_on_delivery'
    ]

    # Default currency
    DEFAULT_CURRENCY = 'KES'

    # Payment processing settings
    PAYMENT_PROCESSING_TIMEOUT = timedelta(minutes=10)
    MAX_PAYMENT_RETRY_ATTEMPTS = 3
    PAYMENT_CONFIRMATION_TIMEOUT = timedelta(minutes=30)

    # Security settings
    PAYMENT_IDEMPOTENCY_KEY_EXPIRY = timedelta(hours=24)
    PAYMENT_CALLBACK_TOKEN_EXPIRY = timedelta(hours=1)

    # Logging settings
    LOG_PAYMENT_REQUESTS = True
    LOG_PAYMENT_RESPONSES = True
    LOG_SENSITIVE_DATA = False  # Set to False in production

    # Rate limiting
    PAYMENT_RATE_LIMIT = "10 per minute"
    CALLBACK_RATE_LIMIT = "100 per minute"

    # =====================
    # Environment-specific Settings
    # =====================

    @classmethod
    def get_mpesa_config(cls):
        """Get M-PESA configuration dictionary"""
        return {
            'consumer_key': cls.MPESA_CONSUMER_KEY,
            'consumer_secret': cls.MPESA_CONSUMER_SECRET,
            'business_short_code': cls.MPESA_BUSINESS_SHORT_CODE,
            'passkey': cls.MPESA_PASSKEY,
            'environment': cls.MPESA_ENVIRONMENT,
            'base_url': cls.MPESA_BASE_URL,
            'callback_url': cls.MPESA_CALLBACK_URL,
            'min_amount': cls.MPESA_MIN_AMOUNT,
            'max_amount': cls.MPESA_MAX_AMOUNT
        }

    @classmethod
    def get_pesapal_config(cls):
        """Get Pesapal configuration dictionary"""
        return {
            'consumer_key': cls.PESAPAL_CONSUMER_KEY,
            'consumer_secret': cls.PESAPAL_CONSUMER_SECRET,
            'environment': cls.PESAPAL_ENVIRONMENT,
            'base_url': cls.PESAPAL_BASE_URL,
            'callback_url': cls.PESAPAL_CALLBACK_URL,
            'ipn_url': cls.PESAPAL_IPN_URL,
            'min_amount': cls.PESAPAL_MIN_AMOUNT,
            'max_amount': cls.PESAPAL_MAX_AMOUNT,
            'supported_currencies': cls.PESAPAL_SUPPORTED_CURRENCIES
        }

    @classmethod
    def is_production(cls):
        """Check if running in production environment"""
        return (cls.MPESA_ENVIRONMENT == 'production' and
                cls.PESAPAL_ENVIRONMENT == 'production')

    @classmethod
    def validate_amount(cls, amount: float, payment_method: str = 'mpesa') -> bool:
        """
        Validate payment amount for specific payment method

        Args:
            amount: Amount to validate
            payment_method: Payment method ('mpesa' or 'pesapal')

        Returns:
            True if amount is valid, False otherwise
        """
        try:
            amount = float(amount)

            if payment_method.lower() == 'mpesa':
                return cls.MPESA_MIN_AMOUNT <= amount <= cls.MPESA_MAX_AMOUNT
            elif payment_method.lower() == 'pesapal':
                return cls.PESAPAL_MIN_AMOUNT <= amount <= cls.PESAPAL_MAX_AMOUNT
            else:
                return amount > 0

        except (ValueError, TypeError):
            return False

    @classmethod
    def get_payment_timeout(cls, payment_method: str = 'mpesa') -> timedelta:
        """
        Get payment timeout for specific payment method

        Args:
            payment_method: Payment method

        Returns:
            Timeout duration
        """
        if payment_method.lower() == 'mpesa':
            return cls.MPESA_TRANSACTION_TIMEOUT
        elif payment_method.lower() == 'pesapal':
            return cls.PESAPAL_TRANSACTION_TIMEOUT
        else:
            return cls.PAYMENT_PROCESSING_TIMEOUT

# Create global config instance
payment_config = PaymentConfig()

# Export configuration
__all__ = ['PaymentConfig', 'payment_config']
