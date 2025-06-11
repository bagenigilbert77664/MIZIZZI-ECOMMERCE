#!/bin/bash

# Admin API Testing Script
# Base URL for the API
BASE_URL="http://localhost:5000"
API_URL="$BASE_URL/api"

# Admin credentials
ADMIN_EMAIL="REDACTED-SENDER-EMAIL"
ADMIN_PASSWORD="junior2020"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to make curl request and check response
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    local expected_status=${5:-200}

    echo ""
    print_status "Testing: $description"
    echo "Method: $method"
    echo "Endpoint: $endpoint"

    if [ "$data" != "" ]; then
        echo "Data: $data"
    fi

    echo "Expected Status: $expected_status"
    echo "----------------------------------------"

    # Build curl command
    local curl_cmd="curl -s -w 'HTTP_STATUS:%{http_code}\n' -X $method"

    # Add authorization header if token exists
    if [ "$ADMIN_TOKEN" != "" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $ADMIN_TOKEN'"
    fi

    # Add content type and data for POST/PUT requests
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
        if [ "$data" != "" ]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi
    fi

    # Add the URL
    curl_cmd="$curl_cmd '$endpoint'"

    # Execute the curl command
    local response=$(eval $curl_cmd)
    local http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
    local response_body=$(echo "$response" | sed '/HTTP_STATUS/d')

    echo "Response Status: $http_status"
    echo "Response Body:"
    echo "$response_body" | jq . 2>/dev/null || echo "$response_body"

    # Check if status matches expected
    if [ "$http_status" = "$expected_status" ]; then
        print_success "✓ Test passed (Status: $http_status)"
    else
        print_error "✗ Test failed (Expected: $expected_status, Got: $http_status)"
    fi

    echo "========================================"

    # Return the response for further processing
    echo "$response_body"
}

# Start testing
echo "========================================"
echo "      ADMIN API ENDPOINT TESTING       "
echo "========================================"

# 1. Admin Login
print_status "Starting Admin Login Test..."
login_data="{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}"
login_response=$(test_endpoint "POST" "$API_URL/login" "$login_data" "Admin Login" "200")

# Extract token from login response
ADMIN_TOKEN=$(echo "$login_response" | jq -r '.access_token // empty' 2>/dev/null)

if [ "$ADMIN_TOKEN" = "" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    print_error "Failed to get admin token. Cannot proceed with other tests."
    exit 1
fi

print_success "Admin token obtained: ${ADMIN_TOKEN:0:20}..."

# 2. Test Admin Dashboard
test_endpoint "GET" "$API_URL/admin/dashboard" "" "Get Admin Dashboard Data"

# 3. Test User Management
test_endpoint "GET" "$API_URL/admin/users" "" "Get All Users"
test_endpoint "GET" "$API_URL/admin/users?page=1&per_page=5" "" "Get Users with Pagination"
test_endpoint "GET" "$API_URL/admin/users?role=CUSTOMER" "" "Get Users by Role"
test_endpoint "GET" "$API_URL/admin/users?search=test" "" "Search Users"

# Test user creation
new_user_data='{
    "name": "Test Admin User",
    "email": "test.admin@example.com",
    "password": "testpassword123",
    "role": "CUSTOMER",
    "phone": "+1234567890"
}'
user_response=$(test_endpoint "POST" "$API_URL/admin/users" "$new_user_data" "Create New User" "201")
NEW_USER_ID=$(echo "$user_response" | jq -r '.user.id // empty' 2>/dev/null)

if [ "$NEW_USER_ID" != "" ] && [ "$NEW_USER_ID" != "null" ]; then
    print_success "Created user with ID: $NEW_USER_ID"

    # Test user operations
    test_endpoint "GET" "$API_URL/admin/users/$NEW_USER_ID" "" "Get User Details"

    # Update user
    update_user_data='{"name": "Updated Test User", "phone": "+0987654321"}'
    test_endpoint "PUT" "$API_URL/admin/users/$NEW_USER_ID" "$update_user_data" "Update User"

    # Activate/Deactivate user
    test_endpoint "POST" "$API_URL/admin/users/$NEW_USER_ID/deactivate" "" "Deactivate User"
    test_endpoint "POST" "$API_URL/admin/users/$NEW_USER_ID/activate" "" "Activate User"
fi

# 4. Test Category Management
test_endpoint "GET" "$API_URL/admin/categories" "" "Get All Categories"
test_endpoint "GET" "$API_URL/admin/categories?page=1&per_page=5" "" "Get Categories with Pagination"

# Create new category
new_category_data='{
    "name": "Test Category",
    "description": "This is a test category",
    "slug": "test-category",
    "is_featured": true
}'
category_response=$(test_endpoint "POST" "$API_URL/admin/categories" "$new_category_data" "Create New Category" "201")
NEW_CATEGORY_ID=$(echo "$category_response" | jq -r '.category.id // empty' 2>/dev/null)

