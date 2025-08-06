"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X, ImageIcon, AlertCircle, Save, Loader2, Star, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { EnhancedImage } from "@/components/shared/enhanced-image"
import { imageUploadService } from "@/services/image-upload-service"
import { useProductImages } from "@/hooks/use-swr-product"

interface ProductImagesTabProps {
  images: string[]
  setImages: (images: string[]) => void
  setFormChanged: (changed: boolean) => void
  saveSectionChanges: (section: string) => Promise<boolean>
  productId?: string
}

export function ProductImagesTab({
  images,
  setImages,
  setFormChanged,
  saveSectionChanges,
  productId,
}: ProductImagesTabProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Use SWR hook for real-time image data
  const {
    images: swrImages,
    isLoading: isLoadingImages,
    mutate: mutateImages,
  } = useProductImages(productId)

  // Update local images when SWR data changes
  useEffect(() => {
    if (swrImages && swrImages.length > 0) {
      // Assuming ProductImage has a 'url' property
      setImages(swrImages.map((img: any) => img.url))
      console.log(`Loaded ${swrImages.length} images from database for product ${productId}`)
    }
  }, [swrImages, setImages, productId])

  // Handle manual refresh of images
  const handleRefreshImages = async () => {
    setIsRefreshing(true)
    try {
      await mutateImages()
      toast({
        description: "Images refreshed successfully",
      })
    } catch (error) {
      console.error("Error refreshing images:", error)
      toast({
        title: "Error refreshing images",
        description: "Failed to refresh images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Handle save button click
  const handleSave = async () => {
    if (!hasChanges) {
      toast({
        description: "No changes to save",
      })
      return
    }

    setIsSaving(true)
    try {
      const success = await saveSectionChanges("Images")
      if (success) {
        setLastSaved(new Date().toLocaleTimeString())
        setHasChanges(false)
        setFormChanged(false)

        // Refresh images from server
        await mutateImages()

        // Dispatch custom event for product update
        window.dispatchEvent(
          new CustomEvent("product-images-updated", {
            detail: { images },
          }),
        )

        toast({
          title: "Images saved successfully",
          description: `${images.length} images have been saved.`,
        })
      }
    } catch (error) {
      console.error("Error saving images:", error)
      toast({
        title: "Error saving images",
        description: "There was a problem saving your images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Set up auto-save functionality
  useEffect(() => {
    // Clear any existing timer when images change
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    if (hasChanges) {
      // Set a new timer to auto-save after 30 seconds of inactivity
      const timer = setTimeout(() => {
        handleSave()
      }, 30000)

      setAutoSaveTimer(timer)
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [images, hasChanges])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [])

  // Handle image upload with enhanced persistence
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const fileArray = Array.from(files)

      // Upload images one by one
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]

        try {
          // Compress image before upload
          const compressedFile = await imageUploadService.compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8,
            maxSizeMB: 2,
          })

          // Upload to server
          const result = await imageUploadService.uploadImage(compressedFile, productId, (progress) => {
            // Calculate overall progress
            const fileProgress = (i / fileArray.length) * 100 + progress / fileArray.length
            setUploadProgress(Math.round(fileProgress))
          })

          // Add to images array immediately
          const newImages = [...images, result.url]
          setImages(newImages)
          setHasChanges(true)
          setFormChanged(true)

          toast({
            title: "Image uploaded",
            description: `${file.name} has been uploaded successfully.`,
          })
        } catch (error: any) {
          console.error("Error uploading image:", error)
          setUploadError(error.message || "Failed to upload image.")
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}: ${error.message}`,
            variant: "destructive",
          })
        }
      }

      // Refresh images from server to ensure consistency
      await mutateImages()
    } catch (error: any) {
      console.error("Error in upload process:", error)
      setUploadError(error.message || "Failed to upload images.")
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
      // Clear the input
      e.target.value = ""
    }
  }

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setUploadError(null)

    const files = e.dataTransfer.files

    if (files && files.length > 0) {
      setIsUploading(true)
      setUploadProgress(0)

      try {
        const fileArray = Array.from(files)

        for (let i = 0; i < fileArray.length; i++) {
          const file = fileArray[i]

          // Check if it's an image
          if (!file.type.startsWith("image/")) {
            toast({
              title: "Invalid file",
              description: `${file.name} is not an image file.`,
              variant: "destructive",
            })
            continue
          }

          try {
            // Compress image before upload
            const compressedFile = await imageUploadService.compressImage(file, {
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 0.8,
              maxSizeMB: 2,
            })

            // Upload to server
            const result = await imageUploadService.uploadImage(compressedFile, productId, (progress) => {
              const fileProgress = (i / fileArray.length) * 100 + progress / fileArray.length
              setUploadProgress(Math.round(fileProgress))
            })

            // Add to images array immediately
            const newImages = [...images, result.url]
            setImages(newImages)
            setHasChanges(true)
            setFormChanged(true)

            toast({
              title: "Image uploaded",
              description: `${file.name} has been uploaded successfully.`,
            })
          } catch (error: any) {
            console.error("Error uploading image:", error)
            toast({
              title: "Upload failed",
              description: `Failed to upload ${file.name}: ${error.message}`,
              variant: "destructive",
            })
          }
        }

        // Refresh images from server to ensure consistency
        await mutateImages()
      } catch (error: any) {
        console.error("Error in drop upload:", error)
        setUploadError(error.message || "Failed to upload images.")
      } finally {
        setIsUploading(false)
        setUploadProgress(null)
      }
    }
  }

  // Remove image with enhanced cleanup
  const handleRemoveImage = async (index: number) => {
    const imageUrl = images[index]

    try {
      // Delete from server
      await imageUploadService.deleteImage(imageUrl)

      // Remove from local state
      const newImages = images.filter((_, i) => i !== index)
      setImages(newImages)
      setHasChanges(true)
      setFormChanged(true)

      // Refresh images from server to ensure consistency
      await mutateImages()

      toast({
        description: "Image removed successfully.",
      })
    } catch (error: any) {
      console.error("Error removing image:", error)
      toast({
        title: "Error",
        description: `Failed to remove image: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Set main image (move to first position)
  const setAsMainImage = (index: number) => {
    if (index === 0) return // Already main image

    const newImages = [...images]
    const mainImage = newImages.splice(index, 1)[0]
    newImages.unshift(mainImage)

    setImages(newImages)
    setHasChanges(true)
    setFormChanged(true)

    toast({
      description: "Main image updated. Don't forget to save your changes.",
    })
  }

  return (
    <Card className="border shadow-sm bg-white">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header with refresh button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Product Images</h3>
            <div className="flex items-center space-x-2">
              {images.length > 0 && <span className="text-sm text-gray-500">{images.length} images</span>}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshImages}
                disabled={isRefreshing || isLoadingImages}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-300"
            } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-orange-50 rounded-full">
                {isUploading ? (
                  <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                ) : (
                  <Upload className="h-10 w-10 text-orange-500" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {isUploading ? "Uploading images..." : "Drag and drop product images"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">PNG, JPG, JPEG, GIF or WEBP up to 5MB</p>
              </div>
              {!isUploading && (
                <Button variant="outline" onClick={() => document.getElementById("image-upload")?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Browse Images
                </Button>
              )}
              <input
                id="image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={isUploading}
              />
            </div>
          </div>

          {uploadProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-gray-500 mt-1 text-center">Uploading: {uploadProgress}%</p>
            </div>
          )}

          {uploadError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {isLoadingImages && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-500">Loading images...</span>
            </div>
          )}

          {images.length > 0 && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                {images.map((image, index) => (
                  <div key={`${image}-${index}`} className="relative group">
                    <EnhancedImage
                      src={image}
                      alt={`Product image ${index + 1}`}
                      width={200}
                      height={200}
                      className="rounded-md border border-gray-200 w-full h-40 object-cover"
                      objectFit="cover"
                    />

                    {/* Main image indicator */}
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                        <Star className="h-3 w-3 mr-1" />
                        Main
                      </div>
                    )}

                    <div className="absolute top-2 right-2 flex space-x-1">
                      {index !== 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
                          onClick={() => setAsMainImage(index)}
                          title="Set as main image"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {lastSaved && <div className="text-sm text-gray-500 mt-4">Last saved: {lastSaved}</div>}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-4 bg-gray-50">
        <div className="text-sm text-gray-500">
          {hasChanges && !isSaving && "Unsaved changes"}
          {isSaving && "Saving changes..."}
          {isUploading && "Uploading images..."}
          {!hasChanges && !isSaving && !isUploading && `${images.length} images loaded`}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges || isUploading}
          className={`bg-orange-500 hover:bg-orange-600 ${!hasChanges ? "opacity-70" : ""}`}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Images
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
