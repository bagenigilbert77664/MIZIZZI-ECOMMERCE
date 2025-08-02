"""
Comprehensive tests for M-PESA utility functions
Tests the MpesaClient class and all its methods
"""

import pytest
import json
import base64
import uuid
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# Import the MpesaClient from utils
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from app.utils.mpesa_utils import MpesaClient


class TestMpesaClientInitialization:
    """Test MpesaClient initialization and configuration"""

    def test_client_initialization_sandbox(self):
        """Test client initialization in sandbox environment"""
        with patch.dict(os.environ, {
            'MPESA_ENVIRONMENT': 'sandbox',
            'MPESA_CONSUMER_KEY': 'test_key',
            'MPESA_CONSUMER_SECRET': 'test_secret',
            'MPESA_BUSINESS_SHORT_CODE': '174379',
            'MPESA_PASSKEY': 'test_passkey'
        }):
            client = MpesaClient()

            assert client.consumer_key == 'test_key'
            assert client.consumer_secret == 'test_secret'
            assert client.business_short_code == '174379'
            assert client.passkey == 'test_passkey'
            assert client.environment == 'sandbox'
            assert client.base_url == 'https://sandbox.safaricom.co.ke'

    def test_client_initialization_production(self):
        """Test client initialization in production environment"""
        with patch.dict(os.environ, {
            'MPESA_ENVIRONMENT': 'production',
            'MPESA_CONSUMER_KEY': 'prod_key',
            'MPESA_CONSUMER_SECRET': 'prod_secret'
        }):
            client = MpesaClient()

            assert client.environment == 'production'
            assert client.base_url == 'https://api.safaricom.co.ke'

    def test_client_initialization_default_values(self):
        """Test client initialization with default values"""
        with patch.dict(os.environ, {}, clear=True):
            client = MpesaClient()

            assert client.consumer_key == 'qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n'
            assert client.environment == 'sandbox'
            assert client.base_url == 'https://sandbox.safaricom.co.ke'


class TestMpesaAccessToken:
    """Test M-PESA access token functionality"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    @patch('requests.get')
    def test_get_access_token_success(self, mock_get, client):
        """Test successful access token retrieval"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'access_token': 'test_access_token',
            'expires_in': '3599'
        }
        mock_get.return_value = mock_response

        token = client.get_access_token()

        assert token == 'test_access_token'
        assert client._access_token == 'test_access_token'
        assert client._token_expires_at is not None

        # Verify the request was made correctly
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert 'Authorization' in call_args[1]['headers']
        assert call_args[1]['headers']['Authorization'].startswith('Basic ')

    @patch('requests.get')
    def test_get_access_token_cached(self, mock_get, client):
        """Test that cached token is returned when valid"""
        # Set a cached token that hasn't expired
        client._access_token = 'cached_token'
        client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        token = client.get_access_token()

        assert token == 'cached_token'
        # Should not make a new request
        mock_get.assert_not_called()

    @patch('requests.get')
    def test_get_access_token_expired_cache(self, mock_get, client):
        """Test that new token is fetched when cached token is expired"""
        # Set an expired cached token
        client._access_token = 'expired_token'
        client._token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'access_token': 'new_token',
            'expires_in': '3599'
        }
        mock_get.return_value = mock_response

        token = client.get_access_token()

        assert token == 'new_token'
        mock_get.assert_called_once()

    @patch('requests.get')
    def test_get_access_token_failure(self, mock_get, client):
        """Test access token retrieval failure"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = 'Unauthorized'
        mock_get.return_value = mock_response

        token = client.get_access_token()

        assert token is None

    @patch('requests.get')
    def test_get_access_token_exception(self, mock_get, client):
        """Test access token retrieval with exception"""
        mock_get.side_effect = Exception('Network error')

        token = client.get_access_token()

        assert token is None


class TestMpesaPasswordGeneration:
    """Test M-PESA password generation"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        client = MpesaClient()
        client.business_short_code = '174379'
        client.passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
        return client

    def test_generate_password(self, client):
        """Test password generation"""
        password, timestamp = client.generate_password()

        # Verify timestamp format
        assert len(timestamp) == 14
        assert timestamp.isdigit()

        # Verify password is base64 encoded
        try:
            decoded = base64.b64decode(password)
            assert len(decoded) > 0
        except Exception:
            pytest.fail("Password should be valid base64")

        # Verify password contains expected components
        expected_string = f"{client.business_short_code}{client.passkey}{timestamp}"
        expected_password = base64.b64encode(expected_string.encode()).decode()
        assert password == expected_password


