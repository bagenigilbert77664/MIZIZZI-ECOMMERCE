"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Hook that tracks network status with debouncing to prevent flapping
 * @returns Object containing online status and connection quality
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [connectionQuality, setConnectionQuality] = useState<"unknown" | "slow" | "medium" | "fast">("unknown")

  const onlineDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const offlineDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const qualityCheckDebounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleOffline = () => {
      // Clear any pending online debounce
      if (onlineDebounceRef.current) {
        clearTimeout(onlineDebounceRef.current)
        onlineDebounceRef.current = null
      }

      // Debounce offline detection by 2 seconds to prevent flapping
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current)
      }

      offlineDebounceRef.current = setTimeout(() => {
        console.log("[v0] Network went offline (debounced)")
        setIsOnline(false)
        setConnectionQuality("unknown")
      }, 2000)
    }

    const handleOnline = () => {
      // Clear any pending offline debounce
      if (offlineDebounceRef.current) {
        clearTimeout(offlineDebounceRef.current)
        offlineDebounceRef.current = null
      }

      // Debounce online detection by 1 second to prevent flapping
      if (onlineDebounceRef.current) {
        clearTimeout(onlineDebounceRef.current)
      }

      onlineDebounceRef.current = setTimeout(() => {
        console.log("[v0] Network came online (debounced)")
        setIsOnline(true)
        checkConnectionQuality()
      }, 1000)
    }

    const checkConnectionQuality = async () => {
      // Clear any pending quality check
      if (qualityCheckDebounceRef.current) {
        clearTimeout(qualityCheckDebounceRef.current)
      }

      qualityCheckDebounceRef.current = setTimeout(async () => {
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
      }, 500) // Debounce quality checks by 500ms
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial check (debounced)
    checkConnectionQuality()

    let intervalId: NodeJS.Timeout | null = null
    if (isOnline) {
      intervalId = setInterval(checkConnectionQuality, 120000) // Check every 2 minutes instead of 1
    }

    // Clean up
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)

      if (onlineDebounceRef.current) clearTimeout(onlineDebounceRef.current)
      if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current)
      if (qualityCheckDebounceRef.current) clearTimeout(qualityCheckDebounceRef.current)
      if (intervalId) clearInterval(intervalId)
    }
  }, [isOnline])

  return { isOnline, connectionQuality }
}
