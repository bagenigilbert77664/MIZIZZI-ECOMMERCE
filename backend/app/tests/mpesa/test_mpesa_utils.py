"""
Comprehensive tests for M-PESA utility functions.
Tests all utility functions used by M-PESA routes.
"""

import pytest
import json
import base64
import hashlib
import hmac
from datetime import datetime
from unittest.mock import patch, MagicMock
import requests

from app.utils.mpesa_utils import (
    get_access_token,
    initiate_stk_push,
    query_stk_status,
    format_phone_number,
    get_transaction_status_message,
    generate_password,
    validate_mpesa_callback
)


class TestMpesaAuthentication:
    """Test M-PESA authentication utilities"""

    @patch('app.utils.mpesa_utils.requests.get')
    def test_get_access_token_success(self, mock_get):
        """Test successful access token retrieval"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'access_token': 'test_access_token',
            'expires_in': '3599'
        }
        mock_get.return_value = mock_response

        token = get_access_token()

        assert token == 'test_access_token'
        mock_get.assert_called_once()

    @patch('app.utils.mpesa_utils.requests.get')
    def test_get_access_token_failure(self, mock_get):
        """Test access token retrieval failure"""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'errorCode': '400.002.02',
            'errorMessage': 'Bad Request - Invalid Credentials'
        }
        mock_get.return_value = mock_response

        token = get_access_token()

        assert token is None

    @patch('app.utils.mpesa_utils.requests.get')
    def test_get_access_token_network_error(self, mock_get):
        """Test access token retrieval with network error"""
        mock_get.side_effect = requests.RequestException("Network error")

        token = get_access_token()

        assert token is None

    @patch('app.utils.mpesa_utils.requests.get')
    def test_get_access_token_invalid_json(self, mock_get):
        """Test access token retrieval with invalid JSON response"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_get.return_value = mock_response

        token = get_access_token()

        assert token is None


class TestMpesaSTKPush:
    """Test M-PESA STK Push utilities"""

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_initiate_stk_push_success(self, mock_post, mock_get_token):
        """Test successful STK push initiation"""
        mock_get_token.return_value = 'test_access_token'
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'MerchantRequestID': 'merchant_123',
            'CheckoutRequestID': 'ws_CO_123',
            'ResponseCode': '0',
            'ResponseDescription': 'Success',
            'CustomerMessage': 'Success. Request accepted for processing'
        }
        mock_post.return_value = mock_response

        result = initiate_stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='ORD123',
            transaction_desc='Test payment'
        )

        assert result is not None
        assert result['ResponseCode'] == '0'
        assert result['CheckoutRequestID'] == 'ws_CO_123'

    @patch('app.utils.mpesa_utils.get_access_token')
    def test_initiate_stk_push_no_token(self, mock_get_token):
        """Test STK push initiation without access token"""
        mock_get_token.return_value = None

        result = initiate_stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='ORD123',
            transaction_desc='Test payment'
        )

        assert result is None

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_initiate_stk_push_failure(self, mock_post, mock_get_token):
        """Test STK push initiation failure"""
        mock_get_token.return_value = 'test_access_token'
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'ResponseCode': '400.002.02',
            'ResponseDescription': 'Bad Request - Invalid Credentials'
        }
        mock_post.return_value = mock_response

        result = initiate_stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='ORD123',
            transaction_desc='Test payment'
        )

        assert result is not None
        assert result['ResponseCode'] == '400.002.02'

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_initiate_stk_push_network_error(self, mock_post, mock_get_token):
        """Test STK push initiation with network error"""
        mock_get_token.return_value = 'test_access_token'
        mock_post.side_effect = requests.RequestException("Network error")

        result = initiate_stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='ORD123',
            transaction_desc='Test payment'
        )

        assert result is None

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_initiate_stk_push_invalid_json(self, mock_post, mock_get_token):
        """Test STK push initiation with invalid JSON response"""
        mock_get_token.return_value = 'test_access_token'
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_post.return_value = mock_response

        result = initiate_stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='ORD123',
            transaction_desc='Test payment'
        )

        assert result is None