class TestMpesaStkPush:
    """Test M-PESA STK Push functionality"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    @patch('requests.post')
    def test_stk_push_success(self, mock_post, client):
        """Test successful STK push"""
        # Mock access token
        client._access_token = 'test_token'
        client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'ResponseCode': '0',
            'ResponseDescription': 'Success',
            'CheckoutRequestID': 'ws_CO_123456789',
            'MerchantRequestID': 'mr_123456789'
        }
        mock_post.return_value = mock_response

        result = client.stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='TEST123',
            transaction_desc='Test payment',
            callback_url='https://example.com/callback'
        )

        assert result['ResponseCode'] == '0'
        assert result['CheckoutRequestID'] == 'ws_CO_123456789'

        # Verify the request was made correctly
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert 'Authorization' in call_args[1]['headers']
        assert call_args[1]['headers']['Authorization'] == 'Bearer test_token'

    @patch('requests.post')
    def test_stk_push_no_access_token(self, mock_post, client):
        """Test STK push when access token is unavailable"""
        with patch.object(client, 'get_access_token', return_value=None):
            result = client.stk_push(
                phone_number='254712345678',
                amount=1000,
                account_reference='TEST123',
                transaction_desc='Test payment',
                callback_url='https://example.com/callback'
            )

            assert result['ResponseCode'] == '1'
            assert 'Failed to get access token' in result['errorMessage']

    @patch('requests.post')
    def test_stk_push_api_failure(self, mock_post, client):
        """Test STK push API failure"""
        client._access_token = 'test_token'
        client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        mock_post.return_value = mock_response

        result = client.stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='TEST123',
            transaction_desc='Test payment',
            callback_url='https://example.com/callback'
        )

        assert result['ResponseCode'] == '1'
        assert 'STK push failed' in result['errorMessage']

    @patch('requests.post')
    def test_stk_push_exception(self, mock_post, client):
        """Test STK push with exception"""
        client._access_token = 'test_token'
        client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        mock_post.side_effect = Exception('Network error')

        result = client.stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='TEST123',
            transaction_desc='Test payment',
            callback_url='https://example.com/callback'
        )

        assert result['ResponseCode'] == '1'
        assert 'STK push error' in result['errorMessage']


class TestMpesaStkQuery:
    """Test M-PESA STK query functionality"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    @patch('requests.post')
    def test_query_stk_status_success(self, mock_post, client):
        """Test successful STK status query"""
        client._access_token = 'test_token'
        client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'ResponseCode': '0',
            'ResponseDescription': 'Success',
            'CheckoutRequestID': 'ws_CO_123456789',
            'ResultCode': '0',
            'ResultDesc': 'The service request is processed successfully.'
        }
        mock_post.return_value = mock_response

        result = client.query_stk_status('ws_CO_123456789')

        assert result['ResponseCode'] == '0'
        assert result['CheckoutRequestID'] == 'ws_CO_123456789'

    @patch('requests.post')
    def test_query_stk_status_no_access_token(self, mock_post, client):
        """Test STK query when access token is unavailable"""
        with patch.object(client, 'get_access_token', return_value=None):
            result = client.query_stk_status('ws_CO_123456789')

            assert result['ResponseCode'] == '1'
            assert 'Failed to get access token' in result['errorMessage']

    @patch('requests.post')
    def test_query_stk_status_failure(self, mock_post, client):
        """Test STK query failure"""
        client._access_token = 'test_token'
        client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        mock_post.return_value = mock_response

        result = client.query_stk_status('ws_CO_123456789')

        assert result['ResponseCode'] == '1'
        assert 'STK status query failed' in result['errorMessage']


