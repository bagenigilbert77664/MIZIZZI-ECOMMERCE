"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut, X, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ImageZoomModalProps {
  product: any
  isOpen: boolean
  onClose: () => void
  selectedImageIndex: number
}

export function ImageZoomModal({ product, isOpen, onClose, selectedImageIndex }: ImageZoomModalProps) {
  const [currentIndex, setCurrentIndex] = useState(selectedImageIndex)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isZoomed, setIsZoomed] = useState(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Get product images
  const getProductImages = (product: any): string[] => {
    // Handle image_urls parsing if it's a JSON string
    let imageUrls: string[] | string | undefined = product.image_urls

    // Ensure we have a defined value before processing
    if (!imageUrls) {
      imageUrls = []
    }

    if (typeof imageUrls === "string") {
      try {
        const parsed = JSON.parse(imageUrls)
        imageUrls = Array.isArray(parsed)
          ? (parsed as string[])
          : typeof parsed === "string"
          ? [parsed as string]
          : [imageUrls as string]
      } catch (error) {
        console.error("Error parsing image_urls:", error)
        imageUrls = [typeof imageUrls === "string" ? imageUrls : ""]
      }
    }

    let imageUrlsArray: string[] = []
    if (Array.isArray(imageUrls)) {
      imageUrlsArray = (imageUrls as string[]).filter((url: string) => typeof url === "string" && url.trim() !== "")
    } else if (typeof imageUrls === "string" && imageUrls && typeof imageUrls.trim === "function" && imageUrls.trim() !== "") {
      imageUrlsArray = [imageUrls]
    }

    if (imageUrlsArray.length === 0) {
      if (product.thumbnail_url && typeof product.thumbnail_url === "string") {
        imageUrlsArray = [product.thumbnail_url]
      } else if (product.images && Array.isArray(product.images)) {
        imageUrlsArray = product.images
          .map((img: any) => img.url)
          .filter((url: any): url is string => Boolean(url && typeof url === "string"))
      }
    }

    const validImages = imageUrlsArray.filter((url): url is string =>
      Boolean(url && typeof url === "string" && url.trim() !== ""),
    )
    return validImages.length > 0 ? validImages : ["/placeholder.svg?height=600&width=600"]
  }

  const images = getProductImages(product)

  // Reset states when modal opens/closes or when selectedImageIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(selectedImageIndex)
      setIsImageLoading(true)
      setZoomLevel(1)
      setPosition({ x: 0, y: 0 })
      setIsZoomed(false)
    }
  }, [isOpen, selectedImageIndex])

  // Handle image loading
  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set([...prev, index]))
    if (index === currentIndex) {
      setTimeout(() => {
        setIsImageLoading(false)
      }, 200)
    }
  }

  // Handle image change
  const handleImageChange = (newIndex: number) => {
    setCurrentIndex(newIndex)
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
    setIsZoomed(false)
    if (!loadedImages.has(newIndex)) {
      setIsImageLoading(true)
    } else {
      setIsImageLoading(true)
      setTimeout(() => {
        setIsImageLoading(false)
      }, 150)
    }
  }

  const handlePrevious = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    handleImageChange(newIndex)
  }

  const handleNext = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    handleImageChange(newIndex)
  }

  // Jumia-style zoom functionality
  const handleImageClick = (e: React.MouseEvent) => {
    if (isImageLoading) return

    const container = imageContainerRef.current
    const image = imageRef.current
    if (!container || !image) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate the click position as a percentage
    const xPercent = (x / rect.width) * 100
    const yPercent = (y / rect.height) * 100

    if (!isZoomed) {
      // Zoom in to 2.5x at the clicked position
      setZoomLevel(2.5)
      setIsZoomed(true)

      // Calculate position to center the clicked area
      const newX = -(xPercent - 50) * 2.5
      const newY = -(yPercent - 50) * 2.5

      // Constrain the position
      const maxX = 75 // 150% / 2
      const maxY = 75

      setPosition({
        x: Math.max(Math.min(newX, maxX), -maxX),
        y: Math.max(Math.min(newY, maxY), -maxY),
      })
    } else {
      // Zoom out
      setZoomLevel(1)
      setPosition({ x: 0, y: 0 })
      setIsZoomed(false)
    }
  }

  // Handle mouse move for zoom preview (like Jumia)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isZoomed || isDragging) return

    const container = imageContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Calculate the mouse position as a percentage
    const xPercent = (x / rect.width) * 100
    const yPercent = (y / rect.height) * 100

    // Update position based on mouse movement
    const newX = -(xPercent - 50) * 2.5
    const newY = -(yPercent - 50) * 2.5

    // Constrain the position
    const maxX = 75
    const maxY = 75

    setPosition({
      x: Math.max(Math.min(newX, maxX), -maxX),
      y: Math.max(Math.min(newY, maxY), -maxY),
    })
  }

  // Handle dragging for mobile
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isZoomed) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleMouseDrag = (e: React.MouseEvent) => {
    if (isDragging && isZoomed) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      const maxX = 75
      const maxY = 75

      setPosition({
        x: Math.max(Math.min(newX, maxX), -maxX),
        y: Math.max(Math.min(newY, maxY), -maxY),
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Reset zoom
  const handleZoomReset = () => {
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
    setIsZoomed(false)
  }

  // Zoom controls
  const handleZoomIn = () => {
    if (!isZoomed) {
      setZoomLevel(2.5)
      setIsZoomed(true)
    } else {
      const newLevel = Math.min(zoomLevel + 0.5, 4)
      setZoomLevel(newLevel)
    }
  }

  const handleZoomOut = () => {
    if (zoomLevel <= 1.5) {
      setZoomLevel(1)
      setPosition({ x: 0, y: 0 })
      setIsZoomed(false)
    } else {
      setZoomLevel(Math.max(zoomLevel - 0.5, 1))
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative bg-white rounded-2xl overflow-hidden w-[95%] max-w-6xl max-h-[95vh] flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
            <div>
              <h3 className="font-semibold text-black text-lg tracking-tight">HD Product Gallery</h3>
              <p className="text-sm text-gray-600 font-medium">
                {isZoomed ? "Click to zoom out • Move mouse to pan" : "Click image to zoom in"}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </motion.button>

                <span className="text-sm font-semibold text-black min-w-[3rem] text-center tracking-tight">
                  {Math.round(zoomLevel * 100)}%
                </span>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 4}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </motion.button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleZoomReset}
                  className="p-2 rounded-lg hover:bg-white transition-all duration-200"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-200"
                onClick={onClose}
                title="Close"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>
          </div>

          {/* Main Image Container */}
          <div className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            <div
              className="absolute inset-0 flex items-center justify-center"
              ref={imageContainerRef}
              onClick={handleImageClick}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                cursor: isZoomed ? (isDragging ? "grabbing" : "zoom-out") : "zoom-in",
              }}
            >
              {/* Loading State */}
              <AnimatePresence>
                {isImageLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-white z-20"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      <p className="text-sm text-gray-600">Loading high resolution image...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Image */}
              <motion.div
                className="relative w-full h-full flex items-center justify-center overflow-hidden"
                onMouseMove={isDragging ? handleMouseDrag : undefined}
              >
                <motion.div
                  className="relative w-full h-full"
                  animate={{
                    scale: zoomLevel,
                    x: position.x,
                    y: position.y,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.3,
                  }}
                >
                  <Image
                    ref={imageRef}
                    src={images[currentIndex] || "/placeholder.svg"}
                    alt={`${product.name || "Product"} - Image ${currentIndex + 1}`}
                    fill
                    sizes="(max-width: 768px) 90vw, 1200px"
                    quality={95}
                    className={cn(
                      "object-contain transition-opacity duration-300",
                      isImageLoading ? "opacity-0" : "opacity-100",
                    )}
                    priority
                    onLoad={() => handleImageLoad(currentIndex)}
                    onError={() => {
                      setIsImageLoading(false)
                    }}
                    style={{
                      filter: "contrast(1.02) saturate(1.05)",
                    }}
                  />
                </motion.div>
              </motion.div>

              {/* Navigation Arrows */}
              {images.length > 1 && !isImageLoading && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.95)" }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all shadow-lg z-20"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePrevious()
                    }}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.95)" }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all shadow-lg z-20"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNext()
                    }}
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </motion.button>
                </>
              )}

              {/* Image Info Overlay */}
              <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-xl">
                <div className="text-sm font-semibold tracking-tight">
                  {currentIndex + 1} / {images.length}
                </div>
                {isZoomed && (
                  <div className="text-xs text-gray-300 mt-1 font-medium">
                    {isDragging ? "Dragging..." : "Move mouse to pan"}
                  </div>
                )}
              </div>

              {/* Zoom Instructions */}
              <AnimatePresence>
                {!isZoomed && !isImageLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl text-sm font-medium"
                  >
                    Click anywhere on image to zoom in • Use controls for precise zoom
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Zoom indicator */}
              <AnimatePresence>
                {isZoomed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                  >
                    <ZoomIn className="h-4 w-4" />
                    Zoomed {Math.round(zoomLevel * 100)}% • Click to zoom out
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-3 justify-center overflow-x-auto">
                {images.map((image: string, index: number) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "relative w-16 h-16 flex-shrink-0 border-2 rounded-xl overflow-hidden transition-all",
                      currentIndex === index
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300",
                    )}
                    onClick={() => handleImageChange(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                      onLoad={() => handleImageLoad(index)}
                    />
                    {/* Thumbnail loading overlay */}
                    {!loadedImages.has(index) && (
                      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    {/* Active indicator */}
                    {currentIndex === index && <div className="absolute inset-0 bg-blue-500/10" />}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