class TestMpesaStatusQuery:
    """Test M-PESA status query utilities"""

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_query_stk_status_success(self, mock_post, mock_get_token):
        """Test successful STK status query"""
        mock_get_token.return_value = 'test_access_token'
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'ResponseCode': '0',
            'ResponseDescription': 'The service request has been accepted successfully',
            'ResultCode': '0',
            'ResultDesc': 'The service request is processed successfully.',
            'CallbackMetadata': {
                'Item': [
                    {'Name': 'Amount', 'Value': 1000},
                    {'Name': 'MpesaReceiptNumber', 'Value': 'NLJ7RT61SV'},
                    {'Name': 'TransactionDate', 'Value': '20231201120000'},
                    {'Name': 'PhoneNumber', 'Value': '254712345678'}
                ]
            }
        }
        mock_post.return_value = mock_response

        result = query_stk_status('ws_CO_123456789')

        assert result is not None
        assert result['ResultCode'] == '0'
        assert result['CallbackMetadata']['Item'][1]['Value'] == 'NLJ7RT61SV'

    @patch('app.utils.mpesa_utils.get_access_token')
    def test_query_stk_status_no_token(self, mock_get_token):
        """Test STK status query without access token"""
        mock_get_token.return_value = None

        result = query_stk_status('ws_CO_123456789')

        assert result is None

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_query_stk_status_failure(self, mock_post, mock_get_token):
        """Test STK status query failure"""
        mock_get_token.return_value = 'test_access_token'
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'ResponseCode': '400.002.02',
            'ResponseDescription': 'Bad Request - Invalid Credentials'
        }
        mock_post.return_value = mock_response

        result = query_stk_status('ws_CO_123456789')

        assert result is not None
        assert result['ResponseCode'] == '400.002.02'

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_query_stk_status_network_error(self, mock_post, mock_get_token):
        """Test STK status query with network error"""
        mock_get_token.return_value = 'test_access_token'
        mock_post.side_effect = requests.RequestException("Network error")

        result = query_stk_status('ws_CO_123456789')

        assert result is None


class TestPhoneNumberFormatting:
    """Test phone number formatting utilities"""

    def test_format_phone_number_valid_kenyan(self):
        """Test formatting valid Kenyan phone numbers"""
        test_cases = [
            ('0712345678', '254712345678'),
            ('712345678', '254712345678'),
            ('254712345678', '254712345678'),
            ('+254712345678', '254712345678'),
            ('0722345678', '254722345678'),
            ('0733345678', '254733345678'),
        ]

        for input_phone, expected in test_cases:
            result = format_phone_number(input_phone)
            assert result == expected, f"Failed for input: {input_phone}"

    def test_format_phone_number_invalid(self):
        """Test formatting invalid phone numbers"""
        invalid_numbers = [
            '12345',  # Too short
            '25471234567890',  # Too long
            '255712345678',  # Wrong country code
            'abcdefghij',  # Non-numeric
            '',  # Empty string
            None,  # None value
            '0812345678',  # Invalid network code
        ]

        for invalid_phone in invalid_numbers:
            result = format_phone_number(invalid_phone)
            assert result is None, f"Should be None for input: {invalid_phone}"

    def test_format_phone_number_edge_cases(self):
        """Test phone number formatting edge cases"""
        # Test with spaces
        assert format_phone_number('0712 345 678') == '254712345678'

        # Test with dashes
        assert format_phone_number('0712-345-678') == '254712345678'

        # Test with parentheses
        assert format_phone_number('(0712) 345678') == '254712345678'

        # Test with plus and spaces
        assert format_phone_number('+254 712 345 678') == '254712345678'


class TestTransactionStatusMessages:
    """Test transaction status message utilities"""

    def test_get_transaction_status_message_success(self):
        """Test status messages for successful transactions"""
        assert get_transaction_status_message('0') == 'Transaction completed successfully'
        assert get_transaction_status_message(0) == 'Transaction completed successfully'

    def test_get_transaction_status_message_failures(self):
        """Test status messages for failed transactions"""
        test_cases = [
            ('1', 'Insufficient funds'),
            ('1001', 'Invalid phone number'),
            ('1032', 'Transaction cancelled by user'),
            ('1037', 'Transaction timeout'),
            ('2001', 'Invalid amount'),
        ]

        for code, expected_message in test_cases:
            result = get_transaction_status_message(code)
            assert expected_message.lower() in result.lower()

    def test_get_transaction_status_message_unknown(self):
        """Test status messages for unknown codes"""
        result = get_transaction_status_message('9999')
        assert 'unknown' in result.lower() or 'error' in result.lower()

    def test_get_transaction_status_message_none(self):
        """Test status messages for None input"""
        result = get_transaction_status_message(None)
        assert result is not None
        assert len(result) > 0