class TestMpesaCallbackValidation:
    """Test M-PESA callback validation"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    def test_validate_callback_success(self, client):
        """Test successful callback validation"""
        callback_data = {
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
                            {'Name': 'PhoneNumber', 'Value': 254712345678}
                        ]
                    }
                }
            }
        }

        result = client.validate_callback(callback_data)

        assert result['valid'] is True
        assert result['data']['checkout_request_id'] == 'ws_CO_123456789'
        assert result['data']['result_code'] == 0
        assert result['data']['callback_metadata']['Amount'] == 1000.00
        assert result['data']['callback_metadata']['MpesaReceiptNumber'] == 'NLJ7RT61SV'

    def test_validate_callback_failed_payment(self, client):
        """Test callback validation for failed payment"""
        callback_data = {
            'Body': {
                'stkCallback': {
                    'CheckoutRequestID': 'ws_CO_123456789',
                    'MerchantRequestID': 'mr_123456789',
                    'ResultCode': 1032,
                    'ResultDesc': 'Request cancelled by user'
                }
            }
        }

        result = client.validate_callback(callback_data)

        assert result['valid'] is True
        assert result['data']['result_code'] == 1032
        assert result['data']['result_desc'] == 'Request cancelled by user'

    def test_validate_callback_empty_data(self, client):
        """Test callback validation with empty data"""
        result = client.validate_callback(None)

        assert result['valid'] is False
        assert 'No callback data' in result['error']

    def test_validate_callback_invalid_structure(self, client):
        """Test callback validation with invalid structure"""
        callback_data = {
            'InvalidStructure': 'test'
        }

        result = client.validate_callback(callback_data)

        assert result['valid'] is False
        assert 'Invalid callback structure' in result['error']

    def test_validate_callback_missing_checkout_request_id(self, client):
        """Test callback validation with missing CheckoutRequestID"""
        callback_data = {
            'Body': {
                'stkCallback': {
                    'ResultCode': 0,
                    'ResultDesc': 'Success'
                }
            }
        }

        result = client.validate_callback(callback_data)

        assert result['valid'] is False
        assert 'Missing CheckoutRequestID' in result['error']

    def test_validate_callback_exception(self, client):
        """Test callback validation with exception"""
        # Pass data that will cause an exception during metadata processing
        callback_data = {
            'Body': {
                'stkCallback': {
                    'CheckoutRequestID': 'ws_CO_123456789',  # Add required field
                    'ResultCode': 0,
                    'CallbackMetadata': {
                        'Item': 'invalid'  # This should be a list, not a string
                    }
                }
            }
        }

        result = client.validate_callback(callback_data)

        # The validation should still succeed but with empty metadata
        assert result['valid'] is True
        assert result['data']['callback_metadata'] == {}


class TestMpesaPhoneFormatting:
    """Test M-PESA phone number formatting"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    def test_format_phone_number_with_zero_prefix(self, client):
        """Test formatting phone number with 0 prefix"""
        formatted = client.format_phone_number('0712345678')
        assert formatted == '254712345678'

    def test_format_phone_number_with_country_code(self, client):
        """Test formatting phone number with country code"""
        formatted = client.format_phone_number('254712345678')
        assert formatted == '254712345678'

    def test_format_phone_number_nine_digits(self, client):
        """Test formatting 9-digit phone number"""
        formatted = client.format_phone_number('712345678')
        assert formatted == '254712345678'

    def test_format_phone_number_with_spaces(self, client):
        """Test formatting phone number with spaces"""
        formatted = client.format_phone_number('0712 345 678')
        assert formatted == '254712345678'

    def test_format_phone_number_with_plus(self, client):
        """Test formatting phone number with plus sign"""
        formatted = client.format_phone_number('+254712345678')
        assert formatted == '254712345678'

    def test_format_phone_number_invalid(self, client):
        """Test formatting invalid phone number"""
        formatted = client.format_phone_number('invalid')
        assert formatted == 'invalid'  # Should return as-is if can't format

    def test_format_phone_number_exception(self, client):
        """Test phone formatting with exception"""
        formatted = client.format_phone_number(None)
        assert formatted is None


