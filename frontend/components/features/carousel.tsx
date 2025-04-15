"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { ArrowRight, Clock, Star, Flame, Gift, ShoppingBag, Package, HeadphonesIcon } from "lucide-react"

// Replace the carouselItems array with these more attractive shopping images
const carouselItems = [
  {
    image: "https://img.freepik.com/premium-psd/black-friday-sale-banner-template-with-3d-red-smartphone-gift-box_438535-153.jpg?w=996",
    title: "Luxury Jewelry Collection",
    description: "Exclusive Designer Pieces",
    buttonText: "SHOP NOW",
    href: "/products",
  },
  {
    image: "https://img.freepik.com/premium-psd/black-friday-sale-banner-template-with-3d-gold-smartphone-gift-box_438535-152.jpg?w=996",
    title: "Designer Fashion",
    description: "New Season Arrivals",
    buttonText: "SHOP NOW",
    href: "/products",
  },
  {
    image: "https://img.freepik.com/free-photo/black-friday-composition-with-bags-basket-board_23-2147695945.jpg?t=st=1743700379~exp=1743703979~hmac=3ce69a669097a240deb3ec7e91336a3191de465ce5ca9f132ad963258ea85599&w=996",
    title: "Premium Collection",
    description: "Discover Exclusive Designs",
    buttonText: "DISCOVER MORE",
    href: "/products",
  },
]

// Replace the sideImages array with these more attractive shopping-related images
const sideImages = [
  {
    url: "https://images.pexels.com/photos/5650034/pexels-photo-5650034.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Luxury Shopping Experience",
  },
  {
    url: "https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Premium Watches Display",
  },
  {
    url: "https://images.pexels.com/photos/5872361/pexels-photo-5872361.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Luxury Retail Display",
  },
  {
    url: "https://images.pexels.com/photos/6044266/pexels-photo-6044266.jpeg?auto=compress&cs=tinysrgb&w=600",
    alt: "Elegant Shopping Bags",
  },
]

// Fixed feature cards as specified by the user
const featureCards = [
  {
    icon: <Flame className="h-4 w-4" />,
    title: "FLASH SALES",
    description: "Limited Time Offers",
    href: "/flash-sales",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-500",
  },
  {
    icon: <Gift className="h-4 w-4" />,
    title: "LUXURY DEALS",
    description: "Premium Collections",
    href: "/luxury",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-500",
  },
  {
    icon: <Star className="h-4 w-4" />,
    title: "WISHLIST",
    description: "Save Your Favorites",
    href: "/wishlist",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-500",
  },
  {
    icon: <Package className="h-4 w-4" />,
    title: "ORDERS",
    description: "Track Your Purchases",
    href: "/orders",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-500",
  },
  {
    icon: <HeadphonesIcon className="h-4 w-4" />,
    title: "CUSTOMER SUPPORT",
    description: "24/7 Assistance",
    href: "/help",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
  },
  {
    icon: <ShoppingBag className="h-4 w-4" />,
    title: "PRODUCTS",
    description: "Browse All Items",
    href: "/products",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-500",
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
      <div className="text-xs font-semibold text-white/90 mb-1">{year}</div>
      <div className="text-sm font-bold text-white mb-1">{month}</div>
      <div className="text-3xl font-bold text-rose-400">{day}</div>
    </div>
  )
}

// Quote component with animation
const AnimatedQuote = () => {
  const quotes = [
    "Luxury is in each detail",
    "Elegance never goes out of style",
    "Quality remains long after price is forgotten",
    "Style is a reflection of your attitude and personality",
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
        <p className="text-sm font-medium text-white/90 italic leading-tight">"{quotes[quoteIndex]}"</p>
      </motion.div>
    </AnimatePresence>
  )
}

// Contact Call to Action component
const ContactCTA = () => {
  return (
    <div className="bg-cherry-800 text-white p-4 rounded-md shadow-md h-[90px] flex flex-col justify-center">
      <div className="text-center space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide">Call or WhatsApp</p>
        <p className="text-xl font-bold tracking-wider">0746 741 719</p>
        <p className="text-[10px] uppercase tracking-wide">To Order</p>
      </div>
    </div>
  )
}

