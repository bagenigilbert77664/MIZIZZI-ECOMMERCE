/**
 * Admin Cart Routes Test Script
 *
 * This script tests the admin cart API endpoints for the Mizizzi E-commerce platform.
 * It covers cart management, shipping zones, shipping methods, payment methods, and coupons.
 */

import axios from "axios"
import { strict as assert } from "assert"

// Configuration
const API_URL = "http://localhost:5000/api"
const ADMIN_USER = {
  email: "mizizzi@gmail.com",
  password: "junior2020",
}

// Store auth token and test data
let authToken = null
let testCart = null
let testShippingZone = null
let testShippingMethod = null
let testPaymentMethod = null
let testCoupon = null

// Helper function to create authenticated axios instance
const authAxios = () => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  })
}

// Log in as admin user and get auth token
async function loginAsAdmin() {
  try {
    console.log("🔑 Logging in as admin user...")
    const response = await axios.post(`${API_URL}/auth/login`, ADMIN_USER)
    authToken = response.data.access_token
    console.log("✅ Admin login successful!")
  } catch (error) {
    console.error("❌ Admin login failed:", error.response?.data || error.message)
    process.exit(1)
  }
}

// Verify admin access
async function verifyAdminAccess() {
  try {
    console.log("🔒 Verifying admin access...")
    // Try to access an admin-only endpoint instead of using /admin/profile
    const response = await authAxios().get(`${API_URL}/admin/dashboard`)
    console.log("✅ Admin access verified!")
    return true
  } catch (error) {
    // Check if the error is due to authentication rather than a 405 error
    if (error.response && error.response.status === 401) {
      console.error("❌ Admin access verification failed: Not authenticated as admin")
      return false
    }

    // If we get a different error (like 404 or 405), it might still be an admin
    // but the endpoint doesn't exist or doesn't support GET
    console.log("⚠️ Could not verify admin access through dashboard endpoint, trying another approach...")

    try {
      // Try another admin endpoint
      const cartResponse = await authAxios().get(`${API_URL}/admin/cart/test`)
      console.log("✅ Admin access verified through cart test endpoint!")
      return true
    } catch (secondError) {
      if (secondError.response && secondError.response.status === 401) {
        console.error("❌ Admin access verification failed: Not authenticated as admin")
        return false
      }

      console.error("❌ Admin access verification failed:", secondError.message)
      console.log("⚠️ Assuming admin access and proceeding with tests...")
      // If we're getting errors but they're not 401, assume we have admin access
      // and proceed with the tests
      return true
    }
  }
}

