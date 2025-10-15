"""
Pytest configuration and fixtures for M-PESA utils tests
"""

import pytest
import os
from unittest.mock import patch, Mock
from datetime import datetime, timezone, timedelta

# Import the MpesaClient
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from app.utils.mpesa_utils import MpesaClient


@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing"""
    env_vars = {
        'MPESA_CONSUMER_KEY': 'test_consumer_key',
        'MPESA_CONSUMER_SECRET': 'test_consumer_secret',
        'MPESA_BUSINESS_SHORT_CODE': '174379',
        'MPESA_PASSKEY': 'test_passkey',
        'MPESA_ENVIRONMENT': 'sandbox'
    }

    with patch.dict(os.environ, env_vars):
        yield env_vars


@pytest.fixture
def mpesa_client(mock_env_vars):
    """Create a test M-PESA client with mocked environment"""
    return MpesaClient()


@pytest.fixture
def mock_successful_token_response():
    """Mock successful token response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'access_token': 'test_access_token_12345',
        'expires_in': '3599'
    }
    return mock_response


@pytest.fixture
def mock_failed_token_response():
    """Mock failed token response"""
    mock_response = Mock()
    mock_response.status_code = 401
    mock_response.text = 'Unauthorized'
    return mock_response


@pytest.fixture
def mock_successful_stk_response():
    """Mock successful STK push response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        'ResponseCode': '0',
        'ResponseDescription': 'Success. Request accepted for processing',
        'CheckoutRequestID': 'ws_CO_123456789',
        'MerchantRequestID': 'mr_123456789',
        'CustomerMessage': 'Success. Request accepted for processing'
    }
    return mock_response


@pytest.fixture
def mock_failed_stk_response():
    """Mock failed STK push response"""
    mock_response = Mock()
    mock_response.status_code = 400
    mock_response.text = 'Bad Request - Invalid phone number'
    return mock_response


@pytest.fixture
def sample_callback_success():
    """Sample successful callback data"""
    return {
        'Body': {
            'stkCallback': {
                'CheckoutRequestID': 'ws_CO_123456789',
                'MerchantRequestID': 'mr_123456789',
                'ResultCode': 0,
                'ResultDesc': 'The service request is processed successfully.',
                'CallbackMetadata': {
                    'Item': [
                        {'Name': 'Amount', 'Value': 1000.00},
                        {'Name': 'MpesaReceiptNumber', 'Value': 'NLJ7RT61SV'},
                        {'Name': 'Balance', 'Value': 0.00},
                        {'Name': 'TransactionDate', 'Value': 20230101120000},
                        {'Name': 'PhoneNumber', 'Value': 254712345678}
                    ]
                }
            }
        }
    }


@pytest.fixture
def sample_callback_failed():
    """Sample failed callback data"""
    return {
        'Body': {
            'stkCallback': {
                'CheckoutRequestID': 'ws_CO_123456789',
                'MerchantRequestID': 'mr_123456789',
                'ResultCode': 1032,
                'ResultDesc': 'Request cancelled by user'
            }
        }
    }


@pytest.fixture
def sample_callback_malformed():
    """Sample malformed callback data"""
    return {
        'InvalidStructure': {
            'someData': 'test'
        }
    }


@pytest.fixture
def valid_phone_numbers():
    """List of valid phone number formats"""
    return [
        '0712345678',
        '254712345678',
        '+254712345678',
        '712345678',
        '0712 345 678',
        '254-712-345-678'
    ]


@pytest.fixture
def invalid_phone_numbers():
    """List of invalid phone number formats"""
    return [
        '12345',
        'invalid',
        '',
        None,
        '25471234567890',  # Too long
        '071234567'  # Too short
    ]


@pytest.fixture
def valid_amounts():
    """List of valid transaction amounts"""
    return [1.0, 10.50, 1000.00, 50000.00, 70000.00]


@pytest.fixture
def invalid_amounts():
    """List of invalid transaction amounts"""
    return [0, 0.50, -100, 70000.01, 100000, 'invalid', None]


@pytest.fixture
def mpesa_result_codes():
    """Dictionary of M-PESA result codes and their descriptions"""
    return {
        0: "Success",
        1: "Insufficient Funds",
        1001: "Invalid Phone Number",
        1019: "Dialing the number failed",
        1025: "Unable to lock subscriber, a transaction is already in process for the current subscriber",
        1032: "Request cancelled by user",
        1037: "DS timeout user cannot be reached",
        2001: "Invalid Amount",
        9999: "Request failed"
    }


@pytest.fixture
def client_with_cached_token(mpesa_client):
    """M-PESA client with a cached valid token"""
    mpesa_client._access_token = 'cached_token_12345'
    mpesa_client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    return mpesa_client


@pytest.fixture
def client_with_expired_token(mpesa_client):
    """M-PESA client with an expired cached token"""
    mpesa_client._access_token = 'expired_token_12345'
    mpesa_client._token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    return mpesa_client


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "network: mark test as requiring network access"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers automatically"""
    for item in items:
        # Add unit marker to all tests by default
        if not any(marker.name in ['integration', 'network', 'slow'] for marker in item.iter_markers()):
            item.add_marker(pytest.mark.unit)

        # Add network marker to tests that mock requests
        if 'mock_get' in item.fixturenames or 'mock_post' in item.fixturenames:
            item.add_marker(pytest.mark.network)
