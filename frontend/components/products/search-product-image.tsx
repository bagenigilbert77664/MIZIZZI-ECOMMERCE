"use client"

import { useState, useEffect } from "react"
import { imageBatchService } from "@/services/image-batch-service"
import type { ProductImage } from "@/types"

interface SearchProductImageProps {
  productId: number
  productName: string
  fallbackImage?: string
  className?: string
}

export function SearchProductImage({
  productId,
  productName,
  fallbackImage = "/diverse-products-still-life.png",
  className = "w-full h-full object-cover",
}: SearchProductImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(fallbackImage)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const loadProductImage = async () => {
      try {
        setIsLoading(true)
        setHasError(false)

        // Get cached images from the batch service
        const cachedImages = imageBatchService.getCachedImages(productId.toString())

        if (cachedImages && Array.isArray(cachedImages) && cachedImages.length > 0) {
          const firstImage = cachedImages[0]

          // Ensure we have a valid ProductImage object
          if (firstImage && typeof firstImage === "object" && "url" in firstImage) {
            const imageUrl = (firstImage as ProductImage).url

            if (imageUrl && typeof imageUrl === "string") {
              // Handle different URL formats
              let finalImageUrl = imageUrl
              if (!imageUrl.startsWith("http")) {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
                finalImageUrl = imageUrl.startsWith("/")
                  ? `${backendUrl}${imageUrl}`
                  : `${backendUrl}/api/uploads/product_images/${imageUrl}`
              }

              setImageSrc(finalImageUrl)
              setIsLoading(false)
              return
            }
          }
        }

        // If no cached images, try to fetch them
        console.log(`[v0] Fetching images for product ${productId}`)
        const images = await imageBatchService.fetchProductImages(productId.toString())

        if (images && Array.isArray(images) && images.length > 0) {
          const firstImage = images[0]

          if (firstImage && typeof firstImage === "object" && "url" in firstImage) {
            const imageUrl = (firstImage as ProductImage).url

            if (imageUrl && typeof imageUrl === "string") {
              let finalImageUrl = imageUrl
              if (!imageUrl.startsWith("http")) {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
                finalImageUrl = imageUrl.startsWith("/")
                  ? `${backendUrl}${imageUrl}`
                  : `${backendUrl}/api/uploads/product_images/${imageUrl}`
              }

              setImageSrc(finalImageUrl)
            } else {
              setImageSrc(fallbackImage)
            }
          } else {
            console.warn(`[v0] Unexpected image data format for product ${productId}:`, firstImage)
            setImageSrc(fallbackImage)
          }
        } else {
          setImageSrc(fallbackImage)
        }
      } catch (error) {
        console.error(`[v0] Error loading image for product ${productId}:`, error)
        setImageSrc(fallbackImage)
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    loadProductImage()
  }, [productId, fallbackImage])

  const handleImageError = () => {
    if (!hasError) {
      console.log(`[v0] Image failed to load for product ${productId}, using fallback`)
      setImageSrc(fallbackImage)
      setHasError(true)
    }
  }

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}>
        <div className="text-gray-400 text-xs">Loading...</div>
      </div>
    )
  }

  return (
    <img
      src={imageSrc || "/placeholder.svg"}
      alt={productName}
      className={className}
      onError={handleImageError}
      loading="lazy"
    />
  )
}
