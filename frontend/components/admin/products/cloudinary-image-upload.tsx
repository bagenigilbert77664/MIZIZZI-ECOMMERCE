"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { Upload, X, Star, ImageIcon, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { cloudinaryImageService, type ProductImageData } from "@/services/cloudinary-image-service"

interface CloudinaryImageUploadProps {
  productId: string | number
  existingImages?: ProductImageData[]
  onImagesUpdated?: (images: ProductImageData[]) => void
  maxImages?: number
}

export function CloudinaryImageUpload({
  productId,
  existingImages = [],
  onImagesUpdated,
  maxImages = 10,
}: CloudinaryImageUploadProps) {
  const [images, setImages] = useState<ProductImageData[]>(existingImages)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [altTextPrefix, setAltTextPrefix] = useState("")
  const [errors, setErrors] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return

      const fileArray = Array.from(files)

      // Validate files
      const validation = cloudinaryImageService.validateImageFiles(fileArray)
      if (!validation.valid) {
        setErrors(validation.errors)
        return
      }

      // Check total image limit
      if (images.length + fileArray.length > maxImages) {
        setErrors([`Cannot upload more than ${maxImages} images per product`])
        return
      }

      setErrors([])
      setSelectedFiles(fileArray)
    },
    [images.length, maxImages],
  )

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files)
      }
    },
    [handleFileSelect],
  )

  // Upload selected files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const result = await cloudinaryImageService.uploadProductImages(
        productId,
        selectedFiles,
        primaryIndex,
        altTextPrefix,
      )

      if (result.success) {
        const updatedImages = [...images, ...result.uploaded_images]
        setImages(updatedImages)
        onImagesUpdated?.(updatedImages)

        setSelectedFiles([])
        setPrimaryIndex(0)
        setAltTextPrefix("")

        toast({
          title: "Images uploaded successfully",
          description: `${result.uploaded_images.length} images have been uploaded to Cloudinary.`,
        })

        if (result.errors.length > 0) {
          setErrors(result.errors.map((err) => `${err.file}: ${err.error}`))
        }
      } else {
        throw new Error(result.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload images",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  // Delete an image
  const handleDeleteImage = async (imageId: number) => {
    try {
      const result = await cloudinaryImageService.deleteImage(imageId)

      if (result.success) {
        const updatedImages = images.filter((img) => img.id !== imageId)
        setImages(updatedImages)
        onImagesUpdated?.(updatedImages)

        toast({
          title: "Image deleted",
          description: "Image has been removed from Cloudinary and the database.",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      })
    }
  }

  // Set primary image
  const handleSetPrimary = async (imageId: number) => {
    try {
      const result = await cloudinaryImageService.setPrimaryImage(imageId)

      if (result.success) {
        const updatedImages = images.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }))
        setImages(updatedImages)
        onImagesUpdated?.(updatedImages)

        toast({
          title: "Primary image updated",
          description: "The primary image has been updated successfully.",
        })
      }
    } catch (error) {
      console.error("Set primary error:", error)
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to set primary image",
        variant: "destructive",
      })
    }
  }

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)

    // Adjust primary index if necessary
    if (primaryIndex >= newFiles.length && newFiles.length > 0) {
      setPrimaryIndex(newFiles.length - 1)
    } else if (newFiles.length === 0) {
      setPrimaryIndex(0)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Product Images ({images.length}/{maxImages})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-gray-100 rounded-full">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-gray-500" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium">
                {isUploading ? "Uploading to Cloudinary..." : "Upload Product Images"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Drag and drop images here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Supports JPEG, PNG, WebP up to 10MB each</p>
            </div>

            {!isUploading && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= maxImages}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Browse Images
              </Button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={isUploading || images.length >= maxImages}
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress !== null && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
            <p className="text-xs text-gray-500 mt-1 text-center">Uploading: {uploadProgress}%</p>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>

            {/* Upload Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="primary-index">Primary Image</Label>
                <select
                  id="primary-index"
                  value={primaryIndex}
                  onChange={(e) => setPrimaryIndex(Number.parseInt(e.target.value))}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  {selectedFiles.map((file, index) => (
                    <option key={index} value={index}>
                      {file.name} {index === 0 ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="alt-text-prefix">Alt Text Prefix</Label>
                <Input
                  id="alt-text-prefix"
                  value={altTextPrefix}
                  onChange={(e) => setAltTextPrefix(e.target.value)}
                  placeholder="Product name or description"
                  className="mt-1"
                />
              </div>
            </div>

            {/* File List */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Primary indicator */}
                  {index === primaryIndex && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </div>
                  )}

                  {/* Remove button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeSelectedFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>

                  <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>

            {/* Upload Button */}
            <Button onClick={handleUpload} disabled={isUploading || selectedFiles.length === 0} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading to Cloudinary...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? "s" : ""} to Cloudinary
                </>
              )}
            </Button>
          </div>
        )}

        {/* Existing Images */}
        {images.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Uploaded Images ({images.length})</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image) => (
                <div key={image.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.thumbnail_url || image.secure_url}
                      alt={image.alt_text || `Product image ${image.id}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Primary indicator */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!image.is_primary && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSetPrimary(image.id)}
                        title="Set as primary"
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDeleteImage(image.id)}
                      title="Delete image"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Image info */}
                  <div className="mt-1">
                    <p className="text-xs text-gray-500 truncate">
                      {image.format?.toUpperCase()} • {image.width}×{image.height}
                    </p>
                    {image.size_bytes && (
                      <p className="text-xs text-gray-400">{(image.size_bytes / 1024 / 1024).toFixed(1)} MB</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && selectedFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No images uploaded yet</p>
            <p className="text-sm">Upload images to showcase your product</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
