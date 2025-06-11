#!/bin/bash

echo "=== Testing Mizizzi Backend ==="

# Test if server is running
echo "Testing if server is running..."
curl -s http://localhost:5000/api/test > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start it first."
    exit 1
fi

# Test endpoints
echo -e "\n🔍 Testing endpoints..."

echo -e "\n1. Testing /api/test"
curl -s http://localhost:5000/api/test | jq '.'

echo -e "\n2. Testing /api/categories"
curl -s http://localhost:5000/api/categories | jq '.'

echo -e "\n3. Testing /api/products"
curl -s http://localhost:5000/api/products | jq '.'

echo -e "\n4. Testing /api/products?featured=true"
curl -s "http://localhost:5000/api/products?featured=true" | jq '.'

echo -e "\n5. Testing /api/products?new=true"
curl -s "http://localhost:5000/api/products?new=true" | jq '.'

echo -e "\n6. Testing /api/products?sale=true"
curl -s "http://localhost:5000/api/products?sale=true" | jq '.'

echo -e "\n7. Testing /api/products?flash_sale=true"
curl -s "http://localhost:5000/api/products?flash_sale=true" | jq '.'

echo -e "\n8. Testing /api/products?luxury_deal=true"
curl -s "http://localhost:5000/api/products?luxury_deal=true" | jq '.'

echo -e "\n✅ All tests completed!"
