"""
Test script for search API endpoints
"""
import requests
import json
import time

BASE_URL = "http://localhost:5000/api/search"

def test_basic_search():
    """Test basic search functionality"""
    print("🔍 Testing basic search...")

    response = requests.get(f"{BASE_URL}/", params={
        'q': 'phone',
        'page': 1,
        'per_page': 5
    })

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data['data']['pagination']['total_items']} products")
        print(f"Response time: {data['data']['meta']['response_time']}s")
        print(f"ML enabled: {data['data']['meta']['ml_enabled']}")

        # Print first product
        if data['data']['products']:
            product = data['data']['products'][0]
            print(f"First product: {product['name']}")
    else:
        print(f"❌ Error: {response.text}")
    print("-" * 50)

def test_filtered_search():
    """Test search with filters"""
    print("🔍 Testing filtered search...")

    response = requests.get(f"{BASE_URL}/", params={
        'q': 'laptop',
        'min_price': 500,
        'max_price': 2000,
        'sort_by': 'price_asc',
        'in_stock': True
    })

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Found {data['data']['pagination']['total_items']} laptops in price range")
        print(f"Filters applied: {data['data']['filters_applied']}")
    else:
        print(f"❌ Error: {response.text}")
    print("-" * 50)

def test_search_suggestions():
    """Test search suggestions"""
    print("🔍 Testing search suggestions...")

    response = requests.get(f"{BASE_URL}/suggestions", params={
        'q': 'pho',
        'limit': 5
    })

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        suggestions = data['data']['suggestions']
        print(f"✅ Found {len(suggestions)} suggestions")
        for suggestion in suggestions:
            print(f"  - {suggestion['text']} ({suggestion['type']})")
    else:
        print(f"❌ Error: {response.text}")
    print("-" * 50)

def test_trending_searches():
    """Test trending searches"""
    print("🔍 Testing trending searches...")

    response = requests.get(f"{BASE_URL}/trending", params={
        'days': 7,
        'limit': 10
    })

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        trending = data['data']['trending']
        print(f"✅ Found {len(trending)} trending searches")
        for trend in trending:
            print(f"  - '{trend['term']}' ({trend['count']} searches)")
    else:
        print(f"❌ Error: {response.text}")
    print("-" * 50)

def test_search_analytics():
    """Test search analytics"""
    print("🔍 Testing search analytics...")

    response = requests.get(f"{BASE_URL}/analytics", params={
        'days': 30
    })

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        performance = data['data']['performance']
        print(f"✅ Analytics retrieved")
        print(f"  - Avg response time: {performance['avg_response_time']}ms")
        print(f"  - Avg results count: {performance['avg_results_count']}")
        print(f"  - Zero results rate: {performance['zero_results_rate']}%")
        print(f"  - Conversion rate: {performance['conversion_rate']}%")
    else:
        print(f"❌ Error: {response.text}")
    print("-" * 50)

def test_search_sorting():
    """Test different sorting options"""
    print("🔍 Testing search sorting...")

    sort_options = ['relevance', 'price_asc', 'price_desc', 'newest', 'name']

    for sort_by in sort_options:
        response = requests.get(f"{BASE_URL}/", params={
            'q': 'phone',
            'sort_by': sort_by,
            'per_page': 3
        })

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sort by {sort_by}: {data['data']['pagination']['total_items']} results")
        else:
            print(f"❌ Sort by {sort_by} failed: {response.text}")
    print("-" * 50)

def test_empty_search():
    """Test search with no query (should return filtered results)"""
    print("🔍 Testing empty search (browse mode)...")

    response = requests.get(f"{BASE_URL}/", params={
        'page': 1,
        'per_page': 5,
        'is_featured': True
    })

    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Browse mode: {data['data']['pagination']['total_items']} featured products")
    else:
        print(f"❌ Error: {response.text}")
    print("-" * 50)

def test_search_performance():
    """Test search performance with multiple requests"""
    print("🔍 Testing search performance...")

    queries = ['phone', 'laptop', 'headphones', 'camera', 'watch']
    total_time = 0

    for query in queries:
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/", params={'q': query})
        end_time = time.time()

        request_time = end_time - start_time
        total_time += request_time

        if response.status_code == 200:
            data = response.json()
            server_time = data['data']['meta']['response_time']
            print(f"✅ Query '{query}': {request_time:.3f}s total, {server_time}s server")
        else:
            print(f"❌ Query '{query}' failed")

    avg_time = total_time / len(queries)
    print(f"Average request time: {avg_time:.3f}s")
    print("-" * 50)

def test_log_search_click():
    """Test logging search clicks"""
    print("🔍 Testing search click logging...")

    # First, perform a search to get a search query ID
    search_response = requests.get(f"{BASE_URL}/", params={'q': 'test'})

    if search_response.status_code == 200:
        # Simulate logging a click
        click_data = {
            'search_query_id': 1,  # This would be from the search response in real usage
            'product_id': 1,
            'position': 1
        }

        response = requests.post(f"{BASE_URL}/click", json=click_data)
        print(f"Click logging status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Click logged successfully")
        else:
            print(f"❌ Click logging failed: {response.text}")
    else:
        print("❌ Could not perform initial search for click test")
    print("-" * 50)

def run_all_tests():
    """Run all search API tests"""
    print("🚀 Starting Search API Tests")
    print("=" * 50)

    try:
        test_basic_search()
        test_filtered_search()
        test_search_suggestions()
        test_trending_searches()
        test_search_analytics()
        test_search_sorting()
        test_empty_search()
        test_search_performance()
        test_log_search_click()

        print("🎉 All tests completed!")

    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure your Flask server is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    run_all_tests()
