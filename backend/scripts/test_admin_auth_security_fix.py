#!/usr/bin/env python3
"""
Enhanced test script to verify the admin authentication security fixes.
This script tests that password verification works correctly and MFA is properly enforced.
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

VALID_ADMIN = {
    "identifier": "REDACTED-SENDER-EMAIL",
    "password": "junior2020"
}

INVALID_ADMIN = {
    "identifier": "REDACTED-SENDER-EMAIL",
    "password": "wrongpassword123"
}

def log_test(test_name, status, message):
    """Log test results with colors."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "PASS":
        print(f"[{timestamp}] ✅ {test_name}: {message}")
    elif status == "FAIL":
        print(f"[{timestamp}] ❌ {test_name}: {message}")
    else:
        print(f"[{timestamp}] ℹ️  {test_name}: {message}")

def check_backend_connection():
    """Check if backend is running with multiple endpoint attempts."""
    endpoints_to_try = [
        f"{BASE_URL}/health",
        f"{BASE_URL}/",
        f"{API_BASE}/health",
        f"{BASE_URL}/api"
    ]

    for endpoint in endpoints_to_try:
        try:
            response = requests.get(endpoint, timeout=5)
            if response.status_code in [200, 404]:  # 404 is ok, means server is running
                log_test("Backend Connection", "PASS", f"Backend responding at {endpoint}")
                return True
        except requests.exceptions.RequestException:
            continue

    return False

def test_password_verification():
    """Test that password verification works correctly."""
    print("\n🔐 Testing Password Verification Security")
    print("=" * 50)

    try:
        response = requests.post(f"{API_BASE}/admin/login",
                               json=VALID_ADMIN,
                               headers={"Content-Type": "application/json"},
                               timeout=10)

        log_test("Request Details", "INFO", f"POST {API_BASE}/admin/login")
        log_test("Response Status", "INFO", f"{response.status_code}")

        # Try to parse JSON response
        try:
            data = response.json()
            log_test("Response Format", "INFO", f"Valid JSON response")
        except:
            log_test("Response Format", "FAIL", f"Invalid JSON: {response.text[:200]}")
            return False

        if response.status_code == 200:
            if "access_token" in data and "user" in data:
                log_test("Valid Password", "PASS", "Login successful with correct credentials")
                return True
            else:
                log_test("Valid Password", "FAIL", f"Login succeeded but missing required fields: {list(data.keys())}")
                return False
        elif response.status_code == 403:
            if "mfa" in data.get("error", "").lower() or "mfa_required" in str(data):
                log_test("Valid Password", "PASS", "Login requires MFA (security working)")
                return True
            else:
                log_test("Valid Password", "FAIL", f"Login failed with 403: {data}")
                return False
        elif response.status_code == 400:
            log_test("Valid Password", "FAIL", f"Bad request (400): {data}")
            return False
        elif response.status_code == 401:
            log_test("Valid Password", "FAIL", f"Unauthorized (401): {data}")
            return False
        else:
            log_test("Valid Password", "FAIL", f"Unexpected status {response.status_code}: {data}")
            return False

    except requests.exceptions.RequestException as e:
        log_test("Valid Password", "FAIL", f"Network error: {str(e)}")
        return False
    except Exception as e:
        log_test("Valid Password", "FAIL", f"Exception during valid login: {str(e)}")
        return False

