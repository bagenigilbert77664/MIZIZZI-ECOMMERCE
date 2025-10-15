"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Shield } from "lucide-react"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import adminService from "@/services/admin"

interface QuickTestResult {
  name: string
  status: "success" | "error" | "warning"
  message: string
}

export function AdminTokenTestWidget() {
  const { isAuthenticated, getToken } = useAdminAuth()
  const [testResults, setTestResults] = useState<QuickTestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runQuickTests = async () => {
    setIsRunning(true)
    const results: QuickTestResult[] = []

    // Test 1: Token presence
    try {
      const token = getToken()
      if (token) {
        results.push({
          name: "Token",
          status: "success",
          message: "Present",
        })
      } else {
        results.push({
          name: "Token",
          status: "error",
          message: "Missing",
        })
      }
    } catch (error) {
      results.push({
        name: "Token",
        status: "error",
        message: "Error",
      })
    }

    // Test 2: Auth state
    results.push({
      name: "Auth State",
      status: isAuthenticated ? "success" : "error",
      message: isAuthenticated ? "Authenticated" : "Not authenticated",
    })

    // Test 3: Quick API test
    try {
      await adminService.getDashboardData()
      results.push({
        name: "API Access",
        status: "success",
        message: "Working",
      })
    } catch (error) {
      results.push({
        name: "API Access",
        status: "error",
        message: "Failed",
      })
    }

    setTestResults(results)
    setIsRunning(false)
  }

  useEffect(() => {
    runQuickTests()
  }, [isAuthenticated])

  const getStatusIcon = (status: QuickTestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: QuickTestResult["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Token Status
          </span>
          <Button variant="ghost" size="sm" onClick={runQuickTests} disabled={isRunning} className="h-6 w-6 p-0">
            <RefreshCw className={`w-3 h-3 ${isRunning ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(result.status)}
                <span className="text-sm font-medium">{result.name}</span>
              </div>
              <Badge className={getStatusColor(result.status)}>{result.message}</Badge>
            </div>
          ))}

          {testResults.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-4">
              {isRunning ? "Running tests..." : "No test results"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
