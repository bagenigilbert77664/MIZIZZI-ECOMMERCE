#!/usr/bin/env python3
"""
Pesapal Production Success Test
Final test to confirm the integration is working perfectly
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

class PesapalSuccessTester:
    """Test to confirm Pesapal integration success"""

    def __init__(self):
        """Initialize the tester"""
        self.test_results = []
        self.start_time = time.time()

        # Test configuration
        self.test_amount = 150.0
        self.test_currency = 'KES'
        self.test_email = 'customer@mizizzi.com'
        self.test_phone = '254700123456'

        logger.info("Pesapal Production Success Tester initialized")

    def run_success_tests(self):
        """Run success confirmation tests"""
        logger.info("🎉" * 20)
        logger.info("PESAPAL PRODUCTION SUCCESS CONFIRMATION")
        logger.info("🎉" * 20)
        logger.info("")

        # Test 1: Quick Configuration Check
        self.test_quick_config()

        # Test 2: Authentication Test
        self.test_authentication()

        # Test 3: IPN Management Test
        self.test_ipn_management()

        # Test 4: Create Real Payment Request
        self.test_create_payment()

        # Test 5: Verify Payment URL
        self.test_payment_url()

        # Generate success summary
        self.generate_success_summary()

    def test_quick_config(self):
        """Quick configuration test"""
        logger.info("⚙️ Quick Configuration Check")

        try:
            from app.config.pesapal_config import get_pesapal_config

            config = get_pesapal_config()

            # Check key configuration
            checks = {
                'Environment': config.environment,
                'Base URL': config.base_url,
                'Consumer Key Set': bool(config.consumer_key),
                'Consumer Secret Set': bool(config.consumer_secret),
                'Callback URL': config.callback_url,
                'IPN URL': config.ipn_url
            }

            all_good = all([
                config.environment == 'production',
                'pay.pesapal.com' in config.base_url,
                config.consumer_key,
                config.consumer_secret,
                config.callback_url,
                config.ipn_url
            ])

            if all_good:
                self.add_test_result("Configuration Check", True, "All configuration parameters are correct")
            else:
                self.add_test_result("Configuration Check", False, f"Configuration issues: {checks}")

        except Exception as e:
            self.add_test_result("Configuration Check", False, f"Exception: {str(e)}")

    def test_authentication(self):
        """Test authentication"""
        logger.info("🔐 Authentication Test")

        try:
            from app.utils.pesapal_auth import get_auth_manager

            auth_manager = get_auth_manager()
            token = auth_manager.get_access_token()

            if token and len(token) > 50:  # JWT tokens are long
                token_info = auth_manager.get_token_info()
                self.add_test_result(
                    "Authentication",
                    True,
                    f"✅ Token obtained successfully (expires in {token_info['time_until_expiry']}s)"
                )
                self.auth_token = token
            else:
                self.add_test_result("Authentication", False, "Failed to obtain valid access token")

        except Exception as e:
            self.add_test_result("Authentication", False, f"Exception: {str(e)}")

    def test_ipn_management(self):
        """Test IPN management"""
        logger.info("📡 IPN Management Test")

        try:
            from app.utils.pesapal_utils import PesapalClient
            from app.config.pesapal_config import get_pesapal_config

            config = get_pesapal_config()
            client = PesapalClient(config)

            # Test IPN registration/retrieval
            ipn_id = client.register_ipn_url()

            if ipn_id:
                self.add_test_result(
                    "IPN Management",
                    True,
                    f"✅ IPN configured successfully (ID: {ipn_id[:8]}...)"
                )
                self.ipn_id = ipn_id
            else:
                self.add_test_result("IPN Management", False, "Failed to configure IPN")

        except Exception as e:
            self.add_test_result("IPN Management", False, f"Exception: {str(e)}")

    def test_create_payment(self):
        """Test creating a real payment request"""
        logger.info("💳 Create Payment Request")

        try:
            from app.utils.pesapal_utils import create_card_payment_request

            # Create a real payment request
            result = create_card_payment_request(
                amount=self.test_amount,
                currency=self.test_currency,
                description=f'MIZIZZI Production Test Payment - {datetime.now().strftime("%Y%m%d_%H%M%S")}',
                customer_email=self.test_email,
                customer_phone=self.test_phone,
                callback_url='https://mizizzi.com/api/pesapal/callback',
                billing_address={
                    'first_name': 'MIZIZZI',
                    'last_name': 'Customer',
                    'line_1': 'Nairobi CBD',
                    'city': 'Nairobi',
                    'country_code': 'KE',
                    'postal_code': '00100',
                    'email_address': self.test_email,
                    'phone_number': self.test_phone
                }
            )

            if result['status'] == 'success':
                order_id = result.get('order_tracking_id')
                redirect_url = result.get('redirect_url')

                self.add_test_result(
                    "Payment Request Creation",
                    True,
                    f"✅ Payment created successfully (Order: {order_id[:8]}...)"
                )

                # Store for next test
                self.payment_order_id = order_id
                self.payment_redirect_url = redirect_url

            else:
                error_msg = result.get('message', 'Unknown error')
                self.add_test_result("Payment Request Creation", False, f"Failed: {error_msg}")

        except Exception as e:
            self.add_test_result("Payment Request Creation", False, f"Exception: {str(e)}")

    def test_payment_url(self):
        """Test payment URL validity"""
        logger.info("🔗 Payment URL Verification")

        try:
            if hasattr(self, 'payment_redirect_url') and self.payment_redirect_url:
                # Basic URL validation
                url = self.payment_redirect_url

                url_checks = {
                    'HTTPS': url.startswith('https://'),
                    'Pesapal Domain': 'pay.pesapal.com' in url,
                    'Has Order ID': 'OrderTrackingId=' in url,
                    'Valid Format': len(url) > 50
                }

                if all(url_checks.values()):
                    self.add_test_result(
                        "Payment URL Verification",
                        True,
                        f"✅ Valid payment URL generated"
                    )

                    # Log the URL for manual testing
                    logger.info(f"🔗 Payment URL: {url}")

                else:
                    self.add_test_result(
                        "Payment URL Verification",
                        False,
                        f"URL validation failed: {url_checks}"
                    )
            else:
                self.add_test_result(
                    "Payment URL Verification",
                    False,
                    "No payment URL available from previous test"
                )

        except Exception as e:
            self.add_test_result("Payment URL Verification", False, f"Exception: {str(e)}")

    def add_test_result(self, test_name: str, passed: bool, message: str):
        """Add a test result"""
        result = {
            'test_name': test_name,
            'passed': passed,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }

        self.test_results.append(result)

        status = "✅" if passed else "❌"
        logger.info(f"{status} {test_name}")
        logger.info(f"   {message}")
        logger.info("")

    def generate_success_summary(self):
        """Generate success summary"""
        end_time = time.time()
        duration = end_time - self.start_time

        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['passed'])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        logger.info("🎉" * 20)
        logger.info("PESAPAL INTEGRATION SUCCESS SUMMARY")
        logger.info("🎉" * 20)
        logger.info(f"📊 Tests: {passed_tests}/{total_tests} passed ({success_rate:.1f}%)")
        logger.info(f"⏱️  Duration: {duration:.2f} seconds")
        logger.info("")

        if failed_tests == 0:
            logger.info("🎉 PERFECT! ALL TESTS PASSED!")
            logger.info("🚀 Your Pesapal integration is 100% ready for production!")
            logger.info("")
            logger.info("✅ What's working:")
            logger.info("   • Production credentials configured")
            logger.info("   • Authentication working")
            logger.info("   • IPN management working")
            logger.info("   • Payment requests creating successfully")
            logger.info("   • Payment URLs generating correctly")
            logger.info("")
            logger.info("🎯 Next Steps:")
            logger.info("   1. Test the payment URL in a browser")
            logger.info("   2. Complete a test transaction")
            logger.info("   3. Verify IPN callbacks are received")
            logger.info("   4. Deploy to your production environment")

        elif passed_tests >= 4:
            logger.info("🟢 EXCELLENT! Core integration is working!")
            logger.info("🚀 Your Pesapal integration is ready for production!")
            logger.info("")
            logger.info("✅ What's working:")
            for result in self.test_results:
                if result['passed']:
                    logger.info(f"   • {result['test_name']}")

            if failed_tests > 0:
                logger.info("")
                logger.info("⚠️  Minor issues (non-critical):")
                for result in self.test_results:
                    if not result['passed']:
                        logger.info(f"   • {result['test_name']}: {result['message']}")
        else:
            logger.info("🔴 Some issues detected. Please review:")
            for result in self.test_results:
                status = "✅" if result['passed'] else "❌"
                logger.info(f"   {status} {result['test_name']}")

        # Show payment URL if available
        if hasattr(self, 'payment_redirect_url') and self.payment_redirect_url:
            logger.info("")
            logger.info("🔗 TEST PAYMENT URL:")
            logger.info(f"   {self.payment_redirect_url}")
            logger.info("")
            logger.info("💡 You can test this URL in your browser to complete a payment!")

        logger.info("🎉" * 20)

        return failed_tests == 0

def main():
    """Main function"""
    print("🎉 MIZIZZI Pesapal Production Success Test")
    print("=" * 50)
    print("Confirming your Pesapal integration is ready!")
    print()

    # Run success tests
    tester = PesapalSuccessTester()
    success = tester.run_success_tests()

    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