if [ "$NEW_CATEGORY_ID" != "" ] && [ "$NEW_CATEGORY_ID" != "null" ]; then
    print_success "Created category with ID: $NEW_CATEGORY_ID"

    # Test category operations
    test_endpoint "GET" "$API_URL/admin/categories/$NEW_CATEGORY_ID" "" "Get Category Details"

    # Update category
    update_category_data='{"name": "Updated Test Category", "description": "Updated description"}'
    test_endpoint "PUT" "$API_URL/admin/categories/$NEW_CATEGORY_ID" "$update_category_data" "Update Category"

    # Toggle featured status
    test_endpoint "POST" "$API_URL/admin/categories/$NEW_CATEGORY_ID/toggle-featured" "" "Toggle Category Featured"
fi

# 5. Test Product Management
test_endpoint "GET" "$API_URL/admin/products" "" "Get All Products"
test_endpoint "GET" "$API_URL/admin/products?page=1&per_page=5" "" "Get Products with Pagination"
test_endpoint "GET" "$API_URL/admin/products?search=test" "" "Search Products"

# Create new product (only if we have a category)
if [ "$NEW_CATEGORY_ID" != "" ] && [ "$NEW_CATEGORY_ID" != "null" ]; then
    new_product_data="{
        \"name\": \"Test Product\",
        \"description\": \"This is a test product\",
        \"price\": 99.99,
        \"sale_price\": 79.99,
        \"stock\": 50,
        \"category_id\": $NEW_CATEGORY_ID,
        \"sku\": \"TEST-PROD-001\",
        \"is_featured\": true,
        \"is_new\": true,
        \"is_sale\": true
    }"
    product_response=$(test_endpoint "POST" "$API_URL/admin/products" "$new_product_data" "Create New Product" "201")
    NEW_PRODUCT_ID=$(echo "$product_response" | jq -r '.product.id // empty' 2>/dev/null)

    if [ "$NEW_PRODUCT_ID" != "" ] && [ "$NEW_PRODUCT_ID" != "null" ]; then
        print_success "Created product with ID: $NEW_PRODUCT_ID"

        # Test product operations
        test_endpoint "GET" "$API_URL/admin/products/$NEW_PRODUCT_ID" "" "Get Product Details"

        # Update product
        update_product_data='{"name": "Updated Test Product", "price": 109.99}'
        test_endpoint "PUT" "$API_URL/admin/products/$NEW_PRODUCT_ID" "$update_product_data" "Update Product"

        # Update product stock
        stock_data='{"stock": 75}'
        test_endpoint "PUT" "$API_URL/admin/products/$NEW_PRODUCT_ID/stock" "$stock_data" "Update Product Stock"

        # Test product images
        test_endpoint "GET" "$API_URL/admin/products/$NEW_PRODUCT_ID/images" "" "Get Product Images"

        # Add product images
        images_data='{
            "images": [
                {"url": "https://example.com/image1.jpg", "alt_text": "Test Image 1"},
                {"url": "https://example.com/image2.jpg", "alt_text": "Test Image 2"}
            ]
        }'
        test_endpoint "POST" "$API_URL/admin/products/$NEW_PRODUCT_ID/images" "$images_data" "Add Product Images" "201"

        # Test product variants
        test_endpoint "GET" "$API_URL/admin/products/$NEW_PRODUCT_ID/variants" "" "Get Product Variants"

        # Add product variants
        variants_data='{
            "variants": [
                {
                    "name": "Small",
                    "price": 89.99,
                    "stock": 20,
                    "options": {"size": "S", "color": "Red"}
                },
                {
                    "name": "Large",
                    "price": 109.99,
                    "stock": 15,
                    "options": {"size": "L", "color": "Blue"}
                }
            ]
        }'
        test_endpoint "POST" "$API_URL/admin/products/$NEW_PRODUCT_ID/variants" "$variants_data" "Add Product Variants" "201"
    fi
fi

# 6. Test Bulk Product Update
if [ "$NEW_PRODUCT_ID" != "" ] && [ "$NEW_PRODUCT_ID" != "null" ]; then
    bulk_update_data="{
        \"product_ids\": [$NEW_PRODUCT_ID],
        \"updates\": {
            \"is_featured\": false,
            \"sale_price\": 69.99
        }
    }"
    test_endpoint "POST" "$API_URL/admin/products/bulk-update" "$bulk_update_data" "Bulk Update Products"
fi

# 7. Test Order Management
test_endpoint "GET" "$API_URL/admin/orders" "" "Get All Orders"
test_endpoint "GET" "$API_URL/admin/orders?page=1&per_page=5" "" "Get Orders with Pagination"
test_endpoint "GET" "$API_URL/admin/orders?status=PENDING" "" "Get Orders by Status"

