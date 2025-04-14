"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"

interface ImageZoomModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  selectedImageIndex: number
}

export function ImageZoomModal({ product, isOpen, onClose, selectedImageIndex }: ImageZoomModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Safely get image URLs array, defaulting to empty array if undefined
  const imageUrls = product?.image_urls || []

  // Update current index when modal opens or selected image changes
  useEffect(() => {
    if (isOpen) {
      // Ensure the index is valid for the current image array
      const validIndex = imageUrls.length > 0 ? Math.min(selectedImageIndex, imageUrls.length - 1) : 0
      setCurrentIndex(validIndex)
    }
  }, [isOpen, selectedImageIndex, imageUrls.length])

  // Navigate to next image
  const handleNext = () => {
    if (imageUrls.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % imageUrls.length)
    }
  }

  // Navigate to previous image
  const handlePrevious = () => {
    if (imageUrls.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)
    }
  }

  // If there are no images, show a placeholder
  const currentImage = imageUrls.length > 0 ? imageUrls[currentIndex] : "/assorted-products-display.png"
  const productName = product?.name || "Product"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] md:w-[85vw] p-0 bg-white overflow-hidden">
        {/* Add DialogTitle for accessibility */}
        <DialogTitle className="sr-only">Product Images - {productName}</DialogTitle>

        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-medium text-sm md:text-base">
              Product Images
              {imageUrls.length > 1 && (
                <span className="text-xs md:text-sm text-gray-500 ml-2">
                  ({currentIndex + 1}/{imageUrls.length})
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Image Container - mizizzi-style moderate zoom */}
          <div className="bg-white p-4 flex items-center justify-center">
            <div className="relative w-full aspect-square md:aspect-auto md:h-[400px] lg:h-[500px] flex items-center justify-center">
              <Image
                src={currentImage || "/placeholder.svg"}
                alt={`${productName} - Image ${currentIndex + 1}`}
                width={800}
                height={800}
                priority
                className="object-contain max-h-full max-w-full"
              />
            </div>
          </div>

          {/* Navigation Arrows - Only show if multiple images */}
          {imageUrls.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full h-8 w-8 md:h-10 md:w-10 shadow-sm z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full h-8 w-8 md:h-10 md:w-10 shadow-sm z-10"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </>
          )}

          {/* Thumbnails - only show if there are multiple images */}
          {imageUrls.length > 1 && (
            <div className="p-3 border-t bg-white">
              <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                {imageUrls.map((image, index) => (
                  <button
                    key={index}
                    className={`relative flex-shrink-0 overflow-hidden rounded transition-all ${
                      currentIndex === index
                        ? "border-2 border-orange-500 shadow-sm"
                        : "border border-gray-200 hover:border-gray-400"
                    }`}
                    style={{ width: "60px", height: "60px" }}
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`View image ${index + 1}`}
                    aria-current={currentIndex === index ? "true" : "false"}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Thumbnail ${index + 1}`}
                      width={60}
                      height={60}
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
