"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, MessageCircle, Shield, Star, Truck, Gift } from 'lucide-react'

const promoSlides = [
  {
    icon: Phone,
    title: "CONTACT US",
    subtitle: "0700 123 456",
    description: "24/7 Customer Support",
  },
  {
    icon: MessageCircle,
    title: "LIVE CHAT",
    subtitle: "Chat Now",
    description: "Instant Help Available",
  },
  {
    icon: Shield,
    title: "SECURE SHOPPING",
    subtitle: "100% Safe",
    description: "Protected Transactions",
  },
  {
    icon: Star,
    title: "PREMIUM QUALITY",
    subtitle: "5-Star Rated",
    description: "Verified Products Only",
  },
  {
    icon: Truck,
    title: "FREE DELIVERY",
    subtitle: "Same Day",
    description: "Orders Over KSh 2,000",
  },
  {
    icon: Gift,
    title: "SPECIAL OFFERS",
    subtitle: "Up to 70% Off",
    description: "Limited Time Deals",
  },
]

export const ContactCTA = React.memo(() => {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const currentPromo = promoSlides[currentSlide]
  const IconComponent = currentPromo.icon

  return (
    <section className="relative h-[110px] rounded-lg overflow-hidden bg-gradient-to-br from-cherry-800 to-cherry-900 border border-cherry-700" aria-label="Contact and promotional information">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            y: -10,
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
          }}
          className="absolute inset-0 flex flex-col justify-center items-center p-6 rounded-lg"
        >
          <div className="text-center space-y-2 w-full max-w-sm">
            {/* Removed Icon */}
            {/* Text content */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-cherry-200">
                {currentPromo.title}
              </p>
              <p className="text-xl font-bold text-white">
                {currentPromo.subtitle}
              </p>
              <p className="text-sm text-cherry-100">
                {currentPromo.description}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Removed slide indicators */}
      {/* Removed subtle background pattern for texture */}
    </section>
  )
})

ContactCTA.displayName = "ContactCTA"
