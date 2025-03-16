"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { authService } from "@/services/auth"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw, User, ShoppingCart, Key } from "lucide-react"

export default function AuthTestPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testingCart, setTestingCart] = useState(false)

  // Update token state
  useEffect(() => {
    setAccessToken(authService.getAccessToken())
    setRefreshToken(authService.getRefreshToken())
    setCsrfToken(authService.getCsrfToken())

    // Update tokens every 5 seconds
    const interval = setInterval(() => {
      setAccessToken(authService.getAccessToken())
      setRefreshToken(authService.getRefreshToken())
      setCsrfToken(authService.getCsrfToken())
    }, 5000)

    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Test token refresh
  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    setTestResult(null)

    try {
      const newToken = await authService.refreshAccessToken()
      setAccessToken(newToken)
      setCsrfToken(authService.getCsrfToken())

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

  // Format token for display
  const formatToken = (token: string | null): string => {
    if (!token) return "Not available"
    if (token.length <= 12) return token
    return `${token.substring(0, 6)}...${token.substring(token.length - 6)}`
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>

      <div className="grid gap-6 md:grid-cols-2">
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
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Authenticated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      Not Authenticated
                    </span>
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
                <div className="font-semibold mb-1">Access Token:</div>
                <code className="bg-muted p-2 rounded block text-xs overflow-x-auto">{formatToken(accessToken)}</code>
              </div>

              <div>
                <div className="font-semibold mb-1">Refresh Token:</div>
                <code className="bg-muted p-2 rounded block text-xs overflow-x-auto">{formatToken(refreshToken)}</code>
              </div>

              <div>
                <div className="font-semibold mb-1">CSRF Token:</div>
                <code className="bg-muted p-2 rounded block text-xs overflow-x-auto">{formatToken(csrfToken)}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Actions */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
            <CardDescription>Test token refresh and API calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
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
      </div>
    </div>
  )
}

