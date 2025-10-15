#!/bin/bash

# Base URL
API_URL="http://localhost:5000/api"
COOKIES_FILE="cookies.txt"
ADMIN_COOKIES_FILE="admin_cookies.txt"
TEST_EMAIL="testuser$(date +%s)@example.com"
ADMIN_EMAIL="admin@example.com"
TEST_PASSWORD="Password123!"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ $2${NC}"
  else
    echo -e "${RED}✗ $2 (Status: $1)${NC}"
  fi
}

# Function to print section headers
print_section() {
  echo -e "\n${MAGENTA}======================================${NC}"
  echo -e "${MAGENTA}   $1${NC}"
  echo -e "${MAGENTA}======================================${NC}"
}

# Function to extract JSON value - fixed to handle JSON properly
extract_json_value() {
  echo "$1" | grep -o "\"$2\":[^,}]*" | cut -d':' -f2- | sed 's/^[ \t]*//;s/^"//;s/"$//'
}

# Clean up any existing cookie files
rm -f $COOKIES_FILE $ADMIN_COOKIES_FILE

echo -e "${YELLOW}Starting Comprehensive API Tests${NC}"
echo -e "${BLUE}$(date)${NC}"

# ================================
# AUTH ROUTES
# ================================
print_section "AUTH ROUTES"

# 1. Register a new user
echo -e "\n${YELLOW}Testing: Register new user${NC}"
REGISTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -c $COOKIES_FILE \
  -d '{
    "name": "Test User",
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

REGISTER_STATUS="${REGISTER_RESPONSE: -3}"
REGISTER_BODY="${REGISTER_RESPONSE:0:${#REGISTER_RESPONSE}-3}"

if [ "$REGISTER_STATUS" -eq 201 ]; then
  print_status 0 "Register new user"
  USER_ID=$(extract_json_value "$REGISTER_BODY" "id")
  echo "User ID: $USER_ID"
  CSRF_TOKEN=$(extract_json_value "$REGISTER_BODY" "csrf_token")
  echo "CSRF Token: $CSRF_TOKEN"
else
  print_status "$REGISTER_STATUS" "Register new user"
  echo "Response: $REGISTER_BODY"
fi

# 2. Register admin user (if not exists)
echo -e "\n${YELLOW}Testing: Register admin user (if not exists)${NC}"
ADMIN_REGISTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -c $ADMIN_COOKIES_FILE \
  -d '{
    "name": "Admin User",
    "email": "'$ADMIN_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

ADMIN_REGISTER_STATUS="${ADMIN_REGISTER_RESPONSE: -3}"
ADMIN_REGISTER_BODY="${ADMIN_REGISTER_RESPONSE:0:${#ADMIN_REGISTER_RESPONSE}-3}"

if [ "$ADMIN_REGISTER_STATUS" -eq 201 ] || [ "$ADMIN_REGISTER_STATUS" -eq 409 ]; then
  print_status 0 "Register/check admin user"
  if [ "$ADMIN_REGISTER_STATUS" -eq 201 ]; then
    ADMIN_CSRF_TOKEN=$(extract_json_value "$ADMIN_REGISTER_BODY" "csrf_token")
    echo "Admin CSRF Token: $ADMIN_CSRF_TOKEN"
  fi
else
  print_status "$ADMIN_REGISTER_STATUS" "Register admin user"
  echo "Response: $ADMIN_REGISTER_BODY"
fi

# 3. Login as admin
echo -e "\n${YELLOW}Testing: Login as admin${NC}"
ADMIN_LOGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -c $ADMIN_COOKIES_FILE \
  -d '{
    "email": "'$ADMIN_EMAIL'",
    "password": "'$TEST_PASSWORD'"
  }')

ADMIN_LOGIN_STATUS="${ADMIN_LOGIN_RESPONSE: -3}"
ADMIN_LOGIN_BODY="${ADMIN_LOGIN_RESPONSE:0:${#ADMIN_LOGIN_RESPONSE}-3}"

if [ "$ADMIN_LOGIN_STATUS" -eq 200 ]; then
  print_status 0 "Login as admin"
  ADMIN_CSRF_TOKEN=$(extract_json_value "$ADMIN_LOGIN_BODY" "csrf_token")
  echo "Admin CSRF Token: $ADMIN_CSRF_TOKEN"
else
  print_status "$ADMIN_LOGIN_STATUS" "Login as admin"
  echo "Response: $ADMIN_LOGIN_BODY"
fi

# 4. Get current user
echo -e "\n${YELLOW}Testing: Get current user profile${NC}"
ME_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/auth/me" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE)

ME_STATUS="${ME_RESPONSE: -3}"
ME_BODY="${ME_RESPONSE:0:${#ME_RESPONSE}-3}"

if [ "$ME_STATUS" -eq 200 ]; then
  print_status 0 "Get current user profile"
  USER_EMAIL=$(extract_json_value "$ME_BODY" "email")
  echo "User Email: $USER_EMAIL"
else
  print_status "$ME_STATUS" "Get current user profile"
  echo "Response: $ME_BODY"
fi

# 5. Update user profile
echo -e "\n${YELLOW}Testing: Update user profile${NC}"
UPDATE_PROFILE_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/auth/me" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE \
  -d '{
    "name": "Updated Test User",
    "phone": "1234567890"
  }')

UPDATE_PROFILE_STATUS="${UPDATE_PROFILE_RESPONSE: -3}"
UPDATE_PROFILE_BODY="${UPDATE_PROFILE_RESPONSE:0:${#UPDATE_PROFILE_RESPONSE}-3}"

if [ "$UPDATE_PROFILE_STATUS" -eq 200 ]; then
  print_status 0 "Update user profile"
