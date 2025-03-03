"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

interface SuccessScreenProps {
  username: string
  onComplete: () => void
}

export function SuccessScreen({ username, onComplete }: SuccessScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-r from-cherry-950 to-cherry-900"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10, stiffness: 100 }}
            className="mb-4 flex justify-center"
          >
            <div className="rounded-full bg-cherry-600 p-4">
              <Check className="h-12 w-12 text-white" />
            </div>
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-white"
          >
            Welcome, {username}!
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-lg text-cherry-100"
          >
            Your account has been created successfully.
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

