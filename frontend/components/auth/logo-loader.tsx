"use client"

import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface LogoLoaderProps {
  onLoadingComplete?: () => void
  duration?: number
  showText?: boolean
  size?: "sm" | "md" | "lg"
}

export function LogoLoader({ onLoadingComplete, duration = 4000, showText = true, size = "md" }: LogoLoaderProps) {
  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  return (
    <AnimatePresence onExitComplete={onLoadingComplete}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: [0.5, 1.2, 1],
            opacity: 1,
          }}
          transition={{
            duration: 1,
            ease: "easeOut",
            times: [0, 0.6, 1],
          }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-cherry-800 to-cherry-900 p-1.5 shadow-xl ${sizeClasses[size]}`}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ delay: 0.5 }}
            className="h-full w-full rounded-xl bg-white p-3 flex items-center justify-center"
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="MIZIZZI"
              width={80}
              height={80}
              className="h-full w-full object-contain"
              priority
            />
          </motion.div>
        </motion.div>

        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-8 text-center"
          >
            <h2 className="text-2xl font-bold text-cherry-900 mb-2">Welcome to Mizizzi</h2>
            <p className="text-cherry-600">Preparing your experience...</p>
          </motion.div>
        )}

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 1, duration: 2.5, ease: "easeInOut" }}
          className="h-1 bg-cherry-600 rounded-full mt-6 max-w-xs"
        />
      </motion.div>
    </AnimatePresence>
  )
}
