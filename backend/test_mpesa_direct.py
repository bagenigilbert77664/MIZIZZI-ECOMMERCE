"""
Comprehensive M-PESA Integration Test Script.
Tests all functionalities of the direct M-PESA integration module.
"""
import os
import sys
import json
import time
from datetime import datetime

# Add the parent directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the direct_mpesa module
try:
    from app.mpesa.direct_mpesa import (
        initiate_stk_push, query_stk_status, process_stk_callback,
        format_phone_number, validate_amount, generate_access_token,
        simulate_stk_push, simulate_callback, test_module, get_module_info,
        MpesaError
    )
    print("✅ Successfully imported direct_mpesa module")
except ImportError as e:
    print(f"❌ Failed to import direct_mpesa module: {str(e)}")
    sys.exit(1)

def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_result(test_name, success, details=None):
    """Print test result."""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    Details: {details}")

def test_phone_formatting():
    """Test phone number formatting."""
    print_section("TESTING PHONE NUMBER FORMATTING")

    test_cases = [
        ("0712345678", "254712345678"),
        ("712345678", "254712345678"),
        ("254712345678", "254712345678"),
        ("+254712345678", "254712345678"),
        ("0701234567", "254701234567"),
        ("701234567", "254701234567"),
    ]

    all_passed = True

    for input_phone, expected in test_cases:
        try:
            result = format_phone_number(input_phone)
            success = result == expected
            print_result(f"Format {input_phone} -> {result}", success)
            if not success:
                all_passed = False
                print(f"    Expected: {expected}, Got: {result}")
        except Exception as e:
            print_result(f"Format {input_phone}", False, str(e))
            all_passed = False

    # Test invalid phone numbers
    invalid_phones = ["123", "abcd", "", "25471234567890"]
    for phone in invalid_phones:
        try:
            format_phone_number(phone)
            print_result(f"Invalid phone {phone} should fail", False)
            all_passed = False
        except MpesaError:
            print_result(f"Invalid phone {phone} correctly rejected", True)
        except Exception as e:
            print_result(f"Invalid phone {phone}", False, f"Unexpected error: {str(e)}")
            all_passed = False

    return all_passed

def test_amount_validation():
    """Test amount validation."""
    print_section("TESTING AMOUNT VALIDATION")

    test_cases = [
        (100, 100),
        ("100.50", 100),
        (1.99, 1),
        ("50", 50),
        (70000, 70000),
    ]

    all_passed = True

    for input_amount, expected in test_cases:
        try:
            result = validate_amount(input_amount)
            success = result == expected
            print_result(f"Validate {input_amount} -> {result}", success)
            if not success:
                all_passed = False
                print(f"    Expected: {expected}, Got: {result}")
        except Exception as e:
            print_result(f"Validate {input_amount}", False, str(e))
            all_passed = False

    # Test invalid amounts
    invalid_amounts = [0, -10, "abc", 80000, None]
    for amount in invalid_amounts:
        try:
            validate_amount(amount)
            print_result(f"Invalid amount {amount} should fail", False)
            all_passed = False
        except MpesaError:
            print_result(f"Invalid amount {amount} correctly rejected", True)
        except Exception as e:
            print_result(f"Invalid amount {amount}", False, f"Unexpected error: {str(e)}")
            all_passed = False

    return all_passed

def test_token_generation():
    """Test access token generation."""
    print_section("TESTING ACCESS TOKEN GENERATION")

    try:
        print("Generating access token...")
        token = generate_access_token()

        if token:
            print_result("Token generation", True, f"Token length: {len(token)}")

            # Test token caching
            print("Testing token caching...")
            start_time = time.time()
            cached_token = generate_access_token()
            cache_time = time.time() - start_time

            if cached_token == token and cache_time < 1:
                print_result("Token caching", True, f"Cache time: {cache_time:.3f}s")
            else:
                print_result("Token caching", False, "Token not cached properly")
                return False

            return True
        else:
            print_result("Token generation", False, "No token returned")
            return False

    except Exception as e:
        print_result("Token generation", False, str(e))
        return False

