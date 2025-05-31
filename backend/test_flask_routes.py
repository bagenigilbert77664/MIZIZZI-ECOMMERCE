"""
Test script to verify that Flask routes are properly registered.
"""
import requests
import json

def test_flask_routes():
    """Test if Flask routes are accessible."""
    base_url = "http://localhost:5000"

    print("Testing Flask routes...")

    # Test basic API health
    try:
        response = requests.get(f"{base_url}/api/products")
        print(f"✅ Products API: {response.status_code}")
    except Exception as e:
        print(f"❌ Products API failed: {e}")

    # Test M-PESA ping endpoint
    try:
        response = requests.get(f"{base_url}/api/mpesa/ping")
        print(f"✅ M-PESA Ping: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ M-PESA Ping failed: {e}")

    # Test M-PESA status endpoint
    try:
        response = requests.get(f"{base_url}/api/mpesa/status")
        print(f"✅ M-PESA Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ M-PESA Status failed: {e}")

    # Test M-PESA health endpoint
    try:
        response = requests.get(f"{base_url}/api/mpesa/health")
        print(f"✅ M-PESA Health: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ M-PESA Health failed: {e}")

if __name__ == "__main__":
    test_flask_routes()
