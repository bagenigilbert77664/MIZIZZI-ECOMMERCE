"use client"

import { useState, useEffect } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"

// Define breakpoints locally since they're not exported from carousel constants
const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  minSpaceForCards: 600,
  minSpaceForSidePanels: 1200,
}

export function useResponsiveLayout() {
  const [sidePanelsVisible, setSidePanelsVisible] = useState(true)
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`)
  const isLargeTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`)

  useEffect(() => {
    const checkCollision = () => {
      const screenWidth = window.innerWidth

      if (screenWidth < BREAKPOINTS.minSpaceForSidePanels && screenWidth >= BREAKPOINTS.minSpaceForCards) {
        setSidePanelsVisible(false)
      } else if (screenWidth >= BREAKPOINTS.minSpaceForSidePanels) {
        setSidePanelsVisible(true)
      } else {
        setSidePanelsVisible(false)
      }
    }

    checkCollision()
    window.addEventListener("resize", checkCollision)
    return () => window.removeEventListener("resize", checkCollision)
  }, [])

  return {
    sidePanelsVisible,
    isDesktop,
    isLargeTablet,
  }
}
