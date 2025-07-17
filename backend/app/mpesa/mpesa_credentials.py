"""
M-PESA API Credentials for Mizizzi E-commerce Platform.
"""
import os

# M-PESA API Credentials
CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY', 'qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n')
CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET', 'MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7')
BUSINESS_SHORT_CODE = os.environ.get('MPESA_BUSINESS_SHORT_CODE', '174379')  # Default sandbox shortcode
PASSKEY = os.environ.get('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919')  # Default sandbox passkey

# Determine if we're in production or sandbox
IS_PRODUCTION = os.environ.get('MPESA_PRODUCTION', 'false').lower() == 'true'

# API Endpoints
def get_token_url():
    """Get the token URL based on environment."""
    if IS_PRODUCTION:
        return "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    else:
        return "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

def get_stk_push_url():
    """Get the STK Push URL based on environment."""
    if IS_PRODUCTION:
        return "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    else:
        return "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

def get_stk_query_url():
    """Get the STK Query URL based on environment."""
    if IS_PRODUCTION:
        return "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query"
    else:
        return "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"

def get_c2b_register_url():
    """Get the C2B Register URL based on environment."""
    if IS_PRODUCTION:
        return "https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl"
    else:
        return "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl"

def get_c2b_simulate_url():
    """Get the C2B Simulate URL based on environment."""
    if IS_PRODUCTION:
        return "https://api.safaricom.co.ke/mpesa/c2b/v1/simulate"
    else:
        return "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate"
