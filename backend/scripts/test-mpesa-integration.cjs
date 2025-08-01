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

    log(`Making ${method} request to: ${config.url}`)
    const response = await axios(config)
    return { success: true, data: response.data, status: response.status }
  } catch (error) {
    log(`Request failed: ${error.response?.status} - ${error.response?.statusText}`)
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

  // Try multiple possible health check endpoints
  const healthEndpoints = ["/api/health-check", "/health", "/api/health", "/"]

  for (const endpoint of healthEndpoints) {
    const result = await makeRequest("GET", endpoint)
    if (result.success) {
      log(`API health check passed at ${endpoint}`, "success")
      return true
    }
  }

  log("All health check endpoints failed", "error")
  return false
}

const testMpesaHealthCheck = async () => {
  log("Testing M-PESA service health...")

  // Try multiple possible M-PESA endpoints
  const mpesaEndpoints = ["/api/payments/mpesa/health", "/api/mpesa/health", "/mpesa/health"]

  for (const endpoint of mpesaEndpoints) {
    const result = await makeRequest("GET", endpoint)
    if (result.success) {
      log(`M-PESA service status: ${result.data.status}`, "success")
      return result.data.status === "healthy"
    }
  }

  log("M-PESA health check failed on all endpoints", "error")
  return false
}

const registerUser = async () => {
  log("Registering test user...")

  // Try multiple possible auth endpoints
  const authEndpoints = ["/api/auth/register", "/auth/register", "/api/register"]

  for (const endpoint of authEndpoints) {
    const result = await makeRequest("POST", endpoint, TEST_USER)
    if (result.success) {
      log("User registered successfully", "success")
      userId = result.data.user?.id
      return true
    } else if (result.status === 400 && result.error.message?.includes("already exists")) {
      log("User already exists, proceeding with login", "info")
      return true
    }
  }

  log("User registration failed on all endpoints", "error")
  return false
}

const loginUser = async () => {
  log("Logging in test user...")

  const loginData = {
    email: TEST_USER.email,
    password: TEST_USER.password,
  }

  // Try multiple possible login endpoints
  const loginEndpoints = ["/api/auth/login", "/auth/login", "/api/login"]

  for (const endpoint of loginEndpoints) {
    const result = await makeRequest("POST", endpoint, loginData)
    if (result.success) {
      authToken = result.data.access_token || result.data.token
      userId = result.data.user?.id
      log("User logged in successfully", "success")
      return true
    }
  }

  log("User login failed on all endpoints", "error")
  return false
}

const createTestOrder = async () => {
  log("Creating test order...")

  // Try multiple possible order endpoints
  const orderEndpoints = ["/api/orders", "/orders", "/api/order"]

  for (const endpoint of orderEndpoints) {
    const result = await makeRequest("POST", endpoint, TEST_ORDER)
    if (result.success) {
      orderId = result.data.order?.id || result.data.id
      log(`Test order created with ID: ${orderId}`, "success")
      return true
    }
  }

  log("Order creation failed on all endpoints", "error")
  return false
}

const initiateMpesaPayment = async () => {
  log("Initiating M-PESA payment...")

  const paymentData = {
    order_id: orderId,
    phone_number: TEST_USER.phone,
    amount: TEST_ORDER.total_amount,
    description: `Payment for order #${orderId}`,
  }

  // Try multiple possible M-PESA initiate endpoints
  const initiateEndpoints = ["/api/payments/mpesa/initiate", "/api/mpesa/initiate", "/mpesa/initiate"]

  for (const endpoint of initiateEndpoints) {
    const result = await makeRequest("POST", endpoint, paymentData)
    if (result.success) {
      transactionId = result.data.transaction_id
      log(`M-PESA payment initiated successfully`, "success")
      log(`Transaction ID: ${transactionId}`)
      log(`CheckoutRequestID: ${result.data.checkout_request_id}`)
      log("Please complete the payment on your phone...")
      return true
    }
  }

  log("M-PESA payment initiation failed on all endpoints", "error")
  return false
}

