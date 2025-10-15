"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw, Server, AlertTriangle } from "lucide-react"

interface BackendStatusProps {
  className?: string
}

interface Missing404Endpoint {
  url: string
  method: string
  timestamp: number
}

export function BackendStatus({ className }: BackendStatusProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [missing404Endpoints, setMissing404Endpoints] = useState<Missing404Endpoint[]>([])

  const checkBackendStatus = async () => {
    setIsChecking(true)
    try {
      const healthEndpoints = ["http://localhost:5000/api/admin/dashboard/health", "http://localhost:5000/api/products"]

      let lastError = null

      for (const endpoint of healthEndpoints) {
        try {
          console.log(`[v0] Trying health check endpoint: ${endpoint}`)
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(3000), // 3 second timeout per endpoint
          })

          if (response.ok) {
            setIsOnline(true)
            console.log(`[v0] Backend server is online via ${endpoint}`)
            return // Success, exit early
          } else {
            console.log(`[v0] Health check ${endpoint} responded with error:`, response.status)
            lastError = new Error(`HTTP ${response.status}`)
          }
        } catch (error) {
          console.log(`[v0] Health check ${endpoint} failed:`, error)
          lastError = error
          continue // Try next endpoint
        }
      }

      // If we get here, all endpoints failed
      setIsOnline(false)
      console.log("[v0] All health check endpoints failed, backend appears offline")
    } catch (error) {
      setIsOnline(false)
      console.log("[v0] Backend health check failed:", error)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkBackendStatus()

    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000)

    const handle404Error = (event: CustomEvent) => {
      const { url, method } = event.detail
      console.log(`[v0] 404 Error detected: ${method} ${url}`)

      const ignoredPatterns = [
        "/api/health",
        "/health",
        "/api/status",
        "/api/health-check",
        "/api/products/featured",
        "/api/products/new",
        "/api/products/sale",
      ]

      const shouldIgnore = ignoredPatterns.some((pattern) => url.includes(pattern))
      if (shouldIgnore) {
        console.log(`[v0] Ignoring expected 404 for: ${url}`)
        return
      }

      setMissing404Endpoints((prev) => {
        // Check if this endpoint is already tracked
        const exists = prev.some((e) => e.url === url && e.method === method)
        if (exists) return prev

        // Add new 404 endpoint
        return [...prev, { url, method, timestamp: Date.now() }]
      })
    }

    document.addEventListener("api-404-error", handle404Error as EventListener)

    return () => {
      clearInterval(interval)
      document.removeEventListener("api-404-error", handle404Error as EventListener)
    }
  }, [])

  if (isOnline === true && missing404Endpoints.length === 0) {
    return null // Don't show anything when backend is online and no 404s
  }

  return (
    <div className={className}>
      {isOnline === false && (
        <>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span>Backend server is not running. Please start the backend server to use the application.</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkBackendStatus}
                disabled={isChecking}
                className="ml-4 bg-transparent"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Checking..." : "Retry"}
              </Button>
            </AlertDescription>
          </Alert>

          <Alert className="mb-4">
            <Server className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">To start the backend server:</p>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  <p>cd your-project-directory</p>
                  <p>chmod +x scripts/start-backend.sh</p>
                  <p>./scripts/start-backend.sh</p>
                </div>
                <p className="text-sm text-muted-foreground">The server will start on http://localhost:5000</p>
              </div>
            </AlertDescription>
          </Alert>
        </>
      )}

      {isOnline === true && missing404Endpoints.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">Missing Backend Endpoints (404 Errors)</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMissing404Endpoints([])}
                  className="bg-transparent"
                >
                  Clear
                </Button>
              </div>
              <p className="text-sm">The following endpoints do not exist on your backend:</p>
              <div className="bg-muted p-3 rounded-md font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                {missing404Endpoints.map((endpoint, index) => (
                  <div key={index} className="text-destructive">
                    {endpoint.method} {endpoint.url}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Check your backend code to ensure these endpoints are implemented.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
