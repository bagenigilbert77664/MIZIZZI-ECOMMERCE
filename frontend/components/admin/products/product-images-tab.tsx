"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X, ImageIcon, AlertCircle, Save, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { EnhancedImage } from "@/components/shared/enhanced-image"

interface ProductImagesTabProps {
  images: string[] // Changed to string[]
  setImages: (images: string[]) => void // Changed to string[]
  setFormChanged: (changed: boolean) => void
  saveSectionChanges: (section: string) => Promise<boolean>
}

export function ProductImagesTab({ images, setImages, setFormChanged, saveSectionChanges }: ProductImagesTabProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

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

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadError(null)
    setUploadProgress(0)

    // Check file sizes and types
    const validFiles = Array.from(files).filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setUploadError("Some files exceeded the 5MB size limit and were skipped.")
        return false
      }
      if (!file.type.startsWith("image/")) {
        setUploadError("Only image files are allowed.")
        return false
      }
      return true
    })

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 10
      })
    }, 200)

    // Create URLs for preview (in a real app, you would upload to server)
    setTimeout(() => {
      const newImages = Array.from(validFiles).map((file) => URL.createObjectURL(file))
      setImages([...images, ...newImages])
      setHasChanges(true)
      setFormChanged(true)
      setUploadProgress(null)
      clearInterval(progressInterval)

      toast({
        title: "Images added",
        description: `${newImages.length} images have been added. Don't forget to save your changes.`,
      })
    }, 1500)
  }

  // Remove image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setHasChanges(true)
    setFormChanged(true)

    toast({
      description: "Image removed. Don't forget to save your changes.",
    })
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setHasChanges(true)
    setFormChanged(true)

    toast({
      description: "Image removed. Don't forget to save your changes.",
    })
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setUploadError(null)
    setUploadProgress(0)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      // Check file sizes and types
      const validFiles = Array.from(files).filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          setUploadError("Some files exceeded the 5MB size limit and were skipped.")
          return false
        }
        if (!file.type.startsWith("image/")) {
          setUploadError("Only image files are allowed.")
          return false
        }
        return true
      })

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + 10
        })
      }, 200)

      // Create URLs for preview with a slight delay to simulate upload
      setTimeout(() => {
        const newImages = validFiles.map((file) => URL.createObjectURL(file))
        setImages([...images, ...newImages])
        setHasChanges(true)
        setFormChanged(true)
        setUploadProgress(null)
        clearInterval(progressInterval)

        toast({
          title: "Images added",
          description: `${newImages.length} images have been added. Don't forget to save your changes.`,
        })
      }, 1500)
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
              <Button variant="outline" onClick={() => document.getElementById("image-upload")?.click()}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Browse Images
              </Button>
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

          {images.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Product Images</h3>
                <p className="text-sm text-gray-500">{images.length} images</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <EnhancedImage
                      src={image}
                      alt={`Product image ${index + 1}`}
                      width={200}
                      height={200}
                      className="rounded-md border border-gray-200 w-full h-40 object-cover"
                      objectFit="cover"
                    />
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
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
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
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