else
  print_status "$UPDATE_PROFILE_STATUS" "Update user profile"
  echo "Response: $UPDATE_PROFILE_BODY"
fi

# ================================
# CATEGORY ROUTES
# ================================
print_section "CATEGORY ROUTES"

# 6. Create category (admin only)
echo -e "\n${YELLOW}Testing: Create category (admin only)${NC}"
CREATE_CATEGORY_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/categories" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE \
  -d '{
    "name": "Test Category",
    "slug": "test-category-'$(date +%s)'",
    "description": "This is a test category",
    "is_featured": true
  }')

CREATE_CATEGORY_STATUS="${CREATE_CATEGORY_RESPONSE: -3}"
CREATE_CATEGORY_BODY="${CREATE_CATEGORY_RESPONSE:0:${#CREATE_CATEGORY_RESPONSE}-3}"

if [ "$CREATE_CATEGORY_STATUS" -eq 201 ]; then
  print_status 0 "Create category (admin only)"
  CATEGORY_ID=$(extract_json_value "$CREATE_CATEGORY_BODY" "id")
  echo "Category ID: $CATEGORY_ID"
else
  print_status "$CREATE_CATEGORY_STATUS" "Create category (admin only)"
  echo "Response: $CREATE_CATEGORY_BODY"
fi

# 7. Get categories
echo -e "\n${YELLOW}Testing: Get categories${NC}"
GET_CATEGORIES_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/categories" \
  -H "Content-Type: application/json")

GET_CATEGORIES_STATUS="${GET_CATEGORIES_RESPONSE: -3}"
GET_CATEGORIES_BODY="${GET_CATEGORIES_RESPONSE:0:${#GET_CATEGORIES_RESPONSE}-3}"

if [ "$GET_CATEGORIES_STATUS" -eq 200 ]; then
  print_status 0 "Get categories"
else
  print_status "$GET_CATEGORIES_STATUS" "Get categories"
  echo "Response: $GET_CATEGORIES_BODY"
fi

# 8. Get category by ID
if [ ! -z "$CATEGORY_ID" ]; then
  echo -e "\n${YELLOW}Testing: Get category by ID${NC}"
  GET_CATEGORY_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/categories/$CATEGORY_ID" \
    -H "Content-Type: application/json")

  GET_CATEGORY_STATUS="${GET_CATEGORY_RESPONSE: -3}"
  GET_CATEGORY_BODY="${GET_CATEGORY_RESPONSE:0:${#GET_CATEGORY_RESPONSE}-3}"

  if [ "$GET_CATEGORY_STATUS" -eq 200 ]; then
    print_status 0 "Get category by ID"
  else
    print_status "$GET_CATEGORY_STATUS" "Get category by ID"
    echo "Response: $GET_CATEGORY_BODY"
  fi
fi

# 9. Update category (admin only)
if [ ! -z "$CATEGORY_ID" ]; then
  echo -e "\n${YELLOW}Testing: Update category (admin only)${NC}"
  UPDATE_CATEGORY_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/categories/$CATEGORY_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
    -b $ADMIN_COOKIES_FILE \
    -d '{
      "name": "Updated Test Category",
      "description": "This is an updated test category"
    }')

  UPDATE_CATEGORY_STATUS="${UPDATE_CATEGORY_RESPONSE: -3}"
  UPDATE_CATEGORY_BODY="${UPDATE_CATEGORY_RESPONSE:0:${#UPDATE_CATEGORY_RESPONSE}-3}"

  if [ "$UPDATE_CATEGORY_STATUS" -eq 200 ]; then
    print_status 0 "Update category (admin only)"
  else
    print_status "$UPDATE_CATEGORY_STATUS" "Update category (admin only)"
    echo "Response: $UPDATE_CATEGORY_BODY"
  fi
fi

# ================================
# BRAND ROUTES
# ================================
print_section "BRAND ROUTES"

# 10. Create brand (admin only)
echo -e "\n${YELLOW}Testing: Create brand (admin only)${NC}"
CREATE_BRAND_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/brands" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE \
  -d '{
    "name": "Test Brand",
    "slug": "test-brand-'$(date +%s)'",
    "description": "This is a test brand",
    "website": "https://example.com",
    "is_featured": true
  }')

CREATE_BRAND_STATUS="${CREATE_BRAND_RESPONSE: -3}"
CREATE_BRAND_BODY="${CREATE_BRAND_RESPONSE:0:${#CREATE_BRAND_RESPONSE}-3}"

if [ "$CREATE_BRAND_STATUS" -eq 201 ]; then
  print_status 0 "Create brand (admin only)"
  BRAND_ID=$(extract_json_value "$CREATE_BRAND_BODY" "id")
  echo "Brand ID: $BRAND_ID"
else
  print_status "$CREATE_BRAND_STATUS" "Create brand (admin only)"
  echo "Response: $CREATE_BRAND_BODY"
fi

# 11. Get brands
echo -e "\n${YELLOW}Testing: Get brands${NC}"
GET_BRANDS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/brands" \
  -H "Content-Type: application/json")

GET_BRANDS_STATUS="${GET_BRANDS_RESPONSE: -3}"
GET_BRANDS_BODY="${GET_BRANDS_RESPONSE:0:${#GET_BRANDS_RESPONSE}-3}"

if [ "$GET_BRANDS_STATUS" -eq 200 ]; then
  print_status 0 "Get brands"
else
  print_status "$GET_BRANDS_STATUS" "Get brands"
  echo "Response: $GET_BRANDS_BODY"
fi

