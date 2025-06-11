"""
Test script to verify all endpoints are working
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_endpoint(endpoint, method="GET", data=None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n🔍 Testing {method} {endpoint}")

    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)

        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            try:
                json_data = response.json()
                print(f"   ✅ Success: {json.dumps(json_data, indent=2)[:200]}...")
                return True
            except:
                print(f"   ✅ Success: {response.text[:200]}...")
                return True
        else:
            print(f"   ❌ Failed: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Connection Error: {e}")
        return False

def main():
    """Test all endpoints"""
    print("=== Testing Minimal Flask Server ===")

    # Test basic endpoints
    endpoints = [
        "/api/test",
        "/api/seed",  # Seed data first
        "/api/categories",
        "/api/products",
        "/api/products?featured=true",
        "/api/products?new=true",
        "/api/products?sale=true",
        "/api/products?flash_sale=true",
        "/api/products?luxury_deal=true",
        "/api/products?limit=5"
    ]

    success_count = 0
    total_count = len(endpoints)

    for endpoint in endpoints:
        if test_endpoint(endpoint):
            success_count += 1

    print(f"\n=== Results ===")
    print(f"✅ Successful: {success_count}/{total_count}")
    print(f"❌ Failed: {total_count - success_count}/{total_count}")

    if success_count == total_count:
        print("\n🎉 All tests passed! Minimal server is working correctly.")
        print("\nNow let's fix your main server...")
    else:
        print(f"\n⚠️  Some tests failed. Check the server logs.")

if __name__ == "__main__":
    main()
