"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import AnimationErrorBoundary from "@/components/animation/animation-error-boundary"

interface PageTransitionProps {
  isVisible: boolean // This must be a boolean
  onComplete?: () => void
  onError?: () => void
  duration?: number
}

export function PageTransition({ isVisible, onComplete, onError, duration = 4000 }: PageTransitionProps) {
  const [isAnimating, setIsAnimating] = useState<boolean>(false)

  useEffect(() => {
    // Convert isVisible to boolean explicitly to ensure type safety
    const shouldAnimate = isVisible === true

    if (shouldAnimate) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        if (onComplete) onComplete()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete, duration])

  const handleAnimationError = () => {
    console.warn("Animation error detected, gracefully handling")
    setIsAnimating(false)
    if (onError) onError()
    if (onComplete) onComplete()
  }

  return (
    <AnimationErrorBoundary>
      <AnimatePresence mode="popLayout">
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white"
          >
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: [0.8, 1.1, 1],
                  opacity: 1,
                }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  times: [0, 0.6, 1],
                }}
                className="relative h-32 w-32 overflow-hidden rounded-2xl shadow-xl bg-cherry-700"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="h-full w-full rounded-xl bg-white p-4 flex items-center justify-center"
                >
                  {/* Logo image */}
                  <img src="/logo.png" alt="MIZIZZI" className="h-full w-full object-contain" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-8 text-center"
              >
                <h2 className="text-2xl font-bold text-cherry-900 mb-2">Welcome to Mizizzi</h2>
                <p className="text-cherry-600">Preparing your experience...</p>
              </motion.div>

              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 2.5, ease: "easeInOut" }}
                className="h-1 rounded-full mt-6 max-w-xs bg-cherry-600"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimationErrorBoundary>
  )
}