# 12. Get brand by ID
if [ ! -z "$BRAND_ID" ]; then
  echo -e "\n${YELLOW}Testing: Get brand by ID${NC}"
  GET_BRAND_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/brands/$BRAND_ID" \
    -H "Content-Type: application/json")

  GET_BRAND_STATUS="${GET_BRAND_RESPONSE: -3}"
  GET_BRAND_BODY="${GET_BRAND_RESPONSE:0:${#GET_BRAND_RESPONSE}-3}"

  if [ "$GET_BRAND_STATUS" -eq 200 ]; then
    print_status 0 "Get brand by ID"
  else
    print_status "$GET_BRAND_STATUS" "Get brand by ID"
    echo "Response: $GET_BRAND_BODY"
  fi
fi

# 13. Update brand (admin only)
if [ ! -z "$BRAND_ID" ]; then
  echo -e "\n${YELLOW}Testing: Update brand (admin only)${NC}"
  UPDATE_BRAND_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/brands/$BRAND_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
    -b $ADMIN_COOKIES_FILE \
    -d '{
      "name": "Updated Test Brand",
      "description": "This is an updated test brand"
    }')

  UPDATE_BRAND_STATUS="${UPDATE_BRAND_RESPONSE: -3}"
  UPDATE_BRAND_BODY="${UPDATE_BRAND_RESPONSE:0:${#UPDATE_BRAND_RESPONSE}-3}"

  if [ "$UPDATE_BRAND_STATUS" -eq 200 ]; then
    print_status 0 "Update brand (admin only)"
  else
    print_status "$UPDATE_BRAND_STATUS" "Update brand (admin only)"
    echo "Response: $UPDATE_BRAND_BODY"
  fi
fi

# ================================
# PRODUCT ROUTES
# ================================
print_section "PRODUCT ROUTES"

# 14. Create product (admin only)
if [ ! -z "$CATEGORY_ID" ] && [ ! -z "$BRAND_ID" ]; then
  echo -e "\n${YELLOW}Testing: Create product (admin only)${NC}"
  CREATE_PRODUCT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/products" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
    -b $ADMIN_COOKIES_FILE \
    -d '{
      "name": "Test Product",
      "slug": "test-product-'$(date +%s)'",
      "description": "This is a test product",
      "price": 99.99,
      "sale_price": 79.99,
      "stock": 100,
      "category_id": '$CATEGORY_ID',
      "brand_id": '$BRAND_ID',
      "image_urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
      "thumbnail_url": "https://example.com/thumbnail.jpg",
      "is_featured": true,
      "is_new": true,
      "is_sale": true
    }')

  CREATE_PRODUCT_STATUS="${CREATE_PRODUCT_RESPONSE: -3}"
  CREATE_PRODUCT_BODY="${CREATE_PRODUCT_RESPONSE:0:${#CREATE_PRODUCT_RESPONSE}-3}"

  if [ "$CREATE_PRODUCT_STATUS" -eq 201 ]; then
    print_status 0 "Create product (admin only)"
    PRODUCT_ID=$(extract_json_value "$CREATE_PRODUCT_BODY" "id")
    echo "Product ID: $PRODUCT_ID"
  else
    print_status "$CREATE_PRODUCT_STATUS" "Create product (admin only)"
    echo "Response: $CREATE_PRODUCT_BODY"
  fi
fi

# 15. Get products
echo -e "\n${YELLOW}Testing: Get products${NC}"
GET_PRODUCTS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/products?page=1&per_page=10" \
  -H "Content-Type: application/json")

GET_PRODUCTS_STATUS="${GET_PRODUCTS_RESPONSE: -3}"
GET_PRODUCTS_BODY="${GET_PRODUCTS_RESPONSE:0:${#GET_PRODUCTS_RESPONSE}-3}"

if [ "$GET_PRODUCTS_STATUS" -eq 200 ]; then
  print_status 0 "Get products"
  # If we don't have a product ID yet, try to get one from the response
  if [ -z "$PRODUCT_ID" ]; then
    PRODUCT_ID=$(echo "$GET_PRODUCTS_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "Using product ID: $PRODUCT_ID for testing"
  fi
else
  print_status "$GET_PRODUCTS_STATUS" "Get products"
  echo "Response: $GET_PRODUCTS_BODY"
fi

# 16. Get product by ID
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Get product by ID${NC}"
  GET_PRODUCT_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/products/$PRODUCT_ID" \
    -H "Content-Type: application/json")

  GET_PRODUCT_STATUS="${GET_PRODUCT_RESPONSE: -3}"
  GET_PRODUCT_BODY="${GET_PRODUCT_RESPONSE:0:${#GET_PRODUCT_RESPONSE}-3}"

  if [ "$GET_PRODUCT_STATUS" -eq 200 ]; then
    print_status 0 "Get product by ID"
  else
    print_status "$GET_PRODUCT_STATUS" "Get product by ID"
    echo "Response: $GET_PRODUCT_BODY"
  fi
fi

# 17. Update product (admin only)
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Update product (admin only)${NC}"
  UPDATE_PRODUCT_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/products/$PRODUCT_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
    -b $ADMIN_COOKIES_FILE \
    -d '{
      "name": "Updated Test Product",
      "description": "This is an updated test product",
      "price": 89.99
    }')

  UPDATE_PRODUCT_STATUS="${UPDATE_PRODUCT_RESPONSE: -3}"
  UPDATE_PRODUCT_BODY="${UPDATE_PRODUCT_RESPONSE:0:${#UPDATE_PRODUCT_RESPONSE}-3}"

  if [ "$UPDATE_PRODUCT_STATUS" -eq 200 ]; then
    print_status 0 "Update product (admin only)"
  else
    print_status "$UPDATE_PRODUCT_STATUS" "Update product (admin only)"
    echo "Response: $UPDATE_PRODUCT_BODY"
  fi
fi

