"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X, ImageIcon, AlertCircle, Save, Loader2, Cloud } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { EnhancedImage } from "@/components/shared/enhanced-image"
import { adminService } from "@/services/admin"
import { invalidateProductImages } from "@/hooks/use-swr-product"
import { productService } from "@/services/product"
import { cloudinaryService } from "@/services/cloudinary-service"
import type { ProductImage } from "@/types"
import Script from "next/script"

interface PreviewImage {
  file: File
  blobUrl: string
  isUploading?: boolean
  id?: never
  alt_text?: never
  isPreview: true
  url: string
}

type DisplayImage = ProductImage | PreviewImage

interface ProductImagesTabProps {
  images: (string | ProductImage)[] // Support both strings and objects
  setImages: (images: (string | ProductImage)[]) => void
  setFormChanged: (changed: boolean) => void
  saveSectionChanges: (section: string) => Promise<boolean>
  productId?: number // Add productId to fetch proper image data
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
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [deletingImages, setDeletingImages] = useState<Set<number>>(new Set())
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([])
  const [permanentImages, setPermanentImages] = useState<ProductImage[]>([])
  const [cloudinaryLoaded, setCloudinaryLoaded] = useState(false)
  const cloudinaryWidgetRef = useRef<any>(null)

  const blobUrlsRef = useRef<Map<string, { url: string; refCount: number }>>(new Map())

  useEffect(() => {
    const fetchProductImages = async () => {
      if (productId) {
        try {
          setProductImages([])
          setPermanentImages([])

          console.log("[v0] Fetching product images for product:", productId)
          const imageData = await adminService.getProductImages(productId)
          console.log("[v0] Fetched image data:", imageData)

          if (Array.isArray(imageData) && imageData.length > 0) {
            setProductImages(imageData)
            setPermanentImages(imageData)
            console.log("[v0] Fetched product images with IDs:", imageData)
          } else {
            console.log("[v0] No images found for product:", productId)
            setProductImages([])
            setPermanentImages([])
          }
        } catch (error) {
          console.error("Error fetching product images:", error)
          setProductImages([])
          setPermanentImages([])
        }
      }
    }

    fetchProductImages()
  }, [productId])

  useEffect(() => {
    return () => {
      previewImages.forEach(({ blobUrl }) => {
        console.log("[v0] Cleaning up blob URL on unmount:", blobUrl)
        URL.revokeObjectURL(blobUrl)
      })
      blobUrlsRef.current.forEach(({ url }) => {
        if (url.startsWith("blob:")) {
          console.log("[v0] Cleaning up blob URL on unmount:", url)
          URL.revokeObjectURL(url)
        }
      })
      blobUrlsRef.current.clear()
    }
  }, [previewImages])

