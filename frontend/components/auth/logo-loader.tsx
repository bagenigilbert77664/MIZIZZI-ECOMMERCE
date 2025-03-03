"use client"

import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface LogoLoaderProps {
  onLoadingComplete?: () => void
}

export function LogoLoader({ onLoadingComplete }: LogoLoaderProps) {
  return (
    <AnimatePresence onExitComplete={onLoadingComplete}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-white"
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
          className="relative h-24 w-24 overflow-hidden rounded-2xl bg-gradient-to-br from-cherry-800 to-cherry-900 p-1"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ delay: 0.5 }}
            className="h-full w-full rounded-xl bg-white p-3"
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
      </motion.div>
    </AnimatePresence>
  )
}