# ================================
# PRODUCT VARIANT ROUTES
# ================================
print_section "PRODUCT VARIANT ROUTES"

# 18. Create product variant (admin only)
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Create product variant (admin only)${NC}"
  CREATE_VARIANT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/products/$PRODUCT_ID/variants" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
    -b $ADMIN_COOKIES_FILE \
    -d '{
      "sku": "TEST-SKU-'$(date +%s)'",
      "color": "Red",
      "size": "M",
      "stock": 50,
      "price": 89.99,
      "image_urls": ["https://example.com/red-m.jpg"]
    }')

  CREATE_VARIANT_STATUS="${CREATE_VARIANT_RESPONSE: -3}"
  CREATE_VARIANT_BODY="${CREATE_VARIANT_RESPONSE:0:${#CREATE_VARIANT_RESPONSE}-3}"

  if [ "$CREATE_VARIANT_STATUS" -eq 201 ]; then
    print_status 0 "Create product variant (admin only)"
    VARIANT_ID=$(extract_json_value "$CREATE_VARIANT_BODY" "id")
    echo "Variant ID: $VARIANT_ID"
  else
    print_status "$CREATE_VARIANT_STATUS" "Create product variant (admin only)"
    echo "Response: $CREATE_VARIANT_BODY"
  fi
fi

# 19. Get product variants
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Get product variants${NC}"
  GET_VARIANTS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/products/$PRODUCT_ID/variants" \
    -H "Content-Type: application/json")

  GET_VARIANTS_STATUS="${GET_VARIANTS_RESPONSE: -3}"
  GET_VARIANTS_BODY="${GET_VARIANTS_RESPONSE:0:${#GET_VARIANTS_RESPONSE}-3}"

  if [ "$GET_VARIANTS_STATUS" -eq 200 ]; then
    print_status 0 "Get product variants"
    # If we don't have a variant ID yet, try to get one from the response
    if [ -z "$VARIANT_ID" ]; then
      VARIANT_ID=$(echo "$GET_VARIANTS_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
      echo "Using variant ID: $VARIANT_ID for testing"
    fi
  else
    print_status "$GET_VARIANTS_STATUS" "Get product variants"
    echo "Response: $GET_VARIANTS_BODY"
  fi
fi

# 20. Update product variant (admin only)
if [ ! -z "$VARIANT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Update product variant (admin only)${NC}"
  UPDATE_VARIANT_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/variants/$VARIANT_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
    -b $ADMIN_COOKIES_FILE \
    -d '{
      "color": "Blue",
      "size": "L",
      "stock": 75
    }')

  UPDATE_VARIANT_STATUS="${UPDATE_VARIANT_RESPONSE: -3}"
  UPDATE_VARIANT_BODY="${UPDATE_VARIANT_RESPONSE:0:${#UPDATE_VARIANT_RESPONSE}-3}"

  if [ "$UPDATE_VARIANT_STATUS" -eq 200 ]; then
    print_status 0 "Update product variant (admin only)"
  else
    print_status "$UPDATE_VARIANT_STATUS" "Update product variant (admin only)"
    echo "Response: $UPDATE_VARIANT_BODY"
  fi
fi

# ================================
# CART ROUTES
# ================================
print_section "CART ROUTES"

# 21. Add to cart
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Add item to cart${NC}"
  ADD_CART_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/cart" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "product_id": '$PRODUCT_ID',
      "quantity": 2
    }')

  ADD_CART_STATUS="${ADD_CART_RESPONSE: -3}"
  ADD_CART_BODY="${ADD_CART_RESPONSE:0:${#ADD_CART_RESPONSE}-3}"

  if [ "$ADD_CART_STATUS" -eq 201 ] || [ "$ADD_CART_STATUS" -eq 200 ]; then
    print_status 0 "Add item to cart"
    CART_ITEM_ID=$(extract_json_value "$ADD_CART_BODY" "id")
    echo "Cart Item ID: $CART_ITEM_ID"
  else
    print_status "$ADD_CART_STATUS" "Add item to cart"
    echo "Response: $ADD_CART_BODY"
  fi
fi

# 22. Add variant to cart
if [ ! -z "$PRODUCT_ID" ] && [ ! -z "$VARIANT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Add variant to cart${NC}"
  ADD_VARIANT_CART_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/cart" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "product_id": '$PRODUCT_ID',
      "variant_id": '$VARIANT_ID',
      "quantity": 1
    }')

  ADD_VARIANT_CART_STATUS="${ADD_VARIANT_CART_RESPONSE: -3}"
  ADD_VARIANT_CART_BODY="${ADD_VARIANT_CART_RESPONSE:0:${#ADD_VARIANT_CART_RESPONSE}-3}"

  if [ "$ADD_VARIANT_CART_STATUS" -eq 201 ] || [ "$ADD_VARIANT_CART_STATUS" -eq 200 ]; then
    print_status 0 "Add variant to cart"
    VARIANT_CART_ITEM_ID=$(extract_json_value "$ADD_VARIANT_CART_BODY" "id")
    echo "Variant Cart Item ID: $VARIANT_CART_ITEM_ID"
  else
    print_status "$ADD_VARIANT_CART_STATUS" "Add variant to cart"
    echo "Response: $ADD_VARIANT_CART_BODY"
  fi
fi

# 23. Get cart
echo -e "\n${YELLOW}Testing: Get cart items${NC}"
CART_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/cart" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE)

CART_STATUS="${CART_RESPONSE: -3}"
CART_BODY="${CART_RESPONSE:0:${#CART_RESPONSE}-3}"

if [ "$CART_STATUS" -eq 200 ]; then
  print_status 0 "Get cart items"
  CART_TOTAL=$(extract_json_value "$CART_BODY" "total")
  echo "Cart Total: $CART_TOTAL"