  useEffect(() => {
    if (cloudinaryLoaded && window.cloudinary && !cloudinaryWidgetRef.current) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "da35rsdl0"
      const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || "192958788917765"

      cloudinaryWidgetRef.current = window.cloudinary.createMediaLibrary(
        {
          cloud_name: cloudName,
          api_key: apiKey,
          multiple: true,
          max_files: 10,
          insert_caption: "Select Images",
        },
        {
          insertHandler: async (data: any) => {
            console.log("[v0] Selected images from Cloudinary:", data)

            if (!productId) {
              toast({
                title: "Error",
                description: "Product ID is missing. Cannot add images.",
                variant: "destructive",
              })
              return
            }

            setIsSaving(true)
            try {
              const selectedImages = data.assets || []
              const newlyAddedImages: ProductImage[] = []

              for (const asset of selectedImages) {
                try {
                  // Save Cloudinary image URL directly to database
                  const result = await adminService.saveCloudinaryImage(productId, {
                    url: asset.secure_url,
                    public_id: asset.public_id,
                    filename: asset.public_id,
                    original_name: asset.original_filename || asset.public_id,
                    size: asset.bytes,
                  })

                  if (result.success && result.image) {
                    newlyAddedImages.push(result.image)
                    console.log("[v0] Cloudinary image saved:", result.image.url)
                  }
                } catch (error) {
                  console.error("Error saving Cloudinary image:", error)
                }
              }

              if (newlyAddedImages.length > 0) {
                setPermanentImages((prev) => [...prev, ...newlyAddedImages])

                // Invalidate caches
                if (productId) {
                  invalidateProductImages(productId.toString())
                  productService.invalidateProductCache(productId.toString())

                  // Dispatch event to notify frontend
                  window.dispatchEvent(
                    new CustomEvent("productImagesUpdated", {
                      detail: {
                        productId: productId?.toString(),
                        images: [...permanentImages, ...newlyAddedImages],
                      },
                    }),
                  )
                }

                toast({
                  title: "Images added successfully",
                  description: `${newlyAddedImages.length} image(s) added from Cloudinary.`,
                })

                setLastSaved(new Date().toLocaleTimeString())
              }
            } catch (error) {
              console.error("Error adding Cloudinary images:", error)
              toast({
                title: "Error adding images",
                description: "Failed to add images from Cloudinary. Please try again.",
                variant: "destructive",
              })
            } finally {
              setIsSaving(false)
            }
          },
        },
      )
    }
  }, [cloudinaryLoaded, productId, permanentImages])

  const displayImages: DisplayImage[] = [...permanentImages, ...previewImages]

  const handleSave = async () => {
    if (!hasChanges && previewImages.length === 0) {
      toast({
        description: "No changes to save",
      })
      return
    }

    if (!productId) {
      toast({
        title: "Error",
        description: "Product ID is missing. Cannot upload images.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const newlyUploadedImages: ProductImage[] = []

      if (previewImages.length > 0) {
        console.log("[v0] Uploading preview images to get permanent URLs")

        for (const preview of previewImages) {
          try {
            const uploadResult = await adminService.uploadProductImage(productId, preview.file)

            if (uploadResult.success && uploadResult.image) {
              const uploadedImage: ProductImage = {
                id: uploadResult.image.id,
                product_id: productId,
                url: uploadResult.image.url,
                filename: uploadResult.image.filename,
                original_name: uploadResult.image.original_name,
                is_primary: uploadResult.image.is_primary,
                sort_order: uploadResult.image.sort_order,
                alt_text: uploadResult.image.alt_text,
                size: uploadResult.image.size,
                created_at: uploadResult.image.created_at,
              }

              newlyUploadedImages.push(uploadedImage)
              console.log("[v0] Image uploaded successfully:", uploadedImage.url)

              URL.revokeObjectURL(preview.blobUrl)
            }
          } catch (error) {
            console.error("Error uploading preview image:", error)
            toast({
              title: "Upload failed",
              description: "Some images failed to upload. Please try again.",
              variant: "destructive",
            })
          }
        }

        setPreviewImages([])
        setPermanentImages((prev) => [...prev, ...newlyUploadedImages])
      }

      const success = await saveSectionChanges("Images")
      if (success) {
        if (productId) {
          console.log("[v0] Invalidating caches for product:", productId)
          invalidateProductImages(productId.toString())
          productService.invalidateProductCache(productId.toString())
        }

        try {
          const imageData = await adminService.getProductImages(productId)
          if (Array.isArray(imageData) && imageData.length > 0) {
            setPermanentImages(imageData)
            console.log("[v0] Refetched product images after save:", imageData)
          }
        } catch (error) {
          console.error("Error refetching product images:", error)
        }

        setLastSaved(new Date().toLocaleTimeString())
        setHasChanges(false)
        setFormChanged(false)

        console.log("[v0] Dispatching productImagesUpdated event for product:", productId)
        window.dispatchEvent(
          new CustomEvent("productImagesUpdated", {
            detail: {
              productId: productId?.toString(),
              images: permanentImages,
            },
          }),
        )

        toast({
          title: "Images saved successfully",
          description: `${newlyUploadedImages.length} new image(s) uploaded successfully.`,
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadError(null)
    setUploadProgress(0)

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Some files exceeded the 5MB size limit and were skipped.")
        return false
      }
      if (!file.type.startsWith("image/")) {
        setUploadError("Only image files are allowed.")
        return false
      }
      return true
    })

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    setTimeout(() => {
      const newPreviewImages: PreviewImage[] = validFiles.map((file) => {
        const blobUrl = URL.createObjectURL(file)
        console.log("[v0] Created blob URL for preview only:", blobUrl)
        return {
          file,
          blobUrl,
          url: blobUrl,
          isUploading: false,
          isPreview: true as const,
          id: undefined,
          alt_text: undefined,
        }
      })

      setPreviewImages((prev) => [...prev, ...newPreviewImages])
      setHasChanges(true)
      setFormChanged(true)
      setUploadProgress(null)
      clearInterval(progressInterval)

      toast({
        title: "Images added for preview",
        description: `${newPreviewImages.length} images ready for upload. Save to make them permanent.`,
      })
    }, 1500)
  }

  const removeImage = async (index: number) => {
    const imageItem = displayImages[index]

    if ("isPreview" in imageItem && imageItem.isPreview) {
      const previewIndex = previewImages.findIndex((p) => p.blobUrl === imageItem.blobUrl)
      if (previewIndex !== -1) {
        const preview = previewImages[previewIndex]
        console.log("[v0] Removing preview image:", preview.blobUrl)
        URL.revokeObjectURL(preview.blobUrl)
        setPreviewImages((prev) => prev.filter((_, i) => i !== previewIndex))
        setHasChanges(true)
        setFormChanged(true)

        toast({
          title: "Preview image removed",
          description: "Image preview has been removed.",
        })
      }
      return
    }

    let imageIdOrUrl: string
    let imageId: number | undefined

    const permanentImage = imageItem as ProductImage
    if (permanentImage.id) {
      imageId = permanentImage.id
      imageIdOrUrl = permanentImage.id.toString()
      console.log("[v0] Using image object ID:", imageId)
    } else {
      imageIdOrUrl = permanentImage.url
      console.log("[v0] No ID in image object, will attempt URL-based deletion:", permanentImage.url)
    }

    setDeletingImages((prev) => new Set(prev).add(index))

    try {
      console.log("[v0] Attempting to delete permanent image with identifier:", imageIdOrUrl)

      const imageUrl = permanentImage.url
      if (imageUrl && imageUrl.includes("cloudinary.com")) {
        try {
          const publicId = cloudinaryService.extractPublicIdFromUrl(imageUrl)
          if (publicId) {
            console.log("[v0] Deleting image from Cloudinary with public_id:", publicId)
            const cloudinaryResult = await cloudinaryService.deleteImageFromCloudinary(publicId)
            console.log("[v0] Cloudinary deletion result:", cloudinaryResult)

            if (!cloudinaryResult.success) {
              console.warn("[v0] Cloudinary deletion failed, but continuing with database deletion")
            }
          } else {
            console.warn("[v0] Could not extract public_id from URL:", imageUrl)
          }
        } catch (cloudinaryError) {
          console.error("[v0] Error deleting from Cloudinary:", cloudinaryError)
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }

      const result = await adminService.deleteProductImage(imageIdOrUrl)

      if (result.success) {
        const updatedImages = permanentImages.filter((img) => {
          if (imageId) {
            return img.id !== imageId
          } else {
            const urlToMatch = typeof imageItem === "string" ? imageItem : imageItem.url
            return img.url !== urlToMatch
          }
        })

        setPermanentImages(updatedImages)
        setProductImages(updatedImages)
        setHasChanges(true)
        setFormChanged(true)

        if (productId) {
          console.log("[v0] Invalidating caches after image deletion for product:", productId)
          invalidateProductImages(productId.toString())
          productService.invalidateProductCache(productId.toString())

          console.log("[v0] Dispatching productImagesUpdated event after deletion for product:", productId)
          window.dispatchEvent(
            new CustomEvent("productImagesUpdated", {
              detail: {
                productId: productId?.toString(),
                images: updatedImages,
              },
            }),
          )

          try {
            const freshImageData = await adminService.getProductImages(productId)
            if (Array.isArray(freshImageData)) {
              setPermanentImages(freshImageData)
              setProductImages(freshImageData)
              console.log("[v0] Refetched fresh images after deletion:", freshImageData)
            }
          } catch (refetchError) {
            console.error("[v0] Error refetching images after deletion:", refetchError)
          }
        }

        toast({
          title: "Image deleted",
          description: "Image has been successfully deleted from the database and Cloudinary.",
        })
      } else {
        throw new Error(result.message || "Failed to delete image")
      }
    } catch (error: any) {
      console.error("Error deleting image:", error)

      let errorMessage = error.message || "Failed to delete image. Please try again."

      if (error.message?.includes("Unable to delete image")) {
        errorMessage = "Unable to delete image. Please save any recent changes first, then try again."
      } else if (error.message?.includes("Authentication failed")) {
        errorMessage = "Your session has expired. Please refresh the page and log in again."
      } else if (error.message?.includes("Image not found")) {
        errorMessage = "Image not found. It may have already been deleted. Please refresh the page."
      }

      toast({
        title: "Error deleting image",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setDeletingImages((prev) => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setUploadError(null)
    setUploadProgress(0)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          setUploadError("Some files exceeded the 5MB size limit and were skipped.")
          return false
        }
        if (!file.type.startsWith("image/")) {
          setUploadError("Only image files are allowed.")
          return false
        }
        return true
      })

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + 10
        })
      }, 200)

      setTimeout(() => {
        const newPreviewImages: PreviewImage[] = validFiles.map((file) => {
          const blobUrl = URL.createObjectURL(file)
          console.log("[v0] Created blob URL for preview only:", blobUrl)
          return {
            file,
            blobUrl,
            url: blobUrl,
            isUploading: false,
            isPreview: true as const,
            id: undefined,
            alt_text: undefined,
          }
        })

        setPreviewImages((prev) => [...prev, ...newPreviewImages])
        setHasChanges(true)
        setFormChanged(true)
        setUploadProgress(null)
        clearInterval(progressInterval)

        toast({
          title: "Images added for preview",
          description: `${newPreviewImages.length} images ready for upload. Save to make them permanent.`,
        })
      }, 1500)
    }
  }

  const setAsMainImage = (index: number) => {
    if (index === 0) return

    const imageItem = displayImages[index]
    if ("isPreview" in imageItem && imageItem.isPreview) {
      toast({
        title: "Cannot set preview as main",
        description: "Please save the image first before setting it as the main image.",
        variant: "destructive",
      })
      return
    }

    const newPermanentImages = [...permanentImages]
    const mainImage = newPermanentImages.splice(index, 1)[0]
    newPermanentImages.unshift(mainImage)

    setPermanentImages(newPermanentImages)
    setHasChanges(true)
    setFormChanged(true)

    toast({
      description: "Main image updated. Don't forget to save your changes.",
    })
  }

  const openCloudinaryMediaLibrary = () => {
    if (cloudinaryWidgetRef.current) {
      cloudinaryWidgetRef.current.show()
    } else {
      toast({
        title: "Cloudinary not loaded",
        description: "Please wait for Cloudinary to load and try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Script
        src="https://media-library.cloudinary.com/global/all.js"
        onLoad={() => {
          console.log("[v0] Cloudinary Media Library loaded")
          setCloudinaryLoaded(true)
        }}
        onError={() => {
          console.error("[v0] Failed to load Cloudinary Media Library")
          toast({
            title: "Cloudinary failed to load",
            description: "Unable to load Cloudinary Media Library. Please refresh the page.",
            variant: "destructive",
          })
        }}
      />

      <Card className="border shadow-sm bg-white">
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-300"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-orange-50 rounded-full">
                  <Upload className="h-10 w-10 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">Drag and drop product images</h3>
                  <p className="text-sm text-gray-500 mt-1">PNG, JPG or WEBP up to 5MB</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => document.getElementById("image-upload")?.click()}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Browse Local Files
                  </Button>
                  <Button
                    variant="outline"
                    onClick={openCloudinaryMediaLibrary}
                    disabled={!cloudinaryLoaded}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent"
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    Browse Cloudinary
                  </Button>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
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

            {displayImages.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Product Images</h3>
                  <div className="text-sm text-gray-500">
                    {permanentImages.length} saved, {previewImages.length} pending upload
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                  {displayImages.map((image, index) => {
                    const imageUrl = image.url
                    const imageAlt =
                      "alt_text" in image && image.alt_text ? image.alt_text : `Product image ${index + 1}`
                    const isPreview = "isPreview" in image && image.isPreview

                    return (
                      <div key={index} className="relative group">
                        <EnhancedImage
                          src={imageUrl}
                          alt={imageAlt}
                          width={200}
                          height={200}
                          className="rounded-md border border-gray-200 w-full h-40 object-cover"
                          objectFit="cover"
                        />
                        {isPreview && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Preview
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                            disabled={deletingImages.has(index)}
                          >
                            {deletingImages.has(index) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {lastSaved && <div className="text-sm text-gray-500 mt-4">Last saved: {lastSaved}</div>}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4 bg-gray-50">
          <div className="text-sm text-gray-500">
            {(hasChanges || previewImages.length > 0) && !isSaving && "Unsaved changes"}
            {isSaving && "Saving changes..."}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && previewImages.length === 0)}
            className={`bg-orange-500 hover:bg-orange-600 ${!hasChanges && previewImages.length === 0 ? "opacity-70" : ""}`}
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
    </>
  )
}
