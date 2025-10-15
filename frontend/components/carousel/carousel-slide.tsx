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
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
          className="absolute inset-0 overflow-hidden"
        >
          {/* Background Image with refined Parallax Effect */}
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative h-full w-full"
          >
            <Image
              src={item.image || "/placeholder.svg"}
              alt={`${item.title} - ${item.description}`}
              fill
              className="object-cover"
              priority={index < 2}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 80vw"
              quality={95}
            />

            {/* Refined Gradient Overlays for Depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            {/* Subtle Floating Particles - Reduced for Minimalism */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 100, x: Math.random() * 40 - 20 }}
                  animate={{
                    opacity: [0, 0.15, 0],
                    y: -100,
                    x: Math.random() * 40 - 20
                  }}
                  transition={{
                    duration: 5 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "linear"
                  }}
                  className="absolute w-0.5 h-0.5 bg-white/20 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '100%'
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Discount Badge - More Prominent Yet Subtle */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            whileHover={{ scale: 1.03 }}
            className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6"
          >
            <Badge className="bg-black/80 backdrop-blur-sm text-white border border-white/20 px-4 py-2 text-sm font-semibold shadow-md rounded-full">
              {item.discount}
            </Badge>
          </motion.div>

          {/* Main Content Area - Apple-inspired Clean Layout */}
          <div className="absolute inset-0 flex flex-col justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-12 lg:py-20 text-white z-10">
            <motion.div
              initial={{ opacity: 0, y: 50, x: -30 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl w-full relative"
            >
              {/* Subtle Glassmorphism Background for Readability */}
              <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-2xl -z-10" />

              <div className="relative p-4 sm:p-6 md:p-8"> {/* Balanced Inner Padding */}
                {/* Category Badge - Sleek and Integrated */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mb-4 sm:mb-6"
                >
                  <Badge
                    variant="secondary"
                    className="bg-white/10 backdrop-blur-sm text-white border-white/20 px-3 py-1.5 text-xs sm:text-sm font-medium tracking-wider"
                  >
                    <Sparkles className="w-3 h-3 mr-1 flex-shrink-0" />
                    {item.badge}
                  </Badge>
                </motion.div>

                {/* Title - Elegant Typography */}
                <motion.h2
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-tight mb-4 sm:mb-6 leading-tight"
                >
                  {item.title}
                </motion.h2>

                {/* Description - Readable and Spacious */}
                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }}
                  className="text-sm sm:text-base md:text-lg font-normal text-white/90 mb-6 sm:mb-8 leading-relaxed max-w-none"
                >
                  {item.description}
                </motion.p>

                {/* CTA Button - Apple-Style Clean and Interactive */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.7, ease: "easeOut" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    asChild
                    size="lg"
                    className="group relative bg-white/90 backdrop-blur-sm text-gray-900 hover:bg-white font-medium px-6 sm:px-8 py-3.5 md:py-4 rounded-full shadow-lg transition-all duration-300 text-sm sm:text-base border border-white/20 overflow-hidden"
                  >
                    <Link href={item.href} aria-label={`${item.buttonText} - ${item.title}`}>
                      {/* Subtle Hover Gradient */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />

                      {/* Button Content */}
                      <span className="relative flex items-center gap-2">
                        {item.buttonText}
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
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