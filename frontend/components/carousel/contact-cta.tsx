"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { Phone, MessageCircle, Shield, Star, Truck, Gift } from 'lucide-react'

const promoSlides = [
  {
    icon: Phone,
    title: "CONTACT US",
    subtitle: "0746741919",
    description: "24/7 Customer Support",
    color: "text-cherry-300",
  },
  {
    icon: MessageCircle,
    title: "LIVE CHAT",
    subtitle: "Chat Now",
    description: "Instant Help Available",
    color: "text-cherry-400",
  },
  {
    icon: Shield,
    title: "SECURE SHOPPING",
    subtitle: "100% Safe",
    description: "Protected Transactions",
    color: "text-cherry-500",
  },
  {
    icon: Star,
    title: "PREMIUM QUALITY",
    subtitle: "5-Star Rated",
    description: "Verified Products Only",
    color: "text-cherry-600",
  },
  {
    icon: Truck,
    title: "FREE DELIVERY",
    subtitle: "Same Day",
    description: "Orders Over KSh 2,000",
    color: "text-cherry-700",
  },
  {
    icon: Gift,
    title: "SPECIAL OFFERS",
    subtitle: "Up to 70% Off",
    description: "Limited Time Deals",
    color: "text-cherry-800",
  },
]

export const ContactCTA = React.memo(() => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const controls = useAnimation()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    controls.start("animate")
  }, [currentSlide, controls])

  const currentPromo = promoSlides[currentSlide]
  const IconComponent = currentPromo.icon

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  }

  const childVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 200,
      },
    },
  }

  const iconVariants = {
    hidden: { scale: 0, rotate: -180, opacity: 0 },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 150,
        duration: 0.5,
      },
    },
    hover: {
      scale: 1.1,
      rotate: 5,
      transition: { duration: 0.3 },
    },
  }

  return (
    <section
      className="relative h-[120px] rounded-xl overflow-hidden bg-gradient-to-br from-cherry-900 to-cherry-700 border border-cherry-600 shadow-lg"
      aria-label="Contact and promotional information"
    >
      {/* Animated Background Gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 3,
          ease: "linear",
        }}
      />

      {/* Subtle Particle Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0],
              x: Math.random() * 300 - 150,
              y: Math.random() * 120 - 60,
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
            style={{
              left: "50%",
              top: "50%",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="absolute inset-0 flex items-center justify-center p-4 sm:p-6"
        >
          <div className="flex items-center space-x-4 w-full max-w-md">
            {/* Animated Icon */}
            <motion.div
              variants={iconVariants}
              whileHover="hover"
              className={`p-3 rounded-full bg-cherry-800/50 backdrop-blur-sm shadow-md ${currentPromo.color}`}
            >
              <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
            </motion.div>

            {/* Text Content */}
            <div className="space-y-1 flex-grow">
              <motion.p
                variants={childVariants}
                className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-cherry-200"
              >
                {currentPromo.title}
              </motion.p>
              <motion.p
                variants={childVariants}
                className="text-lg sm:text-xl font-bold text-white leading-tight"
              >
                {currentPromo.subtitle}
              </motion.p>
              <motion.p
                variants={childVariants}
                className="text-sm text-cherry-100"
              >
                {currentPromo.description}
              </motion.p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
})

ContactCTA.displayName = "ContactCTA"