def test_simulation():
    """Test M-PESA simulation functions."""
    print_section("TESTING M-PESA SIMULATION")

    try:
        # Test STK Push simulation
        print("Testing STK Push simulation...")
        response = simulate_stk_push("254712345678", 100, "TEST-REF")

        required_fields = ["CheckoutRequestID", "MerchantRequestID", "ResponseCode"]
        missing_fields = [field for field in required_fields if field not in response]

        if not missing_fields and response.get("ResponseCode") == "0":
            print_result("STK Push simulation", True, f"CheckoutRequestID: {response['CheckoutRequestID']}")

            # Test callback simulation
            print("Testing callback simulation...")
            checkout_id = response["CheckoutRequestID"]

            # Test successful callback
            success_callback = simulate_callback(checkout_id, success=True, amount=100, phone_number="254712345678")
            processed_success = process_stk_callback(success_callback)

            if processed_success and processed_success.get("result_code") == 0:
                print_result("Success callback simulation", True)
            else:
                print_result("Success callback simulation", False, "Failed to process success callback")
                return False

            # Test failed callback
            failed_callback = simulate_callback(checkout_id, success=False)
            processed_failed = process_stk_callback(failed_callback)

            if processed_failed and processed_failed.get("result_code") != 0:
                print_result("Failed callback simulation", True)
            else:
                print_result("Failed callback simulation", False, "Failed to process failed callback")
                return False

            return True
        else:
            print_result("STK Push simulation", False, f"Missing fields: {missing_fields}")
            return False

    except Exception as e:
        print_result("Simulation", False, str(e))
        return False

def test_real_stk_push():
    """Test real STK Push (optional, requires user input)."""
    print_section("TESTING REAL STK PUSH")

    # Ask user if they want to test with real phone number
    response = input("Do you want to test with a real phone number? (y/N): ").lower().strip()

    if response != 'y':
        print("Skipping real STK Push test")
        return True

    # Get phone number from user
    phone = input("Enter your phone number (format: 0712345678): ").strip()

    if not phone:
        print("No phone number provided, skipping test")
        return True

    try:
        print(f"Initiating STK Push to {phone} for KES 1...")
        response = initiate_stk_push(
            phone_number=phone,
            amount=1,
            account_reference="TEST-MIZIZZI",
            transaction_desc="Test payment for Mizizzi"
        )

        if response and response.get("ResponseCode") == "0":
            checkout_id = response.get("CheckoutRequestID")
            print_result("Real STK Push initiation", True, f"CheckoutRequestID: {checkout_id}")

            # Wait for user to complete or cancel payment
            input("\nPress Enter after completing or cancelling the payment on your phone...")

            # Query payment status
            print("Checking payment status...")
            status_response = query_stk_status(checkout_id)

            result_code = status_response.get("ResultCode")
            result_desc = status_response.get("ResultDesc")

            print_result("Payment status query", True, f"ResultCode: {result_code}, ResultDesc: {result_desc}")

            if result_code == 0:
                print("🎉 Payment was successful!")
            elif result_code == 1032:
                print("⚠️  Payment was cancelled by user")
            else:
                print(f"ℹ️  Payment status: {result_desc}")

            return True
        else:
            error_msg = response.get("errorMessage") if response else "No response"
            print_result("Real STK Push initiation", False, error_msg)
            return False

    except Exception as e:
        print_result("Real STK Push", False, str(e))
        return False

def test_module_info():
    """Test module information."""
    print_section("TESTING MODULE INFORMATION")

    try:
        info = get_module_info()

        required_fields = ["module", "version", "environment", "features", "status"]
        missing_fields = [field for field in required_fields if field not in info]

        if not missing_fields:
            print_result("Module info", True)
            print(json.dumps(info, indent=2))
            return True
        else:
            print_result("Module info", False, f"Missing fields: {missing_fields}")
            return False

    except Exception as e:
        print_result("Module info", False, str(e))
        return False

def run_comprehensive_test():
    """Run all tests."""
    print_section("M-PESA INTEGRATION COMPREHENSIVE TEST")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Run module self-test first
    print("\nRunning module self-test...")
    if not test_module():
        print("❌ Module self-test failed. Aborting comprehensive test.")
        return False

    print("✅ Module self-test passed")

    # Run individual tests
    tests = [
        ("Phone Number Formatting", test_phone_formatting),
        ("Amount Validation", test_amount_validation),
        ("Token Generation", test_token_generation),
        ("Simulation Functions", test_simulation),
        ("Module Information", test_module_info),
        ("Real STK Push", test_real_stk_push),
    ]

    results = {}

    for test_name, test_func in tests:
        try:
            print(f"\n🔄 Running {test_name}...")
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            results[test_name] = False

    # Print summary
    print_section("TEST SUMMARY")

    passed = sum(1 for result in results.values() if result)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")

    print(f"\nOverall Result: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! M-PESA integration is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    try:
        success = run_comprehensive_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Test failed with unexpected error: {str(e)}")
        sys.exit(1)
