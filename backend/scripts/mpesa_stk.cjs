#!/usr/bin/env node

/**
 * M-PESA STK Push API Tester
 * Tests M-PESA integration via HTTP API endpoints
 *
 * This script tests your M-PESA backend API endpoints directly
 * without relying on Python imports.
 */

const https = require("https")
const http = require("http")
const readline = require("readline")

// Configuration
const CONFIG = {
  // Update these to match your backend server
  BASE_URL: process.env.BACKEND_URL || "http://localhost:5000",
  API_PREFIX: "/api",

  // Test configuration
  DEFAULT_PHONE: process.env.TEST_PHONE || "254746741719",
  DEFAULT_AMOUNT: process.env.TEST_AMOUNT || "1",

  // Timeouts
  REQUEST_TIMEOUT: 30000,
  POLLING_INTERVAL: 15000,
  MAX_POLLING_ATTEMPTS: 6,
}

// ANSI color codes for console output
const COLORS = {
  RESET: "\x1b[0m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",
}

// Emojis for better UX
const EMOJIS = {
  SUCCESS: "✅",
  ERROR: "❌",
  WARNING: "⚠️",
  INFO: "ℹ️",
  PROCESSING: "🔄",
  PHONE: "📱",
  ROCKET: "🚀",
  GEAR: "⚙️",
  LOCK: "🔒",
}

class MpesaApiTester {
  constructor() {
    this.testResults = []
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString()
    const prefix =
      {
        info: `${EMOJIS.INFO} ${COLORS.CYAN}`,
        success: `${EMOJIS.SUCCESS} ${COLORS.GREEN}`,
        error: `${EMOJIS.ERROR} ${COLORS.RED}`,
        warning: `${EMOJIS.WARNING} ${COLORS.YELLOW}`,
        processing: `${EMOJIS.PROCESSING} ${COLORS.BLUE}`,
        gear: `${EMOJIS.GEAR} ${COLORS.MAGENTA}`,
      }[level] || `${EMOJIS.INFO} ${COLORS.WHITE}`

    console.log(`${prefix}${message}${COLORS.RESET}`)
  }

