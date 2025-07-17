"""
Comprehensive test script for M-PESA backend routes.
Tests all M-PESA endpoints to verify they're working correctly.
"""
import requests
import json
import time
from datetime import datetime
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configuration
BASE_URL = "http://localhost:5000"
MPESA_BASE_URL = f"{BASE_URL}/api/mpesa"

# Test data
TEST_PHONE = "254746741719"  # Your phone number
TEST_AMOUNT = 1
TEST_REFERENCE = f"TEST-{int(time.time())}"

def print_separator(title):
    """Print a formatted separator."""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_result(test_name, success, details=None):
    """Print test result."""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    Details: {details}")

def test_health_check():
    """Test the health check endpoint."""
    print_separator("TESTING HEALTH CHECK")

    try:
        response = requests.get(f"{MPESA_BASE_URL}/health", timeout=10)

        if response.status_code == 200:
            data = response.json()
            print_result("Health check", True, f"Status: {data.get('status')}")
            return True
        else:
            print_result("Health check", False, f"Status code: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print_result("Health check", False, f"Error: {str(e)}")
        return False

def test_mpesa_status():
    """Test the M-PESA status endpoint."""
    print_separator("TESTING M-PESA STATUS")

    try:
        response = requests.get(f"{MPESA_BASE_URL}/status", timeout=10)

        if response.status_code == 200:
            data = response.json()
            print_result("M-PESA status", True, f"Status: {data.get('status')}")
            print(f"    Module info: {json.dumps(data.get('module_info', {}), indent=2)}")
            return True
        else:
            print_result("M-PESA status", False, f"Status code: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print_result("M-PESA status", False, f"Error: {str(e)}")
        return False

def test_test_endpoint():
    """Test the test endpoint."""
    print_separator("TESTING TEST ENDPOINT")

    try:
        # Test GET
        response = requests.get(f"{MPESA_BASE_URL}/test", timeout=10)

        if response.status_code == 200:
            data = response.json()
            print_result("Test endpoint (GET)", True, f"Message: {data.get('message')}")
        else:
            print_result("Test endpoint (GET)", False, f"Status code: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

        # Test POST
        test_data = {"test": "data", "timestamp": datetime.now().isoformat()}
        response = requests.post(f"{MPESA_BASE_URL}/test", json=test_data, timeout=10)

        if response.status_code == 200:
            data = response.json()
            print_result("Test endpoint (POST)", True, f"Message: {data.get('message')}")
            return True
        else:
            print_result("Test endpoint (POST)", False, f"Status code: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print_result("Test endpoint", False, f"Error: {str(e)}")
        return False

def test_simulate_payment():
    """Test the simulate payment endpoint."""
    print_separator("TESTING SIMULATE PAYMENT")

    try:
        payload = {
            "phone_number": TEST_PHONE,
            "amount": TEST_AMOUNT,
            "reference": f"SIM-{TEST_REFERENCE}"
        }

        response = requests.post(f"{MPESA_BASE_URL}/simulate", json=payload, timeout=15)

        if response.status_code == 200:
            data = response.json()
            print_result("Simulate payment", True, f"Reference: {data.get('reference')}")
            print(f"    Simulation: {json.dumps(data.get('simulation', {}), indent=2)}")
            return True
        else:
            print_result("Simulate payment", False, f"Status code: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print_result("Simulate payment", False, f"Error: {str(e)}")
        return False

def test_initiate_payment():
    """Test the initiate payment endpoint."""
    print_separator("TESTING INITIATE PAYMENT")

    try:
        payload = {
            "phone_number": TEST_PHONE,
            "amount": TEST_AMOUNT,
            "account_reference": TEST_REFERENCE,
            "transaction_desc": "Test payment from route tester"
        }

        print(f"Sending payload: {json.dumps(payload, indent=2)}")

        response = requests.post(f"{MPESA_BASE_URL}/initiate", json=payload, timeout=15)

        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response text: {response.text}")

        if response.status_code == 200:
            data = response.json()
            print_result("Initiate payment", True, f"Reference: {data.get('reference')}")
            print(f"    Checkout Request ID: {data.get('checkout_request_id')}")
            print(f"    Customer Message: {data.get('customer_message')}")
            return data.get('checkout_request_id')
        else:
            print_result("Initiate payment", False, f"Status code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"    Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"    Raw response: {response.text}")
            return None

    except Exception as e:
        print_result("Initiate payment", False, f"Error: {str(e)}")
        return None

def test_query_payment(checkout_request_id):
    """Test the query payment endpoint."""
    if not checkout_request_id:
        print_result("Query payment", False, "No checkout request ID provided")
        return False

    print_separator("TESTING QUERY PAYMENT")

    try:
        payload = {
            "checkout_request_id": checkout_request_id
        }

        response = requests.post(f"{MPESA_BASE_URL}/query", json=payload, timeout=15)

        if response.status_code == 200:
            data = response.json()
            print_result("Query payment", True, f"Status: {data.get('status')}")
            print(f"    Result code: {data.get('result_code')}")
            print(f"    Result desc: {data.get('result_desc')}")
            return True
        else:
            print_result("Query payment", False, f"Status code: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print_result("Query payment", False, f"Error: {str(e)}")
        return False

def test_verify_payment(checkout_request_id):
    """Test the verify payment endpoint."""
    if not checkout_request_id:
        print_result("Verify payment", False, "No checkout request ID provided")
        return False

    print_separator("TESTING VERIFY PAYMENT")

    try:
        response = requests.get(f"{MPESA_BASE_URL}/verify/{checkout_request_id}", timeout=15)

        if response.status_code == 200:
            data = response.json()
            print_result("Verify payment", True, f"Verified: {data.get('verified')}")
            print(f"    Status: {data.get('status')}")
            return True
        elif response.status_code == 404:
            print_result("Verify payment", True, "Transaction not found (expected for new transaction)")
            return True
        else:
            print_result("Verify payment", False, f"Status code: {response.status_code}")
            print(f"    Response: {response.text}")
            return False

    except Exception as e:
        print_result("Verify payment", False, f"Error: {str(e)}")
        return False

def test_all_endpoints():
    """Test all M-PESA endpoints."""
    print_separator("M-PESA BACKEND ROUTES COMPREHENSIVE TEST")
    print(f"Test started at: {datetime.now()}")
    print(f"Base URL: {MPESA_BASE_URL}")
    print(f"Test phone: {TEST_PHONE}")
    print(f"Test amount: {TEST_AMOUNT}")

    results = []

    # Test basic endpoints
    results.append(("Health Check", test_health_check()))
    results.append(("Test Endpoint", test_test_endpoint()))
    results.append(("M-PESA Status", test_mpesa_status()))
    results.append(("Simulate Payment", test_simulate_payment()))

    # Test payment flow
    checkout_request_id = test_initiate_payment()
    results.append(("Initiate Payment", checkout_request_id is not None))

    if checkout_request_id:
        # Wait a moment before querying
        time.sleep(2)
        results.append(("Query Payment", test_query_payment(checkout_request_id)))
        results.append(("Verify Payment", test_verify_payment(checkout_request_id)))

    # Print summary
    print_separator("TEST SUMMARY")
    passed = 0
    total = len(results)

    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1

    print(f"\nResults: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! M-PESA backend routes are working correctly.")
    else:
        print("⚠️  Some tests failed. Check the details above.")

    return passed == total

def check_backend_connection():
    """Check if the backend is running and accessible."""
    print_separator("CHECKING BACKEND CONNECTION")

    # Try multiple endpoints to check connectivity
    endpoints_to_try = [
        f"{BASE_URL}/api/health",
        f"{MPESA_BASE_URL}/health",
        f"{MPESA_BASE_URL}/test"
    ]

    for endpoint in endpoints_to_try:
        try:
            print(f"Trying endpoint: {endpoint}")
            response = requests.get(endpoint, timeout=5)
            if response.status_code == 200:
                print_result("Backend connection", True, f"Connected via {endpoint}")
                return True
            else:
                print(f"    Status code: {response.status_code}")
        except Exception as e:
            print(f"    Error: {str(e)}")

    print_result("Backend connection", False, "Could not connect to any endpoint")
    print("\n❌ Backend is not accessible!")
    print("Please make sure your Flask backend is running on http://localhost:5000")
    return False

if __name__ == "__main__":
    print("🔄 Starting M-PESA backend routes test...")

    # First check if backend is running
    if not check_backend_connection():
        print("\n💡 To start the backend, run:")
        print("   cd backend")
        print("   python run.py")
        sys.exit(1)

    # Run all tests
    success = test_all_endpoints()

    if success:
        print("\n✅ All M-PESA backend routes are working correctly!")
        print("The frontend should now work with M-PESA payments.")
    else:
        print("\n❌ Some M-PESA backend routes are not working.")
        print("Please check the backend logs for more details.")

    sys.exit(0 if success else 1)
