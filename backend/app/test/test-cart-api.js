/**
 * Cart API Testing Script
 *
 * This script tests all cart endpoints in the Mizizzi E-commerce platform.
 * It provides detailed output and handles errors gracefully.
 */

import axios from 'axios';
import chalk from 'chalk'; // For colored console output

// Configuration
const API_URL = 'http://localhost:5000/';
const TEST_USER = {
  email: 'bagenig47@gmail.com',
  password: 'junior2020'
};

// Store auth token and test data
let authToken = null;
let testCart = null;
let testCartItem = null;
let testProduct = null;
let testAddress = null;
let testShippingMethod = null;
let testPaymentMethod = null;

// Create authenticated axios instance
const authAxios = () => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  });
};

// Helper function to log test results
const logTest = (name, success, message, data = null) => {
  if (success) {
    console.log(chalk.green(`✅ ${name}: ${message}`));
  } else {
    console.log(chalk.red(`❌ ${name}: ${message}`));
  }

  if (data) {
    console.log(chalk.gray('  Details:'), data);
  }
};

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login and get auth token
async function login() {
  try {
    console.log(chalk.blue('🔑 Logging in test user...'));
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = response.data.access_token;
    console.log(chalk.green('✅ Login successful!'));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Login failed:'), error.response?.data || error.message);
    return false;
  }
}