class TestMpesaAmountValidation:
    """Test M-PESA amount validation"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    def test_is_valid_amount_valid_amounts(self, client):
        """Test valid amounts"""
        assert client.is_valid_amount(1.0) is True
        assert client.is_valid_amount(1000.50) is True
        assert client.is_valid_amount(70000.0) is True
        assert client.is_valid_amount(Decimal('500.00')) is True

    def test_is_valid_amount_invalid_amounts(self, client):
        """Test invalid amounts"""
        assert client.is_valid_amount(0.5) is False
        assert client.is_valid_amount(70000.01) is False
        assert client.is_valid_amount(-100) is False
        assert client.is_valid_amount(0) is False

    def test_is_valid_amount_invalid_types(self, client):
        """Test invalid amount types"""
        assert client.is_valid_amount('invalid') is False
        assert client.is_valid_amount(None) is False
        assert client.is_valid_amount([]) is False


class TestMpesaStatusDescriptions:
    """Test M-PESA status code descriptions"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    def test_get_transaction_status_description_known_codes(self, client):
        """Test known status codes"""
        assert client.get_transaction_status_description(0) == "Success - Payment completed successfully"
        assert client.get_transaction_status_description(1) == "Insufficient Funds"
        assert client.get_transaction_status_description(1001) == "Invalid Phone Number"
        assert client.get_transaction_status_description(1032) == "Request cancelled by user"
        assert client.get_transaction_status_description(9999) == "Request failed"

    def test_get_transaction_status_description_unknown_code(self, client):
        """Test unknown status code"""
        description = client.get_transaction_status_description(9876)
        assert "Unknown status code: 9876" in description


