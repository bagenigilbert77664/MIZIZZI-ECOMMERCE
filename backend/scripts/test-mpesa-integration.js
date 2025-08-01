/**
 * M-PESA Integration Test Script for Mizizzi E-commerce
 * Tests the complete M-PESA payment flow including user registration, order creation, and payment processing
 */

const axios = require("axios")
const readline = require("readline")

// Configuration
const BASE_URL = "http://localhost:5000"
const TEST_USER = {
  name: "Test User",
  email: "testuser@example.com",
  password: "TestPassword123!",
  phone: "254746741719",
}

const TEST_ORDER = {
  items: [
    {
      product_id: 1,
      quantity: 2,
      price: 500.0,
    },
  ],
  total_amount: 1000.0,
  shipping_address: {
    first_name: "Test",
    last_name: "User",
    address_line1: "123 Test Street",
    city: "Nairobi",
    country: "Kenya",
    phone: "254746741719",
  },
}

// Global variables
let authToken = null
let userId = null
let orderId = null
let transactionId = null

// Utility functions
const log = (message, type = "info") => {
  const timestamp = new Date().toISOString()
  const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️"
  console.log(`${prefix} [${timestamp}] ${message}`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const makeRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }

    if (data) {
      config.data = data
    }

    const response = await axios(config)
    return { success: true, data: response.data, status: response.status }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    }
  }
}