else
  print_status "$CART_STATUS" "Get cart items"
  echo "Response: $CART_BODY"
fi

# 24. Update cart item
if [ ! -z "$CART_ITEM_ID" ]; then
  echo -e "\n${YELLOW}Testing: Update cart item quantity${NC}"
  UPDATE_CART_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/cart/$CART_ITEM_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "quantity": 3
    }')

  UPDATE_CART_STATUS="${UPDATE_CART_RESPONSE: -3}"
  UPDATE_CART_BODY="${UPDATE_CART_RESPONSE:0:${#UPDATE_CART_RESPONSE}-3}"

  if [ "$UPDATE_CART_STATUS" -eq 200 ]; then
    print_status 0 "Update cart item quantity"
  else
    print_status "$UPDATE_CART_STATUS" "Update cart item quantity"
    echo "Response: $UPDATE_CART_BODY"
  fi
fi

# ================================
# WISHLIST ROUTES
# ================================
print_section "WISHLIST ROUTES"

# 25. Add to wishlist
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Add item to wishlist${NC}"
  ADD_WISHLIST_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/wishlist" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "product_id": '$PRODUCT_ID'
    }')

  ADD_WISHLIST_STATUS="${ADD_WISHLIST_RESPONSE: -3}"
  ADD_WISHLIST_BODY="${ADD_WISHLIST_RESPONSE:0:${#ADD_WISHLIST_RESPONSE}-3}"

  if [ "$ADD_WISHLIST_STATUS" -eq 201 ] || [ "$ADD_WISHLIST_STATUS" -eq 200 ]; then
    print_status 0 "Add item to wishlist"
    WISHLIST_ITEM_ID=$(extract_json_value "$ADD_WISHLIST_BODY" "id")
    echo "Wishlist Item ID: $WISHLIST_ITEM_ID"
  else
    print_status "$ADD_WISHLIST_STATUS" "Add item to wishlist"
    echo "Response: $ADD_WISHLIST_BODY"
  fi
fi

# 26. Get wishlist
echo -e "\n${YELLOW}Testing: Get wishlist items${NC}"
WISHLIST_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/wishlist" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE)

WISHLIST_STATUS="${WISHLIST_RESPONSE: -3}"
WISHLIST_BODY="${WISHLIST_RESPONSE:0:${#WISHLIST_RESPONSE}-3}"

if [ "$WISHLIST_STATUS" -eq 200 ]; then
  print_status 0 "Get wishlist items"
else
  print_status "$WISHLIST_STATUS" "Get wishlist items"
  echo "Response: $WISHLIST_BODY"
fi

# 27. Remove from wishlist
if [ ! -z "$WISHLIST_ITEM_ID" ]; then
  echo -e "\n${YELLOW}Testing: Remove item from wishlist${NC}"
  REMOVE_WISHLIST_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE "$API_URL/wishlist/$WISHLIST_ITEM_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE)

  REMOVE_WISHLIST_STATUS="${REMOVE_WISHLIST_RESPONSE: -3}"
  REMOVE_WISHLIST_BODY="${REMOVE_WISHLIST_RESPONSE:0:${#REMOVE_WISHLIST_RESPONSE}-3}"

  if [ "$REMOVE_WISHLIST_STATUS" -eq 200 ]; then
    print_status 0 "Remove item from wishlist"
  else
    print_status "$REMOVE_WISHLIST_STATUS" "Remove item from wishlist"
    echo "Response: $REMOVE_WISHLIST_BODY"
  fi
fi

# ================================
# REVIEW ROUTES
# ================================
print_section "REVIEW ROUTES"

# 28. Create review
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Create product review${NC}"
  CREATE_REVIEW_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/products/$PRODUCT_ID/reviews" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "rating": 5,
      "title": "Great product!",
      "comment": "This is an excellent product, highly recommended."
    }')

  CREATE_REVIEW_STATUS="${CREATE_REVIEW_RESPONSE: -3}"
  CREATE_REVIEW_BODY="${CREATE_REVIEW_RESPONSE:0:${#CREATE_REVIEW_RESPONSE}-3}"

  if [ "$CREATE_REVIEW_STATUS" -eq 201 ]; then
    print_status 0 "Create product review"
    REVIEW_ID=$(extract_json_value "$CREATE_REVIEW_BODY" "id")
    echo "Review ID: $REVIEW_ID"
  else
    print_status "$CREATE_REVIEW_STATUS" "Create product review"
    echo "Response: $CREATE_REVIEW_BODY"
  fi
fi

# 29. Get product reviews
if [ ! -z "$PRODUCT_ID" ]; then
  echo -e "\n${YELLOW}Testing: Get product reviews${NC}"
  GET_REVIEWS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/products/$PRODUCT_ID/reviews" \
    -H "Content-Type: application/json")

  GET_REVIEWS_STATUS="${GET_REVIEWS_RESPONSE: -3}"
  GET_REVIEWS_BODY="${GET_REVIEWS_RESPONSE:0:${#GET_REVIEWS_RESPONSE}-3}"

  if [ "$GET_REVIEWS_STATUS" -eq 200 ]; then
    print_status 0 "Get product reviews"
  else
    print_status "$GET_REVIEWS_STATUS" "Get product reviews"
    echo "Response: $GET_REVIEWS_BODY"
  fi
fi

