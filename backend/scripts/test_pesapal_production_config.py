#!/usr/bin/env python3
"""
Test Pesapal Production Configuration
Validates the production credentials and configuration
"""

import os
import sys
import logging
import time

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

def test_production_config():
    """Test production configuration"""
    try:
        print("🔧 Testing Pesapal Production Configuration")
        print("=" * 50)

        # Import configuration
        from app.config.pesapal_config import get_pesapal_config, validate_pesapal_setup
        from app.utils.pesapal_auth import get_auth_manager

        # Get configuConfig

        config = get_pesapal_config()

        print(f"Environment: {config.environment}")
        print(f"Base URL: {config.base_url}")
        print(f"Consumer Key: {config.consumer_key[:10]}...")
        print(f"Consumer Secret: {config.consumer_secret[:5]}...")
        print(f"Callback URL: {config.callback_url}")
        print(f"IPN URL: {config.ipn_url}")
        print()

        # Validate setup
        print("🔍 Validating Configuration...")
        validation = validate_pesapal_setup()

        if validation['valid']:
            print("✅ Configuration is valid")
        else:
            print("❌ Configuration has issues:")
            for error in validation['errors']:
                print(f"   - {error}")

        if validation['warnings']:
            print("⚠️  Warnings:")
            for warning in validation['warnings']:
                print(f"   - {warning}")

        print()

        # Test authentication
        print("🔐 Testing Authentication...")
        auth_manager = get_auth_manager()

        # Get token
        token = auth_manager.get_access_token()

        if token:
            print("✅ Successfully obtained access token")
            print(f"Token: {token[:20]}...")

            # Get token info
            token_info = auth_manager.get_token_info()
            print(f"Token expires at: {token_info['expires_at']}")
            print(f"Time until expiry: {token_info['time_until_expiry']} seconds")

            return True
        else:
            print("❌ Failed to obtain access token")
            return False

    except Exception as e:
        logger.error(f"Configuration test failed: {e}")
        return False

def test_payment_request():
    """Test creating a payment request"""
    try:
        print("\n💳 Testing Payment Request Creation...")

        from app.utils.pesapal_utils import create_card_payment_request

        # Test payment data
        result = create_card_payment_request(
            amount=100.0,
            currency='KES',
            description='Test payment for MIZIZZI',
            customer_email='test@mizizzi.com',
            customer_phone='254712345678',
            callback_url='https://mizizzi.com/api/pesapal/callback',
            merchant_reference='MIZIZZI_TEST_' + str(int(time.time())),
            billing_address={
                'first_name': 'John',
                'last_name': 'Doe',
                'line_1': '123 Test Street',
                'city': 'Nairobi',
                'country_code': 'KE'
            }
        )

        if result['status'] == 'success':
            print("✅ Payment request created successfully")
            print(f"Order Tracking ID: {result['order_tracking_id']}")
            print(f"Redirect URL: {result['redirect_url']}")
            return True
        else:
            print("❌ Payment request failed")
            print(f"Error: {result.get('message', 'Unknown error')}")
            return False

    except Exception as e:
        logger.error(f"Payment request test failed: {e}")
        return False

def main():
    """Main function"""
    print("🚀 MIZIZZI Pesapal Production Configuration Test")
    print("=" * 60)
    print("Testing production credentials and configuration...")
    print()

    # Test configuration
    config_success = test_production_config()

    if config_success:
        # Test payment request
        payment_success = test_payment_request()

        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)

        if config_success and payment_success:
            print("🎉 All tests passed! Pesapal integration is ready.")
            print("✅ Configuration: Valid")
            print("✅ Authentication: Working")
            print("✅ Payment Requests: Working")
            print()
            print("🔥 Your Pesapal integration is ready for production!")
            return True
        else:
            print("⚠️  Some tests failed:")
            print(f"   Configuration: {'✅' if config_success else '❌'}")
            print(f"   Payment Requests: {'✅' if payment_success else '❌'}")
            return False
    else:
        print("\n❌ Configuration test failed. Please check your credentials.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
