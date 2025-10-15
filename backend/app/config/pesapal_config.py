"""
Pesapal Configuration for MIZIZZI E-commerce
Production configuration with MIZIZZI credentials
"""

import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class PesapalConfig:
    """Pesapal configuration class for MIZIZZI"""

    def __init__(self):
        """Initialize Pesapal configuration"""
        # MIZIZZI Production Credentials (provided by user)
        self.consumer_key = "MneI7qziaBzoGPuRhd1QZNTjZedp5Eqh"
        self.consumer_secret = "Iy98/30kmlhg3/pjG1Wsneay9/Y="

        # Environment settings - Set to production since we have production credentials
        self.environment = os.getenv('PESAPAL_ENVIRONMENT', 'production')

        # Base URLs - Use production URLs for the provided credentials
        if self.environment == 'production':
            self.base_url = "https://pay.pesapal.com/v3"
        else:
            # Sandbox URL (for testing with test credentials)
            self.base_url = "https://cybqa.pesapal.com/pesapalv3"

        # API Endpoints
        self.auth_url = f"{self.base_url}/api/Auth/RequestToken"
        self.register_ipn_url = f"{self.base_url}/api/URLSetup/RegisterIPN"
        self.submit_order_url = f"{self.base_url}/api/Transactions/SubmitOrderRequest"
        self.transaction_status_url = f"{self.base_url}/api/Transactions/GetTransactionStatus"

        # Callback URLs - Update these to your actual domain
        base_domain = os.getenv('DOMAIN', 'https://mizizzi.com')  # Update this to your actual domain
        self.callback_url = os.getenv('PESAPAL_CALLBACK_URL', f'{base_domain}/api/pesapal/callback')
        self.ipn_url = os.getenv('PESAPAL_IPN_URL', f'{base_domain}/api/pesapal/ipn')

        # Currency settings
        self.currency = 'KES'
        self.supported_currencies = ['KES', 'USD', 'EUR', 'GBP']

        # Amount limits (in KES)
        self.min_amount = 1.0
        self.max_amount = 999999.99

        logger.info(f"Pesapal config initialized for {self.environment} environment")
        logger.info(f"Base URL: {self.base_url}")
        logger.info(f"Consumer Key: {self.consumer_key[:10]}...")

    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.environment == 'production'

    def get_credentials(self) -> Dict[str, str]:
        """Get Pesapal credentials"""
        return {
            'consumer_key': self.consumer_key,
            'consumer_secret': self.consumer_secret
        }

    def get_endpoints(self) -> Dict[str, str]:
        """Get all API endpoints"""
        return {
            'auth': self.auth_url,
            'register_ipn': self.register_ipn_url,
            'submit_order': self.submit_order_url,
            'transaction_status': self.transaction_status_url,
            'callback': self.callback_url,
            'ipn': self.ipn_url
        }

    def validate_config(self) -> Dict[str, Any]:
        """Validate the configuration"""
        errors = []
        warnings = []

        # Check credentials
        if not self.consumer_key or len(self.consumer_key) < 10:
            errors.append("Invalid or missing consumer key")

        if not self.consumer_secret or len(self.consumer_secret) < 10:
            errors.append("Invalid or missing consumer secret")

        # Check URLs
        if not self.base_url.startswith('https://'):
            if self.environment == 'production':
                errors.append("Production environment must use HTTPS")
            else:
                warnings.append("Using HTTP in non-production environment")

        # Check callback URLs for production
        if self.environment == 'production':
            if not self.callback_url.startswith('https://'):
                warnings.append("Callback URL should use HTTPS in production")

            if not self.ipn_url.startswith('https://'):
                warnings.append("IPN URL should use HTTPS in production")

            if 'localhost' in self.callback_url or 'localhost' in self.ipn_url:
                errors.append("Production environment cannot use localhost URLs")

        # Production warnings
        if self.environment == 'production':
            warnings.append("Running in PRODUCTION mode - real transactions will be processed")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }

    def get_config_summary(self) -> Dict[str, Any]:
        """Get configuration summary"""
        return {
            'environment': self.environment,
            'is_production': self.is_production(),
            'base_url': self.base_url,
            'callback_url': self.callback_url,
            'ipn_url': self.ipn_url,
            'currency': self.currency,
            'supported_currencies': self.supported_currencies,
            'min_amount': self.min_amount,
            'max_amount': self.max_amount,
            'consumer_key_length': len(self.consumer_key),
            'consumer_secret_length': len(self.consumer_secret),
            'consumer_key_set': bool(self.consumer_key),
            'consumer_secret_set': bool(self.consumer_secret)
        }

    def format_amount(self, amount: float, currency: str = None) -> Dict[str, Any]:
        """Format amount for Pesapal"""
        if currency is None:
            currency = self.currency

        if currency not in self.supported_currencies:
            raise ValueError(f"Unsupported currency: {currency}")

        if amount < self.min_amount:
            raise ValueError(f"Amount {amount} is below minimum {self.min_amount}")

        if amount > self.max_amount:
            raise ValueError(f"Amount {amount} exceeds maximum {self.max_amount}")

        return {
            'amount': round(amount, 2),
            'currency': currency
        }

    def generate_reference(self, prefix: str = 'MIZIZZI') -> str:
        """Generate unique reference for transactions"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8].upper()
        return f"{prefix}_{timestamp}_{unique_id}"

# Global configuration instance
_pesapal_config = None

def get_pesapal_config() -> PesapalConfig:
    """Get global Pesapal configuration instance"""
    global _pesapal_config
    if _pesapal_config is None:
        _pesapal_config = PesapalConfig()
    return _pesapal_config

def validate_pesapal_config() -> Dict[str, Any]:
    """Validate Pesapal configuration"""
    config = get_pesapal_config()
    return config.validate_config()

def validate_pesapal_setup() -> Dict[str, Any]:
    """Validate complete Pesapal setup"""
    config = get_pesapal_config()
    validation = config.validate_config()

    # Additional setup checks
    setup_checks = {
        'config_valid': validation['valid'],
        'credentials_set': bool(config.consumer_key and config.consumer_secret),
        'urls_configured': bool(config.callback_url and config.ipn_url),
        'ready_for_payments': validation['valid'] and bool(config.consumer_key and config.consumer_secret)
    }

    return {
        'valid': all(setup_checks.values()),
        'setup_checks': setup_checks,
        'errors': validation['errors'],
        'warnings': validation['warnings']
    }
