"use client"

import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, RefreshCw, LogOut, Server, Wifi, WifiOff } from "lucide-react"
import { useState, useEffect } from "react"

export default function AdminAuthDebug() {
  const { isAuthenticated, isLoading, user, token, checkAuth, refreshToken, logout } = useAdminAuth()
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  // Check backend health
  const checkBackendHealth = async () => {
    setBackendStatus("checking")
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${apiUrl}/api/health`, {
        method: "GET",
        credentials: "include",
      })
      setBackendStatus(response.ok ? "online" : "offline")
    } catch (error) {
      setBackendStatus("offline")
    }
    setLastCheck(new Date())
  }

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth()
  }, [])

  // Get stored tokens for debugging
  const getStoredTokens = () => {
    if (typeof window === "undefined") return {}

    try {
      return {
        adminToken: localStorage.getItem("admin_token"),
        mizizziToken: localStorage.getItem("mizizzi_token"),
        adminRefreshToken: localStorage.getItem("admin_refresh_token"),
        mizizziRefreshToken: localStorage.getItem("mizizzi_refresh_token"),
        user: localStorage.getItem("user"),
      }
    } catch (error) {
      return { error: "Failed to access localStorage" }
    }
  }

  const storedTokens = getStoredTokens()

  const handleManualRefresh = async () => {
    try {
      const success = await refreshToken()
      alert(success ? "Token refresh successful!" : "Token refresh failed!")
    } catch (error) {
      alert(`Token refresh error: ${error}`)
    }
  }

  const handleCheckAuth = async () => {
    try {
      const success = await checkAuth()
      alert(success ? "Auth check successful!" : "Auth check failed!")
    } catch (error) {
      alert(`Auth check error: ${error}`)
    }
  }

  const handleLogout = () => {
    logout()
    alert("Logged out successfully!")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Authentication Debug</h1>
        <div className="flex gap-2">
          <Button onClick={handleCheckAuth} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Auth
          </Button>
          <Button onClick={handleManualRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Token
          </Button>
          <Button onClick={handleLogout} variant="destructive" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Backend Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Backend Status
          </CardTitle>
          <CardDescription>Current status of the backend API server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">API Server:</span>
            <div className="flex items-center gap-2">
              {backendStatus === "checking" && (
                <Badge variant="secondary">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              )}
              {backendStatus === "online" && (
                <Badge variant="default" className="bg-green-500">
                  <Wifi className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              )}
              {backendStatus === "offline" && (
                <Badge variant="destructive">
                  <WifiOff className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium">API URL:</span>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}
            </code>
          </div>

          {lastCheck && (
            <div className="flex items-center justify-between">
              <span className="font-medium">Last Check:</span>
              <span className="text-sm text-muted-foreground">{lastCheck.toLocaleTimeString()}</span>
            </div>
          )}

          <Button onClick={checkBackendHealth} variant="outline" size="sm" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Backend Health
          </Button>

          {backendStatus === "offline" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Backend Server Offline</h4>
                  <p className="text-sm text-red-700 mt-1">The backend server is not responding. Please ensure:</p>
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                    <li>
                      Flask server is running on <code>python run.py</code>
                    </li>
                    <li>Check if server is running on http://localhost:5000</li>
                    <li>Verify CORS configuration in your Flask app</li>
                    <li>Check firewall and network connectivity</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authentication State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isAuthenticated ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            Authentication State
          </CardTitle>
          <CardDescription>Current authentication status and user information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Is Authenticated:</span>
              <Badge variant={isAuthenticated ? "default" : "destructive"} className="ml-2">
                {isAuthenticated ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Is Loading:</span>
              <Badge variant={isLoading ? "secondary" : "outline"} className="ml-2">
                {isLoading ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {user && (
            <>
              <Separator />
              <div>
                <span className="font-medium">User Role:</span>
                <Badge variant="outline" className="ml-2">
                  {user.role}
                </Badge>
              </div>
            </>
          )}

          <div>
            <span className="font-medium">Token Present:</span>
            <Badge variant={token ? "default" : "destructive"} className="ml-2">
              {token ? "Yes" : "No"}
            </Badge>
          </div>

          {token && (
            <div>
              <span className="font-medium">Token Preview:</span>
              <code className="block text-xs bg-muted p-2 rounded mt-1 break-all">{token.substring(0, 50)}...</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stored Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>Stored Tokens</CardTitle>
          <CardDescription>Tokens stored in localStorage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Admin Token:</span>
              <Badge variant={storedTokens.adminToken ? "default" : "destructive"} className="ml-2">
                {storedTokens.adminToken ? "Present" : "Missing"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Mizizzi Token:</span>
              <Badge variant={storedTokens.mizizziToken ? "default" : "destructive"} className="ml-2">
                {storedTokens.mizizziToken ? "Present" : "Missing"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Admin Refresh Token:</span>
              <Badge variant={storedTokens.adminRefreshToken ? "default" : "destructive"} className="ml-2">
                {storedTokens.adminRefreshToken ? "Present" : "Missing"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Mizizzi Refresh Token:</span>
              <Badge variant={storedTokens.mizizziRefreshToken ? "default" : "destructive"} className="ml-2">
                {storedTokens.mizizziRefreshToken ? "Present" : "Missing"}
              </Badge>
            </div>
          </div>

          {storedTokens.adminRefreshToken && (
            <div>
              <span className="font-medium">Refresh Token Preview:</span>
              <code className="block text-xs bg-muted p-2 rounded mt-1 break-all">
                {storedTokens.adminRefreshToken.substring(0, 50)}...
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Information */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Detailed user data from context and storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="font-medium">User from Context:</span>
              <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto">{JSON.stringify(user, null, 2)}</pre>
            </div>

            <div>
              <span className="font-medium">Role Analysis:</span>
              <div className="mt-2 space-y-1">
                <div>
                  Role Value: <code>"{user.role}"</code>
                </div>
                <div>
                  Role Type: <code>{typeof user.role}</code>
                </div>
              </div>
            </div>

            {storedTokens.user && (
              <div>
                <span className="font-medium">User from Storage:</span>
                <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto">{storedTokens.user}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Actions to resolve authentication issues</CardDescription>
        </CardHeader>
        <CardContent>
          {backendStatus === "offline" ? (
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Backend Server Issues</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>
                  Start your Flask backend server: <code>python run.py</code>
                </li>
                <li>Check if server is running on http://localhost:5000</li>
                <li>Verify CORS configuration in your Flask app</li>
                <li>Check firewall and network connectivity</li>
                <li>
                  Also, ensure the <code>/api/health</code> endpoint is correctly implemented in your Flask app and is
                  accessible.
                </li>
              </ul>
            </div>
          ) : !isAuthenticated ? (
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">Authentication Issues</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Try logging in again with valid admin credentials</li>
                <li>Clear browser storage and login fresh</li>
                <li>Check if your account has admin privileges</li>
                <li>Ensure your email is verified</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Authentication OK</h4>
              <p className="text-sm">All authentication components are working correctly.</p>
              <p className="text-sm">
                If you are experiencing issues with adding to cart, check the cart-related API endpoints and data
                validation on the server side.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
