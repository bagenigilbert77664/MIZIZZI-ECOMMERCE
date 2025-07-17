"use client"

import { useState, useEffect } from "react"

/**
 * Hook that tracks network status
 * @returns Object containing online status and connection quality
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)

  const [connectionQuality, setConnectionQuality] = useState<"unknown" | "slow" | "medium" | "fast">("unknown")

  useEffect(() => {
    // Handler for when the network connection is lost
    const handleOffline = () => {
      setIsOnline(false)
    }

    // Handler for when the network connection is restored
    const handleOnline = () => {
      setIsOnline(true)
      checkConnectionQuality()
    }

    // Check connection quality
    const checkConnectionQuality = async () => {
      try {
        if (!navigator.onLine) {
          setConnectionQuality("unknown")
          return
        }

        // Use performance API to measure connection speed
        const startTime = performance.now()

        // Fetch a small file to test connection speed
        const response = await fetch("/favicon.ico", {
          method: "HEAD",
          cache: "no-store",
        })

        if (!response.ok) throw new Error("Network test failed")

        const endTime = performance.now()
        const duration = endTime - startTime

        // Classify connection quality based on response time
        if (duration < 100) {
          setConnectionQuality("fast")
        } else if (duration < 300) {
          setConnectionQuality("medium")
        } else {
          setConnectionQuality("slow")
        }
      } catch (error) {
        console.warn("Error checking connection quality:", error)
        setConnectionQuality("unknown")
      }
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial check
    checkConnectionQuality()

    // Set up periodic checks when online
    let intervalId: NodeJS.Timeout | null = null
    if (isOnline) {
      intervalId = setInterval(checkConnectionQuality, 60000) // Check every minute
    }

    // Clean up
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (intervalId) clearInterval(intervalId)
    }
  }, [isOnline])

  return { isOnline, connectionQuality }
}
