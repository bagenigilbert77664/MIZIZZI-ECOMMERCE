"use client"

import { useState, useEffect, useCallback } from "react"
import { cloudinaryService, type CloudinaryImageData } from "@/services/cloudinary-service"
import { toast } from "@/components/ui/use-toast"

interface UseCloudinaryProductImagesProps {
  productId: string | number
  autoLoad?: boolean
}

interface UseCloudinaryProductImagesReturn {
  images: CloudinaryImageData[]
  isLoading: boolean
  isUploading: boolean
  uploadProgress: number
  error: string | null
  loadImages: () => Promise<void>
  uploadImages: (
    files: File[],
    options?: {
      primaryIndex?: number
      altTextPrefix?: string
    },
  ) => Promise<void>
  deleteImage: (imageId: number) => Promise<void>
  setPrimaryImage: (imageId: number) => Promise<void>
  updateImageMetadata: (
    imageId: number,
    metadata: {
      alt_text?: string
      sort_order?: number
    },
  ) => Promise<void>
  reorderImages: (imageOrders: Array<{ id: number; sort_order: number }>) => Promise<void>
  refreshImages: () => Promise<void>
}

export function useCloudinaryProductImages({
  productId,
  autoLoad = true,
}: UseCloudinaryProductImagesProps): UseCloudinaryProductImagesReturn {
  const [images, setImages] = useState<CloudinaryImageData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load images from Cloudinary
   */
  const loadImages = useCallback(async () => {
    if (!productId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await cloudinaryService.getProductImages(productId)
      if (response.success) {
        setImages(response.images)
      } else {
        throw new Error("Failed to load images")
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load product images"
      setError(errorMessage)
      console.error("Error loading images:", err)
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  /**
   * Upload new images
   */
  const uploadImages = useCallback(
    async (
      files: File[],
      options: {
        primaryIndex?: number
        altTextPrefix?: string
      } = {},
    ) => {
      if (!productId || !files.length) return

      setIsUploading(true)
      setUploadProgress(0)
      setError(null)

      try {
        const response = await cloudinaryService.uploadProductImages(productId, files, {
          ...options,
          onProgress: setUploadProgress,
        })

        if (response.success) {
          toast({
            title: "Upload Successful",
            description: `${response.uploaded_images.length} images uploaded successfully`,
          })

          // Reload images to get the latest state
          await loadImages()
        } else {
          throw new Error(response.message || "Upload failed")
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to upload images"
        setError(errorMessage)
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        })
        console.error("Error uploading images:", err)
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    },
    [productId, loadImages],
  )

  /**
   * Delete an image
   */
  const deleteImage = useCallback(
    async (imageId: number) => {
      setError(null)

      try {
        const response = await cloudinaryService.deleteImage(imageId)
        if (response.success) {
          toast({
            title: "Image Deleted",
            description: "Image has been removed successfully",
          })

          // Remove from local state immediately for better UX
          setImages((prev) => prev.filter((img) => img.id !== imageId))

          // Reload to ensure consistency
          await loadImages()
        } else {
          throw new Error(response.message || "Delete failed")
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to delete image"
        setError(errorMessage)
        toast({
          title: "Delete Failed",
          description: errorMessage,
          variant: "destructive",
        })
        console.error("Error deleting image:", err)
      }
    },
    [loadImages],
  )

  /**
   * Set image as primary
   */
  const setPrimaryImage = useCallback(
    async (imageId: number) => {
      setError(null)

      try {
        const response = await cloudinaryService.setPrimaryImage(imageId)
        if (response.success) {
          toast({
            title: "Primary Image Set",
            description: "This image is now the primary product image",
          })

          // Update local state immediately
          setImages((prev) =>
            prev.map((img) => ({
              ...img,
              is_primary: img.id === imageId,
            })),
          )

          // Reload to ensure consistency
          await loadImages()
        } else {
          throw new Error(response.message || "Failed to set primary")
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to set primary image"
        setError(errorMessage)
        toast({
          title: "Failed to Set Primary",
          description: errorMessage,
          variant: "destructive",
        })
        console.error("Error setting primary image:", err)
      }
    },
    [loadImages],
  )

  /**
   * Update image metadata
   */
  const updateImageMetadata = useCallback(
    async (imageId: number, metadata: { alt_text?: string; sort_order?: number }) => {
      setError(null)

      try {
        const response = await cloudinaryService.updateImageMetadata(imageId, metadata)
        if (response.success) {
          toast({
            title: "Image Updated",
            description: "Image metadata has been updated",
          })

          // Update local state immediately
          setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, ...metadata } : img)))

          // Reload to ensure consistency
          await loadImages()
        } else {
          throw new Error(response.message || "Update failed")
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to update image"
        setError(errorMessage)
        toast({
          title: "Update Failed",
          description: errorMessage,
          variant: "destructive",
        })
        console.error("Error updating image metadata:", err)
      }
    },
    [loadImages],
  )

  /**
   * Reorder images
   */
  const reorderImages = useCallback(
    async (imageOrders: Array<{ id: number; sort_order: number }>) => {
      setError(null)

      try {
        const response = await cloudinaryService.reorderImages(imageOrders)
        if (response.success) {
          toast({
            title: "Images Reordered",
            description: "Image order has been updated",
          })

          // Update local state immediately
          const orderMap = new Map(imageOrders.map((order) => [order.id, order.sort_order]))
          setImages((prev) =>
            prev
              .map((img) => ({
                ...img,
                sort_order: orderMap.get(img.id!) || img.sort_order,
              }))
              .sort((a, b) => a.sort_order - b.sort_order),
          )

          // Reload to ensure consistency
          await loadImages()
        } else {
          throw new Error(response.message || "Reorder failed")
        }
      } catch (err: any) {
        const errorMessage = err.message || "Failed to reorder images"
        setError(errorMessage)
        toast({
          title: "Reorder Failed",
          description: errorMessage,
          variant: "destructive",
        })
        console.error("Error reordering images:", err)
      }
    },
    [loadImages],
  )

  /**
   * Refresh images (alias for loadImages)
   */
  const refreshImages = useCallback(async () => {
    await loadImages()
  }, [loadImages])

  // Auto-load images on mount if enabled
  useEffect(() => {
    if (autoLoad && productId) {
      loadImages()
    }
  }, [autoLoad, productId, loadImages])

  return {
    images,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    loadImages,
    uploadImages,
    deleteImage,
    setPrimaryImage,
    updateImageMetadata,
    reorderImages,
    refreshImages,
  }
}
