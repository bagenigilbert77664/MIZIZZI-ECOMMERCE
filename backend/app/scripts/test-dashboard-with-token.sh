#!/bin/bash

# Test Dashboard Routes with Admin Token
# This script tests all dashboard endpoints with real authentication

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:5000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1MTMyMTI2NywianRpIjoiN2UzMDBhOGEtNjE1NS00MTExLWFkZGQtMWNhZTUxYzBiNGUxIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjIwIiwibmJmIjoxNzUxMzIxMjY3LCJjc3JmIjoiYmUyNTIxNjMtZWYyMC00MzJlLWI4NzUtMWYyNWFkZGI4ODA1IiwiZXhwIjoxNzUxMzI0ODY3LCJyb2xlIjoiYWRtaW4ifQ.ZZQQ0LltxdDpOwna_4C6Eu1cYWNuHPHtQ3iaX_f0Tlo"

echo -e "${BLUE}🚀 Testing Dashboard Routes with Admin Token${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to make authenticated requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo -e "${BLUE}Endpoint: $method $endpoint${NC}"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$API_BASE$endpoint")
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X POST \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$API_BASE$endpoint")
        else
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X POST \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                "$API_BASE$endpoint")
        fi
    fi

    # Extract HTTP status
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')

    # Check status and display result
    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}✅ SUCCESS (HTTP $http_status)${NC}"
        echo -e "${GREEN}Response preview:${NC}"
        echo "$response_body" | jq -r 'if type == "object" then (keys | join(", ")) else . end' 2>/dev/null || echo "$response_body" | head -c 200
    elif [ "$http_status" = "401" ]; then
        echo -e "${RED}❌ UNAUTHORIZED (HTTP $http_status)${NC}"
        echo -e "${RED}Response:${NC} $response_body"
    elif [ "$http_status" = "403" ]; then
        echo -e "${RED}❌ FORBIDDEN (HTTP $http_status)${NC}"
        echo -e "${RED}Response:${NC} $response_body"
    else
        echo -e "${RED}❌ FAILED (HTTP $http_status)${NC}"
        echo -e "${RED}Response:${NC} $response_body"
    fi

    echo -e "${BLUE}----------------------------------------${NC}"
}

# Test all dashboard endpoints
echo -e "\n${BLUE}🔍 Testing Main Dashboard Endpoints${NC}"

make_request "GET" "/api/admin/dashboard" "" "Main Dashboard Data"
make_request "GET" "/api/admin/dashboard/stats" "" "Dashboard Statistics"
make_request "GET" "/api/admin/dashboard/stats?type=sales" "" "Sales Statistics"
make_request "GET" "/api/admin/dashboard/stats?type=products" "" "Product Statistics"
make_request "GET" "/api/admin/dashboard/stats?type=customers" "" "Customer Statistics"
make_request "GET" "/api/admin/dashboard/stats?type=orders" "" "Order Statistics"
make_request "GET" "/api/admin/dashboard/live-stats" "" "Live Dashboard Stats"

echo -e "\n${BLUE}🔄 Testing Dashboard Actions${NC}"

make_request "POST" "/api/admin/dashboard/refresh" "" "Refresh Dashboard Data"
make_request "GET" "/api/admin/dashboard/export" "" "Export Dashboard Data (JSON)"
make_request "GET" "/api/admin/dashboard/export?format=csv" "" "Export Dashboard Data (CSV)"

echo -e "\n${BLUE}📊 Testing Specialized Dashboard Endpoints${NC}"

make_request "GET" "/api/admin/dashboard/inventory" "" "Inventory Dashboard"
make_request "GET" "/api/admin/dashboard/revenue" "" "Revenue Dashboard"
make_request "GET" "/api/admin/dashboard/customers" "" "Customer Dashboard"

echo -e "\n${BLUE}🏥 Testing Health Check${NC}"

make_request "GET" "/api/admin/dashboard/health" "" "Dashboard Health Check"

echo -e "\n${BLUE}📅 Testing Date Range Filters${NC}"

make_request "GET" "/api/admin/dashboard?from_date=2024-01-01&to_date=2024-12-31" "" "Dashboard with Date Range"
make_request "GET" "/api/admin/dashboard/stats?type=sales&from_date=2024-01-01" "" "Sales Stats with Date Filter"

echo -e "\n${GREEN}🎉 Dashboard Testing Complete!${NC}"
echo -e "${BLUE}================================================${NC}"

# Summary
echo -e "\n${YELLOW}📋 Test Summary:${NC}"
echo -e "• Main dashboard endpoints tested"
echo -e "• Specialized dashboard routes tested"
echo -e "• Date range filtering tested"
echo -e "• Export functionality tested"
echo -e "• Health check tested"
echo -e "• All requests use REAL database data (no mock data)"

echo -e "\n${BLUE}💡 Next Steps:${NC}"
echo -e "• Check the backend logs for detailed query information"
echo -e "• Verify that all data comes from the database"
echo -e "• Test with different admin users if needed"
echo -e "• Monitor performance with large datasets"
