"""
Payment Configuration Management for Mizizzi E-commerce Platform
Handles configuration for all payment providers (M-PESA, Pesapal, etc.)
"""

import os
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class PaymentProviderConfig:
    """Base payment provider configuration"""
    name: str
    enabled: bool
    environment: str
    min_amount: float
    max_amount: float
    supported_currencies: list

class PaymentConfig:
    """Central payment configuration manager"""

    def __init__(self):
        """Initialize payment configuration"""
        self.environment = os.getenv('PAYMENT_ENVIRONMENT', 'sandbox')

        # Initialize provider configurations
        self._init_mpesa_config()
        self._init_pesapal_config()
        self._init_paypal_config()

    def _init_mpesa_config(self):
        """Initialize M-PESA configuration"""
        self.mpesa = {
            'enabled': os.getenv('MPESA_ENABLED', 'true').lower() == 'true',
            'environment': os.getenv('MPESA_ENVIRONMENT', 'sandbox'),
            'consumer_key': os.getenv('MPESA_CONSUMER_KEY', 'qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n'),
            'consumer_secret': os.getenv('MPESA_CONSUMER_SECRET', 'MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7'),
            'business_short_code': os.getenv('MPESA_BUSINESS_SHORT_CODE', '174379'),
            'passkey': os.getenv('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'),
            'min_amount': 1.0,
            'max_amount': 70000.0,
            'supported_currencies': ['KES'],
            'callback_url': os.getenv('MPESA_CALLBACK_URL', 'https://mizizzi.com/api/mpesa/callback'),
            'timeout_url': os.getenv('MPESA_TIMEOUT_URL', 'https://mizizzi.com/api/mpesa/timeout')
        }

        # Set base URL based on environment
        if self.mpesa['environment'] == 'production':
            self.mpesa['base_url'] = 'https://api.safaricom.co.ke'
        else:
            self.mpesa['base_url'] = 'https://sandbox.safaricom.co.ke'

    def _init_pesapal_config(self):
        """Initialize Pesapal configuration"""
        environment = os.getenv('PESAPAL_ENVIRONMENT', 'sandbox')

        if environment == 'production':
            # Production credentials
            consumer_key = os.getenv('PESAPAL_CONSUMER_KEY', 'MneI7qziaBzoGPuRhd1QZNTjZedp5Eqh')
            consumer_secret = os.getenv('PESAPAL_CONSUMER_SECRET', 'Iy98/30kmlhg3/pjG1Wsneay9/Y=')
            base_url = 'https://pay.pesapal.com/v3'
        else:
            # Sandbox credentials - use demo credentials for testing
            consumer_key = os.getenv('PESAPAL_CONSUMER_KEY', 'qkio1BGGYAXTu2JOfm7XSXNjRrK5NpUJ')
            consumer_secret = os.getenv('PESAPAL_CONSUMER_SECRET', 'osGQ364R49cXKeOYSpaOnT++rHs=')
            base_url = 'https://cybqa.pesapal.com/pesapalv3'

        self.pesapal = {
            'enabled': os.getenv('PESAPAL_ENABLED', 'true').lower() == 'true',
            'environment': environment,
            'consumer_key': consumer_key,
            'consumer_secret': consumer_secret,
            'base_url': base_url,
            'min_amount': 1.0,
            'max_amount': 1000000.0,
            'supported_currencies': ['KES', 'USD', 'EUR', 'GBP'],
            'callback_url': os.getenv('PESAPAL_CALLBACK_URL', 'https://mizizzi.com/api/pesapal/callback'),
            'ipn_url': os.getenv('PESAPAL_IPN_URL', 'https://mizizzi.com/api/pesapal/ipn')
        }

    def _init_paypal_config(self):
        """Initialize PayPal configuration"""
        environment = os.getenv('PAYPAL_ENVIRONMENT', 'sandbox')

        if environment == 'production':
            base_url = 'https://api.paypal.com'
        else:
            base_url = 'https://api.sandbox.paypal.com'

        self.paypal = {
            'enabled': os.getenv('PAYPAL_ENABLED', 'true').lower() == 'true',
            'environment': environment,
            'client_id': os.getenv('PAYPAL_CLIENT_ID', ''),
            'client_secret': os.getenv('PAYPAL_CLIENT_SECRET', ''),
            'base_url': base_url,
            'min_amount': 0.01,
            'max_amount': 10000.0,
            'supported_currencies': ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
            'webhook_url': os.getenv('PAYPAL_WEBHOOK_URL', 'https://mizizzi.com/api/paypal/webhook')
        }

    def get_mpesa_config(self) -> Dict[str, Any]:
        """Get M-PESA configuration"""
        return self.mpesa.copy()

    def get_pesapal_config(self) -> Dict[str, Any]:
        """Get Pesapal configuration"""
        return self.pesapal.copy()

    def get_paypal_config(self) -> Dict[str, Any]:
        """Get PayPal configuration"""
        return self.paypal.copy()

    def get_enabled_providers(self) -> list:
        """Get list of enabled payment providers"""
        providers = []

        if self.mpesa['enabled']:
            providers.append('mpesa')

        if self.pesapal['enabled']:
            providers.append('pesapal')

        if self.paypal['enabled']:
            providers.append('paypal')

        return providers

    def get_supported_currencies(self) -> list:
        """Get all supported currencies across providers"""
        currencies = set()

        if self.mpesa['enabled']:
            currencies.update(self.mpesa['supported_currencies'])

        if self.pesapal['enabled']:
            currencies.update(self.pesapal['supported_currencies'])

        if self.paypal['enabled']:
            currencies.update(self.paypal['supported_currencies'])

        return sorted(list(currencies))

    def get_provider_for_currency(self, currency: str) -> Optional[str]:
        """Get preferred payment provider for a currency"""
        currency = currency.upper()

        # Priority order: Pesapal -> M-PESA -> PayPal
        if self.pesapal['enabled'] and currency in self.pesapal['supported_currencies']:
            return 'pesapal'

        if self.mpesa['enabled'] and currency in self.mpesa['supported_currencies']:
            return 'mpesa'

        if self.paypal['enabled'] and currency in self.paypal['supported_currencies']:
            return 'paypal'

        return None

    def validate_amount(self, amount: float, currency: str, provider: str = None) -> Dict[str, Any]:
        """Validate payment amount for a provider"""
        if not provider:
            provider = self.get_provider_for_currency(currency)

        if not provider:
            return {
                'valid': False,
                'error': f'No provider supports currency {currency}'
            }

        provider_config = getattr(self, provider, {})

        if not provider_config.get('enabled', False):
            return {
                'valid': False,
                'error': f'Provider {provider} is not enabled'
            }

        min_amount = provider_config.get('min_amount', 0)
        max_amount = provider_config.get('max_amount', float('inf'))

        if amount < min_amount:
            return {
                'valid': False,
                'error': f'Amount {amount} is below minimum {min_amount} for {provider}'
            }

        if amount > max_amount:
            return {
                'valid': False,
                'error': f'Amount {amount} exceeds maximum {max_amount} for {provider}'
            }

        return {
            'valid': True,
            'provider': provider,
            'min_amount': min_amount,
            'max_amount': max_amount
        }

    def get_payment_methods(self, currency: str = None) -> Dict[str, Any]:
        """Get available payment methods"""
        methods = {}

        if self.mpesa['enabled']:
            if not currency or currency in self.mpesa['supported_currencies']:
                methods['mpesa'] = {
                    'name': 'M-PESA',
                    'type': 'mobile_money',
                    'currencies': self.mpesa['supported_currencies'],
                    'min_amount': self.mpesa['min_amount'],
                    'max_amount': self.mpesa['max_amount']
                }

        if self.pesapal['enabled']:
            if not currency or currency in self.pesapal['supported_currencies']:
                methods['pesapal'] = {
                    'name': 'Pesapal',
                    'type': 'card',
                    'currencies': self.pesapal['supported_currencies'],
                    'min_amount': self.pesapal['min_amount'],
                    'max_amount': self.pesapal['max_amount']
                }

        if self.paypal['enabled']:
            if not currency or currency in self.paypal['supported_currencies']:
                methods['paypal'] = {
                    'name': 'PayPal',
                    'type': 'digital_wallet',
                    'currencies': self.paypal['supported_currencies'],
                    'min_amount': self.paypal['min_amount'],
                    'max_amount': self.paypal['max_amount']
                }

        return methods

    def validate_configuration(self) -> Dict[str, Any]:
        """Validate all payment configurations"""
        results = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'providers': {}
        }

        # Validate M-PESA
        mpesa_validation = self._validate_mpesa()
        results['providers']['mpesa'] = mpesa_validation
        if not mpesa_validation['valid']:
            results['errors'].extend([f"M-PESA: {error}" for error in mpesa_validation['errors']])

        # Validate Pesapal
        pesapal_validation = self._validate_pesapal()
        results['providers']['pesapal'] = pesapal_validation
        if not pesapal_validation['valid']:
            results['errors'].extend([f"Pesapal: {error}" for error in pesapal_validation['errors']])

        # Validate PayPal
        paypal_validation = self._validate_paypal()
        results['providers']['paypal'] = paypal_validation
        if not paypal_validation['valid']:
            results['errors'].extend([f"PayPal: {error}" for error in paypal_validation['errors']])

        # Check if at least one provider is enabled
        enabled_providers = self.get_enabled_providers()
        if not enabled_providers:
            results['valid'] = False
            results['errors'].append("No payment providers are enabled")

        results['valid'] = len(results['errors']) == 0

        return results

    def _validate_mpesa(self) -> Dict[str, Any]:
        """Validate M-PESA configuration"""
        errors = []

        if self.mpesa['enabled']:
            if not self.mpesa['consumer_key']:
                errors.append("Consumer key is missing")

            if not self.mpesa['consumer_secret']:
                errors.append("Consumer secret is missing")

            if not self.mpesa['business_short_code']:
                errors.append("Business short code is missing")

            if not self.mpesa['passkey']:
                errors.append("Passkey is missing")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'enabled': self.mpesa['enabled']
        }

    def _validate_pesapal(self) -> Dict[str, Any]:
        """Validate Pesapal configuration"""
        errors = []

        if self.pesapal['enabled']:
            if not self.pesapal['consumer_key']:
                errors.append("Consumer key is missing")

            if not self.pesapal['consumer_secret']:
                errors.append("Consumer secret is missing")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'enabled': self.pesapal['enabled']
        }

    def _validate_paypal(self) -> Dict[str, Any]:
        """Validate PayPal configuration"""
        errors = []

        if self.paypal['enabled']:
            if not self.paypal['client_id']:
                errors.append("Client ID is missing")

            if not self.paypal['client_secret']:
                errors.append("Client secret is missing")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'enabled': self.paypal['enabled']
        }


# Global payment configuration instance
payment_config = PaymentConfig()

# Export functions for backward compatibility
def get_mpesa_config():
    return payment_config.get_mpesa_config()

def get_pesapal_config():
    return payment_config.get_pesapal_config()

def get_paypal_config():
    return payment_config.get_paypal_config()

def get_enabled_providers():
    return payment_config.get_enabled_providers()

def get_supported_currencies():
    return payment_config.get_supported_currencies()

def validate_payment_amount(amount: float, currency: str, provider: str = None):
    return payment_config.validate_amount(amount, currency, provider)

def get_payment_methods(currency: str = None):
    return payment_config.get_payment_methods(currency)

def validate_payment_configuration():
    return payment_config.validate_configuration()
