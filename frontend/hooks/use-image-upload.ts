"use client"

import { useState, useEffect } from "react"
import { imageCache } from "@/services/image-cache"
import { toast } from "@/components/ui/use-toast"

interface UseProductImagesProps {
  productId: string | number
  initialImages?: string[]
}

interface UseProductImagesReturn {
  images: string[]
  setImages: (images: string[]) => void
  addImage: (imageUrl: string) => void
  removeImage: (imageUrl: string) => void
  moveImage: (fromIndex: number, toIndex: number) => void
  setMainImage: (index: number) => void
  resetImages: () => void
  hasChanges: boolean
  isLoading: boolean
}

/**
 * Custom hook for managing product images with persistent caching
 */
export function useProductImages({ productId, initialImages = [] }: UseProductImagesProps): UseProductImagesReturn {
  const [images, setImagesState] = useState<string[]>([])
  const [originalImages, setOriginalImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // Load images from cache on mount
  useEffect(() => {
    const loadImages = () => {
      if (!productId) {
        setIsLoading(false)
        return
      }

      try {
        // Try to get images from cache first
        const cachedImages = imageCache.getProductImages(productId)

        if (cachedImages && cachedImages.length > 0) {
          console.log(`Loaded ${cachedImages.length} images from cache for product ${productId}`)
          setImagesState(cachedImages)
          setOriginalImages(cachedImages)
        } else if (initialImages && initialImages.length > 0) {
          // Fall back to initialImages if provided
          console.log(`Using ${initialImages.length} initial images for product ${productId}`)
          setImagesState(initialImages)
          setOriginalImages(initialImages)
          // Also cache these images for future use
          imageCache.cacheProductImages(productId, initialImages)
        }

        setHasChanges(false)
      } catch (error) {
        console.error("Error loading product images:", error)
        if (initialImages && initialImages.length > 0) {
          setImagesState(initialImages)
          setOriginalImages(initialImages)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadImages()
  }, [productId, initialImages])

  // Function to set images and update cache
  const setImages = (newImages: string[]) => {
    setImagesState(newImages)
    imageCache.cacheProductImages(productId, newImages)
    setHasChanges(!arraysEqual(newImages, originalImages))
  }

  // Add a new image
  const addImage = (imageUrl: string) => {
    setImages([...images, imageUrl])
    toast({
      title: "Image added",
      description: "The image has been added to the product.",
    })
  }

  // Remove an image by URL
  const removeImage = (imageUrl: string) => {
    const newImages = images.filter((url) => url !== imageUrl)
    setImages(newImages)
  }

  // Move an image from one position to another
  const moveImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const newImages = [...images]
    const [movedImage] = newImages.splice(fromIndex, 1)
    newImages.splice(toIndex, 0, movedImage)

    setImages(newImages)
  }

  // Set an image as the main image (move to first position)
  const setMainImage = (index: number) => {
    if (index === 0) return // Already main image

    const newImages = [...images]
    const mainImage = newImages.splice(index, 1)[0]
    newImages.unshift(mainImage)

    setImages(newImages)
  }

  // Reset to original images
  const resetImages = () => {
    setImages(originalImages)
    toast({
      title: "Changes discarded",
      description: "Product images have been reset to their original state.",
    })
  }

  // Helper function to compare arrays
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false
    return a.every((val, idx) => val === b[idx])
  }

  // Save images to sessionStorage before unloading page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save current state to cache before page unload
      imageCache.cacheProductImages(productId, images)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [productId, images])

  return {
    images,
    setImages,
    addImage,
    removeImage,
    moveImage,
    setMainImage,
    resetImages,
    hasChanges,
    isLoading,
  }
}
