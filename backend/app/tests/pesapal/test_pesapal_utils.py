#!/usr/bin/env python3
"""
Comprehensive Tests for Pesapal Payment Utilities
Tests all functions in the pesapal_utils module
"""

import os
import sys
import unittest
import logging
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta

# Add backend paths to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
app_dir = os.path.join(backend_dir, 'app')

for path in [backend_dir, app_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    # Import app to initialize
    import app

    # Import Pesapal utilities
    from app.utils.pesapal_utils import (
        PesapalClient, PesapalConfig, get_pesapal_client,
        create_payment_request, create_card_payment_request,
        get_transaction_status, validate_pesapal_ipn,
        get_payment_status_message, validate_amount,
        format_phone_number, generate_merchant_reference,
        is_valid_currency, get_supported_currencies,
        validate_card_payment_data, process_card_payment_callback,
        test_pesapal_connection, get_config_info, cleanup_expired_tokens
    )

    logger.info("✅ Successfully imported Pesapal utilities for testing")

except ImportError as e:
    logger.error(f"❌ Failed to import Pesapal utilities: {e}")
    sys.exit(1)


class TestPesapalConfig(unittest.TestCase):
    """Test PesapalConfig class"""

    def setUp(self):
        """Set up test fixtures"""
        self.config = PesapalConfig()

    def test_config_initialization(self):
        """Test config initialization"""
        self.assertIsNotNone(self.config.consumer_key)
        self.assertIsNotNone(self.config.consumer_secret)
        self.assertIsNotNone(self.config.environment)
        self.assertIsNotNone(self.config.base_url)

    def test_config_urls(self):
        """Test config URLs are properly set"""
        self.assertTrue(self.config.auth_url.startswith('https://'))
        self.assertTrue(self.config.submit_order_url.startswith('https://'))
        self.assertTrue(self.config.transaction_status_url.startswith('https://'))

    def test_supported_currencies(self):
        """Test supported currencies"""
        self.assertIsInstance(self.config.supported_currencies, list)
        self.assertIn('KES', self.config.supported_currencies)
        self.assertIn('USD', self.config.supported_currencies)

    def test_get_config(self):
        """Test get_config method"""
        config_dict = self.config.get_config()

        required_keys = [
            'consumer_key', 'consumer_secret', 'environment',
            'base_url', 'callback_url', 'ipn_url'
        ]

        for key in required_keys:
            self.assertIn(key, config_dict)


class TestPesapalClient(unittest.TestCase):
    """Test PesapalClient class"""

    def setUp(self):
        """Set up test fixtures"""
        self.config = PesapalConfig()
        self.client = PesapalClient(self.config)

    def test_client_initialization(self):
        """Test client initialization"""
        self.assertIsNotNone(self.client.config)
        self.assertIsNotNone(self.client.session)
        self.assertEqual(self.client.config, self.config)

    def test_session_headers(self):
        """Test session headers are set correctly"""
        headers = self.client.session.headers
        self.assertEqual(headers['Content-Type'], 'application/json')
        self.assertEqual(headers['Accept'], 'application/json')

    @patch('app.utils.pesapal_utils.requests.Session.post')
    def test_get_access_token_success(self, mock_post):
        """Test successful access token retrieval"""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': '200',
            'token': 'test_access_token',
            'expiryDate': 3600
        }
        mock_post.return_value = mock_response

        token = self.client.get_access_token()

        self.assertEqual(token, 'test_access_token')
        mock_post.assert_called_once()

    @patch('app.utils.pesapal_utils.requests.Session.post')
    def test_get_access_token_failure(self, mock_post):
        """Test failed access token retrieval"""
        # Mock failed response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = 'Bad Request'
        mock_post.return_value = mock_response

        token = self.client.get_access_token()

        self.assertIsNone(token)

    @patch('app.utils.pesapal_utils.requests.Session.post')
    def test_submit_order_request_success(self, mock_post):
        """Test successful order submission"""
        # Mock access token call
        with patch.object(self.client, 'get_access_token', return_value='test_token'):
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'status': '200',
                'order_tracking_id': 'TRK123456',
                'redirect_url': 'https://pay.pesapal.com/iframe/test'
            }
            mock_post.return_value = mock_response

            order_data = {
                'id': 'TEST123',
                'amount': 100.0,
                'currency': 'KES',
                'description': 'Test payment'
            }

            result = self.client.submit_order_request(order_data)

            self.assertEqual(result['status'], 'success')
            self.assertEqual(result['order_tracking_id'], 'TRK123456')

    @patch('app.utils.pesapal_utils.requests.Session.get')
    def test_get_transaction_status_success(self, mock_get):
        """Test successful transaction status retrieval"""
        # Mock access token call
        with patch.object(self.client, 'get_access_token', return_value='test_token'):
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'status': '200',
                'payment_status_description': 'COMPLETED',
                'payment_method': 'CARD',
                'amount': 100.0,
                'currency': 'KES'
            }
            mock_get.return_value = mock_response

            result = self.client.get_transaction_status('TRK123456')

            self.assertEqual(result['status'], 'success')
            self.assertEqual(result['payment_status'], 'COMPLETED')


