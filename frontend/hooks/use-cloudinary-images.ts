"use client"

import { useState, useEffect, useCallback } from "react"
import { cloudinaryImageService, type ProductImageData } from "@/services/cloudinary-image-service"
import { toast } from "@/components/ui/use-toast"

interface UseCloudinaryImagesOptions {
  productId: string | number
  autoFetch?: boolean
}

interface UseCloudinaryImagesReturn {
  images: ProductImageData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  uploadImages: (files: File[], primaryIndex?: number, altTextPrefix?: string) => Promise<boolean>
  deleteImage: (imageId: number) => Promise<boolean>
  setPrimaryImage: (imageId: number) => Promise<boolean>
  updateImageMetadata: (imageId: number, metadata: { alt_text?: string; sort_order?: number }) => Promise<boolean>
  reorderImages: (imageOrders: Array<{ id: number; sort_order: number }>) => Promise<boolean>
}

export function useCloudinaryImages({
  productId,
  autoFetch = true,
}: UseCloudinaryImagesOptions): UseCloudinaryImagesReturn {
  const [images, setImages] = useState<ProductImageData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch images from API
  const fetchImages = useCallback(async () => {
    if (!productId) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await cloudinaryImageService.getProductImages(productId)

      if (result.success) {
        setImages(result.images)
      } else {
        throw new Error("Failed to fetch images")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch images"
      setError(errorMessage)
      console.error("Error fetching images:", err)
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  // Upload new images
  const uploadImages = useCallback(
    async (files: File[], primaryIndex = 0, altTextPrefix?: string): Promise<boolean> => {
      if (!productId || files.length === 0) return false

      setIsLoading(true)
      setError(null)

      try {
        const result = await cloudinaryImageService.uploadProductImages(productId, files, primaryIndex, altTextPrefix)

        if (result.success) {
          // Update local state with new images
          setImages((prev) => [...prev, ...result.uploaded_images])

          toast({
            title: "Images uploaded successfully",
            description: `${result.uploaded_images.length} images have been uploaded to Cloudinary.`,
          })

          if (result.errors.length > 0) {
            console.warn("Some images failed to upload:", result.errors)
            toast({
              title: "Some uploads failed",
              description: `${result.errors.length} images failed to upload. Check console for details.`,
              variant: "destructive",
            })
          }

          return true
        } else {
          throw new Error(result.message || "Upload failed")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to upload images"
        setError(errorMessage)

        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive",
        })

        return false
      } finally {
        setIsLoading(false)
      }
    },
    [productId],
  )

  // Delete an image
  const deleteImage = useCallback(async (imageId: number): Promise<boolean> => {
    setError(null)

    try {
      const result = await cloudinaryImageService.deleteImage(imageId)

      if (result.success) {
        // Remove from local state
        setImages((prev) => prev.filter((img) => img.id !== imageId))

        toast({
          title: "Image deleted",
          description: "Image has been removed from Cloudinary and the database.",
        })

        return true
      } else {
        throw new Error(result.message || "Delete failed")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete image"
      setError(errorMessage)

      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      })

      return false
    }
  }, [])

  // Set primary image
  const setPrimaryImage = useCallback(async (imageId: number): Promise<boolean> => {
    setError(null)

    try {
      const result = await cloudinaryImageService.setPrimaryImage(imageId)

      if (result.success) {
        // Update local state
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            is_primary: img.id === imageId,
          })),
        )

        toast({
          title: "Primary image updated",
          description: "The primary image has been updated successfully.",
        })

        return true
      } else {
        throw new Error(result.message || "Failed to set primary image")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set primary image"
      setError(errorMessage)

      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      })

      return false
    }
  }, [])

  // Update image metadata
  const updateImageMetadata = useCallback(
    async (imageId: number, metadata: { alt_text?: string; sort_order?: number }): Promise<boolean> => {
      setError(null)

      try {
        const result = await cloudinaryImageService.updateImageMetadata(imageId, metadata)

        if (result.success) {
          // Update local state
          setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, ...metadata } : img)))

          toast({
            title: "Image updated",
            description: "Image metadata has been updated successfully.",
          })

          return true
        } else {
          throw new Error(result.message || "Failed to update image metadata")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update image metadata"
        setError(errorMessage)

        toast({
          title: "Update failed",
          description: errorMessage,
          variant: "destructive",
        })

        return false
      }
    },
    [],
  )

  // Reorder images
  const reorderImages = useCallback(
    async (imageOrders: Array<{ id: number; sort_order: number }>): Promise<boolean> => {
      setError(null)

      try {
        const result = await cloudinaryImageService.reorderImages(imageOrders)

        if (result.success) {
          // Update local state with new order
          setImages((prev) => {
            const updated = [...prev]
            imageOrders.forEach((order) => {
              const index = updated.findIndex((img) => img.id === order.id)
              if (index !== -1) {
                updated[index].sort_order = order.sort_order
              }
            })
            return updated.sort((a, b) => a.sort_order - b.sort_order)
          })

          toast({
            title: "Images reordered",
            description: "Image order has been updated successfully.",
          })

          return true
        } else {
          throw new Error(result.message || "Failed to reorder images")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to reorder images"
        setError(errorMessage)

        toast({
          title: "Reorder failed",
          description: errorMessage,
          variant: "destructive",
        })

        return false
      }
    },
    [],
  )

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && productId) {
      fetchImages()
    }
  }, [autoFetch, productId, fetchImages])

  return {
    images,
    isLoading,
    error,
    refetch: fetchImages,
    uploadImages,
    deleteImage,
    setPrimaryImage,
    updateImageMetadata,
    reorderImages,
  }
}
