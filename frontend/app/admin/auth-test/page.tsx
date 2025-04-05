"use client"

import { useEffect, useState } from "react"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminAuthTest() {
  const { user, isAuthenticated, getToken, refreshToken, logout } = useAdminAuth()
  const [tokenInfo, setTokenInfo] = useState<{
    token: string | null
    expiry: string | null
    refreshToken: string | null
  }>({
    token: null,
    expiry: null,
    refreshToken: null,
  })

  useEffect(() => {
    // Get token information from localStorage
    if (typeof window !== "undefined") {
      setTokenInfo({
        token: localStorage.getItem("admin_token"),
        expiry: localStorage.getItem("admin_token_expiry"),
        refreshToken: localStorage.getItem("admin_refresh_token"),
      })
    }
  }, [isAuthenticated])

  const handleRefreshToken = async () => {
    const result = await refreshToken()
    alert(`Token refresh ${result ? "succeeded" : "failed"}`)

    // Update token info after refresh
    if (typeof window !== "undefined") {
      setTokenInfo({
        token: localStorage.getItem("admin_token"),
        expiry: localStorage.getItem("admin_token_expiry"),
        refreshToken: localStorage.getItem("admin_refresh_token"),
      })
    }
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
      <h1 className="text-2xl font-bold mb-6">Admin Authentication Test</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Authenticated:</span>{" "}
              <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
                {isAuthenticated ? "Yes" : "No"}
              </span>
            </p>
            <p>
              <span className="font-medium">User:</span> {user ? `${user.name} (${user.email})` : "Not logged in"}
            </p>
            <p>
              <span className="font-medium">Role:</span> {user?.role || "N/A"}
            </p>
          </div>

          <div className="mt-6 space-x-4">
            <Button onClick={handleRefreshToken}>Test Token Refresh</Button>
            <Button variant="outline" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Token Information</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Access Token:</span> {formatToken(tokenInfo.token)}
            </p>
            <p>
              <span className="font-medium">Token Expiry:</span> {formatDate(tokenInfo.expiry)}
            </p>
            <p>
              <span className="font-medium">Refresh Token:</span> {formatToken(tokenInfo.refreshToken)}
            </p>
            <p>
              <span className="font-medium">Token Valid:</span>{" "}
              <span className={getToken() ? "text-green-600" : "text-red-600"}>{getToken() ? "Yes" : "No"}</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