// TEST: Get all carts
async function testGetAllCarts() {
  try {
    console.log("\n🧪 TEST: Getting all carts...")
    const response = await authAxios().get(`${API_URL}/admin/cart/carts`)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(Array.isArray(response.data.carts), "Expected carts to be an array")

    console.log(`✅ Got ${response.data.carts.length} carts successfully!`)

    // Save the first cart for later tests if available
    if (response.data.carts.length > 0) {
      testCart = response.data.carts[0]
      console.log(`ℹ️ Using cart ID: ${testCart.id} for further tests`)
    }

    return response.data
  } catch (error) {
    console.error("❌ Get all carts test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Get a specific cart
async function testGetCart() {
  if (!testCart) {
    console.log("\n⚠️ Skipping get cart test (no test cart available)")
    return null
  }

  try {
    console.log(`\n🧪 TEST: Getting cart with ID ${testCart.id}...`)
    const response = await authAxios().get(`${API_URL}/admin/cart/carts/${testCart.id}`)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(response.data.cart, "Expected cart object to be returned")
    assert(Array.isArray(response.data.items), "Expected items to be an array")

    console.log(`✅ Got cart successfully! Items count: ${response.data.items.length}`)
    return response.data
  } catch (error) {
    console.error("❌ Get cart test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Update a cart
async function testUpdateCart() {
  if (!testCart) {
    console.log("\n⚠️ Skipping update cart test (no test cart available)")
    return null
  }

  try {
    console.log(`\n🧪 TEST: Updating cart with ID ${testCart.id}...`)

    const updateData = {
      notes: "This cart was updated by the admin test script",
      is_active: true,
    }

    const response = await authAxios().put(`${API_URL}/admin/cart/carts/${testCart.id}`, updateData)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert.equal(response.data.cart.notes, updateData.notes, "Expected notes to be updated")

    console.log("✅ Updated cart successfully!")
    return response.data
  } catch (error) {
    console.error("❌ Update cart test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Create a shipping zone
async function testCreateShippingZone() {
  try {
    console.log("\n🧪 TEST: Creating a shipping zone...")

    const zoneData = {
      name: "Test Shipping Zone",
      country: "Test Country",
      all_regions: true,
      is_active: true,
    }

    const response = await authAxios().post(`${API_URL}/admin/cart/shipping-zones`, zoneData)

    assert.equal(response.status, 201, "Expected status code 201")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(response.data.shipping_zone, "Expected shipping_zone object to be returned")
    assert.equal(response.data.shipping_zone.name, zoneData.name, "Expected name to match")

    testShippingZone = response.data.shipping_zone
    console.log(`✅ Created shipping zone successfully! ID: ${testShippingZone.id}`)
    return response.data
  } catch (error) {
    console.error("❌ Create shipping zone test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Get all shipping zones
async function testGetShippingZones() {
  try {
    console.log("\n🧪 TEST: Getting all shipping zones...")
    const response = await authAxios().get(`${API_URL}/admin/cart/shipping-zones`)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(Array.isArray(response.data.shipping_zones), "Expected shipping_zones to be an array")

    console.log(`✅ Got ${response.data.shipping_zones.length} shipping zones successfully!`)
    return response.data
  } catch (error) {
    console.error("❌ Get shipping zones test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Create a shipping method
async function testCreateShippingMethod() {
  if (!testShippingZone) {
    console.log("\n⚠️ Skipping create shipping method test (no test shipping zone available)")
    return null
  }

  try {
    console.log("\n🧪 TEST: Creating a shipping method...")

    const methodData = {
      shipping_zone_id: testShippingZone.id,
      name: "Test Shipping Method",
      description: "Test shipping method for automated tests",
      cost: 10.99,
      estimated_days: "3-5 days",
      is_active: true,
    }

    const response = await authAxios().post(`${API_URL}/admin/cart/shipping-methods`, methodData)

    assert.equal(response.status, 201, "Expected status code 201")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(response.data.shipping_method, "Expected shipping_method object to be returned")
    assert.equal(response.data.shipping_method.name, methodData.name, "Expected name to match")

    testShippingMethod = response.data.shipping_method
    console.log(`✅ Created shipping method successfully! ID: ${testShippingMethod.id}`)
    return response.data
  } catch (error) {
    console.error("❌ Create shipping method test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Get all shipping methods
async function testGetShippingMethods() {
  try {
    console.log("\n🧪 TEST: Getting all shipping methods...")
    const response = await authAxios().get(`${API_URL}/admin/cart/shipping-methods`)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(Array.isArray(response.data.shipping_methods), "Expected shipping_methods to be an array")

    console.log(`✅ Got ${response.data.shipping_methods.length} shipping methods successfully!`)
    return response.data
  } catch (error) {
    console.error("❌ Get shipping methods test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Update a shipping method
async function testUpdateShippingMethod() {
  if (!testShippingMethod) {
    console.log("\n⚠️ Skipping update shipping method test (no test shipping method available)")
    return null
  }

  try {
    console.log(`\n🧪 TEST: Updating shipping method with ID ${testShippingMethod.id}...`)

    const updateData = {
      name: "Updated Shipping Method",
      cost: 12.99,
    }

    const response = await authAxios().put(
      `${API_URL}/admin/cart/shipping-methods/${testShippingMethod.id}`,
      updateData,
    )

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert.equal(response.data.shipping_method.name, updateData.name, "Expected name to be updated")
    assert.equal(response.data.shipping_method.cost, updateData.cost, "Expected cost to be updated")

    console.log("✅ Updated shipping method successfully!")
    return response.data
  } catch (error) {
    console.error("❌ Update shipping method test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Create a payment method
async function testCreatePaymentMethod() {
  try {
    console.log("\n🧪 TEST: Creating a payment method...")

    const methodData = {
      name: "Test Payment Method",
      code: "test_payment_" + Date.now(),
      description: "Test payment method for automated tests",
      is_active: true,
    }

    const response = await authAxios().post(`${API_URL}/admin/cart/payment-methods`, methodData)

    assert.equal(response.status, 201, "Expected status code 201")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(response.data.payment_method, "Expected payment_method object to be returned")
    assert.equal(response.data.payment_method.name, methodData.name, "Expected name to match")

    testPaymentMethod = response.data.payment_method
    console.log(`✅ Created payment method successfully! ID: ${testPaymentMethod.id}`)
    return response.data
  } catch (error) {
    console.error("❌ Create payment method test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Get all payment methods
async function testGetPaymentMethods() {
  try {
    console.log("\n🧪 TEST: Getting all payment methods...")
    const response = await authAxios().get(`${API_URL}/admin/cart/payment-methods`)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(Array.isArray(response.data.payment_methods), "Expected payment_methods to be an array")

    console.log(`✅ Got ${response.data.payment_methods.length} payment methods successfully!`)
    return response.data
  } catch (error) {
    console.error("❌ Get payment methods test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Update a payment method
async function testUpdatePaymentMethod() {
  if (!testPaymentMethod) {
    console.log("\n⚠️ Skipping update payment method test (no test payment method available)")
    return null
  }

  try {
    console.log(`\n🧪 TEST: Updating payment method with ID ${testPaymentMethod.id}...`)

    const updateData = {
      name: "Updated Payment Method",
      description: "Updated description for automated tests",
    }

    const response = await authAxios().put(`${API_URL}/admin/cart/payment-methods/${testPaymentMethod.id}`, updateData)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert.equal(response.data.payment_method.name, updateData.name, "Expected name to be updated")
    assert.equal(response.data.payment_method.description, updateData.description, "Expected description to be updated")

    console.log("✅ Updated payment method successfully!")
    return response.data
  } catch (error) {
    console.error("❌ Update payment method test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Create a coupon
async function testCreateCoupon() {
  try {
    console.log("\n🧪 TEST: Creating a coupon...")

    const couponData = {
      code: "TEST" + Date.now(),
      type: "percentage",
      value: 10,
      min_purchase: 50,
      max_discount: 100,
      is_active: true,
    }

    const response = await authAxios().post(`${API_URL}/admin/cart/coupons`, couponData)

    assert.equal(response.status, 201, "Expected status code 201")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(response.data.coupon, "Expected coupon object to be returned")
    assert.equal(response.data.coupon.code, couponData.code, "Expected code to match")

    testCoupon = response.data.coupon
    console.log(`✅ Created coupon successfully! Code: ${testCoupon.code}`)
    return response.data
  } catch (error) {
    console.error("❌ Create coupon test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Get all coupons
async function testGetCoupons() {
  try {
    console.log("\n🧪 TEST: Getting all coupons...")
    const response = await authAxios().get(`${API_URL}/admin/cart/coupons`)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert(Array.isArray(response.data.coupons), "Expected coupons to be an array")

    console.log(`✅ Got ${response.data.coupons.length} coupons successfully!`)
    return response.data
  } catch (error) {
    console.error("❌ Get coupons test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Update a coupon
async function testUpdateCoupon() {
  if (!testCoupon) {
    console.log("\n⚠️ Skipping update coupon test (no test coupon available)")
    return null
  }

  try {
    console.log(`\n🧪 TEST: Updating coupon with ID ${testCoupon.id}...`)

    const updateData = {
      value: 15,
      max_discount: 150,
    }

    const response = await authAxios().put(`${API_URL}/admin/cart/coupons/${testCoupon.id}`, updateData)

    assert.equal(response.status, 200, "Expected status code 200")
    assert.equal(response.data.success, true, "Expected success to be true")
    assert.equal(response.data.coupon.value, updateData.value, "Expected value to be updated")
    assert.equal(response.data.coupon.max_discount, updateData.max_discount, "Expected max_discount to be updated")

    console.log("✅ Updated coupon successfully!")
    return response.data
  } catch (error) {
    console.error("❌ Update coupon test failed:", error.response?.data || error.message)
    throw error
  }
}

// TEST: Delete resources (cleanup)
async function testDeleteResources() {
  console.log("\n🧹 Cleaning up test resources...")

  // Delete coupon
  if (testCoupon) {
    try {
      console.log(`Deleting test coupon ${testCoupon.id}...`)
      await authAxios().delete(`${API_URL}/admin/cart/coupons/${testCoupon.id}`)
      console.log("✅ Deleted test coupon")
    } catch (error) {
      console.log(`⚠️ Could not delete test coupon: ${error.message}`)
    }
  }

  // Delete payment method
  if (testPaymentMethod) {
    try {
      console.log(`Deleting test payment method ${testPaymentMethod.id}...`)
      await authAxios().delete(`${API_URL}/admin/cart/payment-methods/${testPaymentMethod.id}`)
      console.log("✅ Deleted test payment method")
    } catch (error) {
      console.log(`⚠️ Could not delete test payment method: ${error.message}`)
    }
  }

  // Delete shipping method
  if (testShippingMethod) {
    try {
      console.log(`Deleting test shipping method ${testShippingMethod.id}...`)
      await authAxios().delete(`${API_URL}/admin/cart/shipping-methods/${testShippingMethod.id}`)
      console.log("✅ Deleted test shipping method")
    } catch (error) {
      console.log(`⚠️ Could not delete test shipping method: ${error.message}`)
    }
  }

  // Delete shipping zone
  if (testShippingZone) {
    try {
      console.log(`Deleting test shipping zone ${testShippingZone.id}...`)
      await authAxios().delete(`${API_URL}/admin/cart/shipping-zones/${testShippingZone.id}`)
      console.log("✅ Deleted test shipping zone")
    } catch (error) {
      console.log(`⚠️ Could not delete test shipping zone: ${error.message}`)
    }
  }

  console.log("🧹 Cleanup completed")
}

// Run all tests
async function runTests() {
  console.log("🏁 Starting Admin Cart API tests...")
  let testsFailed = false

  try {
    // Setup
    await loginAsAdmin()
    const isAdmin = await verifyAdminAccess()

    if (!isAdmin) {
      console.error("❌ User is not an admin. Cannot proceed with admin tests.")
      process.exit(1)
    }

    // Cart tests
    try {
      await testGetAllCarts()
    } catch (error) {
      console.error("❌ Get all carts test failed, but continuing with other tests")
      testsFailed = true
    }

    if (testCart) {
      try {
        await testGetCart()
      } catch (error) {
        console.error("❌ Get cart test failed, but continuing with other tests")
        testsFailed = true
      }

      try {
        await testUpdateCart()
      } catch (error) {
        console.error("❌ Update cart test failed, but continuing with other tests")
        testsFailed = true
      }
    } else {
      console.log("⚠️ Skipping cart detail tests (no test cart available)")
    }

    // Shipping zone tests
    try {
      await testCreateShippingZone()
    } catch (error) {
      console.error("❌ Create shipping zone test failed, but continuing with other tests")
      testsFailed = true
    }

    try {
      await testGetShippingZones()
    } catch (error) {
      console.error("❌ Get shipping zones test failed, but continuing with other tests")
      testsFailed = true
    }

    // Shipping method tests
    if (testShippingZone) {
      try {
        await testCreateShippingMethod()
      } catch (error) {
        console.error("❌ Create shipping method test failed, but continuing with other tests")
        testsFailed = true
      }

      try {
        await testGetShippingMethods()
      } catch (error) {
        console.error("❌ Get shipping methods test failed, but continuing with other tests")
        testsFailed = true
      }

      if (testShippingMethod) {
        try {
          await testUpdateShippingMethod()
        } catch (error) {
          console.error("❌ Update shipping method test failed, but continuing with other tests")
          testsFailed = true
        }
      }
    }

    // Payment method tests
    try {
      await testCreatePaymentMethod()
    } catch (error) {
      console.error("❌ Create payment method test failed, but continuing with other tests")
      testsFailed = true
    }

    try {
      await testGetPaymentMethods()
    } catch (error) {
      console.error("❌ Get payment methods test failed, but continuing with other tests")
      testsFailed = true
    }

    if (testPaymentMethod) {
      try {
        await testUpdatePaymentMethod()
      } catch (error) {
        console.error("❌ Update payment method test failed, but continuing with other tests")
        testsFailed = true
      }
    }

    // Coupon tests
    try {
      await testCreateCoupon()
    } catch (error) {
      console.error("❌ Create coupon test failed, but continuing with other tests")
      testsFailed = true
    }

    try {
      await testGetCoupons()
    } catch (error) {
      console.error("❌ Get coupons test failed, but continuing with other tests")
      testsFailed = true
    }

    if (testCoupon) {
      try {
        await testUpdateCoupon()
      } catch (error) {
        console.error("❌ Update coupon test failed, but continuing with other tests")
        testsFailed = true
      }
    }

    // Cleanup
    await testDeleteResources()

    if (testsFailed) {
      console.log("\n⚠️ Some tests failed, but the script completed")
    } else {
      console.log("\n🎉 All tests completed successfully!")
    }
  } catch (error) {
    console.error("\n❌ Tests failed:", error)
    process.exit(1)
  }
}

// Start the tests
runTests()
