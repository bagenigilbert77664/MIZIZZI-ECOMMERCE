"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Clock, RefreshCw, Shield, Key, User, Database, AlertTriangle, Info } from "lucide-react"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import adminService from "@/services/admin"

interface TestResult {
  name: string
  status: "pending" | "success" | "error" | "warning"
  message: string
  details?: any
  duration?: number
}

interface TokenInfo {
  token: string | null
  decoded: any
  isValid: boolean
  expiresAt: string | null
  timeUntilExpiry: string | null
  role: string | null
}

export default function AdminTokenTestPage() {
  const { user, isAuthenticated, getToken, refreshToken, logout } = useAdminAuth()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [storageInfo, setStorageInfo] = useState<any>({})

  // Get token information
  const analyzeToken = () => {
    try {
      const token = getToken()
      if (!token) {
        setTokenInfo({
          token: null,
          decoded: null,
          isValid: false,
          expiresAt: null,
          timeUntilExpiry: null,
          role: null,
        })
        return
      }

      // Decode JWT token
      const base64Url = token.split(".")[1]
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      )
      const decoded = JSON.parse(jsonPayload)

      const now = Math.floor(Date.now() / 1000)
      const isValid = decoded.exp && decoded.exp > now
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : null

      let timeUntilExpiry = null
      if (decoded.exp) {
        const secondsUntilExpiry = decoded.exp - now
        if (secondsUntilExpiry > 0) {
          const minutes = Math.floor(secondsUntilExpiry / 60)
          const seconds = secondsUntilExpiry % 60
          timeUntilExpiry = `${minutes}m ${seconds}s`
        } else {
          timeUntilExpiry = "Expired"
        }
      }

      const role = decoded.role || decoded.user_role || decoded.user?.role || "Unknown"

      setTokenInfo({
        token: token.substring(0, 20) + "...",
        decoded,
        isValid,
        expiresAt,
        timeUntilExpiry,
        role: typeof role === "object" ? role.value || role.name : role,
      })
    } catch (error) {
      console.error("Error analyzing token:", error)
      setTokenInfo({
        token: "Invalid token format",
        decoded: null,
        isValid: false,
        expiresAt: null,
        timeUntilExpiry: null,
        role: null,
      })
    }
  }

  // Get storage information
  const analyzeStorage = () => {
    if (typeof window === "undefined") return

    const storage = {
      adminToken: localStorage.getItem("admin_token"),
      adminRefreshToken: localStorage.getItem("admin_refresh_token"),
      adminUser: localStorage.getItem("admin_user"),
      mizizziToken: localStorage.getItem("mizizzi_token"),
      mizizziRefreshToken: localStorage.getItem("mizizzi_refresh_token"),
      user: localStorage.getItem("user"),
      csrfToken: localStorage.getItem("mizizzi_csrf_token"),
    }

    setStorageInfo(storage)
  }

  // Individual test functions
  const testTokenPresence = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const token = getToken()
      if (!token) {
        return {
          name: "Token Presence",
          status: "error",
          message: "No authentication token found",
          duration: Date.now() - startTime,
        }
      }

      return {
        name: "Token Presence",
        status: "success",
        message: "Authentication token found",
        details: { tokenLength: token.length },
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        name: "Token Presence",
        status: "error",
        message: `Error checking token: ${error.message}`,
        duration: Date.now() - startTime,
      }
    }
  }

  const testTokenValidation = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const token = getToken()
      if (!token) {
        return {
          name: "Token Validation",
          status: "error",
          message: "No token to validate",
          duration: Date.now() - startTime,
        }
      }

      const isValid = adminService.validateToken(token)
      if (!isValid) {
        return {
          name: "Token Validation",
          status: "error",
          message: "Token validation failed",
          duration: Date.now() - startTime,
        }
      }

      const decoded = adminService.validateToken(token)
      const hasAdminRole = adminService.isValidAdminToken(decoded)

      if (!hasAdminRole) {
        return {
          name: "Token Validation",
          status: "warning",
          message: "Token is valid but user does not have admin role",
          details: { role: decoded.role },
          duration: Date.now() - startTime,
        }
      }

      return {
        name: "Token Validation",
        status: "success",
        message: "Token is valid and user has admin role",
        details: { role: decoded.role, exp: decoded.exp },
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        name: "Token Validation",
        status: "error",
        message: `Token validation error: ${error.message}`,
        duration: Date.now() - startTime,
      }
    }
  }

  const testAuthContextState = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const contextData = {
        isAuthenticated,
        hasUser: !!user,
        userRole: user?.role,
        userName: user?.name,
        userEmail: user?.email,
      }

      if (!isAuthenticated) {
        return {
          name: "Auth Context State",
          status: "error",
          message: "Auth context shows user as not authenticated",
          details: contextData,
          duration: Date.now() - startTime,
        }
      }

      if (!user) {
        return {
          name: "Auth Context State",
          status: "warning",
          message: "Authenticated but no user data",
          details: contextData,
          duration: Date.now() - startTime,
        }
      }

      return {
        name: "Auth Context State",
        status: "success",
        message: "Auth context state is valid",
        details: contextData,
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        name: "Auth Context State",
        status: "error",
        message: `Auth context error: ${error.message}`,
        duration: Date.now() - startTime,
      }
    }
  }

  const testDashboardAPI = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const dashboardData = await adminService.getDashboardData()

      if (!dashboardData) {
        return {
          name: "Dashboard API",
          status: "error",
          message: "No dashboard data received",
          duration: Date.now() - startTime,
        }
      }

      return {
        name: "Dashboard API",
        status: "success",
        message: "Dashboard API call successful",
        details: {
          hasData: !!dashboardData,
          dataKeys: Object.keys(dashboardData),
        },
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        name: "Dashboard API",
        status: "error",
        message: `Dashboard API error: ${error.message}`,
        duration: Date.now() - startTime,
      }
    }
  }

  const testProductsAPI = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const products = await adminService.getProducts({ page: 1, per_page: 5 })

      return {
        name: "Products API",
        status: "success",
        message: `Products API call successful (${products.length} products)`,
        details: {
          productCount: products.length,
          hasProducts: products.length > 0,
        },
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        name: "Products API",
        status: "error",
        message: `Products API error: ${error.message}`,
        duration: Date.now() - startTime,
      }
    }
  }

  const testTokenRefresh = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      const newToken = await refreshToken()

      if (!newToken) {
        return {
          name: "Token Refresh",
          status: "error",
          message: "Token refresh failed - no new token received",
          duration: Date.now() - startTime,
        }
      }

      return {
        name: "Token Refresh",
        status: "success",
        message: "Token refresh successful",
        details: { refreshed: true },
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        name: "Token Refresh",
        status: "error",
        message: `Token refresh error: ${error.message}`,
        duration: Date.now() - startTime,
      }
    }
  }

  const testStorageConsistency = async (): Promise<TestResult> => {
    const startTime = Date.now()
    try {
      if (typeof window === "undefined") {
        return {
          name: "Storage Consistency",
          status: "warning",
          message: "Cannot test storage on server side",
          duration: Date.now() - startTime,
        }
      }

      const adminToken = localStorage.getItem("admin_token")
      const mizizziToken = localStorage.getItem("mizizzi_token")
      const adminUser = localStorage.getItem("admin_user")
      const regularUser = localStorage.getItem("user")

      const issues = []

      if (!adminToken && !mizizziToken) {
        issues.push("No tokens found in storage")
      }

      if (adminToken && mizizziToken && adminToken !== mizizziToken) {
        issues.push("Admin token and regular token are different")
      }

      if (!adminUser && !regularUser) {
        issues.push("No user data found in storage")
      }

      if (adminUser && regularUser) {
        try {
          const adminUserData = JSON.parse(adminUser)
          const regularUserData = JSON.parse(regularUser)
          if (adminUserData.id !== regularUserData.id) {
            issues.push("Admin user and regular user data are different")
          }
        } catch (e) {
          issues.push("Error parsing user data from storage")
        }
      }

      if (issues.length > 0) {
        return {
          name: "Storage Consistency",
          status: "warning",
          message: `Storage consistency issues found: ${issues.join(", ")}`,
          details: { issues, storageInfo },
          duration: Date.now() - startTime,
        }
      }

      return {
        name: "Storage Consistency",
        status: "success",
        message: "Storage is consistent",
        details: { storageInfo },
        duration: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        name: "Storage Consistency",
        status: "error",
        message: `Storage consistency check error: ${error.message}`,
        duration: Date.now() - startTime,
      }
    }
  }

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])

    const tests = [
      testTokenPresence,
      testTokenValidation,
      testAuthContextState,
      testStorageConsistency,
      testDashboardAPI,
      testProductsAPI,
      testTokenRefresh,
    ]

    const results: TestResult[] = []

    for (const test of tests) {
      try {
        const result = await test()
        results.push(result)
        setTestResults([...results])

        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error: any) {
        results.push({
          name: test.name || "Unknown Test",
          status: "error",
          message: `Test execution error: ${error.message}`,
          duration: 0,
        })
        setTestResults([...results])
      }
    }

    setIsRunning(false)
  }

  // Update token and storage info on mount and when auth state changes
  useEffect(() => {
    analyzeToken()
    analyzeStorage()
  }, [isAuthenticated, user])

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-gray-400" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  const getStatusBadge = (status: TestResult["status"]) => {
    const variants = {
      success: "bg-green-100 text-green-800 border-green-200",
      error: "bg-red-100 text-red-800 border-red-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pending: "bg-gray-100 text-gray-800 border-gray-200",
    }

    return <Badge className={variants[status] || variants.pending}>{status.toUpperCase()}</Badge>
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Token Test Suite</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive testing of admin authentication and token functionality
          </p>
        </div>
        <Button onClick={runAllTests} disabled={isRunning} className="flex items-center gap-2">
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {isRunning ? "Running Tests..." : "Run All Tests"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Token Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenInfo ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Token:</span>
                    <p className="text-muted-foreground font-mono">{tokenInfo.token || "Not found"}</p>
                  </div>
                  <div>
                    <span className="font-medium">Valid:</span>
                    <p className={tokenInfo.isValid ? "text-green-600" : "text-red-600"}>
                      {tokenInfo.isValid ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Role:</span>
                    <p className="text-muted-foreground">{tokenInfo.role || "Unknown"}</p>
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>
                    <p className="text-muted-foreground">{tokenInfo.expiresAt || "Unknown"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Time Until Expiry:</span>
                    <p className={tokenInfo.timeUntilExpiry === "Expired" ? "text-red-600" : "text-muted-foreground"}>
                      {tokenInfo.timeUntilExpiry || "Unknown"}
                    </p>
                  </div>
                </div>

                {tokenInfo.decoded && (
                  <div>
                    <span className="font-medium">Decoded Token:</span>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(tokenInfo.decoded, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No token information available</p>
            )}
          </CardContent>
        </Card>

        {/* Auth Context Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Auth Context State
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Authenticated:</span>
                <p className={isAuthenticated ? "text-green-600" : "text-red-600"}>{isAuthenticated ? "Yes" : "No"}</p>
              </div>
              <div>
                <span className="font-medium">User:</span>
                <p className="text-muted-foreground">{user ? `${user.name} (${user.email})` : "Not loaded"}</p>
              </div>
              <div>
                <span className="font-medium">Role:</span>
                <p className="text-muted-foreground">
                  {user?.role ? (typeof user.role === "object" ? user.role.value : user.role) : "Unknown"}
                </p>
              </div>
              <div>
                <span className="font-medium">User ID:</span>
                <p className="text-muted-foreground">{user?.id || "Unknown"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Local Storage State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {Object.entries(storageInfo).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span className={value ? "text-green-600" : "text-red-600"}>{value ? "Present" : "Missing"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 && !isRunning ? (
              <p className="text-muted-foreground">No tests run yet. Click "Run All Tests" to start.</p>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.duration && <span className="text-xs text-muted-foreground">{result.duration}ms</span>}
                        {getStatusBadge(result.status)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                    {result.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View Details</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}

                {isRunning && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Running tests...</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={analyzeToken} className="flex items-center gap-2 bg-transparent">
              <Key className="w-4 h-4" />
              Refresh Token Info
            </Button>
            <Button variant="outline" onClick={analyzeStorage} className="flex items-center gap-2 bg-transparent">
              <Database className="w-4 h-4" />
              Refresh Storage Info
            </Button>
            <Button variant="outline" onClick={() => refreshToken()} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Token
            </Button>
            <Button variant="destructive" onClick={() => logout()} className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {testResults.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Test Summary:</strong> {testResults.filter((r) => r.status === "success").length} passed,{" "}
            {testResults.filter((r) => r.status === "error").length} failed,{" "}
            {testResults.filter((r) => r.status === "warning").length} warnings
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