class TestPasswordGeneration:
    """Test M-PESA password generation utilities"""

    def test_generate_password_valid_inputs(self):
        """Test password generation with valid inputs"""
        business_short_code = '174379'
        passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
        timestamp = '20231201120000'

        password = generate_password(business_short_code, passkey, timestamp)

        assert password is not None
        assert len(password) > 0
        # Should be base64 encoded
        try:
            base64.b64decode(password)
        except Exception:
            pytest.fail("Generated password is not valid base64")

    def test_generate_password_consistency(self):
        """Test that password generation is consistent"""
        business_short_code = '174379'
        passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
        timestamp = '20231201120000'

        password1 = generate_password(business_short_code, passkey, timestamp)
        password2 = generate_password(business_short_code, passkey, timestamp)

        assert password1 == password2

    def test_generate_password_different_timestamps(self):
        """Test that different timestamps generate different passwords"""
        business_short_code = '174379'
        passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
        timestamp1 = '20231201120000'
        timestamp2 = '20231201120001'

        password1 = generate_password(business_short_code, passkey, timestamp1)
        password2 = generate_password(business_short_code, passkey, timestamp2)

        assert password1 != password2

    def test_generate_password_empty_inputs(self):
        """Test password generation with empty inputs"""
        # Should handle empty inputs gracefully
        password = generate_password('', '', '')
        assert password is not None

    def test_generate_password_none_inputs(self):
        """Test password generation with None inputs"""
        with pytest.raises((TypeError, AttributeError)):
            generate_password(None, None, None)


class TestCallbackValidation:
    """Test M-PESA callback validation utilities"""

    def test_validate_mpesa_callback_valid_structure(self):
        """Test validation of valid callback structure"""
        valid_callback = {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'merchant_123',
                    'CheckoutRequestID': 'ws_CO_123',
                    'ResultCode': 0,
                    'ResultDesc': 'Success'
                }
            }
        }

        result = validate_mpesa_callback(valid_callback)
        assert result is True

    def test_validate_mpesa_callback_invalid_structure(self):
        """Test validation of invalid callback structures"""
        invalid_callbacks = [
            {},  # Empty
            {'Body': {}},  # Missing stkCallback
            {'Body': {'stkCallback': {}}},  # Missing required fields
            {'InvalidKey': 'value'},  # Wrong structure
            None,  # None value
        ]

        for invalid_callback in invalid_callbacks:
            result = validate_mpesa_callback(invalid_callback)
            assert result is False

    def test_validate_mpesa_callback_missing_required_fields(self):
        """Test validation with missing required fields"""
        callback_missing_fields = {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'merchant_123',
                    # Missing CheckoutRequestID, ResultCode, ResultDesc
                }
            }
        }

        result = validate_mpesa_callback(callback_missing_fields)
        assert result is False

    def test_validate_mpesa_callback_with_metadata(self):
        """Test validation of callback with metadata"""
        callback_with_metadata = {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'merchant_123',
                    'CheckoutRequestID': 'ws_CO_123',
                    'ResultCode': 0,
                    'ResultDesc': 'Success',
                    'CallbackMetadata': {
                        'Item': [
                            {'Name': 'Amount', 'Value': 1000},
                            {'Name': 'MpesaReceiptNumber', 'Value': 'NLJ7RT61SV'}
                        ]
                    }
                }
            }
        }

        result = validate_mpesa_callback(callback_with_metadata)
        assert result is True

    def test_validate_mpesa_callback_failed_transaction(self):
        """Test validation of failed transaction callback"""
        failed_callback = {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'merchant_123',
                    'CheckoutRequestID': 'ws_CO_123',
                    'ResultCode': 1,
                    'ResultDesc': 'Insufficient funds'
                }
            }
        }

        result = validate_mpesa_callback(failed_callback)
        assert result is True  # Structure is valid even if transaction failed