// Fetch a test product to use in cart tests
async function getTestProduct() {
  try {
    console.log(chalk.blue('📦 Fetching a test product...'));
    const response = await axios.get(`${API_URL}/products?per_page=1`);

    if (response.data.items && response.data.items.length > 0) {
      testProduct = response.data.items[0];
      console.log(chalk.green(`✅ Found test product: ${testProduct.name} (ID: ${testProduct.id})`));
      return true;
    } else {
      console.log(chalk.yellow('⚠️ No products found. Creating a test product...'));

      // Try to create a test product if admin access is available
      try {
        const adminCheck = await authAxios().get(`${API_URL}/admin/profile`).catch(() => null);

        if (adminCheck) {
          const productData = {
            name: 'Test Product',
            slug: 'test-product',
            description: 'A test product for API testing',
            price: 1000,
            stock: 100,
            is_active: true
          };

          const createResponse = await authAxios().post(`${API_URL}/admin/products`, productData);
          testProduct = createResponse.data.product;
          console.log(chalk.green(`✅ Created test product: ${testProduct.name} (ID: ${testProduct.id})`));
          return true;
        } else {
          console.error(chalk.red('❌ No products found and cannot create test product (no admin access)'));
          return false;
        }
      } catch (error) {
        console.error(chalk.red('❌ Failed to create test product:'), error.response?.data || error.message);
        return false;
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch test product:'), error.response?.data || error.message);
    return false;
  }
}

// Create a test address
async function createTestAddress() {
  try {
    console.log(chalk.blue('🏠 Creating test address...'));

    const addressData = {
      first_name: 'Test',
      last_name: 'User',
      address_line1: '123 Test St',
      city: 'Nairobi',
      state: 'Nairobi County',
      postal_code: '00100',
      country: 'Kenya',
      phone: '+254712345678',
      address_type: 'BOTH',
      is_default: true
    };

    const response = await authAxios().post(`${API_URL}/addresses`, addressData);

    if (response.status === 201) {
      testAddress = response.data.address;
      console.log(chalk.green(`✅ Created test address: ${testAddress.id}`));
      return true;
    } else {
      console.log(chalk.yellow(`⚠️ Unexpected status code: ${response.status}`));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to create test address:'), error.response?.data || error.message);
    return false;
  }
}

// Get test address
async function getTestAddress() {
  try {
    console.log(chalk.blue('🏠 Fetching test address...'));
    const response = await authAxios().get(`${API_URL}/addresses`);

    if (response.data.items && response.data.items.length > 0) {
      testAddress = response.data.items[0];
      console.log(chalk.green(`✅ Found test address: ${testAddress.id}`));
      return true;
    } else {
      console.log(chalk.yellow('⚠️ No addresses found. Creating a test address...'));
      return await createTestAddress();
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch test address:'), error.response?.data || error.message);
    console.log(chalk.yellow('⚠️ Attempting to create a test address...'));
    return await createTestAddress();
  }
}

// Get test shipping method
async function getTestShippingMethod() {
  try {
    console.log(chalk.blue('🚚 Fetching shipping methods...'));

    // First set shipping address to enable shipping methods
    if (testAddress) {
      try {
        await authAxios().post(`${API_URL}/cart/shipping-address`, { address_id: testAddress.id });
        console.log(chalk.green('✅ Set shipping address to enable shipping methods'));
      } catch (error) {
        console.log(chalk.yellow('⚠️ Could not set shipping address:'), error.message);
      }
    }

    const response = await authAxios().get(`${API_URL}/cart/shipping-methods`);

    if (response.data.shipping_methods && response.data.shipping_methods.length > 0) {
      testShippingMethod = response.data.shipping_methods[0];
      console.log(chalk.green(`✅ Found shipping method: ${testShippingMethod.name}`));
      return true;
    } else {
      console.log(chalk.yellow('⚠️ No shipping methods found'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch shipping methods:'), error.response?.data || error.message);
    return false;
  }
}

// Get test payment method
async function getTestPaymentMethod() {
  try {
    console.log(chalk.blue('💳 Fetching payment methods...'));
    const response = await authAxios().get(`${API_URL}/cart/payment-methods`);

    if (response.data.payment_methods && response.data.payment_methods.length > 0) {
      testPaymentMethod = response.data.payment_methods[0];
      console.log(chalk.green(`✅ Found payment method: ${testPaymentMethod.name}`));
      return true;
    } else {
      console.log(chalk.yellow('⚠️ No payment methods found'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch payment methods:'), error.response?.data || error.message);
    return false;
  }
}

// TEST: Get current cart
async function testGetCart() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Getting current cart...'));
    const response = await authAxios().get(`${API_URL}/cart`);

    if (response.status === 200 && response.data.success) {
      testCart = response.data.cart;
      logTest('Get Cart', true, `Got cart successfully! Cart ID: ${testCart.id}`);
      return response.data;
    } else {
      logTest('Get Cart', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Get Cart', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Add item to cart
async function testAddToCart() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Adding item to cart...'));

    if (!testProduct) {
      logTest('Add to Cart', false, 'No test product available');
      return null;
    }

    const cartItem = {
      product_id: testProduct.id,
      quantity: 1
    };

    console.log(chalk.gray(`  Adding product ${testProduct.id} to cart...`));

    // Try to clear the cart first to avoid stock issues
    try {
      await authAxios().delete(`${API_URL}/cart/clear`);
      console.log(chalk.gray('  Cleared cart to start fresh'));
    } catch (error) {
      console.log(chalk.yellow('  ⚠️ Could not clear cart:'), error.message);
    }

    const response = await authAxios().post(`${API_URL}/cart/add`, cartItem);

    if (response.status === 200 && response.data.success) {
      testCartItem = response.data.items.find(item => item.product_id === testProduct.id);
      logTest('Add to Cart', true, `Added item to cart successfully! Item ID: ${testCartItem.id}`);
      return response.data;
    } else {
      logTest('Add to Cart', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Add to Cart', false, 'Request failed', error.response?.data || error.message);

    // Try to get the current cart to continue tests
    try {
      const cartResponse = await authAxios().get(`${API_URL}/cart`);
      const existingItem = cartResponse.data.items?.find(item => item.product_id === testProduct.id);

      if (existingItem) {
        console.log(chalk.yellow(`  ℹ️ Found existing item in cart, will use for further tests: ID ${existingItem.id}`));
        testCartItem = existingItem;
        return cartResponse.data;
      }
    } catch (cartError) {
      console.error(chalk.red('  ❌ Could not get current cart:'), cartError.message);
    }

    return null;
  }
}

// TEST: Update cart item
async function testUpdateCartItem() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Updating cart item quantity...'));

    if (!testCartItem) {
      logTest('Update Cart Item', false, 'No cart item to update');
      return null;
    }

    // Choose a new quantity (increment by 1)
    const newQuantity = testCartItem.quantity + 1;

    console.log(chalk.gray(`  Updating quantity to ${newQuantity}...`));
    const response = await authAxios().put(`${API_URL}/cart/update/${testCartItem.id}`, { quantity: newQuantity });

    if (response.status === 200 && response.data.success) {
      const updatedItem = response.data.items.find(item => item.id === testCartItem.id);

      if (updatedItem && updatedItem.quantity === newQuantity) {
        logTest('Update Cart Item', true, `Updated quantity to ${newQuantity} successfully!`);
      } else {
        logTest('Update Cart Item', false, `Quantity not updated correctly. Expected: ${newQuantity}, Got: ${updatedItem?.quantity}`);
      }

      return response.data;
    } else {
      logTest('Update Cart Item', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Update Cart Item', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Validate cart
async function testValidateCart() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Validating cart...'));
    const response = await authAxios().get(`${API_URL}/cart/validate`);

    if (response.status === 200 && response.data.success) {
      logTest('Validate Cart', true, `Cart validation status: ${response.data.is_valid ? 'Valid' : 'Invalid'}`);

      if (!response.data.is_valid) {
        console.log(chalk.yellow('  ⚠️ Validation errors:'), JSON.stringify(response.data.errors, null, 2));
      }

      return response.data;
    } else {
      logTest('Validate Cart', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Validate Cart', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Apply coupon to cart
async function testApplyCoupon() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Applying coupon to cart...'));

    const couponData = {
      coupon_code: 'TESTCODE'
    };

    const response = await authAxios().post(`${API_URL}/cart/apply-coupon`, couponData);

    if (response.status === 200 && response.data.success) {
      logTest('Apply Coupon', true, 'Applied coupon successfully!');
      return response.data;
    } else {
      logTest('Apply Coupon', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Apply Coupon', false, 'Request failed (expected if coupon is invalid)', error.response?.data || error.message);
    return null;
  }
}

// TEST: Remove coupon from cart
async function testRemoveCoupon() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Removing coupon from cart...'));
    const response = await authAxios().delete(`${API_URL}/cart/remove-coupon`);

    if (response.status === 200 && response.data.success) {
      logTest('Remove Coupon', true, 'Removed coupon successfully!');
      return response.data;
    } else {
      logTest('Remove Coupon', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Remove Coupon', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Set shipping address
async function testSetShippingAddress() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Setting shipping address...'));

    if (!testAddress) {
      logTest('Set Shipping Address', false, 'No test address available');
      return null;
    }

    const addressData = {
      address_id: testAddress.id
    };

    const response = await authAxios().post(`${API_URL}/cart/shipping-address`, addressData);

    if (response.status === 200 && response.data.success) {
      logTest('Set Shipping Address', true, 'Set shipping address successfully!');
      return response.data;
    } else {
      logTest('Set Shipping Address', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Set Shipping Address', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Set billing address
async function testSetBillingAddress() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Setting billing address...'));

    if (!testAddress) {
      logTest('Set Billing Address', false, 'No test address available');
      return null;
    }

    // Test same as shipping first
    console.log(chalk.gray('  Testing same_as_shipping=true...'));
    const sameAsShippingData = {
      same_as_shipping: true
    };

    const response1 = await authAxios().post(`${API_URL}/cart/billing-address`, sameAsShippingData);

    if (response1.status === 200 && response1.data.success) {
      logTest('Set Billing Address (Same as Shipping)', true, 'Set billing address (same as shipping) successfully!');
    } else {
      logTest('Set Billing Address (Same as Shipping)', false, 'Unexpected response', response1.data);
    }

    // Now test with different address
    console.log(chalk.gray('  Testing same_as_shipping=false...'));
    const differentAddressData = {
      same_as_shipping: false,
      address_id: testAddress.id
    };

    const response2 = await authAxios().post(`${API_URL}/cart/billing-address`, differentAddressData);

    if (response2.status === 200 && response2.data.success) {
      logTest('Set Billing Address (Different)', true, 'Set billing address (different from shipping) successfully!');
      return response2.data;
    } else {
      logTest('Set Billing Address (Different)', false, 'Unexpected response', response2.data);
      return null;
    }
  } catch (error) {
    logTest('Set Billing Address', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Set shipping method
async function testSetShippingMethod() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Setting shipping method...'));

    if (!testShippingMethod) {
      logTest('Set Shipping Method', false, 'No test shipping method available');
      return null;
    }

    const shippingData = {
      shipping_method_id: testShippingMethod.id
    };

    const response = await authAxios().post(`${API_URL}/cart/shipping-method`, shippingData);

    if (response.status === 200 && response.data.success) {
      logTest('Set Shipping Method', true, 'Set shipping method successfully!');
      return response.data;
    } else {
      logTest('Set Shipping Method', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Set Shipping Method', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Set payment method
async function testSetPaymentMethod() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Setting payment method...'));

    if (!testPaymentMethod) {
      logTest('Set Payment Method', false, 'No test payment method available');
      return null;
    }

    const paymentData = {
      payment_method_id: testPaymentMethod.id
    };

    const response = await authAxios().post(`${API_URL}/cart/payment-method`, paymentData);

    if (response.status === 200 && response.data.success) {
      logTest('Set Payment Method', true, 'Set payment method successfully!');
      return response.data;
    } else {
      logTest('Set Payment Method', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Set Payment Method', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Validate cart for checkout
async function testValidateCheckout() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Validating cart for checkout...'));
    const response = await authAxios().get(`${API_URL}/cart/checkout/validate`);

    if (response.status === 200 && response.data.success) {
      logTest('Validate Checkout', true, `Checkout validation status: ${response.data.is_valid ? 'Valid' : 'Invalid'}`);

      if (!response.data.is_valid) {
        console.log(chalk.yellow('  ⚠️ Validation errors:'), JSON.stringify(response.data.errors, null, 2));
      }

      return response.data;
    } else {
      logTest('Validate Checkout', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Validate Checkout', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Get cart summary
async function testGetCartSummary() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Getting cart summary...'));
    const response = await authAxios().get(`${API_URL}/cart/summary`);

    if (response.status === 200 && response.data.success) {
      logTest('Get Cart Summary', true, `Got cart summary successfully! Items: ${response.data.item_count}, Total: ${response.data.total}`);
      return response.data;
    } else {
      logTest('Get Cart Summary', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Get Cart Summary', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Set cart notes
async function testSetCartNotes() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Setting cart notes...'));

    const notesData = {
      notes: 'Please deliver after 5 PM. Ring the doorbell twice.'
    };

    const response = await authAxios().post(`${API_URL}/cart/notes`, notesData);

    if (response.status === 200 && response.data.success) {
      logTest('Set Cart Notes', true, 'Set cart notes successfully!');
      return response.data;
    } else {
      logTest('Set Cart Notes', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Set Cart Notes', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Set requires shipping flag
async function testSetRequiresShipping() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Setting requires shipping flag...'));

    const shippingData = {
      requires_shipping: true
    };

    const response = await authAxios().post(`${API_URL}/cart/requires-shipping`, shippingData);

    if (response.status === 200 && response.data.success) {
      logTest('Set Requires Shipping', true, 'Set requires shipping flag successfully!');
      return response.data;
    } else {
      logTest('Set Requires Shipping', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Set Requires Shipping', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Remove item from cart
async function testRemoveFromCart() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Removing item from cart...'));

    if (!testCartItem) {
      logTest('Remove From Cart', false, 'No cart item to remove');
      return null;
    }

    const response = await authAxios().delete(`${API_URL}/cart/remove/${testCartItem.id}`);

    if (response.status === 200 && response.data.success) {
      logTest('Remove From Cart', true, 'Removed item from cart successfully!');
      return response.data;
    } else {
      logTest('Remove From Cart', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Remove From Cart', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// TEST: Clear cart
async function testClearCart() {
  try {
    console.log(chalk.blue('\n🧪 TEST: Clearing cart...'));

    // First add an item to make sure there's something to clear
    await testAddToCart();

    const response = await authAxios().delete(`${API_URL}/cart/clear`);

    if (response.status === 200 && response.data.success) {
      logTest('Clear Cart', true, 'Cleared cart successfully!');
      return response.data;
    } else {
      logTest('Clear Cart', false, 'Unexpected response', response.data);
      return null;
    }
  } catch (error) {
    logTest('Clear Cart', false, 'Request failed', error.response?.data || error.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log(chalk.blue.bold('🏁 Starting Cart API tests...'));

  // Setup
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error(chalk.red.bold('❌ Login failed. Cannot proceed with tests.'));
    return;
  }

  const productSuccess = await getTestProduct();
  if (!productSuccess) {
    console.error(chalk.red.bold('❌ Could not get or create test product. Cannot proceed with tests.'));
    return;
  }

  await getTestAddress();

  // Basic cart operations
  await testGetCart();
  await testAddToCart();

  // Only run these tests if we have a cart item
  if (testCartItem) {
    await testUpdateCartItem();
  } else {
    console.log(chalk.yellow('⚠️ Skipping update cart item test (no test cart item available)'));
  }

  await testValidateCart();
  await testGetCartSummary();

  // Get shipping and payment methods
  await getTestShippingMethod();
  await getTestPaymentMethod();

  // Cart features
  await testApplyCoupon();
  await testRemoveCoupon();
  await testSetShippingAddress();
  await testSetBillingAddress();

  if (testShippingMethod) {
    await testSetShippingMethod();
  }

  if (testPaymentMethod) {
    await testSetPaymentMethod();
  }

  await testSetCartNotes();
  await testSetRequiresShipping();
  await testValidateCheckout();

  // Cleanup
  if (testCartItem) {
    await testRemoveFromCart();
  }

  await testClearCart();

  console.log(chalk.green.bold('\n🎉 All tests completed!'));
}

// Start the tests
runTests().catch(error => {
  console.error(chalk.red.bold('❌ Unhandled error:'), error);
});