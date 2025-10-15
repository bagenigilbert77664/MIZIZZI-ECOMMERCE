"use client"

import React from "react"
import { motion, Transition } from "framer-motion"
import { ChevronRight } from "lucide-react"

interface CarouselNavigationProps {
  onPrevious: () => void
  onNext: () => void
  isPaused: boolean
  onPause: () => void
  onResume: () => void
}

const ANIMATION_CONFIGS = {
  slideTransition: {
    type: "spring",
    stiffness: 120,
    damping: 15,
    mass: 0.5,
  } as Transition,
  hoverTransition: {
    duration: 0.3,
    ease: [0.25, 0.1, 0.25, 1],
  } as Transition,
  tapTransition: {
    duration: 0.2,
  } as Transition,
}

export const CarouselNavigation = React.memo<CarouselNavigationProps>(
  ({ onPrevious, onNext, isPaused, onPause, onResume }) => {
    const [leftHover, setLeftHover] = React.useState(false)
    const [rightHover, setRightHover] = React.useState(false)

    return (
      <>
        {/* Left Navigation with responsive sizing */}
        <div
          className="absolute inset-y-0 left-0 w-1/3 xs:w-1/4 sm:w-1/5 md:w-1/6 flex items-center z-20"
          onMouseEnter={() => {
            onPause()
            setLeftHover(true)
          }}
          onMouseLeave={() => {
            onResume()
            setLeftHover(false)
          }}
          onTouchStart={() => {
            onPause()
            setLeftHover(true)
          }}
          onTouchEnd={() => {
            onResume()
            setLeftHover(false)
          }}
          onFocus={() => onPause()}
          onBlur={() => onResume()}
        >
          <motion.button
            className="bg-white/15 hover:bg-white/25 backdrop-blur-xl text-white p-2 xs:p-2.5 sm:p-3 md:p-4 m-2 xs:m-3 sm:m-4 rounded-full border border-white/30 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-300"
            onClick={onPrevious}
            initial={{ opacity: 0, x: -20, scale: 0.85 }}
            animate={{
              opacity: leftHover ? 1 : 0.3,
              x: leftHover ? 0 : -20,
              scale: leftHover ? 1 : 0.85,
            }}
            transition={ANIMATION_CONFIGS.slideTransition}
            whileHover={{
              scale: 1.15,
              backgroundColor: "rgba(255,255,255,0.35)",
              transition: ANIMATION_CONFIGS.hoverTransition,
            }}
            whileTap={{
              scale: 0.9,
              transition: ANIMATION_CONFIGS.tapTransition,
            }}
            aria-label="Previous slide"
            tabIndex={0}
          >
            <ChevronRight className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 rotate-180" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Right Navigation with responsive sizing */}
        <div
          className="absolute inset-y-0 right-0 w-1/3 xs:w-1/4 sm:w-1/5 md:w-1/6 flex items-center justify-end z-20"
          onMouseEnter={() => {
            onPause()
            setRightHover(true)
          }}
          onMouseLeave={() => {
            onResume()
            setRightHover(false)
          }}
          onTouchStart={() => {
            onPause()
            setRightHover(true)
          }}
          onTouchEnd={() => {
            onResume()
            setRightHover(false)
          }}
          onFocus={() => onPause()}
          onBlur={() => onResume()}
        >
          <motion.button
            className="bg-white/15 hover:bg-white/25 backdrop-blur-xl text-white p-2 xs:p-2.5 sm:p-3 md:p-4 m-2 xs:m-3 sm:m-4 rounded-full border border-white/30 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-300"
            onClick={onNext}
            initial={{ opacity: 0, x: 20, scale: 0.85 }}
            animate={{
              opacity: rightHover ? 1 : 0.3,
              x: rightHover ? 0 : 20,
              scale: rightHover ? 1 : 0.85,
            }}
            transition={ANIMATION_CONFIGS.slideTransition}
            whileHover={{
              scale: 1.15,
              backgroundColor: "rgba(255,255,255,0.35)",
              transition: ANIMATION_CONFIGS.hoverTransition,
            }}
            whileTap={{
              scale: 0.9,
              transition: ANIMATION_CONFIGS.tapTransition,
            }}
            aria-label="Next slide"
            tabIndex={0}
          >
            <ChevronRight className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" aria-hidden="true" />
          </motion.button>
        </div>
      </>
    )
  },
)

CarouselNavigation.displayName = "CarouselNavigation"
