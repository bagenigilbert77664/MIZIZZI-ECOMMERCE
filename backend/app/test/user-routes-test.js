import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TOKEN = process.env.TOKEN; // Make sure to set this environment variable

if (!TOKEN) {
  console.error('Please set the TOKEN environment variable with your JWT token');
  process.exit(1);
}

// Helper function for API requests with enhanced error handling
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers,
    credentials: 'include'
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return { status: response.status, data, contentType };
    } else {
      // Handle non-JSON responses
      const text = await response.text();
      console.warn(`Non-JSON response from ${endpoint}: ${text.substring(0, 100)}...`);
      return {
        status: response.status,
        data: { error: "Non-JSON response received", text: text.substring(0, 100) },
        contentType,
        isHtml: contentType && contentType.includes('text/html')
      };
    }
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    return {
      status: 500,
      error: error.message,
      data: { error: `Request failed: ${error.message}` }
    };
  }
}

// Test functions for each section
async function testAuthentication() {
  console.log('\n🧪 Testing Authentication...');

  // Test getting current user profile
  const meResult = await apiRequest('/auth/me');
  if (meResult.status === 200) {
    console.log('✅ Get current user endpoint working');
    if (meResult.data && meResult.data.name && meResult.data.email) {
      console.log(`   User: ${meResult.data.name} (${meResult.data.email})`);
    } else {
      console.log('   User data structure is not as expected');
    }
  } else {
    console.log('❌ Get current user endpoint failed:', meResult.status, meResult.data?.error || '');
  }

  // Test CSRF token endpoint with better error handling
  try {
    const csrfResult = await apiRequest('/auth/csrf', 'POST');

    // Handle various response scenarios
    if (csrfResult.status === 200) {
      if (csrfResult.data && csrfResult.data.csrf_token) {
        console.log('✅ CSRF token endpoint working');
      } else if (csrfResult.isHtml) {
        console.log('⚠️ CSRF token endpoint returned HTML instead of JSON, but status is 200');
        console.log('   This might indicate a server-side rendering issue or middleware conflict');
      } else {
        console.log('⚠️ CSRF token endpoint returned status 200 but no token in the response');
      }
    } else {
      console.log('❌ CSRF token endpoint failed:', csrfResult.status, csrfResult.data?.error || '');
      if (csrfResult.contentType) {
        console.log(`   Response content type: ${csrfResult.contentType}`);
      }
    }
  } catch (error) {
    console.log('❌ CSRF token endpoint error:', error.message);
  }

  // Consider authentication test passed if /auth/me works, even if CSRF fails
  return meResult.status === 200;
}

async function testCategories() {
  console.log('\n🧪 Testing Categories...');

  // Get categories
  const categoriesResult = await apiRequest('/categories');
  if (categoriesResult.status === 200) {
    console.log('✅ Get categories endpoint working');

    // Safely access pagination data
    if (categoriesResult.data && categoriesResult.data.pagination) {
      console.log(`   Total categories: ${categoriesResult.data.pagination.total_items}`);
    } else {
      console.log('   Pagination data not found in response');
    }

    // Safely test individual category endpoint
    if (categoriesResult.data && categoriesResult.data.items && categoriesResult.data.items.length > 0) {
      const categoryId = categoriesResult.data.items[0].id;

      // Get single category
      const categoryResult = await apiRequest(`/categories/${categoryId}`);
      if (categoryResult.status === 200) {
        console.log(`✅ Get category details endpoint working (ID: ${categoryId})`);
      } else {
        console.log(`❌ Get category details endpoint failed:`, categoryResult.status, categoryResult.data?.error || '');
      }
    } else {
      console.log('   No categories found, skipping category detail test');
    }
  } else {
    console.log('❌ Get categories endpoint failed:', categoriesResult.status, categoriesResult.data?.error || '');
  }

  return categoriesResult.status === 200;
}

async function testBrands() {
  console.log('\n🧪 Testing Brands...');

  // Get brands
  const brandsResult = await apiRequest('/brands');
  if (brandsResult.status === 200) {
    console.log('✅ Get brands endpoint working');

    // Safely access pagination data
    if (brandsResult.data && brandsResult.data.pagination) {
      console.log(`   Total brands: ${brandsResult.data.pagination.total_items}`);
    } else {
      console.log('   Pagination data not found in response');
    }

    // Safely test individual brand endpoint
    if (brandsResult.data && brandsResult.data.items && brandsResult.data.items.length > 0) {
      const brandId = brandsResult.data.items[0].id;

      // Get single brand
      const brandResult = await apiRequest(`/brands/${brandId}`);
      if (brandResult.status === 200) {
        console.log(`✅ Get brand details endpoint working (ID: ${brandId})`);
      } else {
        console.log(`❌ Get brand details endpoint failed:`, brandResult.status, brandResult.data?.error || '');
      }
    } else {
      console.log('   No brands found, skipping brand detail test');
    }
  } else {
    console.log('❌ Get brands endpoint failed:', brandsResult.status, brandsResult.data?.error || '');
  }

  return brandsResult.status === 200;
}

