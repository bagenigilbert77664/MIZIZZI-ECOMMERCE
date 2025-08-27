/**
 * Authentication API for Mizizzi Store
 * Handles user authentication and Pesapal token management
 */

// User authentication functions
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("mizizzi_token")
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem("mizizzi_token", token)
}

export function removeAuthToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("mizizzi_token")
}

interface PesapalTokenData {
  token: string
  expiresAt: string
  obtainedAt: string
}

interface PesapalAuthResponse {
  token?: string
  expiryDate?: string
  error?: string
  message?: string
}

interface TokenInfo {
  hasToken: boolean
  expiresAt?: string
  obtainedAt?: string
  timeUntilExpiry: number
  isValid: boolean
  message?: string
}

class PesapalAuthManager {
  private tokenCache: PesapalTokenData | null = null
  private readonly maxRetries = 3
  private readonly retryDelay = 1000
  private readonly requestTimeout = 30000
  private readonly environment: string
  private readonly authUrl: string
  private readonly consumerKey: string
  private readonly consumerSecret: string

  constructor() {
    this.environment = process.env.NEXT_PUBLIC_PESAPAL_ENVIRONMENT || "production"

    if (this.environment === "production") {
      this.consumerKey = process.env.NEXT_PUBLIC_PESAPAL_CONSUMER_KEY || "MneI7qziaBzoGPuRhd1QZNTjZedp5Eqh"
      this.consumerSecret = process.env.NEXT_PUBLIC_PESAPAL_CONSUMER_SECRET || "Iy98/30kmlhg3/pjG1Wsneay9/Y="
      this.authUrl = "https://pay.pesapal.com/v3/api/Auth/RequestToken"
    } else {
      this.consumerKey = process.env.NEXT_PUBLIC_PESAPAL_CONSUMER_KEY || "qkio1BGGYAXTu2JOfm7XSXNjRrK5NpUJ"
      this.consumerSecret = process.env.NEXT_PUBLIC_PESAPAL_CONSUMER_SECRET || "osGQ364R49cXKeOYSpaOnT++rHs="
      this.authUrl = "https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken"
    }

    console.log(`[v0] PesapalAuthManager initialized for ${this.environment}`)
    console.log(`[v0] Auth URL: ${this.authUrl}`)
  }

  async getAccessToken(): Promise<string | null> {
    try {
      // Check cached token first
      const cachedToken = this.getCachedToken()
      if (cachedToken) {
        console.log("[v0] Using cached Pesapal access token")
        return cachedToken
      }

      // Request new token
      console.log("[v0] Requesting new Pesapal access token")
      return await this.requestNewToken()
    } catch (error) {
      console.error("[v0] Error getting Pesapal access token:", error)
      return null
    }
  }

  private getCachedToken(): string | null {
    if (!this.tokenCache) {
      return null
    }

    const currentTime = new Date()
    const expiresAt = new Date(this.tokenCache.expiresAt)

    // Check if token is still valid (with 30 second buffer)
    const bufferTime = new Date(expiresAt.getTime() - 30000)

    if (currentTime < bufferTime) {
      return this.tokenCache.token
    }

    // Token expired, clear cache
    this.tokenCache = null
    console.log("[v0] Pesapal token expired, cleared cache")
    return null
  }