class TestMpesaUtilsIntegration:
    """Test integration between M-PESA utility functions"""

    @patch('app.utils.mpesa_utils.get_access_token')
    @patch('app.utils.mpesa_utils.requests.post')
    def test_stk_push_to_status_query_flow(self, mock_post, mock_get_token):
        """Test complete flow from STK push to status query"""
        mock_get_token.return_value = 'test_access_token'

        # Mock STK push response
        stk_response = MagicMock()
        stk_response.status_code = 200
        stk_response.json.return_value = {
            'MerchantRequestID': 'merchant_123',
            'CheckoutRequestID': 'ws_CO_123',
            'ResponseCode': '0',
            'ResponseDescription': 'Success'
        }

        # Mock status query response
        status_response = MagicMock()
        status_response.status_code = 200
        status_response.json.return_value = {
            'ResponseCode': '0',
            'ResultCode': '0',
            'ResultDesc': 'Success',
            'CallbackMetadata': {
                'Item': [
                    {'Name': 'Amount', 'Value': 1000},
                    {'Name': 'MpesaReceiptNumber', 'Value': 'NLJ7RT61SV'}
                ]
            }
        }

        mock_post.side_effect = [stk_response, status_response]

        # Step 1: Initiate STK push
        stk_result = initiate_stk_push(
            phone_number='254712345678',
            amount=1000,
            account_reference='ORD123',
            transaction_desc='Test payment'
        )

        assert stk_result is not None
        assert stk_result['ResponseCode'] == '0'
        checkout_request_id = stk_result['CheckoutRequestID']

        # Step 2: Query status
        status_result = query_stk_status(checkout_request_id)

        assert status_result is not None
        assert status_result['ResultCode'] == '0'
        assert status_result['CallbackMetadata']['Item'][1]['Value'] == 'NLJ7RT61SV'

    def test_phone_formatting_with_password_generation(self):
        """Test phone formatting integration with password generation"""
        # Format phone number
        formatted_phone = format_phone_number('0712345678')
        assert formatted_phone == '254712345678'

        # Use formatted phone in password generation context
        business_short_code = '174379'
        passkey = 'test_passkey'
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')

        password = generate_password(business_short_code, passkey, timestamp)

        # Both should work together
        assert formatted_phone is not None
        assert password is not None

    def test_status_message_with_callback_validation(self):
        """Test status message generation with callback validation"""
        # Create valid callback
        callback_data = {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'merchant_123',
                    'CheckoutRequestID': 'ws_CO_123',
                    'ResultCode': 1,  # Failed transaction
                    'ResultDesc': 'Insufficient funds'
                }
            }
        }

        # Validate callback
        is_valid = validate_mpesa_callback(callback_data)
        assert is_valid is True

        # Get status message
        result_code = callback_data['Body']['stkCallback']['ResultCode']
        status_message = get_transaction_status_message(str(result_code))

        assert 'insufficient' in status_message.lower() or 'funds' in status_message.lower()


class TestMpesaUtilsErrorHandling:
    """Test error handling in M-PESA utilities"""

    def test_network_timeout_handling(self):
        """Test handling of network timeouts"""
        with patch('app.utils.mpesa_utils.requests.get') as mock_get:
            mock_get.side_effect = requests.Timeout("Request timeout")

            token = get_access_token()
            assert token is None

    def test_connection_error_handling(self):
        """Test handling of connection errors"""
        with patch('app.utils.mpesa_utils.requests.post') as mock_post:
            mock_post.side_effect = requests.ConnectionError("Connection failed")

            result = initiate_stk_push(
                phone_number='254712345678',
                amount=1000,
                account_reference='ORD123',
                transaction_desc='Test payment'
            )
            assert result is None

    def test_invalid_response_handling(self):
        """Test handling of invalid responses"""
        with patch('app.utils.mpesa_utils.requests.get') as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {}  # Empty response
            mock_get.return_value = mock_response

            token = get_access_token()
            assert token is None

    def test_malformed_json_handling(self):
        """Test handling of malformed JSON responses"""
        with patch('app.utils.mpesa_utils.requests.post') as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.text = "Invalid JSON response"
            mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
            mock_post.return_value = mock_response

            result = initiate_stk_push(
                phone_number='254712345678',
                amount=1000,
                account_reference='ORD123',
                transaction_desc='Test payment'
            )
            assert result is None
