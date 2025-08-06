"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles } from 'lucide-react'
import type { CarouselItem } from "@/types/carousel"

interface CarouselSlideProps {
  item: CarouselItem
  isActive: boolean
  index: number
}

export const CarouselSlide = React.memo<CarouselSlideProps>(({ item, isActive, index }) => {
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{
            duration: 0.7,
            ease: [0.4, 0, 0.2, 1], // Custom ease for a smoother feel
          }}
          className="absolute inset-0 overflow-hidden"
        >
          {/* Background Image with subtle Parallax Effect */}
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative h-full w-full"
          >
            <Image
              src={item.image || "/placeholder.svg"}
              alt={`${item.title} - ${item.description}`}
              fill
              className="object-cover"
              priority={index < 2} // Prioritize loading for the first two slides
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              quality={90}
            />

            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Extremely Subtle Animated Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 80, x: Math.random() * 50 - 25 }}
                  animate={{
                    opacity: [0, 0.2, 0],
                    y: -80,
                    x: Math.random() * 50 - 25
                  }}
                  transition={{
                    duration: 4 + Math.random() * 3,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                    ease: "linear"
                  }}
                  className="absolute w-0.5 h-0.5 bg-white/30 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '100%'
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Discount Badge - positioned for prominence */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
            className="absolute top-6 right-6 z-10"
          >
            <Badge className="bg-gradient-to-r from-red-600 to-rose-600 text-white border-0 px-5 py-2.5 text-base font-bold shadow-lg rounded-full">
              {item.discount}
            </Badge>
          </motion.div>

          {/* Main Content Area - no explicit card, just content with subtle background */}
          <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-12 text-white z-10">
            <motion.div
              initial={{ opacity: 0, y: 40, x: -20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="max-w-md lg:max-w-xl relative" // Removed explicit card styling
            >
              {/* Subtle background for text readability */}
              <div className="absolute inset-0 bg-black/20 rounded-lg pointer-events-none" />

              <div className="relative p-4 sm:p-6"> {/* Inner padding for content */}
                {/* Category Badge - integrated into content block */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="mb-3"
                >
                  <Badge
                    variant="secondary"
                    className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-3 py-1.5 text-xs sm:text-sm font-semibold tracking-wide"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {item.badge}
                  </Badge>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight"
                >
                  {item.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                  className="text-sm sm:text-base md:text-lg font-medium text-white/90 mb-6 leading-relaxed"
                >
                  {item.description}
                </motion.p>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    asChild
                    size="lg"
                    className="group relative bg-white text-gray-900 hover:bg-gray-100 font-semibold px-7 py-3.5 rounded-full shadow-xl transition-all duration-300 text-base border-0 overflow-hidden"
                  >
                    <Link href={item.href} aria-label={`${item.buttonText} - ${item.title}`}>
                      {/* Button Background Animation */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white to-gray-50 transition-transform duration-300 group-hover:scale-105" />

                      {/* Button Content */}
                      <span className="relative flex items-center gap-2">
                        {item.buttonText}
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>

                      {/* Subtle Shine Effect */}
                      <div className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

CarouselSlide.displayName = "CarouselSlide"
