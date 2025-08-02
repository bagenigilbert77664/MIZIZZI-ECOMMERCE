"""
M-PESA Configuration Management for Mizizzi E-commerce Platform
Secure configuration handling with environment variable support
"""

import os
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class MpesaConfig:
    """M-PESA Configuration Manager with security best practices"""

    def __init__(self, environment: str = None):
        """
        Initialize M-PESA configuration

        Args:
            environment: Override environment (sandbox/production)
        """
        # Environment detection
        self.environment = environment or os.getenv('MPESA_ENVIRONMENT', 'sandbox').lower()

        # Validate environment
        if self.environment not in ['sandbox', 'production']:
            logger.warning(f"Invalid environment '{self.environment}', defaulting to sandbox")
            self.environment = 'sandbox'

        # Load configuration
        self._load_config()

        # Validate configuration
        self._validation_result = None

    def _load_config(self):
        """Load configuration from environment variables"""

        # API Credentials
        self.consumer_key = os.getenv('MPESA_CONSUMER_KEY', 'qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n')
        self.consumer_secret = os.getenv('MPESA_CONSUMER_SECRET', 'MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7')
        self.business_short_code = os.getenv('MPESA_BUSINESS_SHORT_CODE', '174379')
        self.passkey = os.getenv('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')

        # Environment-specific URLs
        if self.environment == 'production':
            self.base_url = 'https://api.safaricom.co.ke'
        else:
            self.base_url = 'https://sandbox.safaricom.co.ke'

        # API Endpoints
        self.auth_url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        self.stk_push_url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        self.stk_query_url = f"{self.base_url}/mpesa/stkpushquery/v1/query"

        # Callback URLs
        self.callback_url = os.getenv('MPESA_CALLBACK_URL', 'https://mizizzi-ecommerce.com/api/mpesa/callback')
        self.result_url = os.getenv('MPESA_RESULT_URL', 'https://mizizzi-ecommerce.com/api/mpesa/result')
        self.timeout_url = os.getenv('MPESA_TIMEOUT_URL', 'https://mizizzi-ecommerce.com/api/mpesa/timeout')

        # Transaction limits
        self.min_amount = float(os.getenv('MPESA_MIN_AMOUNT', '1.0'))
        self.max_amount = float(os.getenv('MPESA_MAX_AMOUNT', '70000.0'))

        # Security settings
        self.enable_ssl_verification = os.getenv('MPESA_SSL_VERIFY', 'true').lower() == 'true'
        self.request_timeout = int(os.getenv('MPESA_REQUEST_TIMEOUT', '30'))

        # Rate limiting
        self.rate_limit_requests = int(os.getenv('MPESA_RATE_LIMIT_REQUESTS', '5'))
        self.rate_limit_window = int(os.getenv('MPESA_RATE_LIMIT_WINDOW', '60'))

        logger.info(f"M-PESA configuration loaded for {self.environment} environment")

    def get_credentials(self) -> Dict[str, str]:
        """Get API credentials"""
        return {
            'consumer_key': self.consumer_key,
            'consumer_secret': self.consumer_secret,
            'business_short_code': self.business_short_code,
            'passkey': self.passkey
        }

    def get_endpoints(self) -> Dict[str, str]:
        """Get API endpoints"""
        return {
            'base_url': self.base_url,
            'auth_url': self.auth_url,
            'stk_push_url': self.stk_push_url,
            'stk_query_url': self.stk_query_url,
            'callback_url': self.callback_url,
            'result_url': self.result_url,
            'timeout_url': self.timeout_url
        }

    def get_limits(self) -> Dict[str, float]:
        """Get transaction limits"""
        return {
            'min_amount': self.min_amount,
            'max_amount': self.max_amount
        }

    def get_security_settings(self) -> Dict[str, Any]:
        """Get security settings"""
        return {
            'ssl_verification': self.enable_ssl_verification,
            'request_timeout': self.request_timeout,
            'rate_limit_requests': self.rate_limit_requests,
            'rate_limit_window': self.rate_limit_window
        }

    def validate_config(self) -> Dict[str, Any]:
        """
        Validate M-PESA configuration

        Returns:
            Dict with validation results
        """
        if self._validation_result:
            return self._validation_result

        errors = []
        warnings = []

        # Check required credentials
        required_fields = {
            'consumer_key': self.consumer_key,
            'consumer_secret': self.consumer_secret,
            'business_short_code': self.business_short_code,
            'passkey': self.passkey
        }

        for field, value in required_fields.items():
            if not value or len(str(value).strip()) == 0:
                errors.append(f"Missing required field: {field}")
            elif len(str(value)) < 10:  # Basic length check
                warnings.append(f"Field {field} seems too short")

        # Validate business short code
        if self.business_short_code and not self.business_short_code.isdigit():
            errors.append("Business short code must be numeric")

        # Validate amounts
        if self.min_amount < 0:
            errors.append("Minimum amount cannot be negative")

        if self.max_amount <= self.min_amount:
            errors.append("Maximum amount must be greater than minimum amount")

        if self.max_amount > 70000:
            warnings.append("Maximum amount exceeds M-PESA limit of KES 70,000")

        # Validate URLs
        required_urls = {
            'callback_url': self.callback_url,
            'base_url': self.base_url
        }

        for url_name, url_value in required_urls.items():
            if not url_value or not url_value.startswith(('http://', 'https://')):
                errors.append(f"Invalid {url_name}: {url_value}")
            elif url_value.startswith('http://') and self.environment == 'production':
                warnings.append(f"{url_name} should use HTTPS in production")

        # Environment-specific validations
        if self.environment == 'production':
            if 'sandbox' in self.base_url.lower():
                errors.append("Using sandbox URL in production environment")

            # Check for default/test credentials in production
            test_indicators = ['test', 'demo', 'sandbox', 'example']
            for field, value in required_fields.items():
                if any(indicator in str(value).lower() for indicator in test_indicators):
                    warnings.append(f"Field {field} contains test-like values in production")

        # Security checks
        if not self.enable_ssl_verification and self.environment == 'production':
            warnings.append("SSL verification disabled in production - security risk")

        if self.request_timeout < 10:
            warnings.append("Request timeout is very low - may cause failures")
        elif self.request_timeout > 60:
            warnings.append("Request timeout is very high - may cause poor UX")

        # Rate limiting validation
        if self.rate_limit_requests > 10:
            warnings.append("Rate limit is high - may exceed M-PESA limits")

        self._validation_result = {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'environment': self.environment,
            'timestamp': os.getenv('TIMESTAMP', 'unknown')
        }

        return self._validation_result

    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment == 'production'

    def is_sandbox(self) -> bool:
        """Check if running in sandbox environment"""
        return self.environment == 'sandbox'

    def get_config_summary(self) -> Dict[str, Any]:
        """Get configuration summary (without sensitive data)"""
        return {
            'environment': self.environment,
            'base_url': self.base_url,
            'business_short_code': self.business_short_code,
            'min_amount': self.min_amount,
            'max_amount': self.max_amount,
            'ssl_verification': self.enable_ssl_verification,
            'request_timeout': self.request_timeout,
            'rate_limit': {
                'requests': self.rate_limit_requests,
                'window': self.rate_limit_window
            }
        }

    def __str__(self) -> str:
        """String representation of config"""
        return f"MpesaConfig(environment={self.environment}, business_code={self.business_short_code})"

    def __repr__(self) -> str:
        """Detailed representation of config"""
        return f"MpesaConfig(environment='{self.environment}', base_url='{self.base_url}')"

# Convenience function for quick config creation
def create_mpesa_config(environment: str = None) -> MpesaConfig:
    """
    Create M-PESA configuration instance

    Args:
        environment: Environment to use (sandbox/production)

    Returns:
        MpesaConfig instance
    """
    return MpesaConfig(environment)

# Export for easy importing
__all__ = ['MpesaConfig', 'create_mpesa_config']