# 30. Update review
if [ ! -z "$REVIEW_ID" ]; then
  echo -e "\n${YELLOW}Testing: Update product review${NC}"
  UPDATE_REVIEW_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/reviews/$REVIEW_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "rating": 4,
      "title": "Good product",
      "comment": "This is a good product, but could be better."
    }')

  UPDATE_REVIEW_STATUS="${UPDATE_REVIEW_RESPONSE: -3}"
  UPDATE_REVIEW_BODY="${UPDATE_REVIEW_RESPONSE:0:${#UPDATE_REVIEW_RESPONSE}-3}"

  if [ "$UPDATE_REVIEW_STATUS" -eq 200 ]; then
    print_status 0 "Update product review"
  else
    print_status "$UPDATE_REVIEW_STATUS" "Update product review"
    echo "Response: $UPDATE_REVIEW_BODY"
  fi
fi

# ================================
# ORDER ROUTES
# ================================
print_section "ORDER ROUTES"

# 31. Create order
echo -e "\n${YELLOW}Testing: Create order${NC}"
CREATE_ORDER_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE \
  -d '{
    "shipping_address": {
      "name": "Test User",
      "address": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "zip": "12345",
      "country": "Test Country",
      "phone": "1234567890"
    },
    "billing_address": {
      "name": "Test User",
      "address": "123 Test St",
      "city": "Test City",
      "state": "TS",
      "zip": "12345",
      "country": "Test Country",
      "phone": "1234567890"
    },
    "payment_method": "credit_card",
    "shipping_method": "standard",
    "shipping_cost": 5.99,
    "notes": "Please deliver to front door"
  }')

CREATE_ORDER_STATUS="${CREATE_ORDER_RESPONSE: -3}"
CREATE_ORDER_BODY="${CREATE_ORDER_RESPONSE:0:${#CREATE_ORDER_RESPONSE}-3}"

if [ "$CREATE_ORDER_STATUS" -eq 201 ]; then
  print_status 0 "Create order"
  ORDER_ID=$(extract_json_value "$CREATE_ORDER_BODY" "id")
  echo "Order ID: $ORDER_ID"
else
  print_status "$CREATE_ORDER_STATUS" "Create order"
  echo "Response: $CREATE_ORDER_BODY"
fi

# 32. Get user orders
echo -e "\n${YELLOW}Testing: Get user orders${NC}"
GET_ORDERS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/orders" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE)

GET_ORDERS_STATUS="${GET_ORDERS_RESPONSE: -3}"
GET_ORDERS_BODY="${GET_ORDERS_RESPONSE:0:${#GET_ORDERS_RESPONSE}-3}"

if [ "$GET_ORDERS_STATUS" -eq 200 ]; then
  print_status 0 "Get user orders"
else
  print_status "$GET_ORDERS_STATUS" "Get user orders"
  echo "Response: $GET_ORDERS_BODY"
fi

# 33. Get order by ID
if [ ! -z "$ORDER_ID" ]; then
  echo -e "\n${YELLOW}Testing: Get order by ID${NC}"
  GET_ORDER_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/orders/$ORDER_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE)

  GET_ORDER_STATUS="${GET_ORDER_RESPONSE: -3}"
  GET_ORDER_BODY="${GET_ORDER_RESPONSE:0:${#GET_ORDER_RESPONSE}-3}"

  if [ "$GET_ORDER_STATUS" -eq 200 ]; then
    print_status 0 "Get order by ID"
  else
    print_status "$GET_ORDER_STATUS" "Get order by ID"
    echo "Response: $GET_ORDER_BODY"
  fi
fi

# 34. Update order status (admin only)
if [ ! -z "$ORDER_ID" ]; then
  echo -e "\n${YELLOW}Testing: Update order status (admin only)${NC}"
  UPDATE_ORDER_STATUS_RESPONSE=$(curl -s -w "%{http_code}" -X PUT "$API_URL/orders/$ORDER_ID/status" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
    -b $ADMIN_COOKIES_FILE \
    -d '{
      "status": "PROCESSING"
    }')

  UPDATE_ORDER_STATUS_STATUS="${UPDATE_ORDER_STATUS_RESPONSE: -3}"
  UPDATE_ORDER_STATUS_BODY="${UPDATE_ORDER_STATUS_RESPONSE:0:${#UPDATE_ORDER_STATUS_RESPONSE}-3}"

  if [ "$UPDATE_ORDER_STATUS_STATUS" -eq 200 ]; then
    print_status 0 "Update order status (admin only)"
  else
    print_status "$UPDATE_ORDER_STATUS_STATUS" "Update order status (admin only)"
    echo "Response: $UPDATE_ORDER_STATUS_BODY"
  fi
fi

# ================================
# PAYMENT ROUTES
# ================================
print_section "PAYMENT ROUTES"

# 35. Create payment
if [ ! -z "$ORDER_ID" ]; then
  echo -e "\n${YELLOW}Testing: Create payment${NC}"
  CREATE_PAYMENT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/orders/$ORDER_ID/payments" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "amount": 105.98,
      "payment_method": "credit_card",
      "transaction_id": "test-transaction-'$(date +%s)'",
      "transaction_data": {
        "card_last4": "4242",
        "card_brand": "visa",
        "exp_month": 12,
        "exp_year": 2025
      }
    }')

  CREATE_PAYMENT_STATUS="${CREATE_PAYMENT_RESPONSE: -3}"
  CREATE_PAYMENT_BODY="${CREATE_PAYMENT_RESPONSE:0:${#CREATE_PAYMENT_RESPONSE}-3}"

  if [ "$CREATE_PAYMENT_STATUS" -eq 201 ]; then
    print_status 0 "Create payment"
    PAYMENT_ID=$(extract_json_value "$CREATE_PAYMENT_BODY" "id")
    echo "Payment ID: $PAYMENT_ID"
  else
    print_status "$CREATE_PAYMENT_STATUS" "Create payment"
    echo "Response: $CREATE_PAYMENT_BODY"
  fi
fi

