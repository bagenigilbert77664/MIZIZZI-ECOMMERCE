"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Server } from "lucide-react"

interface NetworkStatusProps {
  className?: string
}

export function NetworkStatus({ className }: NetworkStatusProps) {
  const [isOffline, setIsOffline] = useState(false)
  const [backendDown, setBackendDown] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [lastErrorTime, setLastErrorTime] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const ERROR_COOLDOWN = 10000 // 10 seconds between error alerts
  const MAX_RETRIES = 3 // Maximum retry attempts before giving up

  useEffect(() => {
    console.log("[v0] NetworkStatus: Component mounted")

    // Listen for network status changes
    const handleOnline = () => {
      console.log("[v0] NetworkStatus: Network came online")
      setIsOffline(false)
      setShowAlert(false)
      setRetryCount(0) // Reset retry count when network comes back
    }

    const handleOffline = () => {
      console.log("[v0] NetworkStatus: Network went offline")
      setIsOffline(true)
      setShowAlert(true)
    }

    // Listen for custom network error events from API
    const handleNetworkError = (event: CustomEvent) => {
      const now = Date.now()
      console.log("[v0] NetworkStatus: Network error detected:", event.detail)

      if (now - lastErrorTime < ERROR_COOLDOWN) {
        console.log("[v0] NetworkStatus: Error ignored due to cooldown")
        return
      }

      if (retryCount >= MAX_RETRIES) {
        console.log("[v0] NetworkStatus: Max retries exceeded, not showing alert")
        return
      }

      if (event.detail.isNetworkError) {
        setBackendDown(true)
        setShowAlert(true)
        setLastErrorTime(now)
        console.log("[v0] NetworkStatus: Showing backend down alert")
      }
    }

    // Listen for successful API responses to clear backend down status
    const handleApiSuccess = () => {
      console.log("[v0] NetworkStatus: API success detected, clearing alerts")
      setBackendDown(false)
      setShowAlert(false)
      setRetryCount(0) // Reset retry count on success
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    document.addEventListener("network-error", handleNetworkError as EventListener)
    document.addEventListener("api-success", handleApiSuccess)

    // Check initial network status
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      document.removeEventListener("network-error", handleNetworkError as EventListener)
      document.removeEventListener("api-success", handleApiSuccess)
    }
  }, [lastErrorTime, retryCount])

  const handleRetry = async () => {
    if (isRetrying) return

    console.log("[v0] NetworkStatus: Retry button clicked")
    setIsRetrying(true)
    setRetryCount((prev) => prev + 1)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        console.log("[v0] NetworkStatus: Health check successful")
        setBackendDown(false)
        setShowAlert(false)
        setRetryCount(0)

        // Dispatch success event to clear any other error states
        document.dispatchEvent(new CustomEvent("api-success"))
      } else {
        throw new Error(`Health check failed: ${response.status}`)
      }
    } catch (error) {
      console.log("[v0] NetworkStatus: Retry failed:", error)

      if (retryCount >= MAX_RETRIES) {
        setShowAlert(false)
        // Show a toast or different UI indicating manual refresh needed
      }
    } finally {
      setIsRetrying(false)
    }
  }

  if (!showAlert) return null

  return (
    <div className={className}>
      {isOffline && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You are currently offline. Please check your internet connection.</span>
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetrying}>
              <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
              {isRetrying ? "Checking..." : "Check Connection"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {backendDown && !isOffline && (
        <Alert variant="destructive" className="mb-4">
          <Server className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">Backend server is not available</p>
              <p className="text-sm text-muted-foreground mt-1">
                {retryCount >= MAX_RETRIES
                  ? "Multiple retry attempts failed. Please refresh the page manually or contact support."
                  : "The server is not responding. Please try again."}
              </p>
            </div>
            {retryCount < MAX_RETRIES && (
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetrying}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
                {isRetrying ? "Checking..." : `Retry (${retryCount}/${MAX_RETRIES})`}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
