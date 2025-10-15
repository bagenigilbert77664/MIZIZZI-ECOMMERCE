"use client"

import { useEffect, useState, useRef } from "react"
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

  const onlineDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const offlineDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const errorDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const ERROR_COOLDOWN = 10000 // 10 seconds between error alerts
  const MAX_RETRIES = 3 // Maximum retry attempts before giving up
  const OFFLINE_DEBOUNCE = 3000 // 3 seconds before showing offline alert
  const ONLINE_DEBOUNCE = 1000 // 1 second before clearing offline alert
  const ERROR_DEBOUNCE = 2000 // 2 seconds before showing error alert

  useEffect(() => {
    console.log("[v0] NetworkStatus: Component mounted")

    const handleOnline = () => {
      console.log("[v0] NetworkStatus: Network online event detected")

      // Clear any pending offline debounce
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current)
        offlineDebounceRef.current = null
      }

      // Debounce the online state change
      if (onlineDebounceRef.current) {
        clearTimeout(onlineDebounceRef.current)
      }

      onlineDebounceRef.current = setTimeout(() => {
        console.log("[v0] NetworkStatus: Network came online (debounced)")
        setIsOffline(false)
        setShowAlert(false)
        setRetryCount(0)
      }, ONLINE_DEBOUNCE)
    }

    const handleOffline = () => {
      console.log("[v0] NetworkStatus: Network offline event detected")

      // Clear any pending online debounce
      if (onlineDebounceRef.current) {
        clearTimeout(onlineDebounceRef.current)
        onlineDebounceRef.current = null
      }

      // Debounce the offline state change
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current)
      }

      offlineDebounceRef.current = setTimeout(() => {
        console.log("[v0] NetworkStatus: Network went offline (debounced)")
        setIsOffline(true)
        setShowAlert(true)
      }, OFFLINE_DEBOUNCE)
    }

    const handleNetworkError = (event: CustomEvent) => {
      const now = Date.now()
      console.log("[v0] NetworkStatus: Network error detected:", event.detail)

      // Check cooldown period
      if (now - lastErrorTime < ERROR_COOLDOWN) {
        console.log("[v0] NetworkStatus: Error ignored due to cooldown")
        return
      }

      // Check max retries
      if (retryCount >= MAX_RETRIES) {
        console.log("[v0] NetworkStatus: Max retries exceeded, not showing alert")
        return
      }

      // Debounce error alerts
      if (errorDebounceRef.current) {
        clearTimeout(errorDebounceRef.current)
      }

      errorDebounceRef.current = setTimeout(() => {
        if (event.detail.isNetworkError) {
          setBackendDown(true)
          setShowAlert(true)
          setLastErrorTime(now)
          console.log("[v0] NetworkStatus: Showing backend down alert (debounced)")
        }
      }, ERROR_DEBOUNCE)
    }

    const handleApiSuccess = () => {
      console.log("[v0] NetworkStatus: API success detected")

      // Clear any pending error debounce
      if (errorDebounceRef.current) {
        clearTimeout(errorDebounceRef.current)
        errorDebounceRef.current = null
      }

      setBackendDown(false)
      setShowAlert(false)
      setRetryCount(0)
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

      if (onlineDebounceRef.current) clearTimeout(onlineDebounceRef.current)
      if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current)
      if (errorDebounceRef.current) clearTimeout(errorDebounceRef.current)
    }
  }, [lastErrorTime, retryCount])

  const handleRetry = async () => {
    if (isRetrying) return

    console.log("[v0] NetworkStatus: Retry button clicked")
    setIsRetrying(true)
    setRetryCount((prev) => prev + 1)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const healthEndpoints = [
        `${baseUrl}/api/health`,
        `${baseUrl}/api/health-check`,
        `${baseUrl}/health`,
        `${baseUrl}/api/status`,
      ]

      let healthCheckPassed = false

      for (const endpoint of healthEndpoints) {
        try {
          console.log(`[v0] NetworkStatus: Trying ${endpoint}`)
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000), // Increased timeout to 5 seconds
          })

          if (response.ok) {
            console.log(`[v0] NetworkStatus: Health check successful via ${endpoint}`)
            healthCheckPassed = true
            break
          }
        } catch (error) {
          console.log(`[v0] NetworkStatus: ${endpoint} failed:`, error)
          continue
        }
      }

      if (healthCheckPassed) {
        setBackendDown(false)
        setShowAlert(false)
        setRetryCount(0)

        // Dispatch success event to clear any other error states
        document.dispatchEvent(new CustomEvent("api-success"))
      } else {
        throw new Error("All health check endpoints failed")
      }
    } catch (error) {
      console.log("[v0] NetworkStatus: All retry attempts failed:", error)

      if (retryCount >= MAX_RETRIES) {
        setShowAlert(false)
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