# ================================
# COUPON ROUTES
# ================================
print_section "COUPON ROUTES"

# 36. Create coupon (admin only)
echo -e "\n${YELLOW}Testing: Create coupon (admin only)${NC}"
CREATE_COUPON_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/coupons" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE \
  -d '{
    "code": "TEST'$(date +%s)'",
    "type": "PERCENTAGE",
    "value": 10,
    "min_purchase": 50,
    "max_discount": 100,
    "usage_limit": 100,
    "is_active": true
  }')

CREATE_COUPON_STATUS="${CREATE_COUPON_RESPONSE: -3}"
CREATE_COUPON_BODY="${CREATE_COUPON_RESPONSE:0:${#CREATE_COUPON_RESPONSE}-3}"

if [ "$CREATE_COUPON_STATUS" -eq 201 ]; then
  print_status 0 "Create coupon (admin only)"
  COUPON_CODE=$(extract_json_value "$CREATE_COUPON_BODY" "code")
  echo "Coupon Code: $COUPON_CODE"
else
  print_status "$CREATE_COUPON_STATUS" "Create coupon (admin only)"
  echo "Response: $CREATE_COUPON_BODY"
fi

# 37. Validate coupon
if [ ! -z "$COUPON_CODE" ]; then
  echo -e "\n${YELLOW}Testing: Validate coupon${NC}"
  VALIDATE_COUPON_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/coupons/validate" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE \
    -d '{
      "code": "'$COUPON_CODE'"
    }')

  VALIDATE_COUPON_STATUS="${VALIDATE_COUPON_RESPONSE: -3}"
  VALIDATE_COUPON_BODY="${VALIDATE_COUPON_RESPONSE:0:${#VALIDATE_COUPON_RESPONSE}-3}"

  if [ "$VALIDATE_COUPON_STATUS" -eq 200 ]; then
    print_status 0 "Validate coupon"
  else
    print_status "$VALIDATE_COUPON_STATUS" "Validate coupon"
    echo "Response: $VALIDATE_COUPON_BODY"
  fi
fi

# 38. Get coupons (admin only)
echo -e "\n${YELLOW}Testing: Get coupons (admin only)${NC}"
GET_COUPONS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/coupons" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE)

GET_COUPONS_STATUS="${GET_COUPONS_RESPONSE: -3}"
GET_COUPONS_BODY="${GET_COUPONS_RESPONSE:0:${#GET_COUPONS_RESPONSE}-3}"

if [ "$GET_COUPONS_STATUS" -eq 200 ]; then
  print_status 0 "Get coupons (admin only)"
else
  print_status "$GET_COUPONS_STATUS" "Get coupons (admin only)"
  echo "Response: $GET_COUPONS_BODY"
fi

# ================================
# NEWSLETTER ROUTES
# ================================
print_section "NEWSLETTER ROUTES"

# 39. Subscribe to newsletter
echo -e "\n${YELLOW}Testing: Subscribe to newsletter${NC}"
SUBSCRIBE_NEWSLETTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newsletter'$(date +%s)'@example.com"
  }')

SUBSCRIBE_NEWSLETTER_STATUS="${SUBSCRIBE_NEWSLETTER_RESPONSE: -3}"
SUBSCRIBE_NEWSLETTER_BODY="${SUBSCRIBE_NEWSLETTER_RESPONSE:0:${#SUBSCRIBE_NEWSLETTER_RESPONSE}-3}"

if [ "$SUBSCRIBE_NEWSLETTER_STATUS" -eq 201 ] || [ "$SUBSCRIBE_NEWSLETTER_STATUS" -eq 200 ]; then
  print_status 0 "Subscribe to newsletter"
  NEWSLETTER_EMAIL=$(extract_json_value "$SUBSCRIBE_NEWSLETTER_BODY" "email")
  echo "Newsletter Email: $NEWSLETTER_EMAIL"
else
  print_status "$SUBSCRIBE_NEWSLETTER_STATUS" "Subscribe to newsletter"
  echo "Response: $SUBSCRIBE_NEWSLETTER_BODY"
fi

# 40. Unsubscribe from newsletter
if [ ! -z "$NEWSLETTER_EMAIL" ]; then
  echo -e "\n${YELLOW}Testing: Unsubscribe from newsletter${NC}"
  UNSUBSCRIBE_NEWSLETTER_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/newsletter/unsubscribe" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "'$NEWSLETTER_EMAIL'"
    }')

  UNSUBSCRIBE_NEWSLETTER_STATUS="${UNSUBSCRIBE_NEWSLETTER_RESPONSE: -3}"
  UNSUBSCRIBE_NEWSLETTER_BODY="${UNSUBSCRIBE_NEWSLETTER_RESPONSE:0:${#UNSUBSCRIBE_NEWSLETTER_RESPONSE}-3}"

  if [ "$UNSUBSCRIBE_NEWSLETTER_STATUS" -eq 200 ]; then
    print_status 0 "Unsubscribe from newsletter"
  else
    print_status "$UNSUBSCRIBE_NEWSLETTER_STATUS" "Unsubscribe from newsletter"
    echo "Response: $UNSUBSCRIBE_NEWSLETTER_BODY"
  fi
fi

# ================================
# ADMIN DASHBOARD ROUTES
# ================================
print_section "ADMIN DASHBOARD ROUTES"

# 41. Get admin dashboard data
echo -e "\n${YELLOW}Testing: Get admin dashboard data${NC}"
ADMIN_DASHBOARD_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/admin/dashboard" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE)

ADMIN_DASHBOARD_STATUS="${ADMIN_DASHBOARD_RESPONSE: -3}"
ADMIN_DASHBOARD_BODY="${ADMIN_DASHBOARD_RESPONSE:0:${#ADMIN_DASHBOARD_RESPONSE}-3}"