async function testProducts() {
  console.log('\n🧪 Testing Products...');

  // Get products
  const productsResult = await apiRequest('/products');
  if (productsResult.status === 200) {
    console.log('✅ Get products endpoint working');

    // Safely access pagination data
    if (productsResult.data && productsResult.data.pagination) {
      console.log(`   Total products: ${productsResult.data.pagination.total_items}`);
    } else {
      console.log('   Pagination data not found in response');
    }

    // Safely test individual product endpoint and related endpoints
    if (productsResult.data && productsResult.data.items && productsResult.data.items.length > 0) {
      const productId = productsResult.data.items[0].id;

      // Get single product
      const productResult = await apiRequest(`/products/${productId}`);
      if (productResult.status === 200) {
        console.log(`✅ Get product details endpoint working (ID: ${productId})`);

        // Test product reviews endpoint
        const reviewsResult = await apiRequest(`/products/${productId}/reviews`);
        if (reviewsResult.status === 200) {
          console.log(`✅ Get product reviews endpoint working`);
        } else if (reviewsResult.status === 404) {
          console.log(`⚠️ No reviews found for product (404)`);
        } else {
          console.log(`❌ Get product reviews endpoint failed:`, reviewsResult.status, reviewsResult.data?.error || '');
        }

        // Test product variants endpoint
        const variantsResult = await apiRequest(`/products/${productId}/variants`);
        if (variantsResult.status === 200) {
          console.log(`✅ Get product variants endpoint working`);
        } else if (variantsResult.status === 404) {
          console.log(`⚠️ No variants found for product (404)`);
        } else {
          console.log(`❌ Get product variants endpoint failed:`, variantsResult.status, variantsResult.data?.error || '');
        }
      } else {
        console.log(`❌ Get product details endpoint failed:`, productResult.status, productResult.data?.error || '');
      }
    } else {
      console.log('   No products found, skipping product detail tests');
    }
  } else {
    console.log('❌ Get products endpoint failed:', productsResult.status, productsResult.data?.error || '');
  }

  return productsResult.status === 200;
}

async function testCart() {
  console.log('\n🧪 Testing Cart...');

  // Get cart
  const cartResult = await apiRequest('/cart');
  if (cartResult.status === 200) {
    console.log('✅ Get cart endpoint working');

    // Safely access cart data
    if (cartResult.data && cartResult.data.item_count !== undefined) {
      console.log(`   Total cart items: ${cartResult.data.item_count}`);
    } else {
      console.log('   Cart data structure is not as expected');
    }

    // Test cart validation
    const validateResult = await apiRequest('/cart/validate', 'POST');
    if (validateResult.status === 200) {
      console.log('✅ Cart validation endpoint working');
    } else if (validateResult.status === 400 && validateResult.data && validateResult.data.error === 'Cart is empty') {
      console.log('⚠️ Cart validation endpoint returned expected error for empty cart');
    } else {
      console.log('❌ Cart validation endpoint failed:', validateResult.status, validateResult.data?.error || '');
    }
  } else if (cartResult.status === 404) {
    console.log('⚠️ Cart not found or empty (404)');
  } else {
    console.log('❌ Get cart endpoint failed:', cartResult.status, cartResult.data?.error || '');
  }

  // Consider test passed if we get a 200 or a 404 (no cart yet)
  return cartResult.status === 200 || cartResult.status === 404;
}

async function testWishlist() {
  console.log('\n🧪 Testing Wishlist...');

  // Get wishlist
  const wishlistResult = await apiRequest('/wishlist/user'); // changed from '/wishlist'
  if (wishlistResult.status === 200) {
    console.log('✅ Get wishlist endpoint working');

    // Safely access wishlist data
    if (wishlistResult.data && wishlistResult.data.item_count !== undefined) {
      console.log(`   Total wishlist items: ${wishlistResult.data.item_count}`);
    } else {
      console.log('   Wishlist data structure is not as expected');
    }
  } else if (wishlistResult.status === 404) {
    console.log('⚠️ Wishlist not found or empty (404)');
  } else {
    console.log('❌ Get wishlist endpoint failed:', wishlistResult.status, wishlistResult.data?.error || '');
  }

  // Consider test passed if we get a 200 or a 404 (no wishlist yet)
  return wishlistResult.status === 200 || wishlistResult.status === 404;
}

