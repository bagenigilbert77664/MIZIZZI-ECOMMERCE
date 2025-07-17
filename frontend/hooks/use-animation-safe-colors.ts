"use client"

import { useCallback } from "react"
import { safeColorForAnimation } from "@/lib/utils"

/**
 * Hook to safely transform colors for Framer Motion animations
 */
export function useAnimationSafeColors() {
  /**
   * Transforms any color value to an animation-safe format
   */
  const getSafeColor = useCallback((color: string): string => {
    return safeColorForAnimation(color)
  }, [])

  /**
   * Transforms an object of style properties that may contain colors
   * into an object with animation-safe color values
   */
  const getSafeStyles = useCallback((styles: Record<string, any>): Record<string, any> => {
    const safeStyles: Record<string, any> = {}

    for (const key in styles) {
      const value = styles[key]

      // If this might be a color property and it's a string
      if (
        typeof value === "string" &&
        (key.includes("color") || key.includes("background") || key === "fill" || key === "stroke")
      ) {
        safeStyles[key] = safeColorForAnimation(value)
      } else {
        safeStyles[key] = value
      }
    }

    return safeStyles
  }, [])

  return { getSafeColor, getSafeStyles }
}

export default useAnimationSafeColors