// Test functions
const testHealthCheck = async () => {
  log("Testing API health check...")
  const result = await makeRequest("GET", "/api/health-check")

  if (result.success) {
    log("API health check passed", "success")
    return true
  } else {
    log(`API health check failed: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

const testMpesaHealthCheck = async () => {
  log("Testing M-PESA service health...")
  const result = await makeRequest("GET", "/api/payments/mpesa/health")

  if (result.success) {
    log(`M-PESA service status: ${result.data.status}`, "success")
    return result.data.status === "healthy"
  } else {
    log(`M-PESA health check failed: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

const registerUser = async () => {
  log("Registering test user...")
  const result = await makeRequest("POST", "/api/auth/register", TEST_USER)

  if (result.success) {
    log("User registered successfully", "success")
    userId = result.data.user?.id
    return true
  } else if (result.status === 400 && result.error.message?.includes("already exists")) {
    log("User already exists, proceeding with login", "info")
    return true
  } else {
    log(`User registration failed: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

const loginUser = async () => {
  log("Logging in test user...")
  const result = await makeRequest("POST", "/api/auth/login", {
    email: TEST_USER.email,
    password: TEST_USER.password,
  })

  if (result.success) {
    authToken = result.data.access_token
    userId = result.data.user?.id
    log("User logged in successfully", "success")
    return true
  } else {
    log(`User login failed: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

const createTestOrder = async () => {
  log("Creating test order...")
  const result = await makeRequest("POST", "/api/orders", TEST_ORDER)

  if (result.success) {
    orderId = result.data.order?.id || result.data.id
    log(`Test order created with ID: ${orderId}`, "success")
    return true
  } else {
    log(`Order creation failed: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

const initiateMpesaPayment = async () => {
  log("Initiating M-PESA payment...")

  const paymentData = {
    order_id: orderId,
    phone_number: TEST_USER.phone,
    amount: TEST_ORDER.total_amount,
    description: `Payment for order #${orderId}`,
  }

  const result = await makeRequest("POST", "/api/payments/mpesa/initiate", paymentData)

  if (result.success) {
    transactionId = result.data.transaction_id
    log(`M-PESA payment initiated successfully`, "success")
    log(`Transaction ID: ${transactionId}`)
    log(`CheckoutRequestID: ${result.data.checkout_request_id}`)
    log("Please complete the payment on your phone...")
    return true
  } else {
    log(`M-PESA payment initiation failed: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

const monitorPaymentStatus = async () => {
  log("Monitoring payment status...")
  const maxAttempts = 30 // 5 minutes with 10-second intervals
  let attempts = 0

  while (attempts < maxAttempts) {
    attempts++
    log(`Checking payment status (attempt ${attempts}/${maxAttempts})...`)

    const result = await makeRequest("GET", `/api/payments/mpesa/status/${transactionId}`)

    if (result.success) {
      const status = result.data.status
      log(`Payment status: ${status}`)

      if (status === "completed") {
        log("Payment completed successfully!", "success")
        log(`M-PESA Receipt: ${result.data.mpesa_receipt_number}`)
        return true
      } else if (status === "failed" || status === "cancelled") {
        log(`Payment ${status}: ${result.data.result_desc}`, "error")
        return false
      }
      // Continue monitoring for pending status
    } else {
      log(`Status check failed: ${JSON.stringify(result.error)}`, "error")
    }

    if (attempts < maxAttempts) {
      await sleep(10000) // Wait 10 seconds before next check
    }
  }

  log("Payment monitoring timeout reached", "error")
  return false
}

const testCallbackEndpoint = async () => {
  log("Testing M-PESA callback endpoint...")

  // Simulate M-PESA callback
  const callbackData = {
    Body: {
      stkCallback: {
        MerchantRequestID: "test-merchant-request-id",
        CheckoutRequestID: "test-checkout-request-id",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            {
              Name: "Amount",
              Value: TEST_ORDER.total_amount,
            },
            {
              Name: "MpesaReceiptNumber",
              Value: "TEST123456789",
            },
            {
              Name: "PhoneNumber",
              Value: TEST_USER.phone,
            },
          ],
        },
      },
    },
  }

  const result = await makeRequest("POST", "/api/payments/mpesa/callback", callbackData)

  if (result.success) {
    log("Callback endpoint test passed", "success")
    return true
  } else {
    log(`Callback endpoint test failed: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

const getUserTransactions = async () => {
  log("Fetching user transactions...")
  const result = await makeRequest("GET", "/api/payments/mpesa/transactions")

  if (result.success) {
    const transactions = result.data.transactions || []
    log(`Found ${transactions.length} transactions`, "success")

    transactions.forEach((transaction, index) => {
      log(`Transaction ${index + 1}:`)
      log(`  ID: ${transaction.id}`)
      log(`  Status: ${transaction.status}`)
      log(`  Amount: KES ${transaction.amount}`)
      log(`  Phone: ${transaction.phone_number}`)
      log(`  Created: ${transaction.created_at}`)
    })

    return true
  } else {
    log(`Failed to fetch transactions: ${JSON.stringify(result.error)}`, "error")
    return false
  }
}

// Admin tests (if admin user exists)
const testAdminEndpoints = async () => {
  log("Testing admin endpoints...")

  // Test admin stats
  const statsResult = await makeRequest("GET", "/api/payments/mpesa/admin/stats")
  if (statsResult.success) {
    log("Admin stats endpoint working", "success")
    log(`Total transactions: ${statsResult.data.total_transactions}`)
    log(`Success rate: ${statsResult.data.success_rate}%`)
  } else {
    log("Admin stats endpoint failed (expected if not admin)", "info")
  }

  // Test admin transactions
  const transactionsResult = await makeRequest("GET", "/api/payments/mpesa/admin/transactions")
  if (transactionsResult.success) {
    log("Admin transactions endpoint working", "success")
  } else {
    log("Admin transactions endpoint failed (expected if not admin)", "info")
  }
}

// Interactive payment test
const interactivePaymentTest = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question("Enter your phone number for M-PESA payment (254XXXXXXXXX): ", async (phoneNumber) => {
      rl.question("Enter amount to pay (KES): ", async (amount) => {
        rl.close()

        if (!phoneNumber || !amount) {
          log("Invalid input provided", "error")
          resolve(false)
          return
        }

        log(`Initiating payment of KES ${amount} to ${phoneNumber}...`)

        const paymentData = {
          order_id: orderId,
          phone_number: phoneNumber,
          amount: Number.parseFloat(amount),
          description: `Interactive test payment`,
        }

        const result = await makeRequest("POST", "/api/payments/mpesa/initiate", paymentData)

        if (result.success) {
          transactionId = result.data.transaction_id
          log("Payment initiated! Check your phone for M-PESA prompt.", "success")

          // Monitor payment
          const paymentSuccess = await monitorPaymentStatus()
          resolve(paymentSuccess)
        } else {
          log(`Payment failed: ${JSON.stringify(result.error)}`, "error")
          resolve(false)
        }
      })
    })
  })
}

// Main test runner
const runTests = async () => {
  console.log("🚀 Starting M-PESA Integration Tests for Mizizzi E-commerce")
  console.log("=" * 60)

  const tests = [
    { name: "API Health Check", fn: testHealthCheck },
    { name: "M-PESA Health Check", fn: testMpesaHealthCheck },
    { name: "User Registration", fn: registerUser },
    { name: "User Login", fn: loginUser },
    { name: "Order Creation", fn: createTestOrder },
    { name: "M-PESA Payment Initiation", fn: initiateMpesaPayment },
    { name: "Payment Status Monitoring", fn: monitorPaymentStatus },
    { name: "Callback Endpoint Test", fn: testCallbackEndpoint },
    { name: "User Transactions", fn: getUserTransactions },
    { name: "Admin Endpoints", fn: testAdminEndpoints },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`)
    console.log("-".repeat(40))

    try {
      const result = await test.fn()
      if (result) {
        passed++
        log(`${test.name} PASSED`, "success")
      } else {
        failed++
        log(`${test.name} FAILED`, "error")
      }
    } catch (error) {
      failed++
      log(`${test.name} ERROR: ${error.message}`, "error")
    }

    await sleep(1000) // Brief pause between tests
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 TEST SUMMARY")
  console.log("=".repeat(60))
  log(`Total Tests: ${tests.length}`)
  log(`Passed: ${passed}`, "success")
  log(`Failed: ${failed}`, failed > 0 ? "error" : "info")
  log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`)

  if (failed === 0) {
    log("🎉 All tests passed! M-PESA integration is working correctly.", "success")
  } else {
    log("⚠️ Some tests failed. Please check the logs above.", "error")
  }

  // Interactive test option
  console.log("\n" + "=".repeat(60))
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  rl.question("Would you like to run an interactive payment test? (y/n): ", async (answer) => {
    rl.close()

    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      console.log("\n📱 Interactive Payment Test")
      console.log("-".repeat(30))
      await interactivePaymentTest()
    }

    console.log("\n✅ Test suite completed!")
    process.exit(failed > 0 ? 1 : 0)
  })
}

// Error handling
process.on("unhandledRejection", (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, "error")
  process.exit(1)
})

process.on("uncaughtException", (error) => {
  log(`Uncaught Exception: ${error.message}`, "error")
  process.exit(1)
})

// Run tests
if (require.main === module) {
  runTests().catch((error) => {
    log(`Test runner error: ${error.message}`, "error")
    process.exit(1)
  })
}

module.exports = {
  runTests,
  testHealthCheck,
  testMpesaHealthCheck,
  registerUser,
  loginUser,
  createTestOrder,
  initiateMpesaPayment,
  monitorPaymentStatus,
}
