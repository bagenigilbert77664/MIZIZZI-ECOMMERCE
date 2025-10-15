"use client"

import React from "react"
import { motion } from "framer-motion"

interface CarouselProgressProps {
  currentSlide: number
  totalSlides: number
  isPaused: boolean
}

export const CarouselProgress = React.memo<CarouselProgressProps>(({ currentSlide, totalSlides, isPaused }) => {
  const progress = ((currentSlide + 1) / totalSlides) * 100

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20" role="progressbar" aria-label="Carousel progress">
      <div className="bg-white/20 backdrop-blur-sm rounded-full h-1 overflow-hidden">
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-center mt-2 space-x-1">
        <span className="text-white text-xs font-medium">
          {currentSlide + 1} / {totalSlides}
        </span>
        {isPaused && <span className="text-white text-xs opacity-75">⏸</span>}
      </div>
    </div>
  )
})

CarouselProgress.displayName = "CarouselProgress"
