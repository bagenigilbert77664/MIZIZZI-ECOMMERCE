import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = 'REDACTED-SENDER-EMAIL';
const ADMIN_PASSWORD = 'junior2020';

async function testAdminAuthentication() {
  console.log('🔍 Testing Admin Authentication Process');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD.replace(/./g, '*')}`);

  try {
    // Step 1: Attempt login
    console.log('\n📋 Step 1: Attempting login with admin credentials');
    const loginResponse = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error('❌ Login failed');
      console.error('Error details:', loginData);
      return;
    }

    console.log('✅ Login successful');

    // Step 2: Verify token and user role
    if (!loginData.access_token) {
      console.error('❌ No access token returned');
      return;
    }

    console.log('\n📋 Step 2: Verifying token and user role');
    const token = loginData.access_token;
    const tokenPreview = token.substring(0, 15) + '...';
    console.log(`Token received: ${tokenPreview}`);

    if (loginData.user && loginData.user.role) {
      console.log(`User role: ${loginData.user.role}`);

      if (loginData.user.role === 'admin' || loginData.user.role === 'ADMIN') {
        console.log('✅ User has admin role');
      } else {
        console.warn('⚠️ User does not have admin role');
      }
    } else {
      console.warn('⚠️ User role information not found in response');
    }

    // Step 3: Test token with a protected admin endpoint
    console.log('\n📋 Step 3: Testing token with protected admin endpoint');
    const dashboardResponse = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (dashboardResponse.ok) {
      console.log('✅ Successfully accessed protected admin endpoint');
      console.log(`Status: ${dashboardResponse.status} ${dashboardResponse.statusText}`);

      const dashboardData = await dashboardResponse.json();
      if (dashboardData.counts) {
        console.log('\nDashboard data summary:');
        console.log(`- Users: ${dashboardData.counts.users || 0}`);
        console.log(`- Products: ${dashboardData.counts.products || 0}`);
        console.log(`- Orders: ${dashboardData.counts.orders || 0}`);
      }
    } else {
      console.error('❌ Failed to access protected admin endpoint');
      console.error(`Status: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
      try {
        const errorData = await dashboardResponse.json();
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Could not parse error response');
      }
    }

    // Step 4: Test with invalid token
    console.log('\n📋 Step 4: Testing with invalid token');
    const invalidToken = token.substring(0, token.length - 5) + 'XXXXX';
    const invalidResponse = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${invalidToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!invalidResponse.ok) {
      console.log('✅ Correctly rejected invalid token');
      console.log(`Status: ${invalidResponse.status} ${invalidResponse.statusText}`);
    } else {
      console.error('❌ Security issue: Invalid token was accepted');
    }

    console.log('\n🏁 Admin authentication testing complete');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testAdminAuthentication();