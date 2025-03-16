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
import { CheckCircle, XCircle, RefreshCw, User, ShoppingCart, Key, Clock, AlertTriangle, Repeat } from "lucide-react"

export default function TokenTester() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testingCart, setTestingCart] = useState(false)
  const [tokenAge, setTokenAge] = useState<number | null>(null)
  const [testingSequence, setTestingSequence] = useState(false)
  const [sequenceResults, setSequenceResults] = useState<Array<{ step: string; success: boolean; message: string }>>([])
  const [testingExpiry, setTestingExpiry] = useState(false)

  // Update token state
  useEffect(() => {
    updateTokenInfo()

    // Update tokens every 5 seconds
    const interval = setInterval(updateTokenInfo, 5000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const updateTokenInfo = () => {
    setAccessToken(authService.getAccessToken())
    setRefreshToken(authService.getRefreshToken())
    setCsrfToken(authService.getCsrfToken())

    // Calculate token age if we have a token
    const token = authService.getAccessToken()
    if (token) {
      try {
        // Get payload from JWT
        const payload = JSON.parse(atob(token.split(".")[1]))
        if (payload.exp) {
          const expiryTime = payload.exp * 1000 // Convert to milliseconds
          const currentTime = Date.now()
          const timeRemaining = expiryTime - currentTime
          setTokenAge(Math.max(0, Math.floor(timeRemaining / 1000))) // In seconds
        }
      } catch (e) {
        console.error("Error parsing token:", e)
        setTokenAge(null)
      }
    } else {
      setTokenAge(null)
    }
  }

  // Test token refresh
  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    setTestResult(null)

    try {
      const newToken = await authService.refreshAccessToken()
      updateTokenInfo()

      setTestResult({
        success: true,
        message: "Token refreshed successfully!",
      })
    } catch (error: any) {
      console.error("Token refresh test failed:", error)

      setTestResult({
        success: false,
        message: `Token refresh failed: ${error.message || "Unknown error"}`,
      })
    } finally {
      setIsRefreshing(false)
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
      })
    } catch (error: any) {
      console.error("API test failed:", error)

      setTestResult({
        success: false,
        message: `API call failed: ${error.message || "Unknown error"}`,
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
      })
    } catch (error: any) {
      console.error("Cart API test failed:", error)

      setTestResult({
        success: false,
        message: `Cart API call failed: ${error.message || "Unknown error"}`,
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
        result.message = `Current token failed: ${error.message || "Unknown error"}`
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
        result.message = `Token refresh failed: ${error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 3: Test new token with /api/auth/me
      result = { step: "3. Test new token", success: false, message: "" }
      try {
        const response = await api.get("/api/auth/me")
        result.success = true
        result.message = `New token works! User: ${response.data.email || "Unknown"}`
      } catch (error: any) {
        result.message = `New token failed: ${error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 4: Test cart API
      result = { step: "4. Test cart API", success: false, message: "" }
      try {
        const response = await api.get("/api/cart")
        result.success = true
        result.message = `Cart API works! Items: ${response.data.length || 0}`
      } catch (error: any) {
        result.message = `Cart API failed: ${error.message || "Unknown error"}`
      }
      setSequenceResults((prev) => [...prev, result])

      // Step 5: Multiple rapid refreshes
      result = { step: "5. Multiple rapid refreshes", success: false, message: "" }
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
      })
    } catch (error: any) {
      console.error("Expiry test failed:", error)

      setTestResult({
        success: false,
        message: `Expiry test failed: ${error.message || "Unknown error"}`,
      })
    } finally {
      setTestingExpiry(false)
    }
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="status">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Tests</TabsTrigger>
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
                        <span className="font-semibold">Role:</span> {user.role || "N/A"}
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
                  onClick={handleTestApiCall}
                  disabled={isTesting || !isAuthenticated}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isTesting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {isTesting ? "Testing..." : "Test User API"}
                </Button>

                <Button
                  onClick={handleTestCartApi}
                  disabled={testingCart || !isAuthenticated}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {testingCart && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <ShoppingCart className="h-4 w-4" />
                  {testingCart ? "Testing..." : "Test Cart API"}
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
                        Error
                      </span>
                    )}
                  </AlertTitle>
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Note: You must be logged in to test token refresh and API calls.
            </CardFooter>
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
                  Test Sequence
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
                  {testingSequence ? "Running Tests..." : "Run Test Sequence"}
                </Button>

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
                  className="flex items-center gap-2"
                >
                  {testingExpiry && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {testingExpiry ? "Testing..." : "Simulate Token Expiry"}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Warning: These tests may temporarily disrupt your authentication state.
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

