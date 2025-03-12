"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

interface LogoLoaderProps {
  onLoadingComplete?: () => void
  duration?: number
}

export function LogoLoader({ onLoadingComplete, duration = 2000 }: LogoLoaderProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          if (onLoadingComplete) {
            setTimeout(onLoadingComplete, 300)
          }
          return 100
        }
        return prev + 5
      })
    }, duration / 20)

    return () => clearInterval(interval)
  }, [duration, onLoadingComplete])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <div className="relative w-24 h-24 mb-8">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
          alt="Mizizzi Logo"
          fill
          className="object-contain"
        />
      </div>

      <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cherry-600"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeInOut" }}
        />
      </div>

      <p className="mt-4 text-sm text-gray-600 font-medium">Welcome to Mizizzi</p>
    </div>
  )
}