class TestUtilityFunctions(unittest.TestCase):
    """Test utility functions"""

    def test_format_phone_number(self):
        """Test phone number formatting"""
        test_cases = [
            ('0712345678', '+254712345678'),
            ('254712345678', '+254712345678'),
            ('+254712345678', '+254712345678'),
            ('712345678', '+254712345678')
        ]

        for input_phone, expected in test_cases:
            result = format_phone_number(input_phone)
            self.assertEqual(result, expected, f"Failed for input: {input_phone}")

    def test_generate_merchant_reference(self):
        """Test merchant reference generation"""
        ref1 = generate_merchant_reference('TEST')
        ref2 = generate_merchant_reference('TEST')

        # Should be unique
        self.assertNotEqual(ref1, ref2)

        # Should start with prefix
        self.assertTrue(ref1.startswith('TEST_'))
        self.assertTrue(ref2.startswith('TEST_'))

        # Should contain timestamp and UUID parts
        parts1 = ref1.split('_')
        parts2 = ref2.split('_')
        self.assertEqual(len(parts1), 3)
        self.assertEqual(len(parts2), 3)

        # Test custom prefix
        custom_ref = generate_merchant_reference('CUSTOM')
        self.assertTrue(custom_ref.startswith('CUSTOM_'))

    def test_validate_amount(self):
        """Test amount validation"""
        # Valid amounts
        self.assertTrue(validate_amount(100.0, 'KES'))
        self.assertTrue(validate_amount(1.0, 'KES'))
        self.assertTrue(validate_amount(1000000.0, 'KES'))

        # Invalid amounts
        self.assertFalse(validate_amount(0.0, 'KES'))
        self.assertFalse(validate_amount(-100.0, 'KES'))
        self.assertFalse(validate_amount(2000000.0, 'KES'))  # Above max
        self.assertFalse(validate_amount('invalid', 'KES'))

    def test_is_valid_currency(self):
        """Test currency validation"""
        # Valid currencies
        self.assertTrue(is_valid_currency('KES'))
        self.assertTrue(is_valid_currency('USD'))
        self.assertTrue(is_valid_currency('EUR'))
        self.assertTrue(is_valid_currency('GBP'))

        # Invalid currencies
        self.assertFalse(is_valid_currency('XYZ'))
        self.assertFalse(is_valid_currency('INVALID'))
        self.assertFalse(is_valid_currency(''))

    def test_get_supported_currencies(self):
        """Test getting supported currencies"""
        currencies = get_supported_currencies()

        self.assertIsInstance(currencies, list)
        self.assertIn('KES', currencies)
        self.assertIn('USD', currencies)
        self.assertGreater(len(currencies), 0)

    def test_get_payment_status_message(self):
        """Test payment status messages"""
        test_cases = [
            ('PENDING', 'processed'),  # Changed from 'processing' to 'processed'
            ('COMPLETED', 'completed successfully'),
            ('FAILED', 'failed'),
            ('CANCELLED', 'cancelled'),
            ('DECLINED', 'declined'),
            ('EXPIRED', 'expired')
        ]

        for status, expected_keyword in test_cases:
            message = get_payment_status_message(status)
            self.assertIn(expected_keyword.lower(), message.lower(),
                         f"Status {status} should contain '{expected_keyword}'")