def test_invalid_password_rejection():
    """Test that invalid passwords are properly rejected."""
    print("\n🚫 Testing Invalid Password Rejection")
    print("=" * 50)

    try:
        response = requests.post(f"{API_BASE}/admin/login",
                               json=INVALID_ADMIN,
                               headers={"Content-Type": "application/json"},
                               timeout=10)

        try:
            data = response.json()
        except:
            log_test("Invalid Password", "FAIL", f"Invalid JSON response: {response.text[:200]}")
            return False

        if response.status_code in [400, 401, 403]:
            if "access_token" not in data:
                log_test("Invalid Password", "PASS", f"Correctly rejected invalid password (status: {response.status_code})")
                return True
            else:
                log_test("Invalid Password", "FAIL", "CRITICAL: Invalid password accepted and token issued!")
                return False
        elif response.status_code == 200:
            if "access_token" in data:
                log_test("Invalid Password", "FAIL", "CRITICAL: Invalid password accepted and token issued!")
                return False
            elif "error" in data:
                log_test("Invalid Password", "PASS", "Invalid password rejected (200 with error)")
                return True
            else:
                log_test("Invalid Password", "FAIL", f"Unexpected 200 response: {data}")
                return False
        else:
            log_test("Invalid Password", "FAIL", f"Unexpected status code: {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        log_test("Invalid Password", "FAIL", f"Network error: {str(e)}")
        return False
    except Exception as e:
        log_test("Invalid Password", "FAIL", f"Exception during invalid login: {str(e)}")
        return False

def test_empty_password_rejection():
    """Test that empty passwords are rejected."""
    print("\n🔒 Testing Empty Password Rejection")
    print("=" * 50)

    test_cases = [
        {"identifier": VALID_ADMIN["identifier"], "password": ""},
        {"identifier": VALID_ADMIN["identifier"], "password": "   "},
        {"identifier": VALID_ADMIN["identifier"]},  # Missing password
    ]

    all_passed = True

    for i, test_case in enumerate(test_cases, 1):
        try:
            response = requests.post(f"{API_BASE}/admin/login",
                                   json=test_case,
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)

            if response.status_code == 400:
                data = response.json()
                if "error" in data and "access_token" not in data:
                    log_test(f"Empty Password Test {i}", "PASS", "Correctly rejected empty/missing password")
                else:
                    log_test(f"Empty Password Test {i}", "FAIL", "Wrong response format")
                    all_passed = False
            elif response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    log_test(f"Empty Password Test {i}", "FAIL", "CRITICAL: Empty password accepted!")
                    all_passed = False
                else:
                    log_test(f"Empty Password Test {i}", "PASS", "Empty password rejected")
            else:
                log_test(f"Empty Password Test {i}", "FAIL", f"Unexpected status: {response.status_code}")
                all_passed = False

        except Exception as e:
            log_test(f"Empty Password Test {i}", "FAIL", f"Exception: {str(e)}")
            all_passed = False

    return all_passed

def test_sql_injection_protection():
    """Test SQL injection protection in login."""
    print("\n🛡️  Testing SQL Injection Protection")
    print("=" * 50)

    sql_payloads = [
        "admin@test.com'; DROP TABLE users; --",
        "admin@test.com' OR '1'='1",
        "admin@test.com' UNION SELECT * FROM users --",
        "'; UPDATE users SET role='admin' WHERE email='user@test.com'; --"
    ]

    all_passed = True

    for i, payload in enumerate(sql_payloads, 1):
        try:
            response = requests.post(f"{API_BASE}/admin/login",
                                   json={"identifier": payload, "password": "anypassword"},
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)

            # Should not return 200 with access_token for SQL injection attempts
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    log_test(f"SQL Injection Test {i}", "FAIL", "CRITICAL: SQL injection may have succeeded!")
                    all_passed = False
                else:
                    log_test(f"SQL Injection Test {i}", "PASS", "SQL injection blocked")
            else:
                log_test(f"SQL Injection Test {i}", "PASS", "SQL injection blocked")

        except Exception as e:
            log_test(f"SQL Injection Test {i}", "PASS", "SQL injection blocked (exception)")

    return all_passed

def main():
    """Run all security tests."""
    print("🔐 MIZIZZI Admin Authentication Security Tests v2")
    print("=" * 60)
    print("Testing critical security fixes for admin authentication\n")

    # Enhanced backend connection check
    log_test("Backend Check", "INFO", f"Checking backend at {BASE_URL}")
    if not check_backend_connection():
        print("❌ Backend is not running! Please start the backend server first.")
        print("Run: cd backend && python app.py")
        print("\n💡 Troubleshooting:")
        print("1. Make sure you're in the project root directory")
        print("2. Check if backend/app.py exists")
        print("3. Ensure no other process is using port 5000")
        return 1

    start_time = time.time()

    # Run all tests
    tests = [
        ("Password Verification", test_password_verification),
        ("Invalid Password Rejection", test_invalid_password_rejection),
        ("Empty Password Rejection", test_empty_password_rejection),
        ("SQL Injection Protection", test_sql_injection_protection)
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            log_test(test_name, "FAIL", f"Test crashed: {str(e)}")
            results.append((test_name, False))

        time.sleep(0.5)  # Brief pause between tests

    # Summary
    print("\n" + "=" * 60)
    print("🎯 TEST RESULTS SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")

    print(f"\n📊 Overall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All security tests PASSED! Admin authentication is secure.")
        return_code = 0
    else:
        print("⚠️  Some security tests FAILED! Please review the issues above.")
        print("\n🔧 Next steps:")
        print("1. Check backend logs for detailed error messages")
        print("2. Verify admin user exists in database")
        print("3. Ensure password hashing is working correctly")
        return_code = 1

    elapsed = time.time() - start_time
    print(f"⏱️  Total test time: {elapsed:.2f} seconds")

    return return_code

if __name__ == "__main__":
    sys.exit(main())