# 8. Test Cart Items Management
test_endpoint "GET" "$API_URL/admin/cart-items" "" "Get All Cart Items"
test_endpoint "GET" "$API_URL/admin/cart-items?page=1&per_page=5" "" "Get Cart Items with Pagination"

# 9. Test Wishlist Items Management
test_endpoint "GET" "$API_URL/admin/wishlist-items" "" "Get All Wishlist Items"

# 10. Test Address Management
test_endpoint "GET" "$API_URL/admin/addresses" "" "Get All Addresses"
test_endpoint "GET" "$API_URL/admin/address-types" "" "Get Address Types"

# 11. Test Review Management
test_endpoint "GET" "$API_URL/admin/reviews" "" "Get All Reviews"
test_endpoint "GET" "$API_URL/admin/reviews?page=1&per_page=5" "" "Get Reviews with Pagination"

# 12. Test Coupon Management
test_endpoint "GET" "$API_URL/admin/coupons" "" "Get All Coupons"

# Create new coupon
new_coupon_data='{
    "code": "TESTCOUPON20",
    "description": "Test coupon for 20% off",
    "discount_value": 20.0,
    "coupon_type": "PERCENTAGE",
    "expiry_date": "2024-12-31",
    "usage_limit": 100
}'
coupon_response=$(test_endpoint "POST" "$API_URL/admin/coupons" "$new_coupon_data" "Create New Coupon" "201")
NEW_COUPON_ID=$(echo "$coupon_response" | jq -r '.coupon.id // empty' 2>/dev/null)

if [ "$NEW_COUPON_ID" != "" ] && [ "$NEW_COUPON_ID" != "null" ]; then
    print_success "Created coupon with ID: $NEW_COUPON_ID"

    # Test coupon operations
    test_endpoint "GET" "$API_URL/admin/coupons/$NEW_COUPON_ID" "" "Get Coupon Details"

    # Update coupon
    update_coupon_data='{"description": "Updated test coupon", "discount_value": 25.0}'
    test_endpoint "PUT" "$API_URL/admin/coupons/$NEW_COUPON_ID" "$update_coupon_data" "Update Coupon"

    # Activate/Deactivate coupon
    test_endpoint "POST" "$API_URL/admin/coupons/$NEW_COUPON_ID/deactivate" "" "Deactivate Coupon"
    test_endpoint "POST" "$API_URL/admin/coupons/$NEW_COUPON_ID/activate" "" "Activate Coupon"
fi

# 13. Test Newsletter Management
test_endpoint "GET" "$API_URL/admin/newsletters" "" "Get Newsletter Subscribers"

# 14. Test Image Upload
print_status "Testing Image Upload..."
# Create a test image file
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > test_image.png

upload_response=$(curl -s -w 'HTTP_STATUS:%{http_code}\n' \
    -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@test_image.png" \
    "$API_URL/admin/upload/image")

upload_http_status=$(echo "$upload_response" | grep "HTTP_STATUS" | cut -d':' -f2)
upload_response_body=$(echo "$upload_response" | sed '/HTTP_STATUS/d')

echo "Image Upload Response Status: $upload_http_status"
echo "Image Upload Response Body:"
echo "$upload_response_body" | jq . 2>/dev/null || echo "$upload_response_body"

# Clean up test image
rm -f test_image.png

if [ "$upload_http_status" = "201" ]; then
    print_success "✓ Image upload test passed"
else
    print_error "✗ Image upload test failed"
fi

# 15. Cleanup - Delete created test data (optional)
print_status "Cleaning up test data..."

if [ "$NEW_COUPON_ID" != "" ] && [ "$NEW_COUPON_ID" != "null" ]; then
    test_endpoint "DELETE" "$API_URL/admin/coupons/$NEW_COUPON_ID" "" "Delete Test Coupon"
fi

if [ "$NEW_PRODUCT_ID" != "" ] && [ "$NEW_PRODUCT_ID" != "null" ]; then
    test_endpoint "DELETE" "$API_URL/admin/products/$NEW_PRODUCT_ID" "" "Delete Test Product"
fi

if [ "$NEW_CATEGORY_ID" != "" ] && [ "$NEW_CATEGORY_ID" != "null" ]; then
    test_endpoint "DELETE" "$API_URL/admin/categories/$NEW_CATEGORY_ID" "" "Delete Test Category"
fi

if [ "$NEW_USER_ID" != "" ] && [ "$NEW_USER_ID" != "null" ]; then
    test_endpoint "DELETE" "$API_URL/admin/users/$NEW_USER_ID" "" "Delete Test User"
fi

# Final summary
echo ""
echo "========================================"
print_status "TESTING COMPLETED"
echo "========================================"
print_success "All admin endpoint tests have been executed."
print_warning "Check the output above for any failed tests."
echo "========================================"
