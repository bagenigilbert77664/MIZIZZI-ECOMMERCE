// Import required modules using ES module syntax
import dotenv from "dotenv"
import { v4 as uuidv4 } from "uuid"

// Load environment variables
dotenv.config()

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = `test-${uuidv4().substring(0, 8)}@example.com`
const TEST_PHONE = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`
const TEST_PASSWORD = "TestPassword123!"
let USER_ID = null
let ACCESS_TOKEN = null
let REFRESH_TOKEN = null
const VERIFICATION_CODE = "123456" // Mock verification code

// Check if server is running before starting tests
async function checkServerAvailability() {
  try {
    console.log(`Checking if API server is available at ${API_BASE_URL}...`)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      signal: controller.signal,
    }).catch(async () => {
      // Try root endpoint if health endpoint doesn't exist
      return await fetch(API_BASE_URL, {
        method: "GET",
        signal: controller.signal,
      }).catch(() => null)
    })

    clearTimeout(timeoutId)

    if (response && (response.status === 200 || response.status === 404)) {
      console.log("✅ API server is running")
      return true
    } else {
      throw new Error("Server not responding properly")
    }
  } catch (error) {
    console.error("❌ API server is not available")
    console.error(`Error: ${error.message || "Unknown error"}`)
    console.log("\n📋 Please make sure:")
    console.log("  1. Your API server is running")
    console.log(`  2. It's accessible at ${API_BASE_URL}`)
    console.log("  3. You've set the correct API_BASE_URL environment variable if needed")
    console.log("\n💡 You can start your server or update the API_BASE_URL in your .env file")
    console.log("   Example: API_BASE_URL=http://localhost:3000/api")
    return false
  }
}

// Helper function for API requests
async function apiRequest(endpoint, method = "GET", body = null, token = null) {
  const headers = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const options = {
    method,
    headers,
  }

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    options.signal = controller.signal

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
    clearTimeout(timeoutId)

    const contentType = response.headers.get("content-type")

    let data
    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = { text }
    }

    return { status: response.status, data }
  } catch (error) {
    console.error(
      `Error calling ${endpoint}:`,
      error.name === "AbortError" ? "Request timed out after 10 seconds" : error.message,
    )
    return {
      status: 500,
      error: error.name === "AbortError" ? "Request timed out" : error.message,
    }
  }
}

// Get error message from response
function getErrorMessage(response) {
  if (response.error) return response.error
  if (response.data && response.data.error) return response.data.error
  if (response.data && response.data.msg) return response.data.msg
  if (response.data && response.data.message) return response.data.message
  if (response.data && response.data.errors && response.data.errors.length > 0) {
    return response.data.errors.map((e) => `${e.field}: ${e.message}`).join(", ")
  }
  return "Unknown error"
}

