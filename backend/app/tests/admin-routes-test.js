import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = 'http://localhost:5000/api/admin';
const TOKEN = process.env.TOKEN; // Make sure to set this environment variable

if (!TOKEN) {
  console.error('Please set the TOKEN environment variable with your JWT token');
  process.exit(1);
}

// Helper function for API requests
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    return { status: 500, error: error.message };
  }
}

// Test functions for each section
async function testDashboard() {
  console.log('\n🧪 Testing Dashboard...');
  const result = await apiRequest('/dashboard');

  if (result.status === 200) {
    console.log('✅ Dashboard endpoint working');
    console.log(`   Users: ${result.data.counts.users}`);
    console.log(`   Products: ${result.data.counts.products}`);
    console.log(`   Orders: ${result.data.counts.orders}`);
    console.log(`   Monthly Sales: $${(result.data.sales.monthly / 100).toFixed(2)}`);
  } else {
    console.log('❌ Dashboard endpoint failed:', result.status, result.data?.error || '');
  }

  return result.status === 200;
}

async function testUsers() {
  console.log('\n🧪 Testing User Management...');

  // Get users
  const usersResult = await apiRequest('/users');
  if (usersResult.status === 200) {
    console.log('✅ Get users endpoint working');
    console.log(`   Total users: ${usersResult.data.pagination.total_items}`);

    if (usersResult.data.items.length > 0) {
      const userId = usersResult.data.items[0].id;

      // Get single user
      const userResult = await apiRequest(`/users/${userId}`);
      if (userResult.status === 200) {
        console.log(`✅ Get user details endpoint working (ID: ${userId})`);
      } else {
        console.log(`❌ Get user details endpoint failed:`, userResult.status, userResult.data?.error || '');
      }
    }
  } else {
    console.log('❌ Get users endpoint failed:', usersResult.status, usersResult.data?.error || '');
  }

  return usersResult.status === 200;
}

async function testCategories() {
  console.log('\n🧪 Testing Category Management...');

  // Get categories
  const categoriesResult = await apiRequest('/categories');
  if (categoriesResult.status === 200) {
    console.log('✅ Get categories endpoint working');
    console.log(`   Total categories: ${categoriesResult.data.pagination.total_items}`);

    if (categoriesResult.data.items.length > 0) {
      const categoryId = categoriesResult.data.items[0].id;

      // Get single category
      const categoryResult = await apiRequest(`/categories/${categoryId}`);
      if (categoryResult.status === 200) {
        console.log(`✅ Get category details endpoint working (ID: ${categoryId})`);
      } else {
        console.log(`❌ Get category details endpoint failed:`, categoryResult.status, categoryResult.data?.error || '');
      }
    }
  } else {
    console.log('❌ Get categories endpoint failed:', categoriesResult.status, categoriesResult.data?.error || '');
  }

  return categoriesResult.status === 200;
}

async function testProducts() {
  console.log('\n🧪 Testing Product Management...');

  // Get products
  const productsResult = await apiRequest('/products');
  if (productsResult.status === 200) {
    console.log('✅ Get products endpoint working');
    console.log(`   Total products: ${productsResult.data.pagination.total_items}`);

    if (productsResult.data.items.length > 0) {
      const productId = productsResult.data.items[0].id;

      // Get single product
      const productResult = await apiRequest(`/products/${productId}`);
      if (productResult.status === 200) {
        console.log(`✅ Get product details endpoint working (ID: ${productId})`);

        // Test product images endpoint
        const imagesResult = await apiRequest(`/products/${productId}/images`);
        if (imagesResult.status === 200) {
          console.log(`✅ Get product images endpoint working`);
        } else {
          console.log(`❌ Get product images endpoint failed:`, imagesResult.status, imagesResult.data?.error || '');
        }

        // Test product variants endpoint
        const variantsResult = await apiRequest(`/products/${productId}/variants`);
        if (variantsResult.status === 200) {
          console.log(`✅ Get product variants endpoint working`);
        } else {
          console.log(`❌ Get product variants endpoint failed:`, variantsResult.status, variantsResult.data?.error || '');
        }
      } else {
        console.log(`❌ Get product details endpoint failed:`, productResult.status, productResult.data?.error || '');
      }
    }
  } else {
    console.log('❌ Get products endpoint failed:', productsResult.status, productsResult.data?.error || '');
  }

  return productsResult.status === 200;
}

