"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Lock, ShieldAlert, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ProtectedRoutesTester() {
  const { isAuthenticated, loading } = useAuth()
  const [testResult, setTestResult] = useState<{
    route: string
    success: boolean
    message: string
  } | null>(null)
  const router = useRouter()

  const testRoutes = [
    { name: "Account Page", path: "/account", requiresAuth: true },
    { name: "Orders Page", path: "/orders", requiresAuth: true },
    { name: "Wishlist", path: "/wishlist", requiresAuth: true },
    { name: "Admin Dashboard", path: "/admin/dashboard", requiresAuth: true, requiresAdmin: true },
  ]

  const simulateRouteAccess = (route: string, requiresAuth: boolean, requiresAdmin = false) => {
    if (requiresAuth && !isAuthenticated) {
      setTestResult({
        route,
        success: false,
        message: "Access denied. Authentication required.",
      })
      return
    }

    if (requiresAdmin) {
      // This is a simplified check. In a real app, you'd check user.role === "admin"
      const isAdmin = false // Simulate non-admin user

      if (!isAdmin) {
        setTestResult({
          route,
          success: false,
          message: "Access denied. Admin privileges required.",
        })
        return
      }
    }

    setTestResult({
      route,
      success: true,
      message: "Access granted. You can navigate to this route.",
    })
  }

  const navigateToRoute = (path: string) => {
    router.push(path)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Alert variant={isAuthenticated ? "default" : "destructive"}>
              <AlertTitle className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Authentication Status: Authenticated
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    Authentication Status: Not Authenticated
                  </>
                )}
              </AlertTitle>
              <AlertDescription>
                {isAuthenticated
                  ? "You are authenticated and can access protected routes."
                  : "You are not authenticated. Protected routes will redirect to login."}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {testRoutes.map((route) => (
                <div key={route.path} className="border rounded-lg p-3 flex flex-col">
                  <div className="flex items-center mb-2">
                    <Lock className="h-4 w-4 mr-2" />
                    <span className="font-medium">{route.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {route.requiresAuth ? "Requires authentication" : "Public route"}
                    {route.requiresAdmin ? " (admin only)" : ""}
                  </p>
                  <div className="mt-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => simulateRouteAccess(route.path, route.requiresAuth, route.requiresAdmin)}
                    >
                      Test Access
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => navigateToRoute(route.path)}>
                      Navigate
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <AlertTitle className="flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Access Granted
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Access Denied
                    </>
                  )}
                </AlertTitle>
                <AlertDescription>
                  <p className="mt-2">
                    <strong>Route:</strong> {testResult.route}
                  </p>
                  <p className="mt-1">
                    <strong>Result:</strong> {testResult.message}
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
