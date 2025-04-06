"use client"

import { useEffect, useState } from "react"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if code is running in browser
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768) // Consider < 768px as mobile
      }

      // Initial check
      checkMobile()

      // Listen for window resize events
      window.addEventListener("resize", checkMobile)

      // Cleanup event listener on component unmount
      return () => {
        window.removeEventListener("resize", checkMobile)
      }
    }
  }, [])

  return isMobile
}

