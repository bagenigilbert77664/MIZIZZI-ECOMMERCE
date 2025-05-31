"""
Test the M-PESA module directly without Flask routes.
"""
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.mpesa.direct_mpesa import (
        test_module,
        get_module_info,
        format_phone_number,
        initiate_stk_push,
        simulate_stk_push,
        query_stk_status
    )
    print("✅ Successfully imported M-PESA module")
except ImportError as e:
    print(f"❌ Failed to import M-PESA module: {e}")
    sys.exit(1)

def test_module_functions():
    """Test M-PESA module functions directly."""
    print("\n" + "="*60)
    print(" TESTING M-PESA MODULE FUNCTIONS")
    print("="*60)

    # Test module self-test
    print("\n🔄 Testing module self-test...")
    if test_module():
        print("✅ Module self-test passed")
    else:
        print("❌ Module self-test failed")
        return False

    # Test module info
    print("\n🔄 Testing module info...")
    try:
        info = get_module_info()
        print(f"✅ Module info: {info}")
    except Exception as e:
        print(f"❌ Module info failed: {e}")
        return False

    # Test phone formatting
    print("\n🔄 Testing phone formatting...")
    test_phones = ["0746741719", "746741719", "254746741719", "+254746741719"]
    for phone in test_phones:
        try:
            formatted = format_phone_number(phone)
            print(f"✅ {phone} -> {formatted}")
        except Exception as e:
            print(f"❌ {phone} -> Error: {e}")

    # Test simulation
    print("\n🔄 Testing STK Push simulation...")
    try:
        result = simulate_stk_push("254746741719", 1, "TEST")
        print(f"✅ Simulation result: {result}")
    except Exception as e:
        print(f"❌ Simulation failed: {e}")
        return False

    return True

def test_real_stk_push():
    """Test real STK Push (optional)."""
    print("\n" + "="*60)
    print(" TESTING REAL STK PUSH")
    print("="*60)

    response = input("Do you want to test real STK Push? (y/N): ")
    if response.lower() != 'y':
        print("Skipping real STK Push test")
        return True

    phone = input("Enter phone number (0746741719): ") or "0746741719"

    try:
        print(f"\n🔄 Initiating STK Push to {phone}...")
        result = initiate_stk_push(
            phone_number=phone,
            amount=1,
            account_reference="TEST-MODULE",
            transaction_desc="Test from module tester"
        )

        if result:
            print(f"✅ STK Push initiated successfully")
            print(f"   Checkout Request ID: {result.get('CheckoutRequestID')}")
            print(f"   Response Code: {result.get('ResponseCode')}")
            print(f"   Customer Message: {result.get('CustomerMessage')}")

            # Test status query
            checkout_id = result.get('CheckoutRequestID')
            if checkout_id:
                print(f"\n🔄 Querying status for {checkout_id}...")
                status_result = query_stk_status(checkout_id)
                print(f"✅ Status query result: {status_result}")

            return True
        else:
            print("❌ STK Push failed")
            return False

    except Exception as e:
        print(f"❌ STK Push error: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Testing M-PESA module directly...")
    print(f"Test started at: {datetime.now()}")

    # Test module functions
    if not test_module_functions():
        print("\n❌ Module function tests failed")
        sys.exit(1)

    # Test real STK Push (optional)
    test_real_stk_push()

    print("\n✅ M-PESA module tests completed!")
