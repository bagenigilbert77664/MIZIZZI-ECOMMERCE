"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"

interface ImageZoomModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  selectedImageIndex: number
}

export function ImageZoomModal({ product, isOpen, onClose, selectedImageIndex }: ImageZoomModalProps) {
  const [currentIndex, setCurrentIndex] = useState(selectedImageIndex)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // Reset zoom and position when modal opens or image changes
  useEffect(() => {
    setCurrentIndex(selectedImageIndex)
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
  }, [isOpen, selectedImageIndex])

  const handleNext = () => {
    if (!product.image_urls) return
    setCurrentIndex((prev) => (prev + 1) % (product.image_urls?.length ?? 0))
    resetZoom()
  }

  const handlePrevious = () => {
    if (!product.image_urls) return
    setCurrentIndex((prev) => (prev - 1 + (product.image_urls?.length ?? 0)) % (product.image_urls?.length ?? 0))
    resetZoom()
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 4))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1))
  }

  const resetZoom = () => {
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update mouse position for hover zoom effect
    if (imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePosition({ x, y })
    }

    // Handle dragging
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handlePrevious()
    } else if (e.key === "ArrowRight") {
      handleNext()
    } else if (e.key === "Escape") {
      onClose()
    } else if (e.key === "+") {
      handleZoomIn()
    } else if (e.key === "-") {
      handleZoomOut()
    } else if (e.key === "0") {
      resetZoom()
    }
  }

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  // Jumia-style hover zoom effect
  const getTransformStyle = () => {
    if (zoomLevel === 1) {
      return {}
    }

    if (isDragging) {
      return {
        transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
        transition: "none",
      }
    }

    // When not dragging, use mouse position for zoom focus
    return {
      transform: `scale(${zoomLevel})`,
      transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
      transition: "transform 0.1s ease-out",
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`${isFullScreen ? "max-w-none w-screen h-screen rounded-none" : "max-w-5xl w-[95vw] h-[90vh]"} p-0 bg-black/95 border-gray-800`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="text-white text-sm">
              {currentIndex + 1} / {product.image_urls?.length || 0}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-gray-800"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-gray-800"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800" onClick={toggleFullScreen}>
                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
            onClick={zoomLevel === 1 ? handleZoomIn : undefined}
            ref={imageContainerRef}
          >
            <div className="relative transition-transform duration-200 ease-out" style={getTransformStyle()}>
              <Image
                src={(product.image_urls ?? [])[currentIndex] || "/placeholder.svg?height=800&width=800&query=product"}
                alt={`${product.name} - Image ${currentIndex + 1}`}
                width={800}
                height={800}
                className="object-contain max-h-[70vh]"
                priority
                draggable={false}
              />
            </div>

            {/* Navigation buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full h-10 w-10"
              onClick={handlePrevious}
              disabled={!product.image_urls || product.image_urls.length <= 1}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full h-10 w-10"
              onClick={handleNext}
              disabled={!product.image_urls || product.image_urls.length <= 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Thumbnails */}
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                {product.image_urls.map((image, index) => (
                  <button
                    key={index}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border ${
                      currentIndex === index ? "border-orange-500" : "border-gray-700"
                    }`}
                    onClick={() => {
                      setCurrentIndex(index)
                      resetZoom()
                    }}
                  >
                    <Image
                      src={image || "/placeholder.svg?height=64&width=64&query=product thumbnail"}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zoom instructions */}
          {zoomLevel > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs py-1 px-3 rounded-full">
              {isDragging ? "Drag to move" : "Click and drag to move"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