  private async requestNewToken(): Promise<string | null> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[v0] Requesting Pesapal access token (attempt ${attempt}/${this.maxRetries})`)

        const response = await fetch(this.authUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            consumer_key: this.consumerKey,
            consumer_secret: this.consumerSecret,
          }),
        })

        console.log(`[v0] Pesapal auth response: ${response.status}`)

        if (response.ok) {
          const responseData: PesapalAuthResponse = await response.json()
          console.log("[v0] Pesapal auth response data:", responseData)

          const token = this.extractTokenFromResponse(responseData)
          if (token) {
            return token
          } else {
            console.error("[v0] No token found in Pesapal response")
          }
        } else {
          const errorText = await response.text()
          console.error(`[v0] Pesapal auth request failed: ${response.status} - ${errorText}`)
        }

        // Retry logic
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt
          console.log(`[v0] Retrying Pesapal auth in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`[v0] Pesapal auth request exception:`, error)

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt
          console.log(`[v0] Retrying Pesapal auth in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    console.error("[v0] Failed to obtain Pesapal access token after all retries")
    return null
  }

  private extractTokenFromResponse(responseData: PesapalAuthResponse): string | null {
    try {
      // Check for error first
      if (responseData.error) {
        console.error("[v0] Pesapal auth error:", responseData.error)
        return null
      }

      // Extract token
      const token = responseData.token
      if (!token) {
        console.error("[v0] No token field in Pesapal response")
        return null
      }

      console.log("[v0] Token extracted from Pesapal response")

      // Extract and parse expiry
      let expiresAt: Date
      if (responseData.expiryDate) {
        console.log(`[v0] Expiry extracted: ${responseData.expiryDate}`)
        try {
          const expiryStr = responseData.expiryDate.endsWith("Z")
            ? responseData.expiryDate
            : responseData.expiryDate + "Z"
          expiresAt = new Date(expiryStr)
        } catch (error) {
          console.warn("[v0] Could not parse expiry date, defaulting to 5 minutes")
          expiresAt = new Date(Date.now() + 5 * 60 * 1000)
        }
      } else {
        // Default to 5 minutes if no expiry provided
        expiresAt = new Date(Date.now() + 5 * 60 * 1000)
        console.warn("[v0] No expiry date provided, defaulting to 5 minutes")
      }

      // Cache the token
      this.tokenCache = {
        token,
        expiresAt: expiresAt.toISOString(),
        obtainedAt: new Date().toISOString(),
      }

      console.log("[v0] Successfully obtained and cached Pesapal access token")
      console.log(`[v0] Token expires at: ${expiresAt.toISOString()}`)

      return token
    } catch (error) {
      console.error("[v0] Error extracting token from Pesapal response:", error)
      return null
    }
  }

  getTokenInfo(): TokenInfo {
    if (!this.tokenCache) {
      return {
        hasToken: false,
        timeUntilExpiry: 0,
        isValid: false,
        message: "No token cached",
      }
    }

    const currentTime = new Date()
    const expiresAt = new Date(this.tokenCache.expiresAt)
    const timeUntilExpiry = Math.max(0, Math.floor((expiresAt.getTime() - currentTime.getTime()) / 1000))

    return {
      hasToken: true,
      expiresAt: this.tokenCache.expiresAt,
      obtainedAt: this.tokenCache.obtainedAt,
      timeUntilExpiry,
      isValid: timeUntilExpiry > 30, // 30 second buffer
    }
  }

  clearTokenCache(): void {
    this.tokenCache = null
    console.log("[v0] Pesapal token cache cleared")
  }

  async testAuthentication(): Promise<{ success: boolean; message: string; tokenInfo?: TokenInfo }> {
    try {
      const token = await this.getAccessToken()

      if (token) {
        const tokenInfo = this.getTokenInfo()
        return {
          success: true,
          message: "Pesapal authentication successful",
          tokenInfo,
        }
      } else {
        return {
          success: false,
          message: "Failed to obtain Pesapal access token",
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Pesapal authentication test failed: ${error}`,
      }
    }
  }
}

// Global Pesapal auth manager instance
let pesapalAuthManager: PesapalAuthManager | null = null

export function getPesapalAuthManager(): PesapalAuthManager {
  if (!pesapalAuthManager) {
    pesapalAuthManager = new PesapalAuthManager()
  }
  return pesapalAuthManager
}

export async function getPesapalAccessToken(): Promise<string | null> {
  const authManager = getPesapalAuthManager()
  return await authManager.getAccessToken()
}

export function getPesapalTokenInfo(): TokenInfo {
  const authManager = getPesapalAuthManager()
  return authManager.getTokenInfo()
}

export function clearPesapalTokenCache(): void {
  const authManager = getPesapalAuthManager()
  authManager.clearTokenCache()
}

export async function testPesapalAuthentication(): Promise<{
  success: boolean
  message: string
  tokenInfo?: TokenInfo
}> {
  const authManager = getPesapalAuthManager()
  return await authManager.testAuthentication()
}

// User session management
export interface User {
  id: string
  email: string
  name: string
  role?: string
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  const userStr = localStorage.getItem("current_user")
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function setCurrentUser(user: User): void {
  if (typeof window === "undefined") return
  localStorage.setItem("current_user", JSON.stringify(user))
}

export function removeCurrentUser(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem("current_user")
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null && getCurrentUser() !== null
}

export function logout(): void {
  removeAuthToken()
  removeCurrentUser()
  clearPesapalTokenCache()

  // Redirect to login page
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}

// API request helper with authentication
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

export { PesapalAuthManager }
