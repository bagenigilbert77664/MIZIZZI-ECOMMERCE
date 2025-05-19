// Test script for M-PESA integration
import fetch from "node-fetch"

// Configuration
const API_BASE_URL = "http://localhost:5000" // Change this to your backend URL
const AUTH_TOKEN = "your-auth-token" // Replace with a valid JWT token
const TEST_PHONE = "254708374149" // Safaricom test phone number
const TEST_AMOUNT = 10 // Small amount for testing

// Helper function for API requests
async function apiRequest(endpoint, method = "GET", data = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
    return await response.json()
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error)
    return { success: false, error: error.message }
  }
}

// Test functions
async function testGenerateToken() {
  console.log("\n🔑 Testing M-PESA token generation...")

  try {
    // This endpoint might not be directly exposed, but we can test it indirectly
    const response = await apiRequest("/api/mpesa/test-token", "GET")

    if (response.success) {
      console.log("✅ Token generation successful!")
      console.log("Token:", response.token.substring(0, 10) + "...")
    } else {
      console.log("❌ Token generation failed:", response.error)
    }

    return response
  } catch (error) {
    console.error("❌ Error testing token generation:", error)
    return { success: false, error: error.message }
  }
}

async function testInitiateSTKPush() {
  console.log("\n📱 Testing M-PESA STK Push initiation...")

  const data = {
    phone: TEST_PHONE,
    amount: TEST_AMOUNT,
    account_reference: "TEST-ACCOUNT",
    transaction_desc: "Test Transaction",
  }

  try {
    const response = await apiRequest("/api/mpesa/initiate", "POST", data)

    if (response.success) {
      console.log("✅ STK Push initiated successfully!")
      console.log("Checkout Request ID:", response.checkout_request_id)
      console.log("Merchant Request ID:", response.merchant_request_id)

      // Store these IDs for later use in status query
      return {
        success: true,
        checkout_request_id: response.checkout_request_id,
        merchant_request_id: response.merchant_request_id,
      }
    } else {
      console.log("❌ STK Push initiation failed:", response.error)
      if (response.response) {
        console.log("API Response:", response.response)
      }
      return { success: false, error: response.error }
    }
  } catch (error) {
    console.error("❌ Error initiating STK Push:", error)
    return { success: false, error: error.message }
  }
}

async function testQuerySTKStatus(checkout_request_id) {
  console.log("\n🔍 Testing M-PESA STK Push status query...")

  if (!checkout_request_id) {
    console.log("❌ No checkout request ID provided for status query")
    return { success: false, error: "No checkout request ID provided" }
  }

  const data = {
    checkout_request_id,
  }

  try {
    const response = await apiRequest("/api/mpesa/query", "POST", data)

    if (response.success) {
      console.log("✅ STK Push status query successful!")
      console.log("Response:", JSON.stringify(response.response, null, 2))
      return { success: true, response: response.response }
    } else {
      console.log("❌ STK Push status query failed:", response.error)
      return { success: false, error: response.error }
    }
  } catch (error) {
    console.error("❌ Error querying STK Push status:", error)
    return { success: false, error: error.message }
  }
}

async function testCheckoutWithMPESA() {
  console.log("\n🛒 Testing checkout with M-PESA payment...")

  // This would typically involve creating an order first
  // For simplicity, we'll just test the direct payment endpoint

  const data = {
    phone: TEST_PHONE,
    amount: TEST_AMOUNT,
    order_id: "TEST-ORDER-123", // This would be a real order ID in production
  }

  try {
    const response = await apiRequest("/api/checkout/mpesa-payment", "POST", data)

    if (response.success) {
      console.log("✅ Checkout with M-PESA initiated successfully!")
      console.log("Checkout Request ID:", response.checkout_request_id)
      return { success: true, checkout_request_id: response.checkout_request_id }
    } else {
      console.log("❌ Checkout with M-PESA failed:", response.error)
      return { success: false, error: response.error }
    }
  } catch (error) {
    console.error("❌ Error testing checkout with M-PESA:", error)
    return { success: false, error: error.message }
  }
}

// Main test function
async function runTests() {
  console.log("🧪 Starting M-PESA Integration Tests 🧪")
  console.log("======================================")

  // Test token generation
  await testGenerateToken()

  // Test STK Push initiation
  const stkResult = await testInitiateSTKPush()

  // If STK Push was successful, test status query
  if (stkResult.success) {
    // Wait a bit for the user to respond to the prompt
    console.log("\n⏳ Waiting 15 seconds for user to respond to STK Push...")
    await new Promise((resolve) => setTimeout(resolve, 15000))

    await testQuerySTKStatus(stkResult.checkout_request_id)
  }

  // Test checkout with M-PESA
  await testCheckoutWithMPESA()

  console.log("\n🏁 M-PESA Integration Tests Completed 🏁")
}

// Run the tests
runTests().catch((error) => {
  console.error("Error running tests:", error)
})
