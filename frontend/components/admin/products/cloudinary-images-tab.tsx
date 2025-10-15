"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, ImageIcon, Save, Loader2, Star, RefreshCw, Eye, Edit3, Trash2, Camera } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { cloudinaryService, type CloudinaryImageData } from "@/services/cloudinary-service"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CloudinaryImagesTabProps {
  productId: string
  onImagesChange?: (images: CloudinaryImageData[]) => void
  className?: string
}

export function CloudinaryImagesTab({ productId, onImagesChange, className }: CloudinaryImagesTabProps) {
  const [images, setImages] = useState<CloudinaryImageData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [editingImage, setEditingImage] = useState<CloudinaryImageData | null>(null)
  const [deleteConfirmImage, setDeleteConfirmImage] = useState<CloudinaryImageData | null>(null)
  const [altText, setAltText] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Load images on component mount
  useEffect(() => {
    if (productId) {
      loadImages()
    }
  }, [productId])

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  /**
   * Load images from Cloudinary
   */
  const loadImages = async () => {
    if (!productId) return

    setIsLoading(true)
    try {
      const response = await cloudinaryService.getProductImages(productId)
      if (response.success) {
        setImages(response.images)
        onImagesChange?.(response.images)
      }
    } catch (error) {
      console.error("Error loading images:", error)
      toast({
        title: "Error",
        description: "Failed to load product images",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle file selection
   */
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validation = cloudinaryService.validateImageFiles(fileArray)

    if (!validation.valid) {
      toast({
        title: "Invalid Files",
        description: validation.errors.join("\n"),
        variant: "destructive",
      })
      return
    }

    setSelectedFiles(fileArray)

    // Create preview URLs
    const urls = fileArray.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)
  }

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  /**
   * Upload selected files to Cloudinary
   */
  const handleUpload = async () => {
    if (!selectedFiles.length || !productId) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const response = await cloudinaryService.uploadProductImages(productId, selectedFiles, {
        primaryIndex: images.length === 0 ? 0 : -1, // Set first image as primary if no images exist
        altTextPrefix: altText || undefined,
        onProgress: setUploadProgress,
      })

      if (response.success) {
        toast({
          title: "Upload Successful",
          description: `${response.uploaded_images.length} images uploaded successfully`,
        })

        // Clear selected files and previews
        setSelectedFiles([])
        setPreviewUrls([])
        setAltText("")

        // Reload images
        await loadImages()
      } else {
        throw new Error(response.message || "Upload failed")
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  /**
   * Delete an image
   */
  const handleDeleteImage = async (image: CloudinaryImageData) => {
    if (!image.id) return

    try {
      const response = await cloudinaryService.deleteImage(image.id)
      if (response.success) {
        toast({
          title: "Image Deleted",
          description: "Image has been removed successfully",
        })
        await loadImages()
      }
    } catch (error: any) {
      console.error("Delete error:", error)
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      })
    }
    setDeleteConfirmImage(null)
  }

  /**
   * Set image as primary
   */
  const handleSetPrimary = async (image: CloudinaryImageData) => {
    if (!image.id) return

    try {
      const response = await cloudinaryService.setPrimaryImage(image.id)
      if (response.success) {
        toast({
          title: "Primary Image Set",
          description: "This image is now the primary product image",
        })
        await loadImages()
      }
    } catch (error: any) {
      console.error("Set primary error:", error)
      toast({
        title: "Failed to Set Primary",
        description: error.message || "Failed to set primary image",
        variant: "destructive",
      })
    }
  }

  /**
   * Update image metadata
   */
  const handleUpdateMetadata = async () => {
    if (!editingImage?.id) return

    try {
      const response = await cloudinaryService.updateImageMetadata(editingImage.id, {
        alt_text: altText,
      })

      if (response.success) {
        toast({
          title: "Image Updated",
          description: "Image metadata has been updated",
        })
        await loadImages()
        setEditingImage(null)
        setAltText("")
      }
    } catch (error: any) {
      console.error("Update error:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update image",
        variant: "destructive",
      })
    }
  }

  /**
   * Clear selected files
   */
  const clearSelectedFiles = () => {
    setSelectedFiles([])
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setPreviewUrls([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  /**
   * Refresh images
   */
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadImages()
    setIsRefreshing(false)
  }

  return (
    <TooltipProvider>
      <Card className={cn("border shadow-sm bg-white", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-600" />
              Product Images
              {images.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {images.length} image{images.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh images</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50",
                isUploading && "opacity-50 pointer-events-none",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-full">
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-blue-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium">
                    {isUploading ? "Uploading images..." : "Upload Product Images"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Drag and drop images here, or click to browse</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports: JPEG, PNG, WebP, GIF • Max size: 10MB per image
                  </p>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={isUploading}
            />

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading to Cloudinary...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selected Images ({selectedFiles.length})</h4>
                  <Button variant="outline" size="sm" onClick={clearSelectedFiles} disabled={isUploading}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={previewUrls[index] || "/placeholder.svg"}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-medium px-2 py-1 bg-black/70 rounded">
                          {file.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alt Text Input */}
                <div className="space-y-2">
                  <Label htmlFor="alt-text">Alt Text Prefix (Optional)</Label>
                  <Input
                    id="alt-text"
                    placeholder="e.g., Product name"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-gray-500">
                    Will be used as: "{altText} - Image 1", "{altText} - Image 2", etc.
                  </p>
                </div>

                {/* Upload Button */}
                <Button onClick={handleUpload} disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading to Cloudinary...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? "s" : ""} to Cloudinary
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Existing Images */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-500">Loading images...</span>
            </div>
          ) : images.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-medium">Current Images</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div key={image.id || index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <Image
                        src={
                          cloudinaryService.generateThumbnailUrl(image.cloudinary_public_id, 300) || "/placeholder.svg"
                        }
                        alt={image.alt_text || `Product image ${index + 1}`}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=300&width=300"
                        }}
                      />
                    </div>

                    {/* Primary Badge */}
                    {image.is_primary && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-yellow-500 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white"
                            onClick={() => {
                              const url = cloudinaryService.generateOptimizedUrl(image.cloudinary_public_id, {
                                width: 1200,
                                height: 1200,
                                crop: "fit",
                              })
                              window.open(url, "_blank")
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View full size</TooltipContent>
                      </Tooltip>

                      {!image.is_primary && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 bg-white/90 hover:bg-white"
                              onClick={() => handleSetPrimary(image)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Set as primary</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white"
                            onClick={() => {
                              setEditingImage(image)
                              setAltText(image.alt_text || "")
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit metadata</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteConfirmImage(image)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete image</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Image Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs truncate">{image.filename || `Image ${index + 1}`}</p>
                      {image.width && image.height && (
                        <p className="text-xs text-gray-300">
                          {image.width} × {image.height}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No images uploaded yet</p>
              <p className="text-sm">Upload your first product image to get started</p>
            </div>
          )}
        </CardContent>

        {/* Edit Image Dialog */}
        <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Image Metadata</DialogTitle>
              <DialogDescription>Update the alt text and other metadata for this image.</DialogDescription>
            </DialogHeader>

            {editingImage && (
              <div className="space-y-4">
                <div className="aspect-video rounded-lg overflow-hidden border">
                  <Image
                    src={cloudinaryService.generateOptimizedUrl(editingImage.cloudinary_public_id, {
                      width: 400,
                      height: 300,
                      crop: "fit",
                    })}
                    alt={editingImage.alt_text || "Product image"}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-alt-text">Alt Text</Label>
                  <Input
                    id="edit-alt-text"
                    placeholder="Describe this image..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingImage(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMetadata}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmImage} onOpenChange={() => setDeleteConfirmImage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Image</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this image? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {deleteConfirmImage && (
              <div className="aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={cloudinaryService.generateOptimizedUrl(deleteConfirmImage.cloudinary_public_id, {
                    width: 400,
                    height: 300,
                    crop: "fit",
                  })}
                  alt={deleteConfirmImage.alt_text || "Product image"}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmImage(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteConfirmImage && handleDeleteImage(deleteConfirmImage)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  )
}
