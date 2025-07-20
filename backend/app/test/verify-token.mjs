import fetch from "node-fetch"
import chalk from "chalk"

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000"
const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc1MDczOTcwOSwianRpIjoiYTgxODBhZGItNTMyZS00ZTQ4LThhM2MtOTUzYTU5Yzk2OTY2IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjIwIiwibmJmIjoxNzUwNzM5NzA5LCJjc3JmIjoiMjdkMzIxMGItZmMzZi00ZmMyLWIzNDEtM2NkY2ZkZTc3M2JhIiwiZXhwIjoxNzUwNzQzMzA5LCJyb2xlIjoiYWRtaW4ifQ.ZitsW6-dpYH20IO_KrMXidRlvliiEEoePPzn-1bw0UE"

async function verifyToken() {
  console.log(chalk.blue.bold("🔐 Verifying Admin Token..."))
  console.log(chalk.cyan(`API Base URL: ${API_BASE_URL}`))
  console.log(chalk.cyan(`Token (first 20 chars): ${TOKEN.substring(0, 20)}...`))

  // Decode JWT to check expiration
  try {
    const payload = JSON.parse(Buffer.from(TOKEN.split(".")[1], "base64").toString())
    console.log(chalk.gray(`Token Subject: ${payload.sub}`))
    console.log(chalk.gray(`Token Role: ${payload.role}`))
    console.log(chalk.gray(`Token Expires: ${new Date(payload.exp * 1000).toISOString()}`))
    console.log(chalk.gray(`Current Time: ${new Date().toISOString()}`))

    if (payload.exp * 1000 < Date.now()) {
      console.log(chalk.red("❌ Token has expired!"))
      return false
    } else {
      console.log(chalk.green("✅ Token is not expired"))
    }
  } catch (e) {
    console.log(chalk.red("❌ Failed to decode token:", e.message))
    return false
  }

  // Test basic API connectivity
  try {
    console.log(chalk.blue("\n🌐 Testing API connectivity..."))
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      console.log(chalk.green("✅ API server is reachable"))
    } else {
      console.log(chalk.yellow(`⚠️ API health check returned: ${response.status}`))
    }
  } catch (error) {
    console.log(chalk.red("❌ Cannot reach API server:", error.message))
    return false
  }

  // Test admin dashboard endpoint specifically
  try {
    console.log(chalk.blue("\n🏠 Testing admin dashboard endpoint..."))
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    console.log(chalk.gray(`Response status: ${response.status} ${response.statusText}`))

    if (response.ok) {
      const data = await response.json()
      console.log(chalk.green("✅ Admin dashboard endpoint is working!"))
      console.log(chalk.gray(`Dashboard data keys: ${Object.keys(data).join(", ")}`))
      return true
    } else {
      const errorText = await response.text()
      console.log(chalk.red(`❌ Admin dashboard failed: ${response.status}`))
      console.log(chalk.red(`Error response: ${errorText}`))
      return false
    }
  } catch (error) {
    console.log(chalk.red("❌ Error testing admin dashboard:", error.message))
    return false
  }
}

// Run verification
verifyToken()
  .then((success) => {
    if (success) {
      console.log(chalk.green.bold("\n🎉 Token verification successful! You can now run the full admin tests."))
      console.log(chalk.cyan("Run: node tests/admin-routes-test.js"))
    } else {
      console.log(chalk.red.bold("\n❌ Token verification failed. Please get a fresh token."))
      console.log(chalk.yellow("Get a new token with:"))
      console.log(
        chalk.gray(
          `curl -X POST -H "Content-Type: application/json" -d '{"identifier":"REDACTED-SENDER-EMAIL","password":"junior2020"}' "${API_BASE_URL}/api/login"`,
        ),
      )
    }
  })
  .catch((error) => {
    console.error(chalk.red("Verification error:"), error)
  })
