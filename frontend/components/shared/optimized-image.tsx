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
    // Only set the image source if it's provided and valid
    if (src && src !== "") {
      setImgSrc(src)
    }
  }, [src])

  const handleImageLoad = () => {
    setIsLoading(false)
    if (onLoad) onLoad()
  }

  const handleImageError = () => {
    setError(true)
    setImgSrc(`/placeholder.svg?height=${height}&width=${width}`)
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

