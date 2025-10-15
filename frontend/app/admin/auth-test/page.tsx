"use client"

import { useEffect, useState } from "react"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminAuthTest() {
  const { user, isAuthenticated, getToken, refreshToken, logout, isLoading } = useAdminAuth()
  const [tokenInfo, setTokenInfo] = useState<{
    token: string | null
    expiry: string | null
    refreshToken: string | null
  }>({
    token: null,
    expiry: null,
    refreshToken: null,
  })

  const [apiTestResults, setApiTestResults] = useState<{
    dashboard: any
    profile: any
  }>({
    dashboard: null,
    profile: null,
  })

  useEffect(() => {
    // Get token information from localStorage
    if (typeof window !== "undefined") {
      setTokenInfo({
        token: localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token"),
        expiry: localStorage.getItem("admin_token_expiry"),
        refreshToken: localStorage.getItem("admin_refresh_token") || localStorage.getItem("mizizzi_refresh_token"),
      })
    }
  }, [isAuthenticated])

  const handleRefreshToken = async () => {
    const result = await refreshToken()
    alert(`Token refresh ${result ? "succeeded" : "failed"}`)

    // Update token info after refresh
    if (typeof window !== "undefined") {
      setTokenInfo({
        token: localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token"),
        expiry: localStorage.getItem("admin_token_expiry"),
        refreshToken: localStorage.getItem("admin_refresh_token") || localStorage.getItem("mizizzi_refresh_token"),
      })
    }
  }

  const testDashboardEndpoint = async () => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${apiUrl}/api/admin/dashboard`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        credentials: "include",
      })

      const data = await response.json()

      setApiTestResults((prev) => ({
        ...prev,
        dashboard: {
          status: response.status,
          ok: response.ok,
          data,
          headers: Object.fromEntries(response.headers.entries()),
        },
      }))
    } catch (error) {
      setApiTestResults((prev) => ({
        ...prev,
        dashboard: {
          status: "error",
          ok: false,
          data: { error: error instanceof Error ? error.message : String(error) },
        },
      }))
    }
  }

  const testProfileEndpoint = async () => {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      const response = await fetch(`${apiUrl}/api/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        credentials: "include",
      })

      const data = await response.json()

      setApiTestResults((prev) => ({
        ...prev,
        profile: {
          status: response.status,
          ok: response.ok,
          data,
          headers: Object.fromEntries(response.headers.entries()),
        },
      }))
    } catch (error) {
      setApiTestResults((prev) => ({
        ...prev,
        profile: {
          status: "error",
          ok: false,
          data: { error: error instanceof Error ? error.message : String(error) },
        },
      }))
    }
  }

  const clearAllTokens = () => {
    const keysToRemove = [
      "mizizzi_token",
      "mizizzi_refresh_token",
      "mizizzi_csrf_token",
      "admin_token",
      "admin_refresh_token",
      "user",
      "admin_user",
    ]

    keysToRemove.forEach((key) => localStorage.removeItem(key))

    // Update token info
    setTokenInfo({
      token: null,
      expiry: null,
      refreshToken: null,
    })

    alert("All tokens cleared")
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    try {
      return new Date(dateString).toLocaleString()
    } catch (e) {
      return "Invalid date"
    }
  }

  const formatToken = (token: string | null) => {
    if (!token) return "Not set"
    return `${token.substring(0, 15)}...${token.substring(token.length - 10)}`
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Authentication Debug</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication State</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Is Authenticated:</span>{" "}
              <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
                {isAuthenticated ? "Yes" : "No"}
              </span>
            </p>
            <p>
              <span className="font-medium">Is Loading:</span> {isLoading ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-medium">User Role:</span> {user?.role || "N/A"}
            </p>
            <p>
              <span className="font-medium">Token:</span> {formatToken(getToken())}
            </p>
            <p>
              <span className="font-medium">Admin Token:</span> {formatToken(tokenInfo.token)}
            </p>
            <p>
              <span className="font-medium">Refresh Token:</span> {formatToken(tokenInfo.refreshToken)}
            </p>
          </div>

          <div className="mt-6 space-x-4">
            <Button onClick={handleRefreshToken}>Test Token Refresh</Button>
            <Button variant="outline" onClick={() => logout()}>
              Logout
            </Button>
            <Button variant="destructive" onClick={clearAllTokens}>
              Clear All Tokens
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">User from Storage</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
            {user ? JSON.stringify(user, null, 2) : "No user data"}
          </pre>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">API Tests</h2>
          <div className="space-x-4 mb-4">
            <Button onClick={testDashboardEndpoint}>Test Dashboard Endpoint</Button>
            <Button onClick={testProfileEndpoint}>Test Profile Endpoint</Button>
          </div>

          {apiTestResults.dashboard && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Dashboard Test Result:</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(apiTestResults.dashboard, null, 2)}
              </pre>
            </div>
          )}

          {apiTestResults.profile && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Profile Test Result:</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(apiTestResults.profile, null, 2)}
              </pre>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
