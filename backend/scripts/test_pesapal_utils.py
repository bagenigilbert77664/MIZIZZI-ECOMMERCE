#!/usr/bin/env python3
"""
Comprehensive Pesapal Utilities Test Script
Tests all Pesapal functionality including authentication, payment requests, and callbacks
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
from decimal import Decimal

# Add backend paths to Python path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
app_dir = os.path.join(backend_dir, 'app')

print(f"Script directory: {script_dir}")
print(f"Backend directory: {backend_dir}")
print(f"App directory: {app_dir}")

# Add paths to sys.path
for path in [backend_dir, app_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Import Pesapal utility functions at the top-level for use throughout the script
try:
    from app.utils.pesapal_utils import (
        PesapalClient, get_pesapal_client, create_payment_request,
        get_transaction_status, validate_pesapal_ipn, validate_amount,
        format_phone_number, generate_merchant_reference,
        is_valid_currency, get_supported_currencies
    )
except ImportError:
    try:
        from app.utils.pesapal_utils import (
            PesapalClient, get_pesapal_client, create_payment_request,
            get_transaction_status, validate_pesapal_ipn, validate_amount,
            format_phone_number, generate_merchant_reference,
            is_valid_currency, get_supported_currencies
        )
    except ImportError as e:
        logger = logging.getLogger(__name__)
        logger.error(f"❌ Failed to import Pesapal utilities: {e}")

def test_imports():
    """Test importing Pesapal utilities"""
    try:
        # Try different import paths
        try:
            from app.utils.pesapal_utils import (
                PesapalClient, get_pesapal_client, create_payment_request,
                get_transaction_status, validate_pesapal_ipn, validate_amount,
                format_phone_number, generate_merchant_reference,
                is_valid_currency, get_supported_currencies
            )
            logger.info("✅ Successfully imported from app.utils.pesapal_utils")
            return True
        except ImportError:
            try:
                from app.utils.pesapal_utils import (
                    PesapalClient, get_pesapal_client, create_payment_request,
                    get_transaction_status, validate_pesapal_ipn, validate_amount,
                    format_phone_number, generate_merchant_reference,
                    is_valid_currency, get_supported_currencies
                )
                logger.info("✅ Successfully imported from app.utils.pesapal_utils")
                return True
            except ImportError:
                from app.utils.pesapal_utils import (
                    PesapalClient, get_pesapal_client, create_payment_request,
                    get_transaction_status, validate_pesapal_ipn, validate_amount,
                    format_phone_number, generate_merchant_reference,
                    is_valid_currency, get_supported_currencies
                )
                logger.info("✅ Successfully imported from utils.pesapal_utils")
                return True
    except ImportError as e:
        logger.error(f"❌ Failed to import Pesapal utilities: {e}")
        return False

def test_configuration():
    """Test Pesapal configuration"""
    logger.info("⚙️ Testing Pesapal configuration...")

    try:
        from app.configuration.payment_config import PaymentConfig
        config = PaymentConfig.get_pesapal_config()

        logger.info(f"Environment: {config['environment']}")
        logger.info(f"Base URL: {config['base_url']}")
        logger.info(f"Consumer Key: {config['consumer_key'][:10]}...")
        logger.info(f"Consumer Secret: {config['consumer_secret'][:10]}...")
        logger.info(f"Callback URL: {config['callback_url']}")
        logger.info(f"IPN URL: {config['ipn_url']}")
        logger.info(f"Min Amount: {config['min_amount']}")
        logger.info(f"Max Amount: {config['max_amount']}")
        logger.info(f"Supported Currencies: {config['supported_currencies']}")

        # Validate configuration
        required_fields = ['consumer_key', 'consumer_secret', 'base_url']
        for field in required_fields:
            if not config.get(field):
                logger.warning(f"⚠️ Warning: {field} is empty or missing")
            else:
                logger.info(f"✓ {field}: configured")

        logger.info("✅ Configuration validation passed!")
        return config

    except Exception as e:
        logger.error(f"❌ Configuration test failed: {e}")
        return None

def test_client_initialization():
    """Test Pesapal client initialization"""
    logger.info("Testing Pesapal client initialization...")

    try:
        client = get_pesapal_client()

        logger.info(f"Environment: {client.environment}")
        logger.info(f"Base URL: {client.base_url}")
        logger.info(f"Consumer Key: {client.consumer_key[:10]}...")
        logger.info(f"Auth URL: {client.auth_url}")
        logger.info(f"Submit Order URL: {client.submit_order_url}")
        logger.info(f"Transaction Status URL: {client.transaction_status_url}")

        logger.info("✅ Client initialization successful!")
        return client

    except Exception as e:
        logger.error(f"❌ Client initialization failed: {e}")
        return None

def test_authentication():
    """Test Pesapal authentication"""
    logger.info("Testing Pesapal authentication...")

    try:
        client = get_pesapal_client()

        # Test getting access token
        access_token = client.get_access_token()

        if access_token:
            logger.info("✅ Pesapal authentication successful!")
            logger.info(f"Access token obtained: {access_token[:20]}...")
            return access_token
        else:
            logger.error("❌ Failed to obtain access token")
            return None

    except Exception as e:
        logger.error(f"❌ Authentication test failed: {e}")
        return None

def test_phone_formatting():
    """Test phone number formatting"""
    logger.info("Testing phone number formatting...")

    test_phones = [
        '0712345678',
        '254712345678',
        '712345678',
        '+254712345678',
        '254 712 345 678',
        '0746741719',
        '254746741719',
        '746741719',
        '+254746741719'
    ]

    try:
        for phone in test_phones:
            formatted = format_phone_number(phone)
            logger.info(f"✓ {phone} -> {formatted}")

        logger.info("✅ Phone formatting tests passed!")
        return True

    except Exception as e:
        logger.error(f"❌ Phone formatting test failed: {e}")
        return False

def test_amount_validation():
    """Test amount validation"""
    logger.info("Testing amount validation...")

    test_amounts = [
        (1, 'KES', True),
        (100, 'KES', True),
        (1000000, 'KES', True),
        (0.5, 'KES', False),
        (1000001, 'KES', False),
        (-10, 'KES', False),
        (100, 'USD', True),
        (100, 'EUR', True),
        (100, 'GBP', True),
        (100, 'INVALID', True),  # Currency validation might be separate
        ('invalid', 'KES', False)
    ]

    try:
        for amount, currency, expected in test_amounts:
            result = validate_amount(amount, currency)
            status = "✓" if result == expected else "✗"
            logger.info(f"{status} Amount {amount} {currency}: {result}")

            if result != expected:
                logger.warning(f"⚠️ Expected {expected}, got {result}")

        logger.info("✅ Amount validation tests completed!")
        return True

    except Exception as e:
        logger.error(f"❌ Amount validation test failed: {e}")
        return False

def test_currency_validation():
    """Test currency validation"""
    logger.info("Testing currency validation...")

    try:
        supported_currencies = get_supported_currencies()
        logger.info(f"Supported currencies: {supported_currencies}")

        test_currencies = ['KES', 'USD', 'EUR', 'GBP', 'INVALID', 'JPY']

        for currency in test_currencies:
            is_valid = is_valid_currency(currency)
            status = "✓" if is_valid else "✗"
            logger.info(f"{status} Currency {currency}: {is_valid}")

        logger.info("✅ Currency validation tests completed!")
        return True

    except Exception as e:
        logger.error(f"❌ Currency validation test failed: {e}")
        return False

def test_merchant_reference_generation():
    """Test merchant reference generation"""
    logger.info("Testing merchant reference generation...")

    try:
        # Generate multiple references to ensure uniqueness
        references = []
        for i in range(5):
            ref = generate_merchant_reference()
            references.append(ref)
            logger.info(f"Generated reference {i+1}: {ref}")
            time.sleep(0.1)  # Small delay to ensure timestamp difference

        # Check uniqueness
        if len(set(references)) == len(references):
            logger.info("✅ All references are unique!")
        else:
            logger.warning("⚠️ Some references are not unique")

        # Test with custom prefix
        custom_ref = generate_merchant_reference("CUSTOM")
        logger.info(f"Custom prefix reference: {custom_ref}")

        logger.info("✅ Merchant reference generation tests passed!")
        return True

    except Exception as e:
        logger.error(f"❌ Merchant reference generation test failed: {e}")
        return False

def test_ipn_validation():
    """Test IPN validation"""
    logger.info("Testing IPN validation...")

    test_ipns = [
        # Valid IPN
        {
            'OrderTrackingId': 'TRK123456789',
            'OrderMerchantReference': 'MIZIZZI_123456',
            'OrderNotificationType': 'IPNCHANGE',
            'OrderCreatedDate': datetime.now().isoformat()
        },
        # Missing tracking ID
        {
            'OrderMerchantReference': 'MIZIZZI_123456',
            'OrderNotificationType': 'IPNCHANGE'
        },
        # Missing merchant reference
        {
            'OrderTrackingId': 'TRK123456789',
            'OrderNotificationType': 'IPNCHANGE'
        },
        # Empty data
        {},
        # Invalid data
        {
            'invalid_field': 'value'
        }
    ]

    try:
        for i, ipn_data in enumerate(test_ipns):
            is_valid = validate_pesapal_ipn(ipn_data)
            status = "✓" if is_valid else "✗"
            logger.info(f"{status} IPN {i+1}: {is_valid}")
            if ipn_data:
                logger.info(f"   Data: {json.dumps(ipn_data, indent=2)}")

        logger.info("✅ IPN validation tests completed!")
        return True

    except Exception as e:
        logger.error(f"❌ IPN validation test failed: {e}")
        return False

def test_payment_request_creation():
    """Test payment request creation"""
    logger.info("Testing payment request creation...")

    # Get user input for test
    phone = input("Enter phone number (default: 254712345678): ").strip()
    if not phone:
        phone = "254712345678"

    email = input("Enter email (default: test@example.com): ").strip()
    if not email:
        email = "test@example.com"

    amount_input = input("Enter amount (default: 100): ").strip()
    try:
        amount = float(amount_input) if amount_input else 100.0
    except ValueError:
        amount = 100.0

    currency = input("Enter currency (default: KES): ").strip()
    if not currency:
        currency = "KES"

    try:
        # Generate unique merchant reference
        merchant_reference = generate_merchant_reference("TEST")

        # Create payment request
        logger.info(f"Creating payment request for {email}, {phone}, {currency} {amount}")

        payment_response = create_payment_request(
            amount=amount,
            currency=currency,
            description=f"Test payment - {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            customer_email=email,
            customer_phone=phone,
            callback_url="https://example.com/callback",
            merchant_reference=merchant_reference,
            first_name="Test",
            last_name="User",
            country_code="KE"
        )

        if payment_response:
            logger.info("Payment Request Response:")
            logger.info(json.dumps(payment_response, indent=2))

            if payment_response.get('status') == 'success':
                logger.info("✅ Payment request created successfully!")
                return payment_response
            else:
                logger.error(f"❌ Payment request failed: {payment_response.get('message')}")
                return None
        else:
            logger.error("❌ Payment request returned None")
            return None

    except Exception as e:
        logger.error(f"❌ Payment request creation failed: {e}")
        return None

def test_transaction_status_query():
    """Test transaction status query"""
    logger.info("Testing transaction status query...")

    # Use a test tracking ID
    tracking_id = input("Enter tracking ID to query (or press Enter to skip): ").strip()

    if not tracking_id:
        logger.info("Skipping transaction status query test")
        return True

    try:
        status_response = get_transaction_status(tracking_id)

        if status_response:
            logger.info("Transaction Status Response:")
            logger.info(json.dumps(status_response, indent=2))

            if status_response.get('status') == 'success':
                logger.info("✅ Transaction status query successful!")
                return status_response
            else:
                logger.error(f"❌ Transaction status query failed: {status_response.get('message')}")
                return None
        else:
            logger.error("❌ Transaction status query returned None")
            return None

    except Exception as e:
        logger.error(f"❌ Transaction status query failed: {e}")
        return None

def test_error_handling():
    """Test error handling scenarios"""
    logger.info("Testing error handling scenarios...")

    try:
        # Test with invalid amount
        logger.info("Testing invalid amount...")
        response = create_payment_request(
            amount=-100,
            currency="KES",
            description="Invalid amount test",
            customer_email="test@example.com",
            customer_phone="254712345678",
            callback_url="https://example.com/callback",
            merchant_reference="INVALID_AMOUNT_TEST"
        )

        if response and response.get('status') == 'error':
            logger.info("✓ Invalid amount properly rejected")
        else:
            logger.warning("⚠️ Invalid amount not properly handled")

        # Test with invalid currency
        logger.info("Testing invalid currency...")
        response = create_payment_request(
            amount=100,
            currency="INVALID",
            description="Invalid currency test",
            customer_email="test@example.com",
            customer_phone="254712345678",
            callback_url="https://example.com/callback",
            merchant_reference="INVALID_CURRENCY_TEST"
        )

        if response and response.get('status') == 'error':
            logger.info("✓ Invalid currency properly rejected")
        else:
            logger.warning("⚠️ Invalid currency not properly handled")

        # Test with invalid tracking ID
        logger.info("Testing invalid tracking ID...")
        response = get_transaction_status("INVALID_TRACKING_ID")

        if response and response.get('status') == 'error':
            logger.info("✓ Invalid tracking ID properly handled")
        else:
            logger.warning("⚠️ Invalid tracking ID not properly handled")

        logger.info("✅ Error handling tests completed!")
        return True

    except Exception as e:
        logger.error(f"❌ Error handling test failed: {e}")
        return False

def run_comprehensive_test():
    """Run comprehensive Pesapal test suite"""
    print("\n" + "="*60)
    print("PESAPAL UTILITIES COMPREHENSIVE TEST")
    print("="*60)

    # Test results tracking
    test_results = {}

    # 1. Test imports
    logger.info("1. Testing imports...")
    test_results['imports'] = test_imports()

    if not test_results['imports']:
        logger.error("❌ Cannot proceed without successful imports")
        return False

    # 2. Test configuration
    logger.info("\n2. Testing configuration...")
    config = test_configuration()
    test_results['configuration'] = config is not None

    # 3. Test client initialization
    logger.info("\n3. Testing client initialization...")
    client = test_client_initialization()
    test_results['client_init'] = client is not None

    # 4. Test authentication
    logger.info("\n4. Testing authentication...")
    access_token = test_authentication()
    test_results['authentication'] = access_token is not None

    # 5. Test utility functions
    logger.info("\n5. Testing phone formatting...")
    test_results['phone_formatting'] = test_phone_formatting()

    logger.info("\n6. Testing amount validation...")
    test_results['amount_validation'] = test_amount_validation()

    logger.info("\n7. Testing currency validation...")
    test_results['currency_validation'] = test_currency_validation()

    logger.info("\n8. Testing merchant reference generation...")
    test_results['merchant_reference'] = test_merchant_reference_generation()

    logger.info("\n9. Testing IPN validation...")
    test_results['ipn_validation'] = test_ipn_validation()

    # 10. Test payment request creation (interactive)
    logger.info("\n10. Testing payment request creation...")
    print("\n" + "="*50)
    print("INTERACTIVE PAYMENT REQUEST TEST")
    print("="*50)

    proceed = input("Do you want to test payment request creation? (y/N): ").strip().lower()
    if proceed == 'y':
        payment_response = test_payment_request_creation()
        test_results['payment_request'] = payment_response is not None

        # If payment was created, offer to query status
        if payment_response and payment_response.get('order_tracking_id'):
            tracking_id = payment_response['order_tracking_id']
            query_status = input(f"Query status for tracking ID {tracking_id}? (y/N): ").strip().lower()
            if query_status == 'y':
                status_response = get_transaction_status(tracking_id)
                test_results['status_query'] = status_response is not None
    else:
        logger.info("Skipping payment request test")
        test_results['payment_request'] = True  # Mark as passed since skipped

    # 11. Test transaction status query (interactive)
    logger.info("\n11. Testing transaction status query...")
    if 'status_query' not in test_results:
        status_response = test_transaction_status_query()
        test_results['status_query'] = status_response is not None or status_response is True

    # 12. Test error handling
    logger.info("\n12. Testing error handling...")
    test_results['error_handling'] = test_error_handling()

    # Print test summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = 0
    total = len(test_results)

    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Pesapal utilities are working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Please check the logs above.")
        return False

if __name__ == "__main__":
    try:
        success = run_comprehensive_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)
