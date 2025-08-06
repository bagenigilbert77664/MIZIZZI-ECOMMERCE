"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion"

interface CarouselSlide {
  id: number
  title: string
  subtitle: string
  description: string
  image: string
  mobileImage?: string
  link: string
  buttonText: string
  theme: "luxury" | "modern" | "elegant" | "vibrant"
  overlay?: "gradient" | "dark" | "light" | "none"
}

const carouselSlides: CarouselSlide[] = [
  {
    id: 1,
    title: "Premium Luxury Collection",
    subtitle: "Exclusive Designer Pieces",
    description: "Discover our handcrafted jewelry collection featuring authentic African designs with modern elegance",
    image: "/placeholder.svg?height=600&width=1200&text=Luxury+Collection",
    mobileImage: "/placeholder.svg?height=400&width=800&text=Luxury+Mobile",
    link: "/luxury",
    buttonText: "SHOP NOW",
    theme: "luxury",
    overlay: "gradient",
  },
  {
    id: 2,
    title: "Flash Sale Event",
    subtitle: "Limited Time Offers",
    description: "Up to 70% off on selected premium items. Don't miss these exclusive deals",
    image: "/placeholder.svg?height=600&width=1200&text=Flash+Sale",
    mobileImage: "/placeholder.svg?height=400&width=800&text=Flash+Mobile",
    link: "/flash-sales",
    buttonText: "SHOP DEALS",
    theme: "vibrant",
    overlay: "dark",
  },
  {
    id: 3,
    title: "New Arrivals",
    subtitle: "Fresh & Trending",
    description: "Explore the latest additions to our curated collection of premium accessories",
    image: "/placeholder.svg?height=600&width=1200&text=New+Arrivals",
    mobileImage: "/placeholder.svg?height=400&width=800&text=New+Mobile",
    link: "/products?new=true",
    buttonText: "EXPLORE",
    theme: "elegant",
    overlay: "light",
  },
]

export function LuxuryCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const background = useTransform(x, [-200, 0, 200], ["#8B0000", "#722F37", "#8B0000"])

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9,
      rotateY: direction > 0 ? 45 : -45,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.9,
      rotateY: direction < 0 ? 45 : -45,
    }),
  }

  const contentVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  }

  const goToSlide = useCallback(
    (index: number, dir = 0) => {
      if (isAnimating || index === currentSlide) return

      setIsAnimating(true)
      setDirection(dir)
      setCurrentSlide(index)

      setTimeout(() => setIsAnimating(false), 800)
    },
    [currentSlide, isAnimating],
  )

  const nextSlide = useCallback(() => {
    const next = (currentSlide + 1) % carouselSlides.length
    goToSlide(next, 1)
  }, [currentSlide, goToSlide])

  const prevSlide = useCallback(() => {
    const prev = (currentSlide - 1 + carouselSlides.length) % carouselSlides.length
    goToSlide(prev, -1)
  }, [currentSlide, goToSlide])

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(nextSlide, 6000)
    return () => clearInterval(timer)
  }, [isPlaying, nextSlide])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    setTouchEnd(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) nextSlide()
    if (isRightSwipe) prevSlide()
  }

  // Drag handlers for desktop
  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false)
    const threshold = 100

    if (info.offset.x > threshold) {
      prevSlide()
    } else if (info.offset.x < -threshold) {
      nextSlide()
    }
  }

  const currentSlideData = carouselSlides[currentSlide]

  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case "luxury":
        return "from-amber-400/20 via-yellow-500/30 to-orange-600/40"
      case "vibrant":
        return "from-pink-500/20 via-purple-600/30 to-blue-600/40"
      case "elegant":
        return "from-slate-800/40 via-gray-700/50 to-black/60"
      default:
        return "from-black/40 via-gray-800/50 to-black/60"
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-cherry-900 to-cherry-800">
      {/* Main Carousel Container */}
      <motion.div
        ref={containerRef}
        className="relative h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px]"
        style={{ background }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.4 },
              scale: { duration: 0.4 },
              rotateY: { duration: 0.6 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <Image
                src={currentSlideData.image || "/placeholder.svg"}
                alt={currentSlideData.title}
                fill
                className="object-cover"
                priority={currentSlide === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
              />

              {/* Dynamic Overlay */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-r",
                getThemeClasses(currentSlideData.theme)
              )} />

              {/* Subtle Pattern Overlay */}
              {/*
                Move SVG data URL to a variable to avoid JSX parsing errors.
              */}
              {(() => {
                const svgPattern =
                  "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
                return (
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      backgroundImage: `url("${svgPattern}")`,
                    }}
                  />
                );
              })()}
           </div>

            {/* Content */}
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              className="relative z-10 flex h-full items-center"
            >
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                  <motion.div variants={itemVariants}>
                    <span className="inline-block rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-xs sm:text-sm font-medium text-white/90 mb-4 border border-white/20">
                      {currentSlideData.subtitle}
                    </span>
                  </motion.div>

                  <motion.h1
                    variants={itemVariants}
                    className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight"
                  >
                    {currentSlideData.title}
                  </motion.h1>

                  <motion.p
                    variants={itemVariants}
                    className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-lg leading-relaxed"
                  >
                    {currentSlideData.description}
                  </motion.p>

                  <motion.div variants={itemVariants}>
                    <Button
                      asChild
                      size="lg"
                      className="bg-white text-cherry-900 hover:bg-white/90 font-semibold px-8 py-4 text-base sm:text-lg rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                      <Link href={currentSlideData.link}>
                        {currentSlideData.buttonText}
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <div className="absolute inset-y-0 left-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            disabled={isAnimating}
            className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>

        <div className="absolute inset-y-0 right-4 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            disabled={isAnimating}
            className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Play/Pause Button */}
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
      </motion.div>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {carouselSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index, index > currentSlide ? 1 : -1)}
            disabled={isAnimating}
            className={cn(
              "h-2 rounded-full transition-all duration-500 hover:scale-125",
              currentSlide === index
                ? "w-8 bg-white shadow-lg"
                : "w-2 bg-white/50 hover:bg-white/70"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <motion.div
          className="h-full bg-gradient-to-r from-white to-amber-200"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 6, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
          key={currentSlide}
        />
      </div>
    </div>
  )
}
