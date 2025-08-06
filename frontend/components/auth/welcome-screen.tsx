"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"

interface WelcomeScreenProps {
  username?: string
  onComplete?: () => void
}

export function WelcomeScreen({ username = "", onComplete }: WelcomeScreenProps) {
  const [show, setShow] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setShow(false)
      if (onComplete) setTimeout(onComplete, 500) // Wait for exit animation
    }, 3000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center space-y-4 text-center"
        >
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold">Welcome to Mizizzi!</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been created successfully. You are now being redirected to the homepage.
          </p>
          <div className="mt-2 flex items-center justify-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
