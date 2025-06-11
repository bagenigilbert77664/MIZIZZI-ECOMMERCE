"""
Quick test script to verify the server is working
"""
import requests
import time

def test_server():
    base_url = "http://localhost:5000"

    print("🔍 Testing Flask server...")

    # Test basic endpoint
    try:
        response = requests.get(f"{base_url}/api/test", timeout=5)
        if response.status_code == 200:
            print("✅ Basic test endpoint working")
        else:
            print(f"❌ Test endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        return False

    # Seed data
    try:
        print("📦 Seeding data...")
        response = requests.get(f"{base_url}/api/seed", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Data seeded: {data.get('categories', 0)} categories, {data.get('products', 0)} products")
        else:
            print(f"❌ Seeding failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Seeding error: {e}")

    # Test categories
    try:
        response = requests.get(f"{base_url}/api/categories", timeout=5)
        if response.status_code == 200:
            categories = response.json()
            print(f"✅ Categories endpoint working: {len(categories)} categories found")
        else:
            print(f"❌ Categories failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Categories error: {e}")

    # Test products
    try:
        response = requests.get(f"{base_url}/api/products", timeout=5)
        if response.status_code == 200:
            products = response.json()
            print(f"✅ Products endpoint working: {len(products)} products found")
        else:
            print(f"❌ Products failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Products error: {e}")

    # Test filtered products
    filters = [
        "featured=true",
        "new=true",
        "sale=true",
        "flash_sale=true",
        "luxury_deal=true",
        "limit=5"
    ]

    for filter_param in filters:
        try:
            response = requests.get(f"{base_url}/api/products?{filter_param}", timeout=5)
            if response.status_code == 200:
                products = response.json()
                print(f"✅ Products with {filter_param}: {len(products)} found")
            else:
                print(f"❌ Products with {filter_param} failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Products with {filter_param} error: {e}")

    print("\n🎉 Server test completed!")
    return True

if __name__ == "__main__":
    test_server()
