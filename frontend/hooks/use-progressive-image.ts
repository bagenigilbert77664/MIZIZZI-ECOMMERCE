"use client"

import { useState, useEffect } from "react"
import { imageCache } from "@/services/image-cache"

interface UseProgressiveImageReturn {
  loaded: boolean
  error: boolean
  imageSource: string
  blur: boolean
}

/**
 * Custom hook for progressively loading images with fallback support
 * This helps ensure images are cached in-memory and retrieved as quickly as possible
 */
export function useProgressiveImage(src: string, fallbackSrc = "/placeholder.svg"): UseProgressiveImageReturn {
  const [loaded, setLoaded] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)
  const [imageSource, setImageSource] = useState<string>(fallbackSrc)
  const [blur, setBlur] = useState<boolean>(true)

  useEffect(() => {
    setLoaded(false)
    setError(false)
    setBlur(true)

    // If src is empty, use fallback and exit
    if (!src) {
      setImageSource(fallbackSrc)
      setError(true)
      return
    }

    // First check if we already have this image in our cache
    const cachedSrc = imageCache.get(`image-src-${src}`)
    if (cachedSrc) {
      setImageSource(cachedSrc)
      setLoaded(true)
      setBlur(false)
      return
    }

    // Create a new image to preload
    const img = new Image()
    img.src = src

    // When the image loads successfully
    img.onload = () => {
      setImageSource(src)
      setLoaded(true)
      setBlur(false)
      // Cache the successful image
      imageCache.set(`image-src-${src}`, src)
    }

    // If there's an error loading the image
    img.onerror = () => {
      console.warn(`Failed to load image: ${src}, using fallback`)
      setImageSource(fallbackSrc)
      setError(true)
      setBlur(false)
    }

    // Cleanup function
    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src, fallbackSrc])

  return { loaded, error, imageSource, blur }
}
