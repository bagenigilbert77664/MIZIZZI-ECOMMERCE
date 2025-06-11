#!/bin/bash

# Quick test script for essential admin endpoints
BASE_URL="http://localhost:5000/api"
ADMIN_EMAIL="REDACTED-SENDER-EMAIL"
ADMIN_PASSWORD="junior2020"

echo "=== Quick Admin API Test ==="

# 1. Login
echo "1. Testing Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    "$BASE_URL/login")

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty' 2>/dev/null)

if [ "$TOKEN" = "" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to get admin token"
    exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."

# 2. Test Dashboard
echo -e "\n2. Testing Dashboard..."
DASHBOARD_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/admin/dashboard")

echo "Dashboard Response:"
echo "$DASHBOARD_RESPONSE" | jq . 2>/dev/null || echo "$DASHBOARD_RESPONSE"

# 3. Test Users
echo -e "\n3. Testing Users Endpoint..."
USERS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/admin/users?page=1&per_page=3")

echo "Users Response:"
echo "$USERS_RESPONSE" | jq . 2>/dev/null || echo "$USERS_RESPONSE"

# 4. Test Categories
echo -e "\n4. Testing Categories Endpoint..."
CATEGORIES_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/admin/categories?page=1&per_page=3")

echo "Categories Response:"
echo "$CATEGORIES_RESPONSE" | jq . 2>/dev/null || echo "$CATEGORIES_RESPONSE"

# 5. Test Products
echo -e "\n5. Testing Products Endpoint..."
PRODUCTS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL/admin/products?page=1&per_page=3")

echo "Products Response:"
echo "$PRODUCTS_RESPONSE" | jq . 2>/dev/null || echo "$PRODUCTS_RESPONSE"

echo -e "\n=== Quick Test Completed ==="
