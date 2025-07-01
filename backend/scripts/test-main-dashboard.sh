#!/bin/bash

echo "🚀 Testing Fixed Main Dashboard Endpoint"
echo "================================================"

# Backend URL
BACKEND_URL="http://localhost:5000"

# Test token (you should replace this with a valid admin token)
# First get a token
echo "🔐 Getting admin token..."

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@mizizzi.com",
    "password": "Admin123!@#"
  }')

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Failed to get admin token"
  echo "Login response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got admin token: ${TOKEN:0:20}..."
echo ""

# Test main dashboard endpoint
echo "🎯 Testing Main Dashboard Endpoint"
echo "Endpoint: GET /api/admin/dashboard"
echo ""

RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$BACKEND_URL/api/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "✅ SUCCESS"
  echo ""
  echo "Response preview:"
  echo $BODY | jq -r 'keys | join(", ")' 2>/dev/null || echo "Response: $BODY"
  echo ""
  echo "Data source check:"
  echo $BODY | jq -r '.data_source // "Not specified"' 2>/dev/null
  echo ""
  echo "Counts preview:"
  echo $BODY | jq '.counts' 2>/dev/null || echo "No counts in response"
  echo ""
  echo "Sales preview:"
  echo $BODY | jq '.sales' 2>/dev/null || echo "No sales in response"
else
  echo "❌ FAILED"
  echo "Response: $BODY"
fi

echo ""
echo "🎉 Test Complete!"