class TestValidationFunctions(unittest.TestCase):
    """Test validation functions"""

    def test_validate_card_payment_data_valid(self):
        """Test valid card payment data"""
        valid_data = {
            'amount': 100.0,
            'currency': 'KES',
            'customer_email': 'test@example.com',
            'customer_phone': '254712345678',
            'description': 'Test payment'
        }

        result = validate_card_payment_data(valid_data)

        self.assertTrue(result['valid'])
        self.assertEqual(len(result['errors']), 0)

    def test_validate_card_payment_data_invalid(self):
        """Test invalid card payment data"""
        invalid_data = {
            'amount': -100,  # Invalid amount
            'currency': 'INVALID',  # Invalid currency
            'customer_email': 'invalid-email',  # Invalid email
            'customer_phone': '123',  # Invalid phone
            'description': ''  # Empty description
        }

        result = validate_card_payment_data(invalid_data)

        self.assertFalse(result['valid'])
        self.assertGreater(len(result['errors']), 0)

    def test_validate_card_payment_data_missing_fields(self):
        """Test card payment data with missing fields"""
        incomplete_data = {
            'amount': 100.0
            # Missing required fields
        }

        result = validate_card_payment_data(incomplete_data)

        self.assertFalse(result['valid'])
        self.assertGreater(len(result['errors']), 0)

    def test_validate_pesapal_ipn_valid(self):
        """Test valid IPN data"""
        valid_ipn = {
            'OrderTrackingId': 'TRK123456',
            'OrderMerchantReference': 'REF123456'
        }

        result = validate_pesapal_ipn(valid_ipn)
        self.assertTrue(result)

    def test_validate_pesapal_ipn_partial(self):
        """Test partial IPN data"""
        partial_ipn = {
            'OrderTrackingId': 'TRK123456'
            # Missing OrderMerchantReference
        }

        result = validate_pesapal_ipn(partial_ipn)
        self.assertFalse(result)  # Changed from assertTrue to assertFalse since both fields are required

    def test_validate_pesapal_ipn_invalid(self):
        """Test invalid IPN data"""
        invalid_ipn = {}

        result = validate_pesapal_ipn(invalid_ipn)
        self.assertFalse(result)


class TestPaymentRequestFunctions(unittest.TestCase):
    """Test payment request functions"""

    @patch('app.utils.pesapal_utils.get_pesapal_client')
    def test_create_payment_request_valid(self, mock_get_client):
        """Test creating valid payment request"""
        # Mock client
        mock_client = Mock()
        mock_client.config.min_amount = 1.0
        mock_client.config.max_amount = 1000000.0
        mock_client.config.supported_currencies = ['KES', 'USD']
        mock_client.submit_order_request.return_value = {
            'status': 'success',
            'order_tracking_id': 'TRK123456'
        }
        mock_get_client.return_value = mock_client

        result = create_payment_request(
            amount=100.0,
            currency='KES',
            description='Test payment',
            customer_email='test@example.com',
            customer_phone='254712345678',
            callback_url='https://example.com/callback',
            merchant_reference='TEST123'
        )

        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['order_tracking_id'], 'TRK123456')

    @patch('app.utils.pesapal_utils.get_pesapal_client')
    def test_create_payment_request_invalid_amount(self, mock_get_client):
        """Test creating payment request with invalid amount"""
        # Mock client
        mock_client = Mock()
        mock_client.config.min_amount = 1.0
        mock_client.config.max_amount = 1000000.0
        mock_get_client.return_value = mock_client

        result = create_payment_request(
            amount=-100.0,  # Invalid amount
            currency='KES',
            description='Test payment',
            customer_email='test@example.com',
            customer_phone='254712345678',
            callback_url='https://example.com/callback',
            merchant_reference='TEST123'
        )

        self.assertEqual(result['status'], 'error')
        self.assertEqual(result['error_code'], 'INVALID_AMOUNT')

    @patch('app.utils.pesapal_utils.get_pesapal_client')
    def test_create_card_payment_request_valid(self, mock_get_client):
        """Test creating valid card payment request"""
        # Mock client
        mock_client = Mock()
        mock_client.config.min_amount = 1.0
        mock_client.config.max_amount = 1000000.0
        mock_client.config.supported_currencies = ['KES', 'USD']
        mock_client.submit_order_request.return_value = {
            'status': 'success',
            'order_tracking_id': 'TRK123456'
        }
        mock_get_client.return_value = mock_client

        billing_address = {
            'first_name': 'John',
            'last_name': 'Doe',
            'line_1': '123 Test Street',
            'city': 'Nairobi'
        }

        result = create_card_payment_request(
            amount=100.0,
            currency='KES',
            description='Test card payment',
            customer_email='test@example.com',
            customer_phone='254712345678',
            callback_url='https://example.com/callback',
            merchant_reference='CARD123',
            billing_address=billing_address
        )

        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['order_tracking_id'], 'TRK123456')


