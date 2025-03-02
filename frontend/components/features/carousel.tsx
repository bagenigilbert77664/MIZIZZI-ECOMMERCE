"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

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
    image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=300&h=200&q=80",
    title: "Fine Jewelry",
    discount: "Luxury Collection",
    href: "/products",
  },
  {
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&h=200&q=80",
    title: "Designer Wear",
    discount: "Premium Selection",
    href: "/products",
  },
]

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
        <div className="absolute left-0 top-0 h-full w-[100px] sm:w-[150px] md:w-[180px] lg:w-[200px] transform bg-gradient-to-r from-cherry-950 to-cherry-900">
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSideImage}
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 0.4, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
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
            <div className="absolute inset-0 bg-gradient-to-t from-cherry-950 via-transparent to-cherry-950" />
          </div>
          <div className="absolute inset-0">
            <svg
              viewBox="0 0 100 400"
              preserveAspectRatio="none"
              className="h-full w-full"
              style={{ transform: "scaleX(-1)" }}
            >
              <path d="M0,0 Q30,200 0,400 L100,400 L100,0 Z" fill="rgba(255,255,255,0.1)" />
            </svg>
          </div>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-center text-white">
              <motion.h3
                className="text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                LIMITED TIME
              </motion.h3>
              <motion.div
                className="relative"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.1 }}
              >
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">70%</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-white">OFF</p>
              </motion.div>
              <motion.p
                className="mt-2 text-xs sm:text-sm font-medium text-yellow-300"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                Exclusive Deals Today
              </motion.p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Right decorative side */}
      {isDesktop && (
        <div className="absolute right-0 top-0 h-full w-[100px] sm:w-[150px] md:w-[180px] lg:w-[200px] transform bg-gradient-to-l from-cherry-950 to-cherry-900">
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={(currentSideImage + 2) % sideImages.length}
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 0.4, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
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
            <div className="absolute inset-0 bg-gradient-to-t from-cherry-950 via-transparent to-cherry-950" />
          </div>
          <div className="absolute inset-0">
            <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0,0 Q30,200 0,400 L100,400 L100,0 Z" fill="rgba(255,255,255,0.1)" />
            </svg>
          </div>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="text-center text-white">
              <motion.h3
                className="text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                LIMITED TIME
              </motion.h3>
              <motion.div
                className="relative"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.1 }}
              >
                <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">70%</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-white">OFF</p>
              </motion.div>
              <motion.p
                className="mt-2 text-xs sm:text-sm font-medium text-yellow-300"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              >
                Exclusive Deals Today
              </motion.p>
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
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent">
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
              <div className="relative h-full w-full">
                <Image
                  src={card.image || "/placeholder.svg"}
                  alt={card.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <div className="flex h-full flex-col justify-end">
                  <h3 className="text-lg font-bold text-white">{card.title}</h3>
                  <p className="text-sm font-medium text-white">{card.discount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

