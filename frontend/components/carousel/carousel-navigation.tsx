"use client"

import React from "react"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { ANIMATION_CONFIGS } from "@/constants/carousel"

interface CarouselNavigationProps {
  onPrevious: () => void
  onNext: () => void
  isPaused: boolean
  onPause: () => void
  onResume: () => void
}

export const CarouselNavigation = React.memo<CarouselNavigationProps>(
  ({ onPrevious, onNext, isPaused, onPause, onResume }) => {
    const [leftHover, setLeftHover] = React.useState(false)
    const [rightHover, setRightHover] = React.useState(false)

    return (
      <>
        {/* Left Navigation */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 flex items-center z-20"
          onMouseEnter={() => {
            onPause()
            setLeftHover(true)
          }}
          onMouseLeave={() => {
            onResume()
            setLeftHover(false)
          }}
          onFocus={() => onPause()}
          onBlur={() => onResume()}
        >
          <motion.button
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 m-4 rounded-full border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={onPrevious}
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{
              opacity: leftHover ? 1 : 0,
              x: leftHover ? 0 : -20,
              scale: leftHover ? 1 : 0.8,
            }}
            transition={ANIMATION_CONFIGS.slideTransition}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
            whileTap={{ scale: 0.95 }}
            aria-label="Previous slide"
            tabIndex={0}
          >
            <ChevronRight className="h-5 w-5 rotate-180" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Right Navigation */}
        <div
          className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end z-20"
          onMouseEnter={() => {
            onPause()
            setRightHover(true)
          }}
          onMouseLeave={() => {
            onResume()
            setRightHover(false)
          }}
          onFocus={() => onPause()}
          onBlur={() => onResume()}
        >
          <motion.button
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 m-4 rounded-full border border-white/20 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={onNext}
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{
              opacity: rightHover ? 1 : 0,
              x: rightHover ? 0 : 20,
              scale: rightHover ? 1 : 0.8,
            }}
            transition={ANIMATION_CONFIGS.slideTransition}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
            whileTap={{ scale: 0.95 }}
            aria-label="Next slide"
            tabIndex={0}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </motion.button>
        </div>
      </>
    )
  },
)

CarouselNavigation.displayName = "CarouselNavigation"
