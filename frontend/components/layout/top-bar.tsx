"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useLayoutEffect, useState } from "react"
import Image from "next/image"
import { Phone, Mail, MapPin, Clock, ChevronRight, Star, Shield } from "lucide-react"
import Link from "next/link"

// Move data outside component to prevent re-creation
const announcements = [
  {
    text: "Free Shipping on Orders Over KSh 10,000! 🚚",
    shortText: "Free Shipping KSh 10,000+",
    image: "/placeholder.svg?height=200&width=1200&text=Free%20Shipping%20Sale",
    contact: {
      icon: Phone,
      text: "Call us: +254 700 000 000",
      shortText: "+254 700 000 000",
      href: "tel:+254700000000",
    },
  },
  {
    text: "New Collection Available - Shop Now! ✨",
    shortText: "New Collection Available",
    image: "https://images.unsplash.com/photo-1557170334-a9632e77c6e4?w=1200&h=200&fit=crop&q=80",
    contact: {
      icon: Mail,
      text: "Email: support@mizizzi.com",
      shortText: "support@mizizzi.com",
      href: "mailto:support@mizizzi.com",
    },
  },
  {
    text: "Limited Time Offer: Up to 70% Off Selected Items 🎉",
    shortText: "Up to 70% Off Sale",
    image: "/placeholder.svg?height=200&width=1200&text=70%25%20Off%20Sale",
    contact: {
      icon: MapPin,
      text: "Visit our Store",
      shortText: "Store Location",
      href: "/store-locator",
    },
  },
  {
    text: "Premium Jewelry Collection - Exclusive Designs 💎",
    shortText: "Premium Jewelry Collection",
    image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1200&h=200&fit=crop&q=80",
    contact: {
      icon: Clock,
      text: "Open: 9AM - 9PM",
      shortText: "9AM - 9PM",
      href: "/contact",
    },
  },
]

// Contact Info Component with responsive text
const ContactInfo = ({ contact }: { contact: (typeof announcements)[0]["contact"] }) => {
  const Icon = contact.icon
  return (
    <Link
      href={contact.href}
      className="hidden xs:flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white/90 hover:text-white transition-colors group"
    >
      <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-white/80 group-hover:text-white transition-colors" />
      <span className="hidden sm:inline">{contact.text}</span>
      <span className="sm:hidden">{contact.shortText}</span>
    </Link>
  )
}

// Responsive announcement component
const AnimatedAnnouncement = ({ announcement, index }: { announcement: any; index: number }) => (
  <motion.div
    key={`announcement-${index}`}
    initial={{ opacity: 0, rotateX: -90, y: 20, scale: 0.9 }}
    animate={{
      opacity: 1,
      rotateX: 0,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    }}
    exit={{
      opacity: 0,
      rotateX: 90,
      y: -20,
      scale: 0.9,
      transition: { duration: 0.3, ease: "easeIn" },
    }}
    className="absolute left-0 right-0 mx-auto px-2"
  >
    <motion.p
      className="text-xs xs:text-sm sm:text-base md:text-base lg:text-lg font-semibold text-white text-center truncate sm:whitespace-normal"
      animate={{
        textShadow: [
          "0 0 8px rgba(255,255,255,0.8)",
          "0 0 12px rgba(255,255,255,0.6)",
          "0 0 8px rgba(255,255,255,0.8)",
        ],
      }}
      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
    >
      <span className="sm:hidden">{announcement.shortText}</span>
      <span className="hidden sm:inline">{announcement.text}</span>
    </motion.p>
  </motion.div>
)

