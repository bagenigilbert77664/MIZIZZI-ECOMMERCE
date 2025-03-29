"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { ArrowRight, Clock, Tag, TrendingUp, Star } from "lucide-react"

const carouselItems = [
  {
    image: "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?auto=format&fit=crop&w=1600&h=400&q=80",
    title: "Luxury Jewelry Collection",
    description: "Exclusive Designer Pieces",
    buttonText: "SHOP NOW",
    href: "/products",
  },
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&h=400&q=80",
    title: "Designer Fashion",
    description: "New Season Arrivals",
    buttonText: "SHOP NOW",
    href: "/products",
  },
  {
    image: "https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&w=1600&h=400&q=80",
    title: "Premium Collection",
    description: "Discover Exclusive Designs",
    buttonText: "DISCOVER MORE",
    href: "/products",
  },
]

const sideImages = [
  {
    url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=300&h=300",
    alt: "Luxury Necklace",
  },
  {
    url: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=300&h=300",
    alt: "Diamond Ring",
  },
  {
    url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=300&h=300",
    alt: "Gold Bracelet",
  },
  {
    url: "https://images.unsplash.com/photo-1531995811006-35cb42e1a022?auto=format&fit=crop&w=300&h=300",
    alt: "Designer Watch",
  },
]

const smallCards = [
  {
    icon: <Tag className="h-5 w-5" />,
    title: "Hot Deals",
    description: "Up to 70% Off",
    bgColor: "from-rose-600 to-rose-800",
    href: "/flash-sales",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "New Arrivals",
    description: "Shop the Latest",
    bgColor: "from-blue-600 to-blue-800",
    href: "/products",
  },
]

// Digital clock component for side panels
const DigitalClock = () => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const day = time.getDate().toString().padStart(2, "0")
  const month = time.toLocaleString("default", { month: "short" }).toUpperCase()
  const year = time.getFullYear()

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-medium text-white/70 mb-1">{year}</div>
      <div className="text-sm font-bold text-white mb-1">{month}</div>
      <div className="text-2xl font-bold text-rose-500">{day}</div>
    </div>
  )
}

