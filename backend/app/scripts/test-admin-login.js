import fetch from 'node-fetch';
import chalk from 'chalk';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = 'REDACTED-SENDER-EMAIL';
const ADMIN_PASSWORD = 'junior2020';

// Helper function to format responses
function formatResponse(data) {
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return data;
  }
}

// Test admin login
async function testAdminLogin() {
  console.log(chalk.blue.bold('\n🔑 Testing Admin Login Process'));
  console.log(chalk.gray(`Email: ${ADMIN_EMAIL}`));
  console.log(chalk.gray(`Password: ${ADMIN_PASSWORD.replace(/./g, '*')}`));

  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    const data = await response.json();

    console.log(chalk.cyan('\n📋 Login Response:'));
    console.log(chalk.gray(`Status: ${response.status} ${response.statusText}`));

    if (!response.ok) {
      console.error(chalk.red('❌ Login failed'));
      console.error(chalk.red('Error details:'), data);
      return null;
    }

    console.log(chalk.green('✅ Login successful'));

    // Print token info (first few characters only for security)
    if (data.access_token) {
      const tokenPreview = data.access_token.substring(0, 15) + '...';
      console.log(chalk.yellow(`Access Token: ${tokenPreview}`));
    } else {
      console.warn(chalk.yellow('⚠️ No access token returned'));
      return null;
    }

    // Check user role
    if (data.user) {
      console.log(chalk.cyan('\n👤 User Information:'));
      console.log(chalk.gray(`Name: ${data.user.name || 'N/A'}`));
      console.log(chalk.gray(`Email: ${data.user.email || 'N/A'}`));
      console.log(chalk.gray(`Role: ${data.user.role || 'N/A'}`));

      if (data.user.role === 'admin' || data.user.role === 'ADMIN') {
        console.log(chalk.green('✅ User has admin role'));
      } else {
        console.warn(chalk.yellow('⚠️ User does not have admin role'));
      }
    } else {
      console.warn(chalk.yellow('⚠️ No user information returned'));
    }

    return data.access_token;
  } catch (error) {
    console.error(chalk.red('❌ Error during login test:'), error.message);
    return null;
  }
}

// Test admin dashboard endpoint
async function testAdminDashboard(token) {
  console.log(chalk.blue.bold('\n📊 Testing Admin Dashboard Endpoint'));

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log(chalk.cyan('\n📋 Dashboard Response:'));
    console.log(chalk.gray(`Status: ${response.status} ${response.statusText}`));

    if (!response.ok) {
      console.error(chalk.red('❌ Dashboard request failed'));
      console.error(chalk.red('Error details:'), data);
      return;
    }

    console.log(chalk.green('✅ Dashboard request successful'));

    // Print dashboard summary
    if (data.counts) {
      console.log(chalk.cyan('\n📊 Dashboard Summary:'));
      console.log(chalk.gray(`Users: ${data.counts.users || 0}`));
      console.log(chalk.gray(`Products: ${data.counts.products || 0}`));
      console.log(chalk.gray(`Orders: ${data.counts.orders || 0}`));
      console.log(chalk.gray(`Categories: ${data.counts.categories || 0}`));
      console.log(chalk.gray(`Brands: ${data.counts.brands || 0}`));
      console.log(chalk.gray(`Reviews: ${data.counts.reviews || 0}`));
    }

    // Print sales data
    if (data.sales) {
      console.log(chalk.cyan('\n💰 Sales Data:'));
      console.log(chalk.gray(`Today: $${(data.sales.today / 100).toFixed(2)}`));
      console.log(chalk.gray(`This Week: $${(data.sales.weekly / 100).toFixed(2)}`));
      console.log(chalk.gray(`This Month: $${(data.sales.monthly / 100).toFixed(2)}`));
      console.log(chalk.gray(`This Year: $${(data.sales.yearly / 100).toFixed(2)}`));
    }

    return true;
  } catch (error) {
    console.error(chalk.red('❌ Error testing dashboard:'), error.message);
    return false;
  }
}

// Test a specific admin endpoint
async function testAdminEndpoint(token, endpoint, method = 'GET', body = null) {
  console.log(chalk.blue.bold(`\n🔍 Testing Admin Endpoint: ${endpoint} [${method}]`));

  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/${endpoint}`, options);

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    console.log(chalk.cyan(`📋 ${endpoint} Response:`));
    console.log(chalk.gray(`Status: ${response.status} ${response.statusText}`));

    if (!response.ok) {
      console.error(chalk.red(`❌ ${endpoint} request failed`));
      console.error(chalk.red('Error details:'), data);
      return false;
    }

    console.log(chalk.green(`✅ ${endpoint} request successful`));

    // Print a summary of the response
    if (typeof data === 'object') {
      if (data.items && data.pagination) {
        console.log(chalk.gray(`Items: ${data.items.length}, Total: ${data.pagination.total_items}`));
      } else if (Array.isArray(data)) {
        console.log(chalk.gray(`Items: ${data.length}`));
      } else if (data.message) {
        console.log(chalk.gray(`Message: ${data.message}`));
      }
    }

    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Error testing ${endpoint}:`), error.message);
    return false;
  }
}

// Main function to run all tests
async function runTests() {
  console.log(chalk.green.bold('🚀 Starting Admin API Testing'));
  console.log(chalk.gray(`API Base URL: ${API_BASE_URL}`));

  // Test admin login
  const token = await testAdminLogin();
  if (!token) {
    console.error(chalk.red('❌ Login failed, cannot proceed with other tests'));
    return;
  }

  // Test admin dashboard
  const dashboardSuccess = await testAdminDashboard(token);

  // Test other admin endpoints
  const endpointsToTest = [
    { endpoint: 'users', method: 'GET' },
    { endpoint: 'categories', method: 'GET' },
    { endpoint: 'products', method: 'GET' },
    { endpoint: 'orders', method: 'GET' },
    { endpoint: 'cart-items', method: 'GET' },
    { endpoint: 'wishlist-items', method: 'GET' },
    { endpoint: 'addresses', method: 'GET' },
    { endpoint: 'newsletters', method: 'GET' },
    { endpoint: 'brands', method: 'GET' },
    { endpoint: 'stats/sales', method: 'GET' },
    { endpoint: 'stats/products', method: 'GET' },
  ];

  let successCount = dashboardSuccess ? 1 : 0;
  let totalTests = 1 + endpointsToTest.length;

  for (const { endpoint, method, body } of endpointsToTest) {
    const success = await testAdminEndpoint(token, endpoint, method, body);
    if (success) successCount++;
  }

  // Print summary
  console.log(chalk.blue.bold('\n📝 Test Summary'));
  console.log(chalk.gray(`Total Tests: ${totalTests}`));
  console.log(chalk.gray(`Successful: ${successCount}`));
  console.log(chalk.gray(`Failed: ${totalTests - successCount}`));

  if (successCount === totalTests) {
    console.log(chalk.green.bold('✅ All tests passed successfully!'));
  } else {
    console.log(chalk.yellow.bold(`⚠️ ${totalTests - successCount} tests failed.`));
  }
}

// Run all tests
runTests();