export function Carousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentSideImage, setCurrentSideImage] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Handle slide transitions with fade effect
  const changeSlide = useCallback(
    (newIndex: number) => {
      if (isTransitioning) return

      setIsTransitioning(true)
      setCurrentSlide(newIndex)

      // Reset transition state after animation completes
      setTimeout(() => {
        setIsTransitioning(false)
      }, 1000)
    },
    [isTransitioning],
  )

  useEffect(() => {
    const timer = setInterval(() => {
      const nextSlide = (currentSlide + 1) % carouselItems.length
      changeSlide(nextSlide)
    }, 6000)
    return () => clearInterval(timer)
  }, [currentSlide, changeSlide])

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
  const isTablet = useMediaQuery("(min-width: 640px)")

  return (
    <div className="relative w-full overflow-hidden">
      {/* Left decorative side - only visible on desktop */}
      {isDesktop && (
        <div className="absolute left-0 top-0 h-full w-[100px] sm:w-[150px] md:w-[180px] lg:w-[200px] transform bg-gradient-to-r from-black via-black/90 to-cherry-950/90">
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSideImage}
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 0.7, scale: 1 }}
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
                  <div className="relative bg-black/60 px-4 py-3 rounded-lg border border-white/20 shadow-lg">
                    <p className="text-3xl font-extrabold text-white">70%</p>
                    <p className="text-sm font-bold text-rose-300">OFF TODAY</p>
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

      {/* Right decorative side - only visible on desktop */}
      {isDesktop && (
        <div className="absolute right-0 top-0 h-full w-[100px] sm:w-[150px] md:w-[180px] lg:w-[200px] transform bg-gradient-to-l from-black via-black/90 to-cherry-950/90">
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={(currentSideImage + 2) % sideImages.length}
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 0.7, scale: 1 }}
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
                  <div className="relative bg-black/60 px-4 py-3 rounded-lg border border-white/20 shadow-lg">
                    <p className="text-sm font-extrabold text-white tracking-wider">EXCLUSIVE</p>
                    <p className="text-sm font-semibold text-blue-300 tracking-wide">COLLECTION</p>
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
          "mx-auto w-full max-w-[1200px] grid gap-2 sm:gap-4 px-2 lg:grid-cols-[1fr,250px]",
          !isDesktop && "px-0", // Remove padding on mobile when decorative sides are hidden
        )}
      >
        {/* Main carousel with fade transition - optimized for mobile */}
        <div className="relative h-[250px] sm:h-[300px] md:h-[350px] lg:h-[380px] overflow-hidden rounded-sm">
          <div className="absolute inset-0">
            {carouselItems.map((item, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
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
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: index === currentSlide ? 1 : 0, y: index === currentSlide ? 0 : 20 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <h2 className="max-w-md text-base font-extrabold sm:text-xl md:text-2xl lg:text-3xl text-shadow-sm">
                        {item.title}
                      </h2>
                      <p className="mt-1 sm:mt-2 max-w-md text-xs sm:text-sm md:text-base font-medium text-white/90">
                        {item.description}
                      </p>
                      <Button className="mt-2 sm:mt-4 w-fit bg-cherry-800 text-white hover:bg-cherry-900 transition-colors text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-2">
                        {item.buttonText}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-2 sm:bottom-3 left-1/2 flex -translate-x-1/2 gap-1 sm:gap-1.5 z-20">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 sm:h-2 w-6 sm:w-8 rounded-sm transition-colors ${
                  currentSlide === index ? "bg-cherry-600" : "bg-white/60"
                }`}
                onClick={() => changeSlide(index)}
              />
            ))}
          </div>
        </div>

        {/* Side cards with equal height to main carousel - Fixed feature cards with white background - DESKTOP ONLY */}
        <div className="hidden lg:flex flex-col gap-2 h-[380px]">
          {/* Feature cards with white background */}
          <div className="bg-white rounded-md shadow-sm overflow-hidden flex-grow">
            <div className="flex flex-col h-[290px]">
              {featureCards.map((card, index) => (
                <Link
                  href={card.href}
                  key={index}
                  className="group flex items-center p-3 hover:bg-black/5 transition-colors text-gray-800 h-[48.33px]"
                >
                  <div className={`flex-shrink-0 mr-3 p-2 rounded-full ${card.iconBg} ${card.iconColor}`}>
                    {card.icon}
                  </div>
                  <div className="transition-transform duration-200 group-hover:translate-x-1">
                    <h3 className="text-xs font-semibold">{card.title}</h3>
                    <p className="text-[10px]">{card.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Call to Action */}
          <ContactCTA />
        </div>
      </div>
    </div>
  )
}
