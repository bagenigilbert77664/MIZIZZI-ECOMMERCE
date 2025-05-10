"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface PageTransitionProps {
  isVisible: boolean
  onComplete?: () => void
  duration?: number
}

export function PageTransition({ isVisible, onComplete, duration = 4000 }: PageTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        if (onComplete) onComplete()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete, duration])

  return (
    <AnimatePresence>
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
              className="relative h-32 w-32 overflow-hidden rounded-2xl shadow-xl"
              style={{
                background: "linear-gradient(to bottom right, #b91c1c, #7f1d1d)",
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="h-full w-full rounded-xl bg-white p-4 flex items-center justify-center"
              >
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                  alt="MIZIZZI"
                  width={100}
                  height={100}
                  className="h-full w-full object-contain"
                  priority
                />
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
              className="h-1 bg-cherry-600 rounded-full mt-6 max-w-xs"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}