"use client"

import { motion } from "framer-motion"
import Image from "next/image"

// Add size prop to Loader component
interface LoaderProps {
  size?: "sm" | "md" | "lg"
}

export function Loader({ size }: LoaderProps) {
  // Determine size classes based on the size prop
  const sizeClasses = size === "lg" ? "h-12 w-12 sm:h-16 sm:w-16" : size === "sm" ? "h-8 w-8" : "h-12 w-12"

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{
          opacity: 1,
          scale: [0.8, 1.1, 1],
          rotate: [0, 0],
        }}
        transition={{
          duration: 0.8,
          ease: "easeOut",
          scale: {
            times: [0, 0.5, 1],
          },
        }}
        className={`relative ${sizeClasses} overflow-hidden rounded-xl bg-gradient-to-br from-cherry-800 to-cherry-900 p-0.5`}
      >
        <div className="h-full w-full rounded-xl bg-white p-1.5 sm:p-2">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
            alt="MIZIZZI"
            width={48}
            height={48}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            background: [
              "linear-gradient(0deg, rgba(136,19,55,0) 0%, rgba(136,19,55,0.2) 50%, rgba(136,19,55,0) 100%)",
              "linear-gradient(360deg, rgba(136,19,55,0) 0%, rgba(136,19,55,0.2) 50%, rgba(136,19,55,0) 100%)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </motion.div>
    </div>
  )
}

