#!/usr/bin/env python3
"""
Complete Pesapal Production Integration Test
Tests the full integration flow with production credentials
"""

import os
import sys
import logging
import time
import json
from datetime import datetime

# Add backend paths to Python path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
app_dir = os.path.join(backend_dir, 'app')

for path in [backend_dir, app_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s'
)

logger = logging.getLogger(__name__)

class PesapalProductionTester:
    """Complete production integration tester"""

    def __init__(self):
        """Initialize the tester"""
        self.test_results = []
        self.start_time = time.time()

        # Test configuration
        self.test_amount = 100.0
        self.test_currency = 'KES'
        self.test_email = 'test@mizizzi.com'
        self.test_phone = '254712345678'

        logger.info("Pesapal Production Integration Tester initialized")

    def run_all_tests(self):
        """Run all integration tests"""
        logger.info("=" * 80)
        logger.info("PESAPAL PRODUCTION INTEGRATION TEST SUITE")
        logger.info("=" * 80)
        logger.info("")

        # Test 1: Configuration and Authentication
        self.test_configuration_and_auth()

        # Test 2: Payment Data Validation
        self.test_payment_validation()

        # Test 3: Payment Request Creation
        self.test_payment_request_creation()

        # Test 4: Transaction Status Query
        self.test_transaction_status_query()

        # Test 5: Error Handling
        self.test_error_handling()

        # Generate summary
        self.generate_summary()

    def test_configuration_and_auth(self):
        """Test configuration and authentication"""
        logger.info("🔧 Testing Configuration and Authentication")

        try:
            from app.config.pesapal_config import get_pesapal_config, validate_pesapal_setup
            from app.utils.pesapal_auth import get_auth_manager

            # Test configuration
            config = get_pesapal_config()
            validation = validate_pesapal_setup()

            if validation['valid']:
                self.add_test_result("Configuration Validation", True, "Configuration is valid")
            else:
                self.add_test_result("Configuration Validation", False, f"Errors: {validation['errors']}")
                return

            # Test authentication
            auth_manager = get_auth_manager()
            token = auth_manager.get_access_token()

            if token:
                token_info = auth_manager.get_token_info()
                self.add_test_result(
                    "Authentication",
                    True,
                    f"Token obtained, expires in {token_info['time_until_expiry']} seconds"
                )
            else:
                self.add_test_result("Authentication", False, "Failed to obtain access token")

        except Exception as e:
            self.add_test_result("Configuration and Auth", False, f"Exception: {str(e)}")

    def test_payment_validation(self):
        """Test payment data validation"""
        logger.info("💳 Testing Payment Data Validation")

        try:
            from app.utils.pesapal_utils import get_payment_manager

            payment_manager = get_payment_manager()

            # Test valid data
            valid_data = {
                'amount': self.test_amount,
                'currency': self.test_currency,
                'customer_email': self.test_email
            }

            valid_result = payment_manager.validate_payment_data(valid_data)

            if valid_result['valid']:
                self.add_test_result("Valid Payment Data", True, "Validation passed")
            else:
                self.add_test_result("Valid Payment Data", False, f"Errors: {valid_result['errors']}")

            # Test invalid data
            invalid_data = {
                'amount': -100,  # Invalid amount
                'currency': 'INVALID',  # Invalid currency
                'customer_email': 'invalid-email'  # Invalid email
            }

            invalid_result = payment_manager.validate_payment_data(invalid_data)

            if not invalid_result['valid'] and len(invalid_result['errors']) > 0:
                self.add_test_result(
                    "Invalid Payment Data",
                    True,
                    f"Correctly rejected with {len(invalid_result['errors'])} errors"
                )
            else:
                self.add_test_result("Invalid Payment Data", False, "Should have rejected invalid data")

        except Exception as e:
            self.add_test_result("Payment Validation", False, f"Exception: {str(e)}")

    def test_payment_request_creation(self):
        """Test payment request creation"""
        logger.info("🚀 Testing Payment Request Creation")

        try:
            from app.utils.pesapal_utils import create_card_payment_request

            # Create test payment request
            result = create_card_payment_request(
                amount=self.test_amount,
                currency=self.test_currency,
                description=f'MIZIZZI test payment - {datetime.now().strftime("%Y%m%d_%H%M%S")}',
                customer_email=self.test_email,
                customer_phone=self.test_phone,
                callback_url='https://mizizzi.com/api/pesapal/callback',  # Explicitly set callback URL
                billing_address={
                    'first_name': 'Test',
                    'last_name': 'Customer',
                    'line_1': '123 Test Street',
                    'city': 'Nairobi',
                    'country_code': 'KE',
                    'postal_code': '00100'
                }
            )

            if result['status'] == 'success':
                self.add_test_result(
                    "Payment Request Creation",
                    True,
                    f"Order ID: {result.get('order_tracking_id', 'N/A')}"
                )

                # Store order tracking ID for status test
                self.test_order_tracking_id = result.get('order_tracking_id')

            else:
                self.add_test_result(
                    "Payment Request Creation",
                    False,
                    f"Error: {result.get('message', 'Unknown error')}"
                )

        except Exception as e:
            self.add_test_result("Payment Request Creation", False, f"Exception: {str(e)}")

    def test_transaction_status_query(self):
        """Test transaction status query"""
        logger.info("📊 Testing Transaction Status Query")

        try:
            from app.utils.pesapal_utils import get_transaction_status

            # Use order tracking ID from previous test if available
            if hasattr(self, 'test_order_tracking_id') and self.test_order_tracking_id:
                result = get_transaction_status(self.test_order_tracking_id)

                if result['status'] == 'success':
                    self.add_test_result(
                        "Transaction Status Query",
                        True,
                        f"Status retrieved for order {self.test_order_tracking_id}"
                    )
                else:
                    self.add_test_result(
                        "Transaction Status Query",
                        False,
                        f"Error: {result.get('message', 'Unknown error')}"
                    )
            else:
                # Test with a dummy ID - this should return an error
                result = get_transaction_status('DUMMY_ORDER_ID')

                # This should fail with an error, which is expected behavior
                if result['status'] == 'error' and 'invalid_order_tracking_id' in result.get('error_code', ''):
                    self.add_test_result(
                        "Transaction Status Query",
                        True,
                        "Correctly handled invalid order ID"
                    )
                else:
                    self.add_test_result(
                        "Transaction Status Query",
                        False,
                        f"Unexpected response: {result}"
                    )

        except Exception as e:
            self.add_test_result("Transaction Status Query", False, f"Exception: {str(e)}")

    def test_error_handling(self):
        """Test error handling scenarios"""
        logger.info("🛡️ Testing Error Handling")

        try:
            from app.utils.pesapal_utils import create_card_payment_request

            # Test with invalid amount
            result = create_card_payment_request(
                amount=0,  # Invalid amount
                currency=self.test_currency,
                customer_email=self.test_email,
                callback_url='https://mizizzi.com/api/pesapal/callback'
            )

            if result['status'] == 'error' and 'validation' in result.get('error_code', '').lower():
                self.add_test_result(
                    "Error Handling - Invalid Amount",
                    True,
                    "Correctly handled invalid amount"
                )
            else:
                self.add_test_result(
                    "Error Handling - Invalid Amount",
                    False,
                    "Should have rejected invalid amount"
                )

            # Test with invalid currency
            result = create_card_payment_request(
                amount=self.test_amount,
                currency='INVALID',  # Invalid currency
                customer_email=self.test_email,
                callback_url='https://mizizzi.com/api/pesapal/callback'
            )

            if result['status'] == 'error':
                self.add_test_result(
                    "Error Handling - Invalid Currency",
                    True,
                    "Correctly handled invalid currency"
                )
            else:
                self.add_test_result(
                    "Error Handling - Invalid Currency",
                    False,
                    "Should have rejected invalid currency"
                )

        except Exception as e:
            self.add_test_result("Error Handling", False, f"Exception: {str(e)}")

    def add_test_result(self, test_name: str, passed: bool, message: str):
        """Add a test result"""
        result = {
            'test_name': test_name,
            'passed': passed,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }

        self.test_results.append(result)

        status = "✅ PASS" if passed else "❌ FAIL"
        logger.info(f"{status} | {test_name}")
        logger.info(f"      {message}")
        logger.info("")

    def generate_summary(self):
        """Generate test summary"""
        end_time = time.time()
        duration = end_time - self.start_time

        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['passed'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        logger.info("=" * 80)
        logger.info("PRODUCTION INTEGRATION TEST SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"✅ Passed: {passed_tests}")
        logger.info(f"❌ Failed: {failed_tests}")
        logger.info(f"⏱️  Duration: {duration:.2f} seconds")
        logger.info(f"📊 Success Rate: {success_rate:.1f}%")
        logger.info("")

        logger.info("Detailed Test Results:")
        for i, result in enumerate(self.test_results, 1):
            status = "✅" if result['passed'] else "❌"
            logger.info(f" {i:2d}. {status} {result['test_name']}")
            logger.info(f"      {result['message']}")

        logger.info("=" * 80)

        if failed_tests == 0:
            logger.info("🎉 ALL TESTS PASSED! Your Pesapal integration is ready for production!")
        else:
            logger.info("⚠️  Some tests failed. Please review the results above.")

        logger.info("=" * 80)

        # Add Next Steps section for production deployment
        logger.info("🎯 Next Steps:")
        logger.info("   1. Test payment URLs in a web browser")
        logger.info("   2. Complete test transactions with real user data")
        logger.info("   3. Verify payment confirmations and callbacks")
        logger.info("   4. Deploy to your production environment")
        logger.info("   5. Monitor transactions and error logs for issues")
        logger.info("")

        return success_rate == 100.0

def main():
    """Main function"""
    print("🚀 MIZIZZI Pesapal Production Integration Test")
    print("=" * 60)
    print("Testing complete production integration flow...")
    print()

    # Confirm production testing
    response = input("⚠️  This will test PRODUCTION credentials. Continue? (y/N): ")
    if response.lower() != 'y':
        print("Test cancelled.")
        return False

    print()
    print("🔥 Running production integration tests...")
    print()

    # Run tests
    tester = PesapalProductionTester()
    success = tester.run_all_tests()

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