if [ "$ADMIN_DASHBOARD_STATUS" -eq 200 ]; then
  print_status 0 "Get admin dashboard data"
else
  print_status "$ADMIN_DASHBOARD_STATUS" "Get admin dashboard data"
  echo "Response: $ADMIN_DASHBOARD_BODY"
fi

# 42. Get admin users list
echo -e "\n${YELLOW}Testing: Get admin users list${NC}"
ADMIN_USERS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/admin/users" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE)

ADMIN_USERS_STATUS="${ADMIN_USERS_RESPONSE: -3}"
ADMIN_USERS_BODY="${ADMIN_USERS_RESPONSE:0:${#ADMIN_USERS_RESPONSE}-3}"

if [ "$ADMIN_USERS_STATUS" -eq 200 ]; then
  print_status 0 "Get admin users list"
else
  print_status "$ADMIN_USERS_STATUS" "Get admin users list"
  echo "Response: $ADMIN_USERS_BODY"
fi

# 43. Get admin orders list
echo -e "\n${YELLOW}Testing: Get admin orders list${NC}"
ADMIN_ORDERS_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$API_URL/admin/orders" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE)

ADMIN_ORDERS_STATUS="${ADMIN_ORDERS_RESPONSE: -3}"
ADMIN_ORDERS_BODY="${ADMIN_ORDERS_RESPONSE:0:${#ADMIN_ORDERS_RESPONSE}-3}"

if [ "$ADMIN_ORDERS_STATUS" -eq 200 ]; then
  print_status 0 "Get admin orders list"
else
  print_status "$ADMIN_ORDERS_STATUS" "Get admin orders list"
  echo "Response: $ADMIN_ORDERS_BODY"
fi

# ================================
# CLEANUP
# ================================
print_section "CLEANUP"

# 44. Remove from cart
if [ ! -z "$CART_ITEM_ID" ]; then
  echo -e "\n${YELLOW}Testing: Remove item from cart${NC}"
  REMOVE_CART_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE "$API_URL/cart/$CART_ITEM_ID" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
    -b $COOKIES_FILE)

  REMOVE_CART_STATUS="${REMOVE_CART_RESPONSE: -3}"
  REMOVE_CART_BODY="${REMOVE_CART_RESPONSE:0:${#REMOVE_CART_RESPONSE}-3}"

  if [ "$REMOVE_CART_STATUS" -eq 200 ]; then
    print_status 0 "Remove item from cart"
  else
    print_status "$REMOVE_CART_STATUS" "Remove item from cart"
    echo "Response: $REMOVE_CART_BODY"
  fi
fi

# 45. Clear cart
echo -e "\n${YELLOW}Testing: Clear cart${NC}"
CLEAR_CART_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE "$API_URL/cart/clear" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE)

CLEAR_CART_STATUS="${CLEAR_CART_RESPONSE: -3}"
CLEAR_CART_BODY="${CLEAR_CART_RESPONSE:0:${#CLEAR_CART_RESPONSE}-3}"

if [ "$CLEAR_CART_STATUS" -eq 200 ]; then
  print_status 0 "Clear cart"
else
  print_status "$CLEAR_CART_STATUS" "Clear cart"
  echo "Response: $CLEAR_CART_BODY"
fi

# 46. Clear wishlist
echo -e "\n${YELLOW}Testing: Clear wishlist${NC}"
CLEAR_WISHLIST_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE "$API_URL/wishlist/clear" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE)

CLEAR_WISHLIST_STATUS="${CLEAR_WISHLIST_RESPONSE: -3}"
CLEAR_WISHLIST_BODY="${CLEAR_WISHLIST_RESPONSE:0:${#CLEAR_WISHLIST_RESPONSE}-3}"

if [ "$CLEAR_WISHLIST_STATUS" -eq 200 ]; then
  print_status 0 "Clear wishlist"
else
  print_status "$CLEAR_WISHLIST_STATUS" "Clear wishlist"
  echo "Response: $CLEAR_WISHLIST_BODY"
fi

# 47. Logout
echo -e "\n${YELLOW}Testing: Logout${NC}"
LOGOUT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/logout" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -b $COOKIES_FILE)

LOGOUT_STATUS="${LOGOUT_RESPONSE: -3}"
LOGOUT_BODY="${LOGOUT_RESPONSE:0:${#LOGOUT_RESPONSE}-3}"

if [ "$LOGOUT_STATUS" -eq 200 ]; then
  print_status 0 "Logout"
else
  print_status "$LOGOUT_STATUS" "Logout"
  echo "Response: $LOGOUT_BODY"
fi

# 48. Admin logout
echo -e "\n${YELLOW}Testing: Admin logout${NC}"
ADMIN_LOGOUT_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/logout" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: $ADMIN_CSRF_TOKEN" \
  -b $ADMIN_COOKIES_FILE)

ADMIN_LOGOUT_STATUS="${ADMIN_LOGOUT_RESPONSE: -3}"
ADMIN_LOGOUT_BODY="${ADMIN_LOGOUT_RESPONSE:0:${#ADMIN_LOGOUT_RESPONSE}-3}"

if [ "$ADMIN_LOGOUT_STATUS" -eq 200 ]; then
  print_status 0 "Admin logout"
else
  print_status "$ADMIN_LOGOUT_STATUS" "Admin logout"
  echo "Response: $ADMIN_LOGOUT_BODY"
fi

# Clean up cookie files
rm -f $COOKIES_FILE $ADMIN_COOKIES_FILE

echo -e "\n${GREEN}API Tests Completed${NC}"
echo -e "${BLUE}$(date)${NC}"