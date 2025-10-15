"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { authService } from "@/services/auth"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  ShoppingCart,
  Key,
  Clock,
  AlertTriangle,
  Repeat,
  Shield,
  UserCog,
  Database,
  FileLock,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import axios from "axios"

export default function TokenTester() {
  const { user, isAuthenticated, isLoading, refreshAuthState } = useAuth()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    data?: any
    status?: number
    details?: any
  } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testingCart, setTestingCart] = useState(false)
  const [tokenAge, setTokenAge] = useState<number | null>(null)
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)
  const [tokenDecoded, setTokenDecoded] = useState<any>(null)
  const [testingSequence, setTestingSequence] = useState(false)
  const [sequenceResults, setSequenceResults] = useState<Array<{ step: string; success: boolean; message: string }>>([])
  const [testingExpiry, setTestingExpiry] = useState(false)
  const [testingEndpoints, setTestingEndpoints] = useState(false)
  const [endpointResults, setEndpointResults] = useState<
    Array<{ endpoint: string; success: boolean; message: string; status?: number }>
  >([])
  const [testingPermissions, setTestingPermissions] = useState(false)

  // Update token state
  useEffect(() => {
    updateTokenInfo()

    // Update tokens every 5 seconds
    const interval = setInterval(updateTokenInfo, 5000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const updateTokenInfo = () => {
    const token = authService.getAccessToken()
    setAccessToken(token)
    setRefreshToken(authService.getRefreshToken())
    setCsrfToken(authService.getCsrfToken())

    // Parse JWT token if available
    if (token) {
      try {
        // Get payload from JWT
        const payload = JSON.parse(atob(token.split(".")[1]))
        setTokenDecoded(payload)

        if (payload.exp) {
          const expiryTime = payload.exp * 1000 // Convert to milliseconds
          const expiryDate = new Date(expiryTime)
          setTokenExpiry(expiryDate)

          const currentTime = Date.now()
          const timeRemaining = expiryTime - currentTime
          setTokenAge(Math.max(0, Math.floor(timeRemaining / 1000))) // In seconds
        }
      } catch (e) {
        console.error("Error parsing token:", e)
        setTokenDecoded(null)
        setTokenAge(null)
        setTokenExpiry(null)
      }
    } else {
      setTokenDecoded(null)
      setTokenAge(null)
      setTokenExpiry(null)
    }
  }

  // Update the handleRefreshToken function to not send the CSRF token
  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    setTestResult(null)

    try {
      // Get the current refresh token
      const currentRefreshToken = authService.getRefreshToken()

      if (!currentRefreshToken) {
        throw new Error("No refresh token available")
      }

      try {
        // Create a custom instance for the refresh request to avoid interceptors
        const refreshInstance = axios.create({
          baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentRefreshToken}`,
            // Removed X-CSRF-TOKEN header to avoid CORS issues
          },
          withCredentials: true,
        })

        const response = await refreshInstance.post("/api/refresh", {})

        // Update token info after successful refresh
        updateTokenInfo()
        await refreshAuthState()

        setTestResult({
          success: true,
          message: "Token refreshed successfully!",
          data: {
            access_token: response.data.access_token ? response.data.access_token.substring(0, 15) + "..." : "N/A",
            csrf_token: response.data.csrf_token ? response.data.csrf_token.substring(0, 10) + "..." : "N/A",
          },
        })
      } catch (error: any) {
        // Check specifically for CORS errors
        const isCorsError =
          error.message?.includes("CORS") || error.message?.includes("Network Error") || error.code === "ERR_NETWORK"

        if (isCorsError) {
          setTestResult({
            success: false,
            message: "CORS error detected when refreshing token",
            status: error.response?.status,
            details: {
              error: "This is likely a CORS configuration issue on the server",
              message: error.message,
              solution: "The server needs to allow the X-CSRF-TOKEN header in CORS preflight responses",
              serverConfig: "Add 'X-CSRF-TOKEN' to the Access-Control-Allow-Headers in your server CORS configuration",
            },
          })
        } else {
          setTestResult({
            success: false,
            message: `Token refresh failed: ${error.response?.data?.msg || error.message || "Unknown error"}`,
            status: error.response?.status,
            details: error.response?.data,
          })
        }
      }
    } catch (error: any) {
      console.error("Token refresh test failed:", error)

      setTestResult({
        success: false,
        message: `Token refresh failed: ${error.response?.data?.msg || error.message || "Unknown error"}`,
        status: error.response?.status,
        details: error.response?.data,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Add a new function to test token refresh without CSRF token
  const handleRefreshTokenNoCsrf = async () => {
    setIsRefreshing(true)
    setTestResult(null)

    try {
      // Get the current refresh token
      const currentRefreshToken = authService.getRefreshToken()

      if (!currentRefreshToken) {
        throw new Error("No refresh token available")
      }

      // Make the refresh request WITHOUT the CSRF token header
      const response = await api.post(
        "/api/refresh",
        {},
        {
          headers: {
            Authorization: `Bearer ${currentRefreshToken}`,
            // No CSRF token header
          },
          withCredentials: true,
        },
      )

      // Update token info after successful refresh
      updateTokenInfo()
      await refreshAuthState()

      setTestResult({
        success: true,
        message: "Token refreshed successfully without CSRF token!",
        data: {
          access_token: response.data.access_token ? response.data.access_token.substring(0, 15) + "..." : "N/A",
          csrf_token: response.data.csrf_token ? response.data.csrf_token.substring(0, 10) + "..." : "N/A",
        },
      })
    } catch (error: any) {
      console.error("Token refresh test failed:", error)

      setTestResult({
        success: false,
        message: `Token refresh failed: ${error.response?.data?.msg || error.message || "Unknown error"}`,
        status: error.response?.status,
        details: error.response?.data,
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Add a new function to test CORS preflight
  const handleTestCorsOptions = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      // Use fetch to make a preflight OPTIONS request
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/refresh`, {
        method: "OPTIONS",
        headers: {
          Origin: window.location.origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Authorization, Content-Type, X-CSRF-TOKEN",
        },
      })

      if (response.ok) {
        // Check what headers are allowed
        const allowedHeaders = response.headers.get("Access-Control-Allow-Headers")
        const allowedMethods = response.headers.get("Access-Control-Allow-Methods")
        const allowedOrigin = response.headers.get("Access-Control-Allow-Origin")

        setTestResult({
          success: true,
          message: "CORS preflight request successful",
          data: {
            status: response.status,
            allowedHeaders,
            allowedMethods,
            allowedOrigin,
            hasCsrfHeader: allowedHeaders?.toLowerCase().includes("x-csrf-token") || false,
          },
        })
      } else {
        setTestResult({
          success: false,
          message: `CORS preflight request failed with status: ${response.status}`,
          status: response.status,
        })
      }
    } catch (error: any) {
      console.error("CORS test failed:", error)

      setTestResult({
        success: false,
        message: `CORS test failed: ${error.message || "Unknown error"}`,
      })
    } finally {
      setIsTesting(false)
    }
  }

  // Test API call with current token
  const handleTestApiCall = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await api.get("/api/auth/me")

      setTestResult({
        success: true,
        message: `API call successful! User: ${response.data.email || "Unknown"}`,
        data: response.data,
      })
    } catch (error: any) {
      console.error("API test failed:", error)

      setTestResult({
        success: false,
        message: `API call failed: ${error.response?.data?.msg || error.message || "Unknown error"}`,
        status: error.response?.status,
      })
    } finally {
      setIsTesting(false)
    }
  }

  // Test cart API call
  const handleTestCartApi = async () => {
    setTestingCart(true)
    setTestResult(null)

    try {
      const response = await api.get("/api/cart")

      setTestResult({
        success: true,
        message: `Cart API call successful! Items: ${response.data.length || 0}`,
        data: response.data,
      })
    } catch (error: any) {
      console.error("Cart API test failed:", error)

      setTestResult({
        success: false,
        message: `Cart API call failed: ${error.response?.data?.msg || error.message || "Unknown error"}`,
        status: error.response?.status,
      })
    } finally {
      setTestingCart(false)
    }
  }

  // Run a sequence of tests
  const handleTestSequence = async () => {
    setTestingSequence(true)
    setSequenceResults([])

    try {
      // Step 1: Test current token with /api/auth/me
      let result = { step: "1. Test current token", success: false, message: "" }
      try {
        const response = await api.get("/api/auth/me")
        result.success = true
        result.message = `Current token works! User: ${response.data.email || "Unknown"}`
      } catch (error: any) {
        result.message = `Current token failed: ${error.response?.data?.msg || error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 2: Refresh token
      result = { step: "2. Refresh token", success: false, message: "" }
      try {
        const newToken = await authService.refreshAccessToken()
        updateTokenInfo()
        result.success = true
        result.message = "Token refreshed successfully!"
      } catch (error: any) {
        result.message = `Token refresh failed: ${error.response?.data?.msg || error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 3: Test new token with /api/auth/me
      result = { step: "3. Test new token", success: false, message: "" }
      try {
        const response = await api.get("/api/auth/me")
        result.success = true
        result.message = `New token works! User: ${response.data.email || "Unknown"}`
      } catch (error: any) {
        result.message = `New token failed: ${error.response?.data?.msg || error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 4: Test cart API
      result = { step: "4. Test cart API", success: false, message: "" }
      try {
        const response = await api.get("/api/cart")
        result.success = true
        result.message = `Cart API works! Items: ${response.data.length || 0}`
      } catch (error: any) {
        result.message = `Cart API failed: ${error.response?.data?.msg || error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 5: Test profile API
      result = { step: "5. Test profile API", success: false, message: "" }
      try {
        const response = await api.get("/api/profile")
        result.success = true
        result.message = `Profile API works! User: ${response.data.user?.email || "Unknown"}`
      } catch (error: any) {
        result.message = `Profile API failed: ${error.response?.data?.msg || error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 6: Multiple rapid refreshes
      result = { step: "6. Multiple rapid refreshes", success: false, message: "" }
      try {
        // Try to refresh 3 times in quick succession
        const promises = [
          authService.refreshAccessToken(),
          authService.refreshAccessToken(),
          authService.refreshAccessToken(),
        ]

        await Promise.all(promises)
        updateTokenInfo()
        result.success = true
        result.message = "Multiple refreshes handled correctly!"
      } catch (error: any) {
        result.message = `Multiple refreshes test failed: ${error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])
    } catch (error) {
      console.error("Test sequence failed:", error)
    } finally {
      setTestingSequence(false)
    }
  }

  // Test all available endpoints
  const handleTestEndpoints = async () => {
    setTestingEndpoints(true)
    setEndpointResults([])

    const endpoints = [
      { url: "/api/auth/me", name: "User Auth Status" },
      { url: "/api/profile", name: "User Profile" },
      { url: "/api/cart", name: "Cart" },
      { url: "/api/orders", name: "Orders" },
      { url: "/api/wishlist/user", name: "Wishlist" }, // Updated to use correct wishlist endpoint
      { url: "/api/addresses", name: "Addresses" },
      { url: "/api/notifications", name: "Notifications" },
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint.url)
        setEndpointResults((prev) => [
          ...prev,
          {
            endpoint: endpoint.name,
            success: true,
            message: `Status: ${response.status} OK`,
            status: response.status,
          },
        ])
      } catch (error: any) {
        setEndpointResults((prev) => [
          ...prev,
          {
            endpoint: endpoint.name,
            success: false,
            message: error.response?.data?.msg || error.message || "Request failed",
            status: error.response?.status,
          },
        ])
      }

      // Small delay to prevent overwhelming the server
      await new Promise((r) => setTimeout(r, 500))
    }

    setTestingEndpoints(false)
  }

  // Simulate token expiry
  const handleSimulateExpiry = async () => {
    setTestingExpiry(true)
    setTestResult(null)

    try {
      // Invalidate the current token by setting an expired one
      if (typeof window !== "undefined") {
        // Create an expired token (this is just for testing, not a real token)
        const expiredToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        localStorage.setItem("mizizzi_token", expiredToken)

        // Force a reload of the auth service
        authService.initializeTokens()
        updateTokenInfo()
      }

      // Now try to make an API call, which should trigger a token refresh
      const response = await api.get("/api/auth/me")

      setTestResult({
        success: true,
        message: "Auto-refresh worked! API call succeeded after token expiry.",
        data: response.data,
      })
    } catch (error: any) {
      console.error("Expiry test failed:", error)

      setTestResult({
        success: false,
        message: `Expiry test failed: ${error.response?.data?.msg || error.message || "Unknown error"}`,
        status: error.response?.status,
      })
    } finally {
      setTestingExpiry(false)
    }
  }

  // Test permissions and access levels
  const handleTestPermissions = async () => {
    setTestingPermissions(true)
    setSequenceResults([])

    const testRoutes = [
      { path: "/api/profile", name: "User Profile" },
      { path: "/api/cart", name: "Cart" },
      { path: "/api/admin/dashboard/stats", name: "Admin Dashboard" },
      { path: "/api/admin/products", name: "Admin Products" },
      { path: "/api/admin/orders", name: "Admin Orders" },
    ]

    for (const route of testRoutes) {
      try {
        const response = await api.get(route.path)
        setSequenceResults((prev) => [
          ...prev,
          {
            step: `Access ${route.name}`,
            success: true,
            message: `Access granted to ${route.name}. Status: ${response.status}`,
          },
        ])
      } catch (error: any) {
        const status = error.response?.status
        const isPermissionDenied = status === 401 || status === 403

        setSequenceResults((prev) => [
          ...prev,
          {
            step: `Access ${route.name}`,
            success: !isPermissionDenied, // It's a success if we EXPECT to be denied
            message: isPermissionDenied
              ? `Correctly denied access to ${route.name} (${status})`
              : `Error accessing ${route.name}: ${error.message}`,
          },
        ])
      }

      // Small delay to prevent overwhelming the server
      await new Promise((r) => setTimeout(r, 300))
    }

    setTestingPermissions(false)
  }

  // Format token for display
  const formatToken = (token: string | null): string => {
    if (!token) return "Not available"
    if (token.length <= 12) return token
    return `${token.substring(0, 6)}...${token.substring(token.length - 6)}`
  }

  // Format token age
  const formatTokenAge = (seconds: number | null): string => {
    if (seconds === null) return "Unknown"
    if (seconds <= 0) return "Expired"

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }

    return `${seconds}s`
  }

  // Calculate token lifespan percentage
  const calculateTokenLifespan = (): number => {
    if (!tokenDecoded || !tokenDecoded.exp || !tokenDecoded.iat) return 0

    const totalLifespan = (tokenDecoded.exp - tokenDecoded.iat) * 1000
    const elapsed = Date.now() - tokenDecoded.iat * 1000
    const percentage = Math.max(0, Math.min(100, (elapsed / totalLifespan) * 100))

    return Math.round(percentage)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="status">
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="status">Token Status</TabsTrigger>
          <TabsTrigger value="tests">Basic Tests</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoint Tests</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Tests</TabsTrigger>
          <TabsTrigger value="cors">CORS Diagnostics</TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          {/* Auth Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Authentication Status
              </CardTitle>
              <CardDescription>Current user authentication state</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading authentication state...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Status:</span>
                    {isAuthenticated ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Authenticated
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Authenticated
                      </Badge>
                    )}
                  </div>

                  {user && (
                    <div className="space-y-2">
                      <div>
                        <span className="font-semibold">User ID:</span> {user.id}
                      </div>
                      <div>
                        <span className="font-semibold">Email:</span> {user.email}
                      </div>
                      <div>
                        <span className="font-semibold">Name:</span> {user.name || "N/A"}
                      </div>
                      <div>
                        <span className="font-semibold">Role:</span>{" "}
                        {typeof user.role === "string"
                          ? user.role
                          : user.role && typeof user.role === "object" && "value" in user.role
                          ? user.role.value
                          : "N/A"}
                      </div>
                      <div>
                        <span className="font-semibold">Email Verified:</span>{" "}
                        {user.email_verified ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Not Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Token Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Token Information
              </CardTitle>
              <CardDescription>Current authentication tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">Access Token:</span>
                    {tokenAge !== null && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTokenAge(tokenAge)}
                      </Badge>
                    )}
                  </div>

                  {tokenExpiry && (
                    <div className="mb-2 text-xs text-muted-foreground">Expires: {tokenExpiry.toLocaleString()}</div>
                  )}

                  {tokenDecoded && tokenDecoded.exp && tokenDecoded.iat && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Token Lifespan</span>
                        <span>{calculateTokenLifespan()}%</span>
                      </div>
                      <Progress value={calculateTokenLifespan()} className="h-1.5" />
                    </div>
                  )}

                  <code className="bg-muted p-2 rounded block text-xs overflow-x-auto">{formatToken(accessToken)}</code>
                </div>

                <div>
                  <div className="font-semibold mb-1">Refresh Token:</div>
                  <code className="bg-muted p-2 rounded block text-xs overflow-x-auto">
                    {formatToken(refreshToken)}
                  </code>
                </div>

                <div>
                  <div className="font-semibold mb-1">CSRF Token:</div>
                  <code className="bg-muted p-2 rounded block text-xs overflow-x-auto">{formatToken(csrfToken)}</code>
                </div>

                {tokenDecoded && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="decoded">
                      <AccordionTrigger>
                        <span className="text-sm font-semibold">Decoded Token Payload</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(tokenDecoded, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests">
          <Card>
            <CardHeader>
              <CardTitle>Basic Tests</CardTitle>
              <CardDescription>Test token refresh and API calls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Token Refresh Tests</h3>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <Button
                      onClick={handleRefreshToken}
                      disabled={isRefreshing || !isAuthenticated}
                      className="flex items-center gap-2"
                    >
                      {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin" />}
                      {isRefreshing ? "Refreshing Token..." : "Refresh Token"}
                    </Button>

                    <Button
                      onClick={handleRefreshTokenNoCsrf}
                      disabled={isRefreshing || !isAuthenticated}
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin" />}
                      Refresh Without CSRF
                    </Button>

                    <Button
                      onClick={handleTestCorsOptions}
                      disabled={isTesting}
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      {isTesting && <RefreshCw className="h-4 w-4 animate-spin" />}
                      Test CORS Preflight
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-2">API Tests</h3>
                  <div className="flex flex-wrap gap-4 mb-4">
                    <Button
                      onClick={handleTestApiCall}
                      disabled={isTesting || !isAuthenticated}
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      {isTesting && <RefreshCw className="h-4 w-4 animate-spin" />}
                      <User className="h-4 w-4 mr-1" />
                      {isTesting ? "Testing..." : "Test User API"}
                    </Button>

                    <Button
                      onClick={handleTestCartApi}
                      disabled={testingCart || !isAuthenticated}
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      {testingCart && <RefreshCw className="h-4 w-4 animate-spin" />}
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      {testingCart ? "Testing..." : "Test Cart API"}
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <Alert className="mt-4" variant={testResult.success ? "default" : "destructive"}>
                    <AlertTitle>
                      {testResult.success ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Error {testResult.status && `(${testResult.status})`}
                        </span>
                      )}
                    </AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>{testResult.message}</p>

                      {testResult.data && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="data">
                            <AccordionTrigger>
                              <span className="text-sm">Response Data</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(testResult.data, null, 2)}
                              </pre>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}

                      {testResult.details && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="details">
                            <AccordionTrigger>
                              <span className="text-sm">Details & Solutions</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2">
                                {testResult.details.solution && (
                                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                                    <p className="font-medium text-amber-800">Suggested Solution:</p>
                                    <p className="text-sm text-amber-700">{testResult.details.solution}</p>
                                  </div>
                                )}
                                {testResult.details.serverConfig && (
                                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="font-medium text-blue-800">Server Configuration:</p>
                                    <p className="text-sm text-blue-700">{testResult.details.serverConfig}</p>
                                  </div>
                                )}
                                <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(testResult.details, null, 2)}
                                </pre>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Note: You must be logged in to test token refresh and API calls.
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Endpoint Tests Tab */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                API Endpoint Tests
              </CardTitle>
              <CardDescription>Test access to various API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleTestEndpoints}
                disabled={testingEndpoints || !isAuthenticated}
                className="flex items-center gap-2 mb-6"
              >
                {testingEndpoints && <RefreshCw className="h-4 w-4 animate-spin" />}
                {testingEndpoints ? "Testing..." : "Test All Endpoints"}
              </Button>

              {endpointResults.length > 0 && (
                <div className="space-y-3">
                  {endpointResults.map((result, index) => (
                    <div
                      key={index}
                      className={`border rounded-md p-3 ${
                        result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{result.endpoint}</span>
                        {result.success ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            {result.status || 200}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">{result.status || "Error"}</Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground">{result.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tests Tab */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Tests</CardTitle>
              <CardDescription>Test complex authentication scenarios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test Sequence */}
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  Authentication Flow Test
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Run a sequence of tests to verify the entire authentication flow
                </p>

                <Button
                  onClick={handleTestSequence}
                  disabled={testingSequence || !isAuthenticated}
                  className="flex items-center gap-2 mb-4"
                >
                  {testingSequence && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {testingSequence ? "Running Tests..." : "Run Authentication Flow"}
                </Button>

                {sequenceResults.length > 0 ? (
                  <div className="space-y-3 mt-4">
                    {sequenceResults.map((result, index) => (
                      <div key={index} className="border rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={result.success ? "default" : "destructive"} className="h-6">
                            {result.success ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {result.step}
                          </Badge>
                        </div>
                        <p className="text-sm">{result.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  "Run Authentication Flow"
                )}

                {sequenceResults.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {sequenceResults.map((result, index) => (
                      <div key={index} className="border rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={result.success ? "default" : "destructive"} className="h-6">
                            {result.success ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {result.step}
                          </Badge>
                        </div>
                        <p className="text-sm">{result.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Permission Tests */}
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permission Tests
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Test access permissions and authorization levels</p>

                <Button
                  onClick={handleTestPermissions}
                  disabled={testingPermissions || !isAuthenticated}
                  variant="outline"
                  className="flex items-center gap-2 mb-4 bg-transparent"
                >
                  {testingPermissions && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <UserCog className="h-4 w-4 mr-1" />
                  {testingPermissions ? "Testing..." : "Test User Permissions"}
                </Button>

                {sequenceResults.length > 0 && testingPermissions === false && (
                  <div className="space-y-3 mt-4">
                    {sequenceResults.map((result, index) => (
                      <div key={index} className="border rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={result.success ? "default" : "destructive"} className="h-6">
                            {result.success ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {result.step}
                          </Badge>
                        </div>
                        <p className="text-sm">{result.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Simulate Token Expiry */}
              <div>
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Simulate Token Expiry
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Test how the system handles expired tokens</p>

                <Button
                  onClick={handleSimulateExpiry}
                  disabled={testingExpiry || !isAuthenticated}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                >
                  {testingExpiry && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <FileLock className="h-4 w-4 mr-1" />
                  {testingExpiry ? "Testing..." : "Simulate Token Expiry"}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Warning: These tests may temporarily disrupt your authentication state.
            </CardFooter>
          </Card>
        </TabsContent>

        {/* CORS Diagnostics Tab */}
        <TabsContent value="cors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                CORS Diagnostics
              </CardTitle>
              <CardDescription>
                Diagnose Cross-Origin Resource Sharing (CORS) issues with authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <h3 className="text-lg font-medium text-amber-800 mb-2">CORS Issues Detected</h3>
                <p className="text-sm text-amber-700 mb-2">
                  Your browser console shows CORS errors when refreshing tokens. This is likely due to missing headers
                  in the server's CORS configuration.
                </p>
                <p className="text-sm text-amber-700">
                  The server needs to allow the <code className="bg-amber-100 px-1 rounded">X-CSRF-TOKEN</code> header
                  in its CORS configuration.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Server Configuration Fix</h3>
                <div className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                  <p className="mb-2 text-muted-foreground">Add this to your Flask backend:</p>
                  <pre className="text-xs">
                    {`@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', '*'))
    response.headers.add('Access-Control-Allow-Headers',
                        'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN')
    response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Test CORS Configuration</h3>
                <div className="flex flex-wrap gap-4 mb-4">
                  <Button onClick={handleTestCorsOptions} disabled={isTesting} className="flex items-center gap-2">
                    {isTesting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Test CORS Preflight
                  </Button>

                  <Button
                    onClick={handleRefreshTokenNoCsrf}
                    disabled={isRefreshing || !isAuthenticated}
                    variant="outline"
                    className="flex items-center gap-2 bg-transparent"
                  >
                    {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Refresh Without CSRF
                  </Button>
                </div>

                {testResult && (
                  <Alert className="mt-4" variant={testResult.success ? "default" : "destructive"}>
                    <AlertTitle>
                      {testResult.success ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Error {testResult.status && `(${testResult.status})`}
                        </span>
                      )}
                    </AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>{testResult.message}</p>

                      {testResult.data && (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="data">
                            <AccordionTrigger>
                              <span className="text-sm">Response Data</span>
                            </AccordionTrigger>
                            <AccordionContent>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(testResult.data, null, 2)}
                              </pre>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Temporary Workaround</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If you can't modify the server immediately, you can try refreshing without sending the CSRF token
                  header.
                </p>
                <div className="bg-muted p-3 rounded-md overflow-x-auto text-sm">
                  <pre className="text-xs">
                    {`// In your auth service or API client
const refreshToken = async () => {
  try {
    const response = await api.post("/api/refresh", {}, {
      headers: {
        Authorization: \`Bearer \${refreshToken}\`,
        // Remove the X-CSRF-TOKEN header temporarily
      },
      withCredentials: true,
    });
    return response.data.access_token;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