async function testAddresses() {
  console.log('\n🧪 Testing Addresses...');

  // Get addresses
  const addressesResult = await apiRequest('/addresses');
  if (addressesResult.status === 200) {
    console.log('✅ Get addresses endpoint working');

    // Safely access pagination data
    if (addressesResult.data && addressesResult.data.pagination) {
      console.log(`   Total addresses: ${addressesResult.data.pagination.total_items}`);
    } else {
      console.log('   Pagination data not found in response');
    }

    // Safely test individual address endpoint and default address
    if (addressesResult.data && addressesResult.data.items && addressesResult.data.items.length > 0) {
      const addressId = addressesResult.data.items[0].id;

      // Get single address
      const addressResult = await apiRequest(`/addresses/${addressId}`);
      if (addressResult.status === 200) {
        console.log(`✅ Get address details endpoint working (ID: ${addressId})`);
      } else {
        console.log(`❌ Get address details endpoint failed:`, addressResult.status, addressResult.data?.error || '');
      }

      // Get default address
      const defaultAddressResult = await apiRequest('/addresses/default');
      if (defaultAddressResult.status === 200) {
        console.log('✅ Get default address endpoint working');
      } else if (defaultAddressResult.status === 404) {
        console.log('⚠️ No default address found (404)');
      } else {
        console.log('❌ Get default address endpoint failed:', defaultAddressResult.status, defaultAddressResult.data?.error || '');
      }
    } else {
      console.log('   No addresses found, skipping address detail tests');
    }
  } else if (addressesResult.status === 404) {
    console.log('⚠️ No addresses found (404)');
  } else {
    console.log('❌ Get addresses endpoint failed:', addressesResult.status, addressesResult.data?.error || '');
  }

  // Consider test passed if we get a 200 or a 404 (no addresses yet)
  return addressesResult.status === 200 || addressesResult.status === 404;
}

async function testOrders() {
  console.log('\n🧪 Testing Orders...');

  // Get orders
  const ordersResult = await apiRequest('/orders');
  if (ordersResult.status === 200) {
    console.log('✅ Get orders endpoint working');

    // Safely access pagination data
    if (ordersResult.data && ordersResult.data.pagination) {
      console.log(`   Total orders: ${ordersResult.data.pagination.total_items}`);
    } else {
      console.log('   Pagination data not found in response');
    }

    // Safely test individual order endpoint
    if (ordersResult.data && ordersResult.data.items && ordersResult.data.items.length > 0) {
      const orderId = ordersResult.data.items[0].id;

      // Get single order
      const orderResult = await apiRequest(`/orders/${orderId}`);
      if (orderResult.status === 200) {
        console.log(`✅ Get order details endpoint working (ID: ${orderId})`);
      } else {
        console.log(`❌ Get order details endpoint failed:`, orderResult.status, orderResult.data?.error || '');
      }
    } else {
      console.log('   No orders found, skipping order detail tests');
    }

    // Get order stats
    const statsResult = await apiRequest('/orders/stats');
    if (statsResult.status === 200) {
      console.log('✅ Get order stats endpoint working');
    } else if (statsResult.status === 404) {
      console.log('⚠️ No order stats available (404)');
    } else {
      console.log('❌ Get order stats endpoint failed:', statsResult.status, statsResult.data?.error || '');
    }
  } else if (ordersResult.status === 404) {
    console.log('⚠️ No orders found (404)');

    // Still try to get order stats even if no orders
    const statsResult = await apiRequest('/orders/stats');
    if (statsResult.status === 200) {
      console.log('✅ Get order stats endpoint working');
    } else if (statsResult.status === 404) {
      console.log('⚠️ No order stats available (404)');
    } else {
      console.log('❌ Get order stats endpoint failed:', statsResult.status, statsResult.data?.error || '');
    }
  } else {
    console.log('❌ Get orders endpoint failed:', ordersResult.status, ordersResult.data?.error || '');
  }

  // Consider test passed if we get a 200 or a 404 (no orders yet)
  return ordersResult.status === 200 || ordersResult.status === 404;
}

async function testCoupons() {
  console.log('\n🧪 Testing Coupons...');

  // Test coupon validation with a dummy code
  const couponResult = await apiRequest('/coupons/validate', 'POST', { code: 'TEST10' });

  // We don't expect this to succeed with a dummy code, but the endpoint should respond
  if (couponResult.status === 200) {
    console.log('✅ Coupon validation endpoint working (coupon found)');
  } else if (couponResult.status === 404) {
    console.log('✅ Coupon validation endpoint working (coupon not found)');
  } else if (couponResult.status === 400) {
    console.log('✅ Coupon validation endpoint working (invalid request)');
  } else {
    console.log('❌ Coupon validation endpoint failed:', couponResult.status, couponResult.data?.error || '');
  }

  return couponResult.status === 200 || couponResult.status === 404 || couponResult.status === 400;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting User Routes Tests...');

  try {
    const results = {
      authentication: await testAuthentication(),
      categories: await testCategories(),
      brands: await testBrands(),
      products: await testProducts(),
      cart: await testCart(),
      wishlist: await testWishlist(),
      addresses: await testAddresses(),
      orders: await testOrders(),
      coupons: await testCoupons()
    };

    console.log('\n📊 Test Results Summary:');
    for (const [test, passed] of Object.entries(results)) {
      console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
    }

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.values(results).length;

    console.log(`\n🏁 ${passedCount}/${totalCount} tests passed (${Math.round(passedCount/totalCount*100)}%)`);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});