async function testOrders() {
  console.log('\n🧪 Testing Order Management...');

  // Get orders
  const ordersResult = await apiRequest('/orders');
  if (ordersResult.status === 200) {
    console.log('✅ Get orders endpoint working');
    console.log(`   Total orders: ${ordersResult.data.pagination.total_items}`);

    if (ordersResult.data.items.length > 0) {
      const orderId = ordersResult.data.items[0].id;

      // Get single order
      const orderResult = await apiRequest(`/orders/${orderId}`);
      if (orderResult.status === 200) {
        console.log(`✅ Get order details endpoint working (ID: ${orderId})`);
      } else {
        console.log(`❌ Get order details endpoint failed:`, orderResult.status, orderResult.data?.error || '');
      }
    }
  } else {
    console.log('❌ Get orders endpoint failed:', ordersResult.status, ordersResult.data?.error || '');
  }

  return ordersResult.status === 200;
}

async function testCartItems() {
  console.log('\n🧪 Testing Cart Management...');

  // Get cart items
  const cartItemsResult = await apiRequest('/cart-items');
  if (cartItemsResult.status === 200) {
    console.log('✅ Get cart items endpoint working');
    console.log(`   Total cart items: ${cartItemsResult.data.pagination?.total_items || 0}`);
  } else {
    console.log('❌ Get cart items endpoint failed:', cartItemsResult.status, cartItemsResult.data?.error || '');
  }

  return cartItemsResult.status === 200;
}

async function testWishlistItems() {
  console.log('\n🧪 Testing Wishlist Management...');

  // Get wishlist items
  const wishlistItemsResult = await apiRequest('/wishlist-items');
  if (wishlistItemsResult.status === 200) {
    console.log('✅ Get wishlist items endpoint working');
    console.log(`   Total wishlist items: ${wishlistItemsResult.data.pagination?.total_items || 0}`);
  } else {
    console.log('❌ Get wishlist items endpoint failed:', wishlistItemsResult.status, wishlistItemsResult.data?.error || '');
  }

  return wishlistItemsResult.status === 200;
}

async function testAddresses() {
  console.log('\n🧪 Testing Address Management...');

  // Get address types
  const addressTypesResult = await apiRequest('/address-types');
  if (addressTypesResult.status === 200) {
    console.log('✅ Get address types endpoint working');
  } else {
    console.log('❌ Get address types endpoint failed:', addressTypesResult.status, addressTypesResult.data?.error || '');
  }

  // Get addresses
  const addressesResult = await apiRequest('/addresses');
  if (addressesResult.status === 200) {
    console.log('✅ Get addresses endpoint working');
    console.log(`   Total addresses: ${addressesResult.data.pagination?.total_items || 0}`);
  } else {
    console.log('❌ Get addresses endpoint failed:', addressesResult.status, addressesResult.data?.error || '');
  }

  return addressTypesResult.status === 200 && addressesResult.status === 200;
}

async function testNewsletters() {
  console.log('\n🧪 Testing Newsletter Management...');

  // Get newsletters
  const newslettersResult = await apiRequest('/newsletters');
  if (newslettersResult.status === 200) {
    console.log('✅ Get newsletters endpoint working');
    console.log(`   Total newsletter subscribers: ${newslettersResult.data.pagination?.total_items || 0}`);
  } else {
    console.log('❌ Get newsletters endpoint failed:', newslettersResult.status, newslettersResult.data?.error || '');
  }

  return newslettersResult.status === 200;
}

async function testStatistics() {
  console.log('\n🧪 Testing Statistics...');

  // Get sales stats
  const salesStatsResult = await apiRequest('/stats/sales');
  if (salesStatsResult.status === 200) {
    console.log('✅ Get sales statistics endpoint working');
  } else {
    console.log('❌ Get sales statistics endpoint failed:', salesStatsResult.status, salesStatsResult.data?.error || '');
  }

  // Get product stats
  const productStatsResult = await apiRequest('/stats/products');
  if (productStatsResult.status === 200) {
    console.log('✅ Get product statistics endpoint working');
  } else {
    console.log('❌ Get product statistics endpoint failed:', productStatsResult.status, productStatsResult.data?.error || '');
  }

  return salesStatsResult.status === 200 && productStatsResult.status === 200;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Admin Routes Tests...');

  const results = {
    dashboard: await testDashboard(),
    users: await testUsers(),
    categories: await testCategories(),
    products: await testProducts(),
    orders: await testOrders(),
    cartItems: await testCartItems(),
    wishlistItems: await testWishlistItems(),
    addresses: await testAddresses(),
    newsletters: await testNewsletters(),
    statistics: await testStatistics()
  };

  console.log('\n📊 Test Results Summary:');
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}`);
  }

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.values(results).length;

  console.log(`\n🏁 ${passedCount}/${totalCount} tests passed (${Math.round(passedCount/totalCount*100)}%)`);
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});