"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { adminService } from "@/services/admin"

export default function AdminApiTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testApiCall = async () => {
    setLoading(true)
    setError(null)

    try {
      // Test a simple API call that requires authentication
      const data = await adminService.getDashboardData()
      setResult(data)
    } catch (err: any) {
      console.error("API test error:", err)
      setError(err.message || "An error occurred during the API test")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Admin API Test</h1>

      <Card className="p-6">
        <p className="mb-4">
          This test will make an authenticated API request to the admin dashboard endpoint. If your token is working
          correctly, you should see the dashboard data below.
        </p>

        <Button onClick={testApiCall} disabled={loading} className="mb-6">
          {loading ? "Testing..." : "Test API Request"}
        </Button>

        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div>
            <h3 className="text-lg font-medium mb-2">API Response:</h3>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  )
}