class TestMpesaIntegrationScenarios:
    """Test complete M-PESA integration scenarios"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    @patch('requests.get')
    @patch('requests.post')
    def test_complete_payment_flow_success(self, mock_post, mock_get, client):
        """Test complete successful payment flow"""
        # Mock access token
        mock_get_response = Mock()
        mock_get_response.status_code = 200
        mock_get_response.json.return_value = {'access_token': 'test_token'}
        mock_get.return_value = mock_get_response

        # Mock STK push
        mock_post_response = Mock()
        mock_post_response.status_code = 200
        mock_post_response.json.return_value = {
            'ResponseCode': '0',
            'CheckoutRequestID': 'ws_CO_123456789'
        }
        mock_post.return_value = mock_post_response

        # Step 1: Get access token
        token = client.get_access_token()
        assert token == 'test_token'

        # Step 2: Format phone number
        formatted_phone = client.format_phone_number('0712345678')
        assert formatted_phone == '254712345678'

        # Step 3: Validate amount
        assert client.is_valid_amount(1000.0) is True

        # Step 4: Initiate STK push
        result = client.stk_push(
            phone_number=formatted_phone,
            amount=1000,
            account_reference='TEST123',
            transaction_desc='Test payment',
            callback_url='https://example.com/callback'
        )

        assert result['ResponseCode'] == '0'
        assert result['CheckoutRequestID'] == 'ws_CO_123456789'

    def test_complete_callback_processing(self, client):
        """Test complete callback processing"""
        callback_data = {
            'Body': {
                'stkCallback': {
                    'CheckoutRequestID': 'ws_CO_123456789',
                    'ResultCode': 0,
                    'ResultDesc': 'Success',
                    'CallbackMetadata': {
                        'Item': [
                            {'Name': 'Amount', 'Value': 1000.00},
                            {'Name': 'MpesaReceiptNumber', 'Value': 'NLJ7RT61SV'},
                            {'Name': 'PhoneNumber', 'Value': 254712345678}
                        ]
                    }
                }
            }
        }

        # Validate callback
        validation_result = client.validate_callback(callback_data)
        assert validation_result['valid'] is True

        # Get status description
        status_desc = client.get_transaction_status_description(
            validation_result['data']['result_code']
        )
        assert status_desc == "Success - Payment completed successfully"

        # Verify callback data
        callback_metadata = validation_result['data']['callback_metadata']
        assert callback_metadata['Amount'] == 1000.00
        assert callback_metadata['MpesaReceiptNumber'] == 'NLJ7RT61SV'


class TestMpesaErrorHandling:
    """Test M-PESA error handling scenarios"""

    @pytest.fixture
    def client(self):
        """Create a test client"""
        return MpesaClient()

    @patch('requests.get')
    def test_network_timeout_handling(self, mock_get, client):
        """Test handling of network timeouts"""
        import requests
        mock_get.side_effect = requests.Timeout('Request timed out')

        token = client.get_access_token()
        assert token is None

    @patch('requests.post')
    def test_connection_error_handling(self, mock_post, client):
        """Test handling of connection errors"""
        import requests
        client._access_token = 'test_token'
        client._token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        mock_post.side_effect = requests.ConnectionError('Connection failed')

        result = client.stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='TEST123',
            transaction_desc='Test payment',
            callback_url='https://example.com/callback'
        )

        assert result['ResponseCode'] == '1'
        assert 'STK push error' in result['errorMessage']

    def test_malformed_json_handling(self, client):
        """Test handling of malformed JSON in callbacks"""
        malformed_callback = {
            'Body': {
                'stkCallback': {
                    'CheckoutRequestID': 'ws_CO_123456789',
                    'CallbackMetadata': {
                        'Item': 'this_should_be_a_list'  # Invalid structure
                    }
                }
            }
        }

        result = client.validate_callback(malformed_callback)
        assert result['valid'] is True  # Should still be valid, just with empty metadata
        assert result['data']['callback_metadata'] == {}
        class TestMpesaClientInit:
            def test_init_with_env_vars(self, monkeypatch):
                monkeypatch.setenv('MPESA_CONSUMER_KEY', 'env_key')
                monkeypatch.setenv('MPESA_CONSUMER_SECRET', 'env_secret')
                monkeypatch.setenv('MPESA_BUSINESS_SHORT_CODE', '123456')
                monkeypatch.setenv('MPESA_PASSKEY', 'env_passkey')
                monkeypatch.setenv('MPESA_ENVIRONMENT', 'production')
                client = MpesaClient()
                assert client.consumer_key == 'env_key'
                assert client.consumer_secret == 'env_secret'
                assert client.business_short_code == '123456'
                assert client.passkey == 'env_passkey'
                assert client.environment == 'production'
                assert client.base_url == 'https://api.safaricom.co.ke'
                assert client.auth_url == 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
                assert client.stk_push_url == 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
                assert client.stk_query_url == 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
                assert client._access_token is None
                assert client._token_expires_at is None

            def test_init_defaults(self, monkeypatch):
                monkeypatch.delenv('MPESA_CONSUMER_KEY', raising=False)
                monkeypatch.delenv('MPESA_CONSUMER_SECRET', raising=False)
                monkeypatch.delenv('MPESA_BUSINESS_SHORT_CODE', raising=False)
                monkeypatch.delenv('MPESA_PASSKEY', raising=False)
                monkeypatch.delenv('MPESA_ENVIRONMENT', raising=False)
                client = MpesaClient()
                assert client.consumer_key == 'qBKabHEyWhNVJrTCRgaHfVJkG1AtCwAn1YcZMEgK6mYO2L6n'
                assert client.consumer_secret == 'MSpIy5O9tdxQzpHB4yfQJ3XQDkO8ToDpsdgM2u0YiOPZOrqq810togwATTYRuUv7'
                assert client.business_short_code == '174379'
                assert client.passkey == 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
                assert client.environment == 'sandbox'
                assert client.base_url == 'https://sandbox.safaricom.co.ke'
                assert client.auth_url == 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
                assert client.stk_push_url == 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
                assert client.stk_query_url == 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
                assert client._access_token is None
                assert client._token_expires_at is None

            def test_init_sandbox_env(self, monkeypatch):
                monkeypatch.setenv('MPESA_ENVIRONMENT', 'sandbox')
                client = MpesaClient()
                assert client.environment == 'sandbox'
                assert client.base_url == 'https://sandbox.safaricom.co.ke'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])