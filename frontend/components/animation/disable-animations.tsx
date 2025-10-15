"use client"

import { useEffect, useState } from "react"

/**
 * DisableAnimations component provides a way to disable all animations
 * for users who have requested reduced motion in their system preferences
 */
export default function DisableAnimations() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check if the user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    // Listen for changes to the prefers-reduced-motion media query
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)

    // Apply the disable-animations class to the document if needed
    if (mediaQuery.matches) {
      document.documentElement.classList.add("disable-animations")
    } else {
      document.documentElement.classList.remove("disable-animations")
    }

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  // Add global styles to disable animations when prefers-reduced-motion is active
  if (prefersReducedMotion) {
    return (
      <style jsx global>{`
        .disable-animations *,
        .disable-animations *::before,
        .disable-animations *::after {
          animation-duration: 0.001s !important;
          transition-duration: 0.001s !important;
          animation-iteration-count: 1 !important;
          transition-delay: 0s !important;
          animation-delay: 0s !important;
        }
      `}</style>
    )
  }

  return null
}
