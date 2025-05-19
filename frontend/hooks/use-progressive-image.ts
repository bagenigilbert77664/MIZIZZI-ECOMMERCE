"use client"

import { useState, useEffect } from "react"

interface ProgressiveImageState {
  loaded: boolean
  blur: boolean
  error: boolean
}

/**
 * Hook for handling progressive image loading
 * @param src Image source URL
 * @returns Object with loading state information
 */
export function useProgressiveImage(src: string): ProgressiveImageState {
  const [state, setState] = useState<ProgressiveImageState>({
    loaded: false,
    blur: true,
    error: false,
  })

  useEffect(() => {
    // Reset state when src changes
    setState({
      loaded: false,
      blur: true,
      error: false,
    })

    if (!src) {
      setState({
        loaded: false,
        blur: false,
        error: true,
      })
      return
    }

    // Create a new image object to preload the image
    const img = new Image()
    img.src = src

    // Handle successful load
    img.onload = () => {
      setState({
        loaded: true,
        blur: false,
        error: false,
      })
    }

    // Handle load error
    img.onerror = () => {
      setState({
        loaded: false,
        blur: false,
        error: true,
      })
    }

    // Start with blur effect
    const blurTimer = setTimeout(() => {
      // If image hasn't loaded after 100ms, keep blur but show loading state
      if (!img.complete) {
        setState((prev) => ({
          ...prev,
          blur: true,
        }))
      }
    }, 100)

    return () => {
      // Clean up
      img.onload = null
      img.onerror = null
      clearTimeout(blurTimer)
    }
  }, [src])

  return state
}
