"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
  objectPosition?: string
  quality?: number
  placeholder?: "blur" | "empty"
  blurDataURL?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  objectFit = "cover",
  objectPosition = "center",
  quality = 80,
  placeholder = "empty",
  blurDataURL,
  ...props
}: OptimizedImageProps) {
  // Default dimensions if not provided
  const finalWidth = width || 500
  const finalHeight = height || 500

  // Use placeholder image if src is empty or invalid
  const imageSrc = src || "/placeholder.svg"

  // Generate blur data URL for placeholder if not provided
  const finalBlurDataURL = blurDataURL || "/placeholder.svg?height=10&width=10"

  return (
    <div className={cn("overflow-hidden", className)} style={{ position: "relative" }}>
      <Image
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={finalBlurDataURL}
        style={{
          objectFit,
          objectPosition,
          width: "100%",
          height: "auto", // Maintain aspect ratio
        }}
        {...props}
      />
    </div>
  )
}
