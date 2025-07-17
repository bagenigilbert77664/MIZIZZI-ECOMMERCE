#!/bin/bash

echo "🧪 Testing Admin Dashboard Endpoints"
echo "=================================="

# Check if ADMIN_TOKEN is set
if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ ADMIN_TOKEN not set. Please run:"
    echo "export ADMIN_TOKEN=\"your_token_here\""
    exit 1
fi

echo "✅ Using admin token: ${ADMIN_TOKEN:0:20}..."
echo ""

# Test health endpoint first
echo "1. Testing dashboard health endpoint..."
curl -X GET \
  -H "Content-Type: application/json" \
  "http://localhost:5000/api/admin/dashboard/health" | jq .

echo ""
echo "2. Testing main dashboard endpoint..."
curl -X GET \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:5000/api/admin/dashboard" | jq .

echo ""
echo "3. Testing dashboard stats endpoint..."
curl -X GET \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:5000/api/admin/dashboard/stats" | jq .

echo ""
echo "4. Testing live stats endpoint..."
curl -X GET \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:5000/api/admin/dashboard/live-stats" | jq .

echo ""
echo "🏁 Dashboard endpoint tests completed!"
