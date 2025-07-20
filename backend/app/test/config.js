// Configuration file for API tests
// You can customize these settings or use environment variables

export default {
  // API base URL - can be overridden with API_BASE_URL environment variable
  apiBaseUrl: "http://localhost:5000/api",

  // Test user credentials
  testUser: {
    name: "Test User",
    // Email and phone will be generated randomly in the tests
    password: "TestPassword123!"
  },

  // Request timeout in milliseconds
  timeout: 10000,

  // Mock verification code (for testing purposes)
  mockVerificationCode: "123456"
}
