"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useProgressiveImage } from "@/hooks/use-progressive-image"

interface EnhancedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  onLoad?: () => void
  onError?: () => void
  fallbackSrc?: string
  showLoadingIndicator?: boolean
}

export function EnhancedImage({
  src,
  alt,
  width = 500,
  height = 500,
  className,
  priority = false,
  quality = 85,
  objectFit = "cover",
  placeholder = "empty",
  blurDataURL,
  onLoad,
  onError,
  fallbackSrc = "/placeholder.svg",
  showLoadingIndicator = true,
}: EnhancedImageProps) {
  const [error, setError] = useState<boolean>(false)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const imageRef = useRef<HTMLDivElement>(null)

  const safeSrc = src || fallbackSrc
  const { loaded, blur } = useProgressiveImage(safeSrc)

  const placeholderUrl = blurDataURL || `/placeholder.svg?height=${height}&width=${width}`

  const isBlobUrl = src && src.startsWith("blob:")

  const handleError = () => {
    console.log(`[v0] Image load error for: ${safeSrc}`)

    if (isBlobUrl) {
      console.warn(`[v0] Blob URL failed to load: ${safeSrc}`)
      setError(true)
      if (onError) onError()
      return
    }

    // For regular URLs, implement retry logic
    if (retryCount < 3) {
      const timeout = Math.pow(2, retryCount) * 1000
      console.warn(`[v0] Image load error, retrying in ${timeout}ms: ${safeSrc}`)

      setTimeout(() => {
        setRetryCount(retryCount + 1)
      }, timeout)
    } else {
      console.error(`[v0] Failed to load image after ${retryCount} retries: ${safeSrc}`)
      setError(true)
      if (onError) onError()
    }
  }

  const handleLoad = () => {
    if (onLoad) onLoad()
  }

  useEffect(() => {
    if (!priority && imageRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true)
              observer.disconnect()
            }
          })
        },
        { rootMargin: "200px" },
      )

      observer.observe(imageRef.current)
      return () => observer.disconnect()
    } else {
      setIsVisible(true)
    }
  }, [priority])

  const handleRetry = () => {
    setError(false)
    setRetryCount(0)
  }

  const renderImage = () => {
    if (error) {
      return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
          <Image
            src={fallbackSrc || "/placeholder.svg"}
            alt={alt}
            width={width}
            height={height}
            className={cn("object-contain", className)}
            quality={quality}
          />
          {!isBlobUrl && (
            <button
              onClick={handleRetry}
              className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-sm"
              aria-label="Retry loading image"
            >
              Retry
            </button>
          )}
        </div>
      )
    }

    if (!isVisible && !priority) {
      return (
        <div
          className={cn("bg-gray-100 dark:bg-gray-800 animate-pulse rounded", className)}
          style={{ width: width || "100%", height: height || "100%" }}
        />
      )
    }

    return (
      <div className="relative w-full h-full">
        {!loaded && placeholder === "blur" && (
          <Image
            src={placeholderUrl || "/placeholder.svg"}
            alt=""
            fill
            className={cn("object-cover transition-opacity duration-500", loaded ? "opacity-0" : "opacity-100")}
            quality={10}
          />
        )}

        <Image
          src={safeSrc || "/placeholder.svg"}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-all duration-500",
            objectFit === "contain" ? "object-contain" : "object-cover",
            blur ? "blur-sm scale-105" : "blur-0 scale-100",
            className,
          )}
          style={{
            opacity: loaded ? 1 : 0.5,
          }}
        />

        {!loaded && showLoadingIndicator && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={imageRef}
      className={cn("relative overflow-hidden", className)}
      style={{ width: width || "100%", height: height || "100%" }}
    >
      {renderImage()}
    </div>
  )
}
