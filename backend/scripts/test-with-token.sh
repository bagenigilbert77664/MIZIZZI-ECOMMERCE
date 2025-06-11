#!/bin/bash

echo "=== Testing Admin Endpoints with Token ==="

# Your current token (you may need to update this if it expires)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0OTUzNjk0MSwianRpIjoiOGM3NGI2NzEtNjMxNy00Njg5LWFkMzYtOTk1NGM5MjBmYWJkIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjIwIiwibmJmIjoxNzQ5NTM2OTQxLCJjc3JmIjoiNWI1N2E2ZDgtNTQ1OS00YzA0LTkwZmEtYmUyOWQ0YzkzOTI0IiwiZXhwIjoxNzQ5NTQwNTQxLCJyb2xlIjoiYWRtaW4ifQ.E-c5ouzJ1eIxZztboSr4PEJk8NYRblOWKNMdFlnTDAE"

BASE_URL="http://localhost:5000/api"

echo "🔍 Testing with token: ${TOKEN:0:50}..."
echo ""

# Test 1: Health Check (no auth required)
echo "1. Testing Health Check..."
curl -s -X GET "$BASE_URL/health-check" | jq . 2>/dev/null || curl -s -X GET "$BASE_URL/health-check"
echo ""

# Test 2: Dashboard
echo "2. Testing Dashboard..."
curl -s -X GET "$BASE_URL/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || curl -s -X GET "$BASE_URL/admin/dashboard" -H "Authorization: Bearer $TOKEN"
echo ""

# Test 3: Users
echo "3. Testing Users..."
curl -s -X GET "$BASE_URL/admin/users" \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || curl -s -X GET "$BASE_URL/admin/users" -H "Authorization: Bearer $TOKEN"
echo ""

# Test 4: Products
echo "4. Testing Products..."
curl -s -X GET "$BASE_URL/admin/products" \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || curl -s -X GET "$BASE_URL/admin/products" -H "Authorization: Bearer $TOKEN"
echo ""

# Test 5: Categories
echo "5. Testing Categories..."
curl -s -X GET "$BASE_URL/admin/categories" \
  -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null || curl -s -X GET "$BASE_URL/admin/categories" -H "Authorization: Bearer $TOKEN"
echo ""

echo "=== Testing Complete ==="