// Test functions for each authentication endpoint
async function testRegistration() {
  console.log("\n🧪 Testing User Registration...")

  // Test email registration
  const emailRegResult = await apiRequest("/user/register", "POST", {
    name: "Test User",
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  if (emailRegResult.status === 201 && emailRegResult.data) {
    console.log("✅ Email registration endpoint working")
    console.log(`   Created user with email: ${TEST_EMAIL}`)
    if (emailRegResult.data.user_id) {
      USER_ID = emailRegResult.data.user_id
      console.log(`   User ID: ${USER_ID}`)
    }
  } else {
    console.log("❌ Email registration endpoint failed:", emailRegResult.status, getErrorMessage(emailRegResult))
  }

  // Test phone registration
  const phoneRegResult = await apiRequest("/user/register", "POST", {
    name: "Test Phone User",
    phone: TEST_PHONE,
    password: TEST_PASSWORD,
  })

  if (phoneRegResult.status === 201 && phoneRegResult.data) {
    console.log("✅ Phone registration endpoint working")
    console.log(`   Created user with phone: ${TEST_PHONE}`)
  } else {
    console.log("❌ Phone registration endpoint failed:", phoneRegResult.status, getErrorMessage(phoneRegResult))
  }

  // Test invalid registration (missing required fields)
  const invalidRegResult = await apiRequest("/user/register", "POST", {
    name: "Invalid User",
    // Missing email/phone and password
  })

  if (invalidRegResult.status === 400) {
    console.log("✅ Invalid registration validation working")
  } else {
    console.log(
      "❌ Invalid registration validation failed:",
      invalidRegResult.status,
      getErrorMessage(invalidRegResult),
    )
  }

  return emailRegResult.status === 201
}

async function testVerification() {
  console.log("\n🧪 Testing User Verification...")

  if (!USER_ID) {
    console.log("❌ Cannot test verification: missing user ID")
    return false
  }

  // Test verification code
  const verifyResult = await apiRequest("/user/verify-code", "POST", {
    user_id: USER_ID,
    code: VERIFICATION_CODE,
    is_phone: false,
  })

  if (verifyResult.status === 200) {
    console.log("✅ Verification endpoint working")
  } else {
    console.log("❌ Verification endpoint failed:", verifyResult.status, getErrorMessage(verifyResult))
  }

  // Test resend verification
  const resendResult = await apiRequest("/user/resend-verification", "POST", {
    identifier: TEST_EMAIL,
  })

  if (resendResult.status === 200) {
    console.log("✅ Resend verification endpoint working")
  } else {
    console.log("❌ Resend verification endpoint failed:", resendResult.status, getErrorMessage(resendResult))
  }

  return verifyResult.status === 200
}

async function testLogin() {
  console.log("\n🧪 Testing User Login...")

  // Test login with email
  const loginResult = await apiRequest("/user/login", "POST", {
    identifier: TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  if (loginResult.status === 200 && loginResult.data) {
    console.log("✅ Login endpoint working")
    if (loginResult.data.access_token) {
      ACCESS_TOKEN = loginResult.data.access_token
      console.log("   Access token received")
    }
    if (loginResult.data.refresh_token) {
      REFRESH_TOKEN = loginResult.data.refresh_token
    }
  } else {
    console.log("❌ Login endpoint failed:", loginResult.status, getErrorMessage(loginResult))
  }

  // Test login with invalid credentials
  const invalidLoginResult = await apiRequest("/user/login", "POST", {
    identifier: TEST_EMAIL,
    password: "WrongPassword123!",
  })

  if (invalidLoginResult.status === 401) {
    console.log("✅ Invalid login validation working")
  } else {
    console.log("❌ Invalid login validation failed:", invalidLoginResult.status, getErrorMessage(invalidLoginResult))
  }

  return loginResult.status === 200
}

async function testTokenRefresh() {
  console.log("\n🧪 Testing Token Refresh...")

  if (!REFRESH_TOKEN) {
    console.log("❌ Cannot test token refresh: missing refresh token")
    return false
  }

  const refreshResult = await apiRequest("/user/refresh", "POST", null, REFRESH_TOKEN)

  if (refreshResult.status === 200 && refreshResult.data) {
    console.log("✅ Token refresh endpoint working")
    // Update access token
    if (refreshResult.data.access_token) {
      ACCESS_TOKEN = refreshResult.data.access_token
    }
  } else {
    console.log("❌ Token refresh endpoint failed:", refreshResult.status, getErrorMessage(refreshResult))
  }

  return refreshResult.status === 200
}

async function testProfile() {
  console.log("\n🧪 Testing User Profile...")

  if (!ACCESS_TOKEN) {
    console.log("❌ Cannot test profile: missing access token")
    return false
  }

  // Get profile
  const profileResult = await apiRequest("/user/profile", "GET", null, ACCESS_TOKEN)

  if (profileResult.status === 200 && profileResult.data) {
    console.log("✅ Get profile endpoint working")
    const userEmail = profileResult.data.user && profileResult.data.user.email ? profileResult.data.user.email : "N/A"
    console.log(`   User email: ${userEmail}`)
  } else {
    console.log("❌ Get profile endpoint failed:", profileResult.status, getErrorMessage(profileResult))
  }

  // Update profile
  const updateResult = await apiRequest(
    "/user/profile",
    "PUT",
    {
      name: "Updated Test User",
    },
    ACCESS_TOKEN,
  )

  if (updateResult.status === 200) {
    console.log("✅ Update profile endpoint working")
  } else {
    console.log("❌ Update profile endpoint failed:", updateResult.status, getErrorMessage(updateResult))
  }

  return profileResult.status === 200 && updateResult.status === 200
}

async function testPasswordChange() {
  console.log("\n🧪 Testing Password Change...")

  if (!ACCESS_TOKEN) {
    console.log("❌ Cannot test password change: missing access token")
    return false
  }

  const newPassword = "NewPassword456!"

  // Change password
  const changeResult = await apiRequest(
    "/user/change-password",
    "POST",
    {
      current_password: TEST_PASSWORD,
      new_password: newPassword,
    },
    ACCESS_TOKEN,
  )

  if (changeResult.status === 200) {
    console.log("✅ Change password endpoint working")

    // Try logging in with new password
    const loginResult = await apiRequest("/user/login", "POST", {
      identifier: TEST_EMAIL,
      password: newPassword,
    })

    if (loginResult.status === 200 && loginResult.data) {
      console.log("✅ Login with new password successful")
      // Update tokens
      if (loginResult.data.access_token) {
        ACCESS_TOKEN = loginResult.data.access_token
      }
      if (loginResult.data.refresh_token) {
        REFRESH_TOKEN = loginResult.data.refresh_token
      }
    } else {
      console.log("❌ Login with new password failed:", loginResult.status, getErrorMessage(loginResult))
      return false
    }
  } else {
    console.log("❌ Change password endpoint failed:", changeResult.status, getErrorMessage(changeResult))
    return false
  }

  return true
}

async function testPasswordReset() {
  console.log("\n🧪 Testing Password Reset...")

  // Request password reset
  const forgotResult = await apiRequest("/user/forgot-password", "POST", {
    email: TEST_EMAIL,
  })

  if (forgotResult.status === 200) {
    console.log("✅ Forgot password endpoint working")

    // In a real scenario, we'd get the reset token from the email
    // Here we'll mock it by generating a new token through login
    if (ACCESS_TOKEN) {
      // Mock reset token (in a real scenario, we'd get this from the email)
      const mockResetToken = ACCESS_TOKEN

      // Reset password
      const resetResult = await apiRequest("/user/reset-password", "POST", {
        token: mockResetToken,
        password: TEST_PASSWORD,
      })

      if (resetResult.status === 200) {
        console.log("✅ Reset password endpoint working (mocked token)")
      } else {
        console.log(
          "❌ Reset password endpoint failed (mocked token):",
          resetResult.status,
          getErrorMessage(resetResult),
        )
      }
    } else {
      console.log("⚠️ Skipping reset password test: no token available")
    }
  } else {
    console.log("❌ Forgot password endpoint failed:", forgotResult.status, getErrorMessage(forgotResult))
  }

  return forgotResult.status === 200
}

async function testLogout() {
  console.log("\n🧪 Testing Logout...")

  if (!ACCESS_TOKEN) {
    console.log("❌ Cannot test logout: missing access token")
    return false
  }

  const logoutResult = await apiRequest("/user/logout", "POST", null, ACCESS_TOKEN)

  if (logoutResult.status === 200) {
    console.log("✅ Logout endpoint working")
    ACCESS_TOKEN = null
    REFRESH_TOKEN = null
  } else {
    console.log("❌ Logout endpoint failed:", logoutResult.status, getErrorMessage(logoutResult))
  }

  return logoutResult.status === 200
}

async function testAccountDeletion() {
  console.log("\n🧪 Testing Account Deletion...")

  // We need to login again since we logged out
  const loginResult = await apiRequest("/user/login", "POST", {
    identifier: TEST_EMAIL,
    password: TEST_PASSWORD,
  })

  if (loginResult.status === 200 && loginResult.data && loginResult.data.access_token) {
    ACCESS_TOKEN = loginResult.data.access_token

    // Delete account
    const deleteResult = await apiRequest(
      "/user/delete-account",
      "POST",
      {
        password: TEST_PASSWORD,
      },
      ACCESS_TOKEN,
    )

    if (deleteResult.status === 200) {
      console.log("✅ Account deletion endpoint working")

      // Try logging in with deleted account
      const loginAfterDeleteResult = await apiRequest("/user/login", "POST", {
        identifier: TEST_EMAIL,
        password: TEST_PASSWORD,
      })

      if (loginAfterDeleteResult.status === 403 || loginAfterDeleteResult.status === 401) {
        console.log("✅ Deleted account cannot login")
      } else {
        console.log("❌ Deleted account can still login:", loginAfterDeleteResult.status)
      }
    } else {
      console.log("❌ Account deletion endpoint failed:", deleteResult.status, getErrorMessage(deleteResult))
    }

    return deleteResult.status === 200
  } else {
    console.log("❌ Cannot test account deletion: login failed")
    return false
  }
}

// Main test function
async function runTests() {
  console.log("🚀 Starting User Authentication API Tests...")
  console.log(`API Base URL: ${API_BASE_URL}`)
  console.log(`Test Email: ${TEST_EMAIL}`)
  console.log(`Test Phone: ${TEST_PHONE}`)

  // Check if server is available before running tests
  const isServerAvailable = await checkServerAvailability()
  if (!isServerAvailable) {
    console.log("\n❌ Aborting tests: API server is not available")
    return
  }

  const results = {
    registration: await testRegistration(),
    verification: await testVerification(),
    login: await testLogin(),
    tokenRefresh: await testTokenRefresh(),
    profile: await testProfile(),
    passwordChange: await testPasswordChange(),
    passwordReset: await testPasswordReset(),
    logout: await testLogout(),
    accountDeletion: await testAccountDeletion(),
  }

  console.log("\n📊 Test Results Summary:")
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? "✅" : "❌"} ${test.charAt(0).toUpperCase() + test.slice(1)}`)
  }

  const passedCount = Object.values(results).filter(Boolean).length
  const totalCount = Object.values(results).length

  console.log(`\n🏁 ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`)
}

// Run the tests
runTests().catch((error) => {
  console.error("Error running tests:", error)
})