// Quote component with animation
const AnimatedQuote = () => {
  const quotes = [
    "Luxury is in each detail",
    "Elegance is not standing out, but being remembered",
    "Quality over quantity",
    "Style is a way to say who you are without speaking",
  ]

  const [quoteIndex, setQuoteIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={quoteIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="text-center px-2"
      >
        <p className="text-xs text-white/80 italic">"{quotes[quoteIndex]}"</p>
      </motion.div>
    </AnimatePresence>
  )
}

export function Carousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentSideImage, setCurrentSideImage] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSideImage = useCallback(() => {
    setCurrentSideImage((prev) => (prev + 1) % sideImages.length)
  }, [])

  useEffect(() => {
    const sideTimer = setInterval(nextSideImage, 3000)
    return () => {
      clearInterval(sideTimer)
    }
  }, [nextSideImage])

  const isDesktop = useMediaQuery("(min-width: 1024px)")

  return (
    <div className="relative w-full overflow-hidden">
      {/* Left decorative side */}
      {isDesktop && (
        <div className="absolute left-0 top-0 h-full w-[100px] sm:w-[150px] md:w-[180px] lg:w-[200px] transform bg-gradient-to-r from-black to-cherry-950">
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSideImage}
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 0.3, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.7 }}
                className="relative h-full w-full"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={sideImages[currentSideImage].url || "/placeholder.svg"}
                    alt={sideImages[currentSideImage].alt}
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
          </div>

          {/* Dot matrix overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNSIgY3k9IjUiIHI9IjAuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIi8+PC9zdmc+')] bg-repeat opacity-30" />

          <div className="absolute inset-0">
            <svg
              viewBox="0 0 100 400"
              preserveAspectRatio="none"
              className="h-full w-full"
              style={{ transform: "scaleX(-1)" }}
            >
              <path d="M0,0 Q30,200 0,400 L100,400 L100,0 Z" fill="rgba(255,255,255,0.05)" />
            </svg>
          </div>

          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center text-white px-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="flex items-center justify-center"
              >
                <Clock className="h-4 w-4 mr-1 text-white/70" />
                <DigitalClock />
              </motion.div>

              <motion.div
                className="relative"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              >
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg blur opacity-30"></div>
                  <div className="relative bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                    <p className="text-2xl font-bold text-white">70%</p>
                    <p className="text-xs font-bold text-white/80">OFF TODAY</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="mt-4"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <Star className="h-5 w-5 text-yellow-400 mx-auto" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Right decorative side */}
      {isDesktop && (
        <div className="absolute right-0 top-0 h-full w-[100px] sm:w-[150px] md:w-[180px] lg:w-[200px] transform bg-gradient-to-l from-black to-cherry-950">
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={(currentSideImage + 2) % sideImages.length}
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 0.3, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.7 }}
                className="relative h-full w-full"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={sideImages[(currentSideImage + 2) % sideImages.length].url || "/placeholder.svg"}
                    alt={sideImages[(currentSideImage + 2) % sideImages.length].alt}
                    fill
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
          </div>

          {/* Dot matrix overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNSIgY3k9IjUiIHI9IjAuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjIpIi8+PC9zdmc+')] bg-repeat opacity-30" />

          <div className="absolute inset-0">
            <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0,0 Q30,200 0,400 L100,400 L100,0 Z" fill="rgba(255,255,255,0.05)" />
            </svg>
          </div>

          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center text-white px-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="space-y-2"
              >
                <p className="text-xs font-medium text-white/70">Quote of the day</p>
                <AnimatedQuote />
              </motion.div>

              <motion.div className="relative" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg blur opacity-30"></div>
                  <div className="relative bg-black/40 px-3 py-2 rounded-lg border border-white/10">
                    <p className="text-xs font-bold text-white">EXCLUSIVE</p>
                    <p className="text-xs font-medium text-white/80">COLLECTION</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="mt-4"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
              >
                <ArrowRight className="h-4 w-4 text-white/70 mx-auto" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main carousel content */}
      <div
        className={cn(
          "mx-auto w-full max-w-[1200px] grid gap-2 sm:gap-4 px-2 lg:grid-cols-[1fr,384px]",
          !isDesktop && "px-0", // Remove padding on mobile when decorative sides are hidden
        )}
      >
        <div className="relative h-[200px] overflow-hidden rounded-sm sm:h-[220px] md:h-[250px] lg:h-[280px]">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {carouselItems.map((item, index) => (
              <Link href={item.href} key={index} className="relative min-w-full">
                <div className="relative h-full w-full">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent">
                  <div className="flex h-full flex-col justify-center p-3 sm:p-4 md:p-5 lg:p-6 text-white">
                    <h2 className="max-w-md text-lg font-bold sm:text-xl md:text-2xl lg:text-3xl">{item.title}</h2>
                    <p className="mt-2 max-w-md text-xs sm:text-sm md:text-base">{item.description}</p>
                    <Button className="mt-4 w-fit bg-cherry-900 text-white hover:bg-cherry-950 transition-colors">
                      {item.buttonText}
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="absolute bottom-1 sm:bottom-2 left-1/2 flex -translate-x-1/2 gap-1 sm:gap-1.5">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                className={`h-1 w-6 rounded-sm transition-colors ${
                  currentSlide === index ? "bg-primary" : "bg-white/60"
                }`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>

        <div className="hidden gap-4 lg:grid">
          {smallCards.map((card, index) => (
            <Link href={card.href} key={index} className="group relative h-[142px] overflow-hidden rounded-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgColor}`}>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-white/10 p-1.5 rounded-full">{card.icon}</div>
                  <h3 className="text-lg font-bold text-white">{card.title}</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/90">{card.description}</p>
                  <div className="flex items-center text-xs font-medium text-white group-hover:underline">
                    Shop now <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity">
                {card.icon && React.cloneElement(card.icon as React.ReactElement, { size: 120 })}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

