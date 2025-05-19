import fetch from "node-fetch"
import { exec } from "child_process"
import { promisify } from "util"
import dotenv from "dotenv"
import path from "path"

// Load environment variables from .env file if it exists
dotenv.config()

const execPromise = promisify(exec)

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000"
const ADMIN_EMAIL = "REDACTED-SENDER-EMAIL"
const ADMIN_PASSWORD = "junior2020"

// Adjust paths for the project structure
const TESTS_PATH = path.resolve(__dirname, "../../tests/admin-routes-test.js")

async function getAdminToken() {
  console.log("🔑 Attempting to log in and get admin token...")

  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Login failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    if (!data.access_token) {
      throw new Error("No access token returned from login endpoint")
    }

    console.log("✅ Successfully obtained admin token")

    // Check if user has admin role
    if (data.user && data.user.role === "admin") {
      console.log("✅ Verified user has admin role")
    } else {
      console.warn("⚠️ Warning: User may not have admin role")
    }

    return data.access_token
  } catch (error) {
    console.error("❌ Error getting admin token:", error.message)
    throw error
  }
}

async function runAdminTests(token) {
  console.log("\n🚀 Running admin routes tests...")
  console.log(`Using test file: ${TESTS_PATH}`)

  try {
    // Set the token as an environment variable for the test script
    process.env.TOKEN = token

    // Run the admin-routes-test.js file
    const { stdout, stderr } = await execPromise(`node ${TESTS_PATH}`)

    if (stderr) {
      console.error("❌ Error running tests:", stderr)
    }

    console.log(stdout)
    console.log("✅ Admin routes tests completed")
  } catch (error) {
    console.error("❌ Error running admin tests:", error.message)
    if (error.stdout) {
      console.log("Test output:", error.stdout)
    }
  }
}

// Main function
async function main() {
  console.log("🔍 Starting admin endpoints testing process")

  try {
    const token = await getAdminToken()
    await runAdminTests(token)
  } catch (error) {
    console.error("❌ Testing process failed:", error.message)
    process.exit(1)
  }
}

// Run the main function
main()
