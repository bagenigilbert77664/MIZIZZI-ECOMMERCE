"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { checkBackendHealth, API_CONFIG } from "@/lib/api-client-config"

export function BackendStatusBanner() {
  const [status, setStatus] = useState<"checking" | "online" | "offline" | "error">("checking")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  const checkStatus = async () => {
    setIsChecking(true)
    setStatus("checking")

    try {
      const result = await checkBackendHealth()

      if (result.available) {
        setStatus("online")
        setShowBanner(false)
        // Dispatch success event
        if (typeof document !== "undefined") {
          document.dispatchEvent(new CustomEvent("api-success"))
        }
      } else {
        setStatus("offline")
        setErrorMessage(result.error || "Backend server is not available")
        setShowBanner(true)
      }
    } catch (error: any) {
      setStatus("error")
      setErrorMessage(error.message || "Failed to check backend status")
      setShowBanner(true)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Initial check
    checkStatus()

    // Listen for network errors
    const handleNetworkError = () => {
      setStatus("offline")
      setShowBanner(true)
    }

    const handleApiSuccess = () => {
      setStatus("online")
      setShowBanner(false)
    }

    if (typeof document !== "undefined") {
      document.addEventListener("network-error", handleNetworkError)
      document.addEventListener("api-success", handleApiSuccess)
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("network-error", handleNetworkError)
        document.removeEventListener("api-success", handleApiSuccess)
      }
    }
  }, [])

  if (!showBanner || status === "online") {
    return null
  }

  return (
    <Alert variant={status === "offline" ? "destructive" : "default"} className="mb-4 border-l-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {status === "checking" && <RefreshCw className="h-5 w-5 animate-spin" />}
          {status === "offline" && <XCircle className="h-5 w-5" />}
          {status === "error" && <AlertTriangle className="h-5 w-5" />}
        </div>

        <div className="flex-1">
          <AlertTitle className="mb-1 font-semibold">
            {status === "checking" && "Checking Backend Connection..."}
            {status === "offline" && "Backend Server Offline"}
            {status === "error" && "Connection Error"}
          </AlertTitle>

          <AlertDescription className="text-sm space-y-2">
            {status === "offline" && (
              <>
                <p>
                  The backend server at{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{API_CONFIG.BASE_URL}</code> is not responding.
                </p>
                <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
                  <p className="font-semibold">To start the backend server:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      Open a terminal in the <code>backend</code> directory
                    </li>
                    <li>
                      Run: <code className="bg-background px-1 py-0.5 rounded">python run.py</code>
                    </li>
                    <li>Wait for "Server will be available at: http://localhost:5000"</li>
                    <li>Click the retry button below</li>
                  </ol>
                </div>
              </>
            )}

            {status === "error" && <p>{errorMessage}</p>}
          </AlertDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={checkStatus}
          disabled={isChecking}
          className="shrink-0 bg-transparent"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "Checking..." : "Retry"}
        </Button>
      </div>
    </Alert>
  )
}
