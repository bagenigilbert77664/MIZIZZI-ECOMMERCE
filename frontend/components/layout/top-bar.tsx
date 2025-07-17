"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useLayoutEffect, useState } from "react"
import Image from "next/image"
import { Phone, Mail, MapPin, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"

// Move data outside component to prevent re-creation
const announcements = [
  {
    text: "Free Shipping on Orders Over KSh 10,000! 🚚",
    image: "https://images.unsplash.com/photo-1530545124313-ce5e8eae55af?w=1200&h=200&fit=crop&q=80", // Red paint splash
    contact: {
      icon: Phone,
      text: "Call us: +254 700 000 000",
      href: "tel:+254700000000",
    },
  },
  {
    text: "New Collection Available - Shop Now! ✨",
    image: "https://images.unsplash.com/photo-1557170334-a9632e77c6e4?w=1200&h=200&fit=crop&q=80", // Red abstract
    contact: {
      icon: Mail,
      text: "Email: support@mizizzi.com",
      href: "mailto:support@mizizzi.com",
    },
  },
  {
    text: "Limited Time Offer: Up to 70% Off Selected Items 🎉",
    image: "https://images.unsplash.com/photo-1532886088761-148f6df5ec52?w=1200&h=200&fit=crop&q=80", // Red silk
    contact: {
      icon: MapPin,
      text: "Visit our Store",
      href: "/store-locator",
    },
  },
  {
    text: "Premium Jewelry Collection - Exclusive Designs 💎",
    image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1200&h=200&fit=crop&q=80", // Red jewelry
    contact: {
      icon: Clock,
      text: "Open: 9AM - 9PM",
      href: "/contact",
    },
  },
]

// Contact Info Component
const ContactInfo = ({ contact }: { contact: (typeof announcements)[0]["contact"] }) => {
  const Icon = contact.icon
  return (
    <Link
      href={contact.href}
      className="hidden sm:flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
    >
      <Icon className="h-4 w-4 text-white/80" />
      <span>{contact.text}</span>
    </Link>
  )
}

// Separate client-only animation component
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
    className="absolute left-0 right-0 mx-auto"
  >
    <motion.p
      className="text-sm sm:text-base font-semibold text-white"
      animate={{
        textShadow: [
          "0 0 8px rgba(255,255,255,0.8)",
          "0 0 12px rgba(255,255,255,0.6)",
          "0 0 8px rgba(255,255,255,0.8)",
        ],
      }}
      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
    >
      {announcement.text}
    </motion.p>
  </motion.div>
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

  // Don't render animations until mounted
  if (!mounted) {
    return (
      <div className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white">
        <div className="container mx-auto">
          <div className="flex h-12 items-center justify-between px-4">
            <div className="text-sm text-white/90">{announcements[0].text}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-50">
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
              src={announcements[currentIndex].image || "/placeholder.svg"}
              alt="Background"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-rose-900/40 to-gray-950" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="container mx-auto relative">
        <div className="flex h-12 items-center justify-between px-4">
          {/* Left side - Contact Info */}
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

          {/* Center - Announcement */}
          <div className="flex-1 relative h-6 overflow-hidden text-center perspective-1000 sm:max-w-xl sm:mx-auto">
            <AnimatePresence mode="wait">
              <AnimatedAnnouncement announcement={announcements[currentIndex]} index={currentIndex} />
            </AnimatePresence>
          </div>

          {/* Right side - Store Features */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-yellow-200 to-yellow-400" />
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-rose-300 to-rose-500" />
                <div className="h-4 w-4 rounded-full bg-gradient-to-r from-purple-300 to-purple-500" />
              </div>
              <span className="text-white/90">Premium Quality</span>
            </motion.div>
            <span className="text-white/40">|</span>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-3.5 w-3.5 text-white/80"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17L4 12" />
              </svg>
              <span className="text-white/90">Verified Store</span>
            </motion.div>
          </div>

          {/* Mobile Navigation Arrow */}
          <button
            className="sm:hidden"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % announcements.length)}
            aria-label="Next announcement"
          >
            <ChevronRight className="h-5 w-5 text-white/80" />
          </button>
        </div>
      </div>

      {/* 3D Effect Borders */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-black/0 via-black/30 to-black/0" />

      {/* Side Highlights */}
      <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/30 via-white/20 to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/30 via-white/20 to-transparent" />

      {/* 3D Depth Effect */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"
        style={{ transform: "translateY(-50%)", height: "50%" }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"
        style={{ transform: "translateY(50%)", height: "50%" }}
      />
    </div>
  )
}