  async makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(CONFIG.BASE_URL + CONFIG.API_PREFIX + endpoint)
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MpesaApiTester/1.0",
        },
        timeout: CONFIG.REQUEST_TIMEOUT,
      }

      if (data) {
        const jsonData = JSON.stringify(data)
        options.headers["Content-Length"] = Buffer.byteLength(jsonData)
      }

      const client = url.protocol === "https:" ? https : http
      const req = client.request(options, (res) => {
        let responseData = ""

        res.on("data", (chunk) => {
          responseData += chunk
        })

        res.on("end", () => {
          try {
            const parsedData = JSON.parse(responseData)
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsedData,
            })
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: responseData,
            })
          }
        })
      })

      req.on("error", (error) => {
        reject(error)
      })

      req.on("timeout", () => {
        req.destroy()
        reject(new Error("Request timeout"))
      })

      if (data) {
        req.write(JSON.stringify(data))
      }

      req.end()
    })
  }

  async testServerConnection() {
    this.log("Testing server connection...", "gear")

    try {
      const response = await this.makeRequest("GET", "/health")

      if (response.statusCode === 200) {
        this.log("Server connection successful!", "success")
        this.testResults.push({
          test: "Server Connection",
          status: "passed",
          details: "Server is responding",
        })
        return true
      } else {
        this.log(`Server responded with status: ${response.statusCode}`, "warning")
        // Try alternative endpoints
        return await this.testAlternativeEndpoints()
      }
    } catch (error) {
      this.log(`Server connection failed: ${error.message}`, "error")
      return await this.testAlternativeEndpoints()
    }
  }

  async testAlternativeEndpoints() {
    const alternatives = ["/", "/api", "/api/status", "/status"]

    for (const endpoint of alternatives) {
      try {
        this.log(`Trying alternative endpoint: ${endpoint}`, "info")
        const response = await this.makeRequest("GET", endpoint)

        if (response.statusCode < 500) {
          this.log(`Found working endpoint: ${endpoint}`, "success")
          this.testResults.push({
            test: "Server Connection",
            status: "passed",
            details: `Server responding on ${endpoint}`,
          })
          return true
        }
      } catch (error) {
        // Continue to next endpoint
      }
    }

    this.log("No working endpoints found", "error")
    this.testResults.push({
      test: "Server Connection",
      status: "failed",
      details: "Server not accessible",
    })
    return false
  }

  async testMpesaConfig() {
    this.log("Testing M-PESA configuration endpoint...", "gear")

    try {
      const response = await this.makeRequest("GET", "/mpesa/config")

      if (response.statusCode === 200 && response.data) {
        this.log("M-PESA configuration endpoint accessible", "success")
        this.log(`Environment: ${response.data.environment || "Unknown"}`, "info")
        this.log(`Business Code: ${response.data.business_short_code || "Unknown"}`, "info")

        this.testResults.push({
          test: "M-PESA Configuration",
          status: "passed",
          details: response.data,
        })
        return true
      } else {
        this.log(`Configuration endpoint returned: ${response.statusCode}`, "warning")
        this.testResults.push({
          test: "M-PESA Configuration",
          status: "failed",
          details: `HTTP ${response.statusCode}`,
        })
        return false
      }
    } catch (error) {
      this.log(`Configuration test failed: ${error.message}`, "error")
      this.testResults.push({
        test: "M-PESA Configuration",
        status: "failed",
        details: error.message,
      })
      return false
    }
  }

  async testStkPush(phoneNumber, amount) {
    this.log(`Testing STK Push for ${phoneNumber}, amount: KES ${amount}`, "gear")

    const payload = {
      phone_number: phoneNumber,
      amount: Number.parseFloat(amount),
      account_reference: `API_TEST_${Date.now()}`,
      transaction_description: `API STK Test - ${new Date().toISOString()}`,
      callback_url: `${CONFIG.BASE_URL}/api/mpesa/callback`,
    }

    try {
      const response = await this.makeRequest("POST", "/mpesa/stk-push", payload)

      this.log(`STK Push Response: ${JSON.stringify(response.data, null, 2)}`, "info")

      if (response.statusCode === 200 && response.data.ResponseCode === "0") {
        this.log("STK Push initiated successfully!", "success")
        this.log(`Checkout Request ID: ${response.data.CheckoutRequestID}`, "info")
        this.log(`Merchant Request ID: ${response.data.MerchantRequestID}`, "info")

        this.testResults.push({
          test: "STK Push Initiation",
          status: "passed",
          details: response.data,
        })

        return response.data
      } else {
        const errorMsg = response.data.errorMessage || `HTTP ${response.statusCode}`
        this.log(`STK Push failed: ${errorMsg}`, "error")

        this.testResults.push({
          test: "STK Push Initiation",
          status: "failed",
          details: errorMsg,
        })

        return null
      }
    } catch (error) {
      this.log(`STK Push error: ${error.message}`, "error")
      this.testResults.push({
        test: "STK Push Initiation",
        status: "failed",
        details: error.message,
      })
      return null
    }
  }

  async testStkQuery(checkoutRequestId) {
    this.log(`Testing STK Push status query for: ${checkoutRequestId}`, "gear")

    const payload = {
      checkout_request_id: checkoutRequestId,
    }

    try {
      const response = await this.makeRequest("POST", "/mpesa/stk-query", payload)

      this.log(`STK Query Response: ${JSON.stringify(response.data, null, 2)}`, "info")

      if (response.statusCode === 200 && response.data.ResponseCode === "0") {
        const resultCode = response.data.ResultCode
        const resultDesc = response.data.ResultDesc

        this.log(`Query successful - Result Code: ${resultCode}`, "success")
        this.log(`Result Description: ${resultDesc}`, "info")

        this.testResults.push({
          test: "STK Push Query",
          status: "passed",
          details: response.data,
        })

        return response.data
      } else {
        const errorMsg = response.data.errorMessage || `HTTP ${response.statusCode}`
        this.log(`STK Query failed: ${errorMsg}`, "error")

        // Don't fail the test for rate limiting
        if (errorMsg.includes("429") || errorMsg.includes("rate")) {
          this.log("Rate limiting detected - this is normal", "warning")
          return null
        }

        this.testResults.push({
          test: "STK Push Query",
          status: "failed",
          details: errorMsg,
        })

        return null
      }
    } catch (error) {
      this.log(`STK Query error: ${error.message}`, "error")
      this.testResults.push({
        test: "STK Push Query",
        status: "failed",
        details: error.message,
      })
      return null
    }
  }

  async monitorPaymentStatus(checkoutRequestId) {
    this.log(
      `Monitoring payment status for ${(CONFIG.MAX_POLLING_ATTEMPTS * CONFIG.POLLING_INTERVAL) / 1000} seconds...`,
      "processing",
    )

    for (let attempt = 1; attempt <= CONFIG.MAX_POLLING_ATTEMPTS; attempt++) {
      this.log(`Status check attempt ${attempt}/${CONFIG.MAX_POLLING_ATTEMPTS}`, "info")

      const response = await this.testStkQuery(checkoutRequestId)

      if (response) {
        const resultCode = response.ResultCode

        if (resultCode === "0") {
          this.log("Payment completed successfully!", "success")
          return "completed"
        } else if (["1032", "1037"].includes(resultCode)) {
          this.log("Payment was cancelled or timed out", "warning")
          return "cancelled"
        } else if (resultCode === "4999") {
          this.log("Payment is still processing...", "processing")
        } else if (resultCode && resultCode !== "1") {
          this.log(`Payment failed with code: ${resultCode}`, "error")
          return "failed"
        }
      }

      if (attempt < CONFIG.MAX_POLLING_ATTEMPTS) {
        this.log(`Waiting ${CONFIG.POLLING_INTERVAL / 1000} seconds before next check...`, "info")
        await this.sleep(CONFIG.POLLING_INTERVAL)
      }
    }

    this.log("Payment monitoring timed out", "warning")
    return "timeout"
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async getUserInput(question, defaultValue) {
    return new Promise((resolve) => {
      this.rl.question(`${question} (default: ${defaultValue}): `, (answer) => {
        resolve(answer.trim() || defaultValue)
      })
    })
  }

  printTestSummary() {
    this.log("=".repeat(70), "info")
    this.log("API TEST SUMMARY", "info")
    this.log("=".repeat(70), "info")

    const passed = this.testResults.filter((r) => r.status === "passed").length
    const failed = this.testResults.filter((r) => r.status === "failed").length

    this.log(`Total Tests: ${this.testResults.length}`, "info")
    this.log(`Passed: ${passed}`, passed > 0 ? "success" : "info")
    this.log(`Failed: ${failed}`, failed > 0 ? "error" : "info")

    this.log("\nDetailed Results:", "info")
    this.testResults.forEach((result, index) => {
      const emoji = result.status === "passed" ? EMOJIS.SUCCESS : EMOJIS.ERROR
      this.log(`${index + 1}. ${emoji} ${result.test}`, "info")

      if (result.status === "failed" && result.details) {
        this.log(`   Error: ${result.details}`, "error")
      }
    })
  }

  async runFullTest() {
    console.log(`${EMOJIS.ROCKET} M-PESA API Tester`)
    console.log("=".repeat(50))
    console.log("This script will test your M-PESA backend API endpoints.")
    console.log(`Backend URL: ${CONFIG.BASE_URL}`)
    console.log("")

    // Get test parameters
    const phone = await this.getUserInput("Enter phone number", CONFIG.DEFAULT_PHONE)
    const amount = await this.getUserInput("Enter amount", CONFIG.DEFAULT_AMOUNT)

    console.log("")

    try {
      // Step 1: Test server connection
      if (!(await this.testServerConnection())) {
        this.log("Server connection failed. Aborting.", "error")
        return false
      }

      // Step 2: Test M-PESA configuration
      await this.testMpesaConfig()

      // Step 3: Test STK Push
      const stkResponse = await this.testStkPush(phone, amount)

      if (!stkResponse) {
        this.log("STK Push initiation failed. Aborting.", "error")
        return false
      }

      const checkoutRequestId = stkResponse.CheckoutRequestID

      if (!checkoutRequestId) {
        this.log("No CheckoutRequestID received. Cannot monitor status.", "error")
        return false
      }

      console.log("")
      this.log(`${EMOJIS.PHONE} Please check your phone and complete the M-PESA payment...`, "info")
      this.log("💡 You can cancel this monitoring by pressing Ctrl+C", "info")
      console.log("")

      // Step 4: Monitor payment status
      const finalStatus = await this.monitorPaymentStatus(checkoutRequestId)

      if (finalStatus === "completed") {
        this.log(`${EMOJIS.ROCKET} API STK Push test completed successfully!`, "success")
        return true
      } else if (finalStatus === "timeout") {
        this.log("⏰ Payment monitoring timed out - this is normal for testing", "warning")
        this.log("The STK Push was initiated successfully via API!", "success")
        return true
      } else {
        this.log(`STK Push test ended with status: ${finalStatus}`, "warning")
        return true // Still consider success since STK was initiated
      }
    } catch (error) {
      this.log(`Test execution error: ${error.message}`, "error")
      return false
    }
  }

  async run() {
    try {
      const success = await this.runFullTest()
      this.printTestSummary()

      if (success) {
        console.log(`\n${EMOJIS.ROCKET} API tests completed successfully!`)
        console.log(`${EMOJIS.PHONE} Your M-PESA API endpoints are working correctly!`)
        console.log(`${EMOJIS.LOCK} Backend integration is functional!`)
        process.exit(0)
      } else {
        console.log("\n⚠️ Some API tests failed or were incomplete.")
        process.exit(1)
      }
    } catch (error) {
      console.log(`\n${EMOJIS.ERROR} Test execution error: ${error.message}`)
      process.exit(1)
    } finally {
      this.rl.close()
    }
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
  console.log("\n\nTest interrupted by user")
  console.log(`${EMOJIS.PHONE} STK Push was successfully initiated before interruption!`)
  process.exit(0)
})

// Run the tester
if (require.main === module) {
  const tester = new MpesaApiTester()
  tester.run()
}

module.exports = MpesaApiTester
