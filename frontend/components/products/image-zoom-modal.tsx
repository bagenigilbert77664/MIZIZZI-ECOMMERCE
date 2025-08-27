"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"
import { cloudinaryService } from "@/services/cloudinary-service"
import { cn } from "@/lib/utils"

interface ImageZoomModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  selectedImageIndex: number
}

type Pointer = { id: number; x: number; y: number }

function toHighRes(url?: string): string {
  if (!url) return "/generic-product-display.png"
  if (url.startsWith("http")) return url
  // Use Cloudinary high quality if the asset is stored by key/path
  return cloudinaryService.generateOptimizedUrl(url, {
    width: 2400,
    height: 2400,
    quality: 95,
    format: "auto",
    crop: "fit",
  })
}

export function ImageZoomModal({ product, isOpen, onClose, selectedImageIndex }: ImageZoomModalProps) {
  const rawImages = (product?.image_urls || []) as string[]
  const images = rawImages.length ? rawImages : ["/generic-product-display.png"]
  const [currentIndex, setCurrentIndex] = useState(0)

  // Zoom state
  const [zoom, setZoom] = useState(1) // 1 - 4
  const [isLoading, setIsLoading] = useState(true)
  const [bgPos, setBgPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [highResUrl, setHighResUrl] = useState<string>(toHighRes(images[0]))
  const containerRef = useRef<HTMLDivElement>(null)
  const wasDragging = useRef(false)
  const pointers = useRef<Map<number, Pointer>>(new Map())
  const lastTapTime = useRef<number>(0)

  // Set index and preload when opened/changed
  useEffect(() => {
    if (!isOpen) return
    const validIndex = images.length > 0 ? Math.min(selectedImageIndex, images.length - 1) : 0
    setCurrentIndex(validIndex)
    setZoom(1)
    setBgPos({ x: 50, y: 50 })
  }, [isOpen, selectedImageIndex, images.length])

  const preload = useCallback((src: string) => {
    setIsLoading(true)
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.referrerPolicy = "no-referrer"
    img.src = src
    img.onload = () => setIsLoading(false)
    img.onerror = () => setIsLoading(false)
  }, [])

  // Load high-res each time index changes/open
  useEffect(() => {
    if (!isOpen) return
    const url = toHighRes(images[currentIndex])
    setHighResUrl(url)
    preload(url)
  }, [currentIndex, isOpen, images, preload])

  // Controls
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
    setZoom(1)
    setBgPos({ x: 50, y: 50 })
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    setZoom(1)
    setBgPos({ x: 50, y: 50 })
  }

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  const setZoomClamped = (v: number, center?: { x: number; y: number }) => {
    const next = clamp(v, 1, 4)
    setZoom((prev) => {
      // Adjust background position to keep center point stable if provided
      if (containerRef.current && center && next > 1) {
        const rect = containerRef.current.getBoundingClientRect()
        const relX = ((center.x - rect.left) / rect.width) * 100
        const relY = ((center.y - rect.top) / rect.height) * 100
        setBgPos({ x: clamp(relX, 0, 100), y: clamp(relY, 0, 100) })
      }
      return next
    })
  }

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.2 : 0.2
    setZoomClamped(zoom + delta, { x: e.clientX, y: e.clientY })
  }

  const moveToPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    setBgPos({ x: clamp(x, 0, 100), y: clamp(y, 0, 100) })
  }

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (zoom <= 1) return
    moveToPointer(e.clientX, e.clientY)
  }

  // Pointer/Touch handling (supports drag and double-tap zoom)
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY })
    wasDragging.current = false

    // Double-tap/double-click toggle zoom
    const now = Date.now()
    if (now - lastTapTime.current < 300) {
      setZoomClamped(zoom > 1 ? 1 : 2.5, { x: e.clientX, y: e.clientY })
      lastTapTime.current = 0
    } else {
      lastTapTime.current = now
    }
  }

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)!
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY })

    // Pinch to zoom when two pointers
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      const prevDist = Math.hypot(prev.x - a.x, prev.y - a.y) // approximation
      const currDist = Math.hypot(a.x - b.x, a.y - b.y)
      const diff = currDist - prevDist
      if (Math.abs(diff) > 0.5) {
        setZoomClamped(zoom + (diff > 0 ? 0.05 : -0.05), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
      }
      wasDragging.current = true
      return
    }

    // Single pointer: pan by following pointer (only when zoomed)
    if (zoom > 1) {
      moveToPointer(e.clientX, e.clientY)
      wasDragging.current = true
    }
  }

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    pointers.current.delete(e.pointerId)
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "Escape") onClose()
    if (e.key === "ArrowRight") handleNext()
    if (e.key === "ArrowLeft") handlePrevious()
    if (e.key === "+" || e.key === "=") setZoomClamped(zoom + 0.2)
    if (e.key === "-" || e.key === "_") setZoomClamped(zoom - 0.2)
  }

  // Hi-res background style
  const bgStyle = {
    backgroundImage: `url("${highResUrl}")`,
    backgroundSize: `${Math.max(zoom * 100, 100)}%`,
    backgroundPosition: `${bgPos.x}% ${bgPos.y}%`,
    backgroundRepeat: "no-repeat",
  } as const

  const productName = product?.name || "Product"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[min(1200px,96vw)] w-[96vw] p-0 bg-white overflow-hidden" onKeyDown={onKeyDown}>
        <DialogTitle className="sr-only">Zoomed Images - {productName}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-medium text-sm md:text-base">
            Image Viewer
            {images.length > 1 && (
              <span className="text-xs md:text-sm text-gray-500 ml-2">
                ({currentIndex + 1}/{images.length})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomClamped(zoom - 0.2)}
              aria-label="Zoom out"
              disabled={zoom <= 1}
              className="h-8 px-2"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="px-2 text-xs w-16 text-center tabular-nums">{Math.round(zoom * 100)}%</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomClamped(zoom + 0.2)}
              aria-label="Zoom in"
              disabled={zoom >= 4}
              className="h-8 px-2"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setZoom(1)
                setBgPos({ x: 50, y: 50 })
              }}
              aria-label="Reset zoom"
              className="h-8 px-2"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main viewer */}
        <div className="relative bg-white">
          <div className="relative">
            {/* Controls arrows (show only if multiple images) */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevious}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full h-9 w-9 md:h-10 md:w-10 shadow-sm z-20"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full h-9 w-9 md:h-10 md:w-10 shadow-sm z-20"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Zoom surface */}
            <div
              ref={containerRef}
              className={cn(
                "relative w-full",
                "min-h-[60vh] md:min-h-[70vh]",
                "max-h-[80vh]",
                "bg-white",
                "cursor-crosshair",
              )}
              style={bgStyle}
              onWheel={handleWheel}
              onMouseMove={onMouseMove}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* Base image for initial fit (object-contain), hidden when zoomed for clarity if desired */}
              <div className="absolute inset-0">
                <Image
                  src={images[currentIndex] || "/placeholder.svg"}
                  alt={`${productName} - Image ${currentIndex + 1}`}
                  fill
                  priority
                  className={cn("object-contain w-full h-full", zoom > 1 ? "opacity-0" : "opacity-100")}
                />
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm border">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
                    <span className="text-xs text-gray-700">Loading high‑res...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="p-3 border-t bg-white">
              <div className="flex gap-2 overflow-x-auto pb-1 justify-center">
                {images.map((image, index) => (
                  <button
                    key={index}
                    className={cn(
                      "relative flex-shrink-0 overflow-hidden rounded-md transition-all border",
                      currentIndex === index ? "border-lux-600 shadow-sm" : "border-gray-200 hover:border-gray-300",
                    )}
                    style={{ width: 64, height: 64 }}
                    onClick={() => {
                      setCurrentIndex(index)
                      setZoom(1)
                      setBgPos({ x: 50, y: 50 })
                    }}
                    aria-label={`View image ${index + 1}`}
                    aria-current={currentIndex === index ? "true" : "false"}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover w-full h-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer tips */}
        <div className="px-3 py-2 border-t text-[11px] text-gray-500 bg-gray-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Scroll to zoom • Drag to pan • Double-click/tap to toggle zoom • ← → to switch images</span>
            <span>Max 4x high‑resolution zoom</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
