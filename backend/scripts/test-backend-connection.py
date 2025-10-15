#!/usr/bin/env python3
"""
Test script to check backend server connection and orders API endpoint.
This script will help diagnose why the orders API is returning 500 errors.
"""

import requests
import json
import sys
import os
from datetime import datetime

# Backend configuration
BACKEND_URL = "http://localhost:5000"
API_ENDPOINTS = {
    "health": "/api/health",
    "orders": "/api/orders",
    "auth": "/api/auth/login"
}

def test_backend_connection():
    """Test if the backend server is running and responding."""
    print("🔍 Testing Backend Server Connection")
    print("=" * 50)

    try:
        # Test basic connection
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
        print(f"✅ Backend server is running at {BACKEND_URL}")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"   Response: {json.dumps(data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
        return True
    except requests.exceptions.ConnectionError:
        print(f"❌ Backend server is NOT running at {BACKEND_URL}")
        print("   Please start the backend server first:")
        print("   cd backend && python app.py")
        return False
    except requests.exceptions.Timeout:
        print(f"⚠️  Backend server at {BACKEND_URL} is not responding (timeout)")
        return False
    except Exception as e:
        print(f"❌ Error connecting to backend: {str(e)}")
        return False

def test_orders_endpoint_without_auth():
    """Test the orders endpoint without authentication to see the error."""
    print("\n🔍 Testing Orders Endpoint (No Auth)")
    print("=" * 50)

    try:
        response = requests.get(f"{BACKEND_URL}/api/orders", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 401:
            print("✅ Expected 401 Unauthorized (authentication required)")
        elif response.status_code == 500:
            print("❌ 500 Internal Server Error - Backend has issues")
            try:
                error_data = response.json()
                print(f"Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Text: {response.text}")
        else:
            print(f"Unexpected status code: {response.status_code}")
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
            except:
                print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing orders endpoint: {str(e)}")

def test_with_mock_auth():
    """Test orders endpoint with mock authentication headers."""
    print("\n🔍 Testing Orders Endpoint (Mock Auth)")
    print("=" * 50)

    # Create mock JWT token (this won't work but will show different error)
    mock_token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoidXNlciIsImV4cCI6OTk5OTk5OTk5OX0.mock"

    headers = {
        "Authorization": mock_token,
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(f"{BACKEND_URL}/api/orders", headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 401:
            print("✅ 401 Unauthorized - Token validation working")
        elif response.status_code == 500:
            print("❌ 500 Internal Server Error - Backend database/processing issue")
            try:
                error_data = response.json()
                print(f"Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Text: {response.text}")
        else:
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
            except:
                print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing with mock auth: {str(e)}")

def check_database_connection():
    """Check if backend can connect to database."""
    print("\n🔍 Testing Database Connection")
    print("=" * 50)

    # Try to hit an endpoint that requires database access
    try:
        response = requests.get(f"{BACKEND_URL}/api/products", timeout=10)
        print(f"Products endpoint status: {response.status_code}")

        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict) and 'products' in data:
                    print(f"✅ Database connection working - found {len(data.get('products', []))} products")
                elif isinstance(data, list):
                    print(f"✅ Database connection working - found {len(data)} products")
                else:
                    print("✅ Database connection working - got response")
            except:
                print("✅ Database connection working - got response")
        elif response.status_code == 500:
            print("❌ Database connection issues - 500 error on products endpoint")
            try:
                error_data = response.json()
                print(f"Error Details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error Text: {response.text}")
        else:
            print(f"Products endpoint returned: {response.status_code}")

    except Exception as e:
        print(f"❌ Error testing database connection: {str(e)}")

def main():
    """Main test function."""
    print("🚀 Backend Connection Test")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Testing backend at: {BACKEND_URL}")
    print()

    # Test 1: Basic connection
    if not test_backend_connection():
        print("\n❌ Backend server is not running. Please start it first.")
        print("To start the backend server:")
        print("1. cd backend")
        print("2. python app.py")
        sys.exit(1)

    # Test 2: Database connection
    check_database_connection()

    # Test 3: Orders endpoint without auth
    test_orders_endpoint_without_auth()

    # Test 4: Orders endpoint with mock auth
    test_with_mock_auth()

    print("\n" + "=" * 50)
    print("🎯 DIAGNOSIS SUMMARY")
    print("=" * 50)
    print("If you see 500 errors above, the backend server is running but has issues.")
    print("Common causes:")
    print("1. Database not connected or configured")
    print("2. Missing environment variables")
    print("3. Database tables not created")
    print("4. Python dependencies not installed")
    print()
    print("Next steps:")
    print("1. Check backend server logs for detailed error messages")
    print("2. Ensure database is running and accessible")
    print("3. Run database migrations if needed")
    print("4. Check backend/app.py configuration")

if __name__ == "__main__":
    main()
