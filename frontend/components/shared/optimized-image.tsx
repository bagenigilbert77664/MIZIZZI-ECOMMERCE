"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  quality?: number
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down"
  sizes?: string
  onLoad?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  objectFit = "cover",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  onLoad,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [imgSrc, setImgSrc] = useState<string>("/placeholder.svg")
  const [error, setError] = useState(false)

  useEffect(() => {
    if (src && src !== "") {
      if (
        src.includes("photo-1609592806596-4d8b5b3c4b5e") ||
        (src.includes("unsplash.com") && src.includes("404")) ||
        src.includes("sale-banner.png") // Add the problematic sale banner
      ) {
        console.warn(`[v0] Detected potentially broken image URL: ${src}`)
        setImgSrc(`/placeholder.svg?height=${height}&width=${width}&text=Image%20Not%20Available`)
        setError(true)
      } else {
        setImgSrc(src)
      }
    } else {
      setImgSrc(`/placeholder.svg?height=${height}&width=${width}`)
    }
  }, [src, height, width])

  const handleImageLoad = () => {
    setIsLoading(false)
    if (onLoad) onLoad()
  }

  const handleImageError = () => {
    console.warn(`[v0] Image failed to load: ${imgSrc}`)
    setError(true)
    setImgSrc(`/placeholder.svg?height=${height}&width=${width}&text=Image%20Unavailable`)
    setIsLoading(false)
  }

  return (
    <div className={cn("relative overflow-hidden", isLoading ? "animate-pulse bg-gray-200" : "", className)}>
      <Image
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        className={cn(
          isLoading ? "scale-110 blur-sm" : "scale-100 blur-0",
          "transition-all duration-300",
          objectFit === "cover" && "object-cover",
          objectFit === "contain" && "object-contain",
          objectFit === "fill" && "object-fill",
          objectFit === "none" && "object-none",
          objectFit === "scale-down" && "object-scale-down",
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        sizes={sizes}
        unoptimized={process.env.NODE_ENV === "development"}
      />
    </div>
  )
}
