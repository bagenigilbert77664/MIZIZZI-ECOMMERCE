"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bug, Database, Key, Network, User, RefreshCw, Copy, Download, Trash2 } from "lucide-react"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import adminService from "@/services/admin"
import { AdminTokenTestWidget } from "@/components/admin/token-test-widget"

export default function AdminDebugPage() {
  const { user, isAuthenticated, getToken, refreshToken, logout } = useAdminAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [apiTests, setApiTests] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)

  const collectDebugInfo = async () => {
    setIsLoading(true)

    const info: any = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        apiUrl: process.env.NEXT_PUBLIC_API_URL,
        websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Server",
        url: typeof window !== "undefined" ? window.location.href : "Server",
      },
      auth: {
        isAuthenticated,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
      },
      tokens: {},
      storage: {},
      apiTests: {},
    }

    // Collect token information
    try {
      const token = getToken()
      if (token) {
        info.tokens.hasToken = true
        info.tokens.tokenLength = token.length
        info.tokens.tokenPrefix = token.substring(0, 20) + "..."

        // Decode token
        try {
          const base64Url = token.split(".")[1]
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join(""),
          )
          const decoded = JSON.parse(jsonPayload)

          info.tokens.decoded = {
            exp: decoded.exp,
            iat: decoded.iat,
            role: decoded.role,
            userId: decoded.user_id,
            email: decoded.email,
          }
          info.tokens.isExpired = decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)
          info.tokens.expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null
        } catch (e) {
          info.tokens.decodeError = (e instanceof Error ? e.message : String(e))
        }
      } else {
        info.tokens.hasToken = false
      }
    } catch (e) {
      info.tokens.error = (e instanceof Error ? e.message : String(e))
    }

    // Collect storage information
    if (typeof window !== "undefined") {
      const storageKeys = [
        "admin_token",
        "admin_refresh_token",
        "admin_user",
        "mizizzi_token",
        "mizizzi_refresh_token",
        "user",
        "mizizzi_csrf_token",
      ]

      storageKeys.forEach((key) => {
        const value = localStorage.getItem(key)
        info.storage[key] = {
          exists: !!value,
          length: value?.length || 0,
          preview: value ? (value.length > 50 ? value.substring(0, 50) + "..." : value) : null,
        }
      })
    }

    // Test API endpoints
    const apiEndpoints = [
      { name: "Dashboard", test: () => adminService.getDashboardData() },
      { name: "Products", test: () => adminService.getProducts({ page: 1, per_page: 1 }) },
      { name: "Categories", test: () => adminService.getCategories({ page: 1, per_page: 1 }) },
      { name: "Brands", test: () => adminService.getBrands({ page: 1, per_page: 1 }) },
    ]

    for (const endpoint of apiEndpoints) {
      const startTime = Date.now() // Declare startTime here
      try {
        await endpoint.test()
        info.apiTests[endpoint.name] = {
          status: "success",
          duration: Date.now() - startTime,
        }
      } catch (error: any) {
        info.apiTests[endpoint.name] = {
          status: "error",
          error: error.message,
          duration: Date.now() - startTime,
        }
      }
    }

    setDebugInfo(info)
    setIsLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadDebugInfo = () => {
    const dataStr = JSON.stringify(debugInfo, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `admin-debug-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearAllStorage = () => {
    if (typeof window !== "undefined") {
      const keys = [
        "admin_token",
        "admin_refresh_token",
        "admin_user",
        "mizizzi_token",
        "mizizzi_refresh_token",
        "user",
        "mizizzi_csrf_token",
      ]
      keys.forEach((key) => localStorage.removeItem(key))
      collectDebugInfo()
    }
  }

  useEffect(() => {
    collectDebugInfo()
  }, [isAuthenticated])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="w-8 h-8" />
            Admin Debug Console
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive debugging information for admin authentication and API access
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={collectDebugInfo} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {debugInfo.timestamp && (
            <Button variant="outline" onClick={downloadDebugInfo}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="api">API Tests</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Authentication Status:</span>
                      <Badge
                        className={
                          isAuthenticated ? "bg-green-100 text-green-800 ml-2" : "bg-red-100 text-red-800 ml-2"
                        }
                      >
                        {isAuthenticated ? "Authenticated" : "Not Authenticated"}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">User Loaded:</span>
                      <Badge className={user ? "bg-green-100 text-green-800 ml-2" : "bg-red-100 text-red-800 ml-2"}>
                        {user ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Token Present:</span>
                      <Badge
                        className={
                          debugInfo.tokens?.hasToken
                            ? "bg-green-100 text-green-800 ml-2"
                            : "bg-red-100 text-red-800 ml-2"
                        }
                      >
                        {debugInfo.tokens?.hasToken ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Token Expired:</span>
                      <Badge
                        className={
                          debugInfo.tokens?.isExpired
                            ? "bg-red-100 text-red-800 ml-2"
                            : "bg-green-100 text-green-800 ml-2"
                        }
                      >
                        {debugInfo.tokens?.isExpired ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>

                  {debugInfo.timestamp && (
                    <div className="text-sm text-muted-foreground">
                      Last updated: {new Date(debugInfo.timestamp).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => refreshToken()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Token
                    </Button>
                    <Button variant="outline" onClick={clearAllStorage}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Storage
                    </Button>
                    <Button variant="destructive" onClick={() => logout()}>
                      Logout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tokens" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Token Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.tokens ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Has Token:</span>
                          <p className={debugInfo.tokens.hasToken ? "text-green-600" : "text-red-600"}>
                            {debugInfo.tokens.hasToken ? "Yes" : "No"}
                          </p>
                        </div>
                        {debugInfo.tokens.tokenLength && (
                          <div>
                            <span className="font-medium">Token Length:</span>
                            <p className="text-muted-foreground">{debugInfo.tokens.tokenLength}</p>
                          </div>
                        )}
                        {debugInfo.tokens.expiresAt && (
                          <div>
                            <span className="font-medium">Expires At:</span>
                            <p className="text-muted-foreground">
                              {new Date(debugInfo.tokens.expiresAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {debugInfo.tokens.isExpired !== undefined && (
                          <div>
                            <span className="font-medium">Is Expired:</span>
                            <p className={debugInfo.tokens.isExpired ? "text-red-600" : "text-green-600"}>
                              {debugInfo.tokens.isExpired ? "Yes" : "No"}
                            </p>
                          </div>
                        )}
                      </div>

                      {debugInfo.tokens.decoded && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Decoded Token:</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(debugInfo.tokens.decoded, null, 2))}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-48">
                            {JSON.stringify(debugInfo.tokens.decoded, null, 2)}
                          </pre>
                        </div>
                      )}

                      {debugInfo.tokens.error && (
                        <Alert variant="destructive">
                          <AlertDescription>Token Error: {debugInfo.tokens.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No token information available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="storage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Local Storage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.storage ? (
                    <div className="space-y-3">
                      {Object.entries(debugInfo.storage).map(([key, info]: [string, any]) => (
                        <div key={key} className="border rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{key}</span>
                            <Badge className={info.exists ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {info.exists ? "Present" : "Missing"}
                            </Badge>
                          </div>
                          {info.exists && (
                            <div className="text-sm text-muted-foreground">
                              <p>Length: {info.length}</p>
                              {info.preview && <p className="font-mono mt-1 break-all">{info.preview}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No storage information available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    API Test Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.apiTests ? (
                    <div className="space-y-3">
                      {Object.entries(debugInfo.apiTests).map(([endpoint, result]: [string, any]) => (
                        <div key={endpoint} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <span className="font-medium">{endpoint}</span>
                            {result.duration && (
                              <span className="text-sm text-muted-foreground ml-2">({result.duration}ms)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                result.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }
                            >
                              {result.status}
                            </Badge>
                          </div>
                          {result.error && <div className="text-sm text-red-600 mt-1">{result.error}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No API test results available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="environment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Environment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {debugInfo.environment ? (
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      {Object.entries(debugInfo.environment).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span className="text-muted-foreground font-mono break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No environment information available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <AdminTokenTestWidget />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span>
                    <p className="text-muted-foreground">{user.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                  <div>
                    <span className="font-medium">Role:</span>
                    <p className="text-muted-foreground">
                      {typeof user.role === "object" ? user.role.value : user.role}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">ID:</span>
                    <p className="text-muted-foreground">{user.id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No user data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
