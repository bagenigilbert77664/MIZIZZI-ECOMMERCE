"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"

/**
 * Component that detects network status changes and shows notifications
 */
export function NetworkDetector() {
  const [isOnline, setIsOnline] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Initialize with current network status
    setIsOnline(navigator.onLine)

    // Handler for when the network connection is lost
    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "You're offline",
        description: "Some features may be unavailable until you reconnect.",
        variant: "destructive",
        duration: 5000,
      })
    }

    // Handler for when the network connection is restored
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "You're back online",
        description: "All features are now available.",
        duration: 3000,
      })
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Clean up event listeners
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [toast])

  // This component doesn't render anything visible
  return null
}