// Store features component
const StoreFeatures = () => (
  <div className="hidden sm:flex items-center gap-2 md:gap-4 text-xs">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 md:gap-1.5">
      <div className="flex -space-x-0.5 md:-space-x-1">
        <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-gradient-to-r from-yellow-200 to-yellow-400" />
        <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-gradient-to-r from-rose-300 to-rose-500" />
        <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-gradient-to-r from-purple-300 to-purple-500" />
      </div>
      <span className="text-white/90 text-xs md:text-sm">Premium</span>
    </motion.div>

    <span className="text-white/40 hidden md:inline">|</span>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="hidden md:flex items-center gap-1"
    >
      <Shield className="h-3 w-3 text-white/80" />
      <span className="text-white/90 text-xs">Verified</span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="hidden lg:flex items-center gap-1"
    >
      <Star className="h-3 w-3 text-white/80 fill-white/80" />
      <span className="text-white/90 text-xs">4.9 Rating</span>
    </motion.div>
  </div>
)

export function TopBar() {
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Use useLayoutEffect to prevent flash of content
  useLayoutEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // Don't render animations until mounted - show simplified version
  if (!mounted) {
    return (
      <div className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="w-full max-w-full mx-auto">
          <div className="flex h-10 xs:h-12 items-center justify-center px-[2%] xs:px-[3%]">
            <div className="text-xs xs:text-sm text-white/90 text-center truncate">{announcements[0].shortText}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-40 sm:opacity-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1 }}
            className="relative w-full h-full"
          >
            <Image
              src={announcements[currentIndex].image || "/placeholder.svg?height=200&width=1200&text=Banner"}
              alt="Background"
              fill
              className="object-cover"
              priority
              sizes="100vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=200&width=1200&text=Banner"
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-rose-900/40 to-gray-950" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-full mx-auto relative">
        <div className="flex h-10 xs:h-12 sm:h-12 md:h-14 items-center justify-between px-[2%] xs:px-[3%] sm:px-[4%] md:px-[5%] lg:px-[6%]">
          {/* Left side - Contact Info */}
          <div className="flex-shrink-0 w-0 xs:w-auto min-w-0 xs:min-w-[20%] sm:min-w-[25%] md:min-w-[30%]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`contact-${currentIndex}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ContactInfo contact={announcements[currentIndex].contact} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Center - Announcement */}
          <div className="flex-1 relative h-5 xs:h-6 sm:h-6 md:h-7 overflow-hidden text-center perspective-1000 mx-[2%] xs:mx-[3%] sm:max-w-[50%] sm:mx-auto">
            <AnimatePresence mode="wait">
              <AnimatedAnnouncement announcement={announcements[currentIndex]} index={currentIndex} />
            </AnimatePresence>
          </div>

          {/* Right side - Store Features & Mobile Arrow */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0 xs:min-w-[20%] sm:min-w-[25%] md:min-w-[30%] justify-end">
            <StoreFeatures />

            {/* Mobile Navigation Arrow */}
            <button
              className="sm:hidden p-1 rounded-full hover:bg-white/10 transition-colors touch-manipulation"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % announcements.length)}
              aria-label="Next announcement"
            >
              <ChevronRight className="h-4 w-4 xs:h-5 xs:w-5 text-white/80" />
            </button>
          </div>
        </div>
      </div>

      {/* 3D Effect Borders - Responsive */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-white/0 via-white/20 sm:via-white/30 to-white/0" />
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-black/0 via-black/20 sm:via-black/30 to-black/0" />

      {/* Side Highlights - Hidden on very small screens */}
      <div className="hidden xs:block absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/20 sm:from-white/30 via-white/10 sm:via-white/20 to-transparent" />
      <div className="hidden xs:block absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/20 sm:from-white/30 via-white/10 sm:via-white/20 to-transparent" />

      {/* 3D Depth Effect - Reduced on mobile */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/5 sm:from-white/10 to-transparent"
        style={{ transform: "translateY(-50%)", height: "50%" }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/5 sm:from-black/10 to-transparent"
        style={{ transform: "translateY(50%)", height: "50%" }}
      />

      {/* Progress Indicators - Mobile only */}
      <div className="sm:hidden absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-1 pb-1">
        {announcements.map((_, index) => (
          <div
            key={index}
            className={`h-0.5 w-4 rounded-full transition-all duration-300 ${
              index === currentIndex ? "bg-white/80" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
