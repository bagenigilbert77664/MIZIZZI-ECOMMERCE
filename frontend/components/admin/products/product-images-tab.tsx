"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X, ImageIcon } from "lucide-react"
import Image from "next/image"

interface ProductImagesTabProps {
  images: string[]
  setImages: (images: string[]) => void
  setFormChanged: (changed: boolean) => void
}

export function ProductImagesTab({ images, setImages, setFormChanged }: ProductImagesTabProps) {
  const [isDragging, setIsDragging] = useState(false)

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Create URLs for preview (in a real app, you would upload to server)
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
    setImages([...images, ...newImages])
    setFormChanged(true)
  }

  // Remove image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setFormChanged(true)
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

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const newImages = Array.from(files)
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => URL.createObjectURL(file))

      setImages([...images, ...newImages])
      setFormChanged(true)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              isDragging ? "border-cherry-500 bg-cherry-50" : "border-gray-300"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-10 w-10 text-gray-400" />
              <h3 className="text-lg font-medium">Drag and drop images here</h3>
              <p className="text-sm text-gray-500">or click the button below to browse files</p>
              <Button variant="outline" onClick={() => document.getElementById("image-upload")?.click()}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Browse Images
              </Button>
              <input
                id="image-upload"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {images.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Product Images</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-md overflow-hidden border">
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`Product image ${index + 1}`}
                        width={200}
                        height={200}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 bg-cherry-600 text-white text-xs px-2 py-1 rounded">
                        Main Image
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