const monitorPaymentStatus = async () => {
  log("Monitoring payment status...")
  const maxAttempts = 6 // Reduced to 1 minute for testing
  let attempts = 0

  while (attempts < maxAttempts) {
    attempts++
    log(`Checking payment status (attempt ${attempts}/${maxAttempts})...`)

    // Try multiple possible status endpoints
    const statusEndpoints = [
      `/api/payments/mpesa/status/${transactionId}`,
      `/api/mpesa/status/${transactionId}`,
      `/mpesa/status/${transactionId}`,
    ]

    for (const endpoint of statusEndpoints) {
      const result = await makeRequest("GET", endpoint)
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
        break // Found working endpoint, continue monitoring
      }
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

  // Try multiple possible callback endpoints
  const callbackEndpoints = ["/api/payments/mpesa/callback", "/api/mpesa/callback", "/mpesa/callback"]

  for (const endpoint of callbackEndpoints) {
    const result = await makeRequest("POST", endpoint, callbackData)
    if (result.success) {
      log("Callback endpoint test passed", "success")
      return true
    }
  }

  log("Callback endpoint test failed on all endpoints", "error")
  return false
}

const getUserTransactions = async () => {
  log("Fetching user transactions...")

  // Try multiple possible transaction endpoints
  const transactionEndpoints = ["/api/payments/mpesa/transactions", "/api/mpesa/transactions", "/mpesa/transactions"]

  for (const endpoint of transactionEndpoints) {
    const result = await makeRequest("GET", endpoint)
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
    }
  }

  log("Failed to fetch transactions on all endpoints", "error")
  return false
}

// Admin tests (if admin user exists)
const testAdminEndpoints = async () => {
  log("Testing admin endpoints...")

  // Test admin stats
  const statsEndpoints = ["/api/payments/mpesa/admin/stats", "/api/mpesa/admin/stats", "/mpesa/admin/stats"]

  let statsWorking = false
  for (const endpoint of statsEndpoints) {
    const result = await makeRequest("GET", endpoint)
    if (result.success) {
      log("Admin stats endpoint working", "success")
      log(`Total transactions: ${result.data.total_transactions}`)
      log(`Success rate: ${result.data.success_rate}%`)
      statsWorking = true
      break
    }
  }

  if (!statsWorking) {
    log("Admin stats endpoint failed (expected if not admin)", "info")
  }

  // Test admin transactions
  const transactionEndpoints = [
    "/api/payments/mpesa/admin/transactions",
    "/api/mpesa/admin/transactions",
    "/mpesa/admin/transactions",
  ]

  let transactionsWorking = false
  for (const endpoint of transactionEndpoints) {
    const result = await makeRequest("GET", endpoint)
    if (result.success) {
      log("Admin transactions endpoint working", "success")
      transactionsWorking = true
      break
    }
  }

  if (!transactionsWorking) {
    log("Admin transactions endpoint failed (expected if not admin)", "info")
  }

  return statsWorking || transactionsWorking
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

        // Ensure phone number starts with 254
        if (!phoneNumber.startsWith("254")) {
          phoneNumber = "254" + phoneNumber.replace(/^0/, "")
        }

        log(`Initiating payment of KES ${amount} to ${phoneNumber}...`)

        const paymentData = {
          order_id: orderId,
          phone_number: phoneNumber,
          amount: Number.parseFloat(amount),
          description: `Interactive test payment`,
        }

        // Try multiple endpoints for interactive payment
        const initiateEndpoints = ["/api/payments/mpesa/initiate", "/api/mpesa/initiate", "/mpesa/initiate"]

        let paymentInitiated = false
        for (const endpoint of initiateEndpoints) {
          const result = await makeRequest("POST", endpoint, paymentData)
          if (result.success) {
            transactionId = result.data.transaction_id
            log("Payment initiated! Check your phone for M-PESA prompt.", "success")
            paymentInitiated = true
            break
          }
        }

        if (paymentInitiated) {
          // Monitor payment
          const paymentSuccess = await monitorPaymentStatus()
          resolve(paymentSuccess)
        } else {
          log("Payment failed on all endpoints", "error")
          resolve(false)
        }
      })
    })
  })
}

// Backend status check
const checkBackendStatus = async () => {
  log("Checking backend server status...")

  try {
    const result = await makeRequest("GET", "/")
    if (result.success) {
      log("Backend server is running", "success")
      return true
    }
  } catch (error) {
    log("Backend server appears to be down", "error")
    log("Please ensure your Flask backend is running on http://localhost:5000", "error")
    return false
  }

  return false
}

// Main test runner
const runTests = async () => {
  console.log("🚀 Starting M-PESA Integration Tests for Mizizzi E-commerce")
  console.log("=".repeat(60))

  // First check if backend is running
  const backendRunning = await checkBackendStatus()
  if (!backendRunning) {
    log("Backend server is not accessible. Please start your Flask backend first.", "error")
    process.exit(1)
  }

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
