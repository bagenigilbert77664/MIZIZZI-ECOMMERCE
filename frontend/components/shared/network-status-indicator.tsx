"use client"

import { useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { isBackendOnline } from "@/lib/api" // Import the utility to check backend status

export function NetworkStatusIndicator() {
  const { toast } = useToast()

  useEffect(() => {
    const handleNetworkError = (event: Event) => {
      const customEvent = event as CustomEvent
      const { message, isNetworkError } = customEvent.detail

      if (isNetworkError) {
        toast({
          title: "Network Error",
          description: message || "Cannot connect to the server. Please check your internet connection.",
          variant: "destructive",
          duration: 5000, // Show for 5 seconds
        })
      }
    }

    const handleBackendUnavailable = (event: Event) => {
      const customEvent = event as CustomEvent
      const { message } = customEvent.detail

      toast({
        title: "Server Unavailable",
        description: message || "The server is currently unavailable. Please try again later.",
        variant: "destructive",
        duration: 0, // Persistent until dismissed or resolved
      })
    }

    const handleBackendRestored = () => {
      // You might want to dismiss previous toasts or show a success toast
      toast({
        title: "Connection Restored",
        description: "Successfully reconnected to the server.",
        variant: "success",
        duration: 3000,
      })
    }

    // Listen for custom events dispatched from lib/api.ts
    document.addEventListener("network-error", handleNetworkError)
    document.addEventListener("backend-unavailable", handleBackendUnavailable)
    // Assuming lib/api.ts dispatches a 'backend-restored' event on successful response after an error
    document.addEventListener("backend-restored", handleBackendRestored)

    // Initial check for backend status on component mount
    if (!isBackendOnline()) {
      toast({
        title: "Offline Mode",
        description: "It seems you are offline or the server is unreachable. Functionality may be limited.",
        variant: "warning",
        duration: 0, // Persistent
      })
    }

    return () => {
      document.removeEventListener("network-error", handleNetworkError)
      document.removeEventListener("backend-unavailable", handleBackendUnavailable)
      document.removeEventListener("backend-restored", handleBackendRestored)
    }
  }, [toast])

  return null // This component doesn't render any UI directly, it just triggers toasts
}