class TestConfigurationFunctions(unittest.TestCase):
    """Test configuration functions"""

    def test_get_config_info(self):
        """Test getting configuration info"""
        config_info = get_config_info()

        required_keys = [
            'environment', 'base_url', 'supported_currencies',
            'min_amount', 'max_amount', 'is_production'
        ]

        for key in required_keys:
            self.assertIn(key, config_info)

        self.assertIsInstance(config_info['supported_currencies'], list)
        self.assertIsInstance(config_info['min_amount'], (int, float))
        self.assertIsInstance(config_info['max_amount'], (int, float))
        self.assertIsInstance(config_info['is_production'], bool)

    @patch('app.utils.pesapal_utils.get_pesapal_client')
    def test_test_pesapal_connection_success(self, mock_get_client):
        """Test successful Pesapal connection test"""
        # Mock client
        mock_client = Mock()
        mock_client.config.environment = 'production'
        mock_client.config.base_url = 'https://pay.pesapal.com/v3'
        mock_client.get_access_token.return_value = 'test_token'
        mock_get_client.return_value = mock_client

        result = test_pesapal_connection()

        self.assertEqual(result['status'], 'success')
        self.assertIn('environment', result)
        self.assertIn('base_url', result)

    @patch('app.utils.pesapal_utils.get_pesapal_client')
    def test_test_pesapal_connection_failure(self, mock_get_client):
        """Test failed Pesapal connection test"""
        # Mock client
        mock_client = Mock()
        mock_client.config.environment = 'production'
        mock_client.config.base_url = 'https://pay.pesapal.com/v3'
        mock_client.get_access_token.return_value = None
        mock_get_client.return_value = mock_client

        result = test_pesapal_connection()

        self.assertEqual(result['status'], 'error')
        self.assertIn('message', result)


class TestCallbackProcessing(unittest.TestCase):
    """Test callback processing functions"""

    def test_process_card_payment_callback_success(self):
        """Test successful card payment callback processing"""
        callback_data = {
            'OrderTrackingId': 'TRK123456',
            'OrderMerchantReference': 'CARD123'
        }

        # Mock transaction
        mock_transaction = Mock()
        mock_transaction.pesapal_tracking_id = 'TRK123456'
        mock_transaction.status = 'pending'

        # Mock get_transaction_status to return success
        with patch('app.utils.pesapal_utils.get_transaction_status') as mock_get_status:
            mock_get_status.return_value = {
                'status': 'success',
                'payment_status': 'COMPLETED',
                'payment_method': 'CARD'
            }

            result = process_card_payment_callback(callback_data, mock_transaction)

            self.assertEqual(result['status'], 'success')
            self.assertEqual(result['payment_status'], 'completed')

    def test_process_card_payment_callback_invalid_data(self):
        """Test card payment callback with invalid data"""
        callback_data = {}  # Missing required fields

        mock_transaction = Mock()

        result = process_card_payment_callback(callback_data, mock_transaction)

        self.assertEqual(result['status'], 'error')
        self.assertIn('Invalid callback data', result['message'])


class TestHelperFunctions(unittest.TestCase):
    """Test helper functions"""

    def test_cleanup_expired_tokens(self):
        """Test cleanup of expired tokens"""
        # This function should run without errors
        try:
            cleanup_expired_tokens()
        except Exception as e:
            self.fail(f"cleanup_expired_tokens raised an exception: {e}")

    def test_get_pesapal_client_singleton(self):
        """Test that get_pesapal_client returns the same instance"""
        client1 = get_pesapal_client()
        client2 = get_pesapal_client()

        self.assertIs(client1, client2)  # Should be the same instance


if __name__ == '__main__':
    print("🧪 Running Pesapal Utilities Test Suite")
    print("=" * 50)

    # Create test suite
    test_suite = unittest.TestSuite()

    # Add test classes
    test_classes = [
        TestPesapalConfig,
        TestPesapalClient,
        TestUtilityFunctions,
        TestValidationFunctions,
        TestPaymentRequestFunctions,
        TestConfigurationFunctions,
        TestCallbackProcessing,
        TestHelperFunctions
    ]

    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)

    # Print summary
    print("\n" + "=" * 50)
    print("🏁 TEST SUMMARY")
    print("=" * 50)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")

    if result.failures:
        print("\n❌ FAILURES:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback}")

    if result.errors:
        print("\n❌ ERRORS:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback}")

    if result.wasSuccessful():
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n⚠️  {len(result.failures + result.errors)} test(s) failed")
        sys.exit(1)
