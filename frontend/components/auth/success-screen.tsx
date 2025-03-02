"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"
import Image from "next/image"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface SuccessScreenProps {
  show: boolean
  onFinish: () => void
  title: string
  subtitle?: string
  provider?: "google" | "facebook" | "apple" | "email"
}

// Clean SVG icons as components
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-full w-full">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      className="fill-[#4285F4]"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      className="fill-[#34A853]"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      className="fill-[#FBBC05]"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      className="fill-[#EA4335]"
    />
  </svg>
)

export function SuccessScreen({ show, onFinish, title, subtitle, provider }: SuccessScreenProps) {
  const router = useRouter()

  useEffect(() => {
    if (show) {
      // Trigger haptic feedback if available
      if (window.navigator.vibrate) {
        window.navigator.vibrate([50, 100, 50])
      }

      // Auto-redirect after 2 seconds
      const timer = setTimeout(() => {
        onFinish()
        router.push("/")
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [show, onFinish, router])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-sm px-4">
            {/* Background glow effect */}
            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cherry-600/20 blur-xl" />

            {/* Main content */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative rounded-2xl border border-white/20 bg-white/90 p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                {/* Success icon with provider badge */}
                <div className="relative mb-4">
                  <motion.div
                    initial={{ rotate: -90, scale: 0.5 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      damping: 10,
                      stiffness: 100,
                    }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cherry-500 to-cherry-700 text-white shadow-lg"
                  >
                    <CheckCircle className="h-10 w-10" />
                  </motion.div>

                  {/* Provider icon */}
                  {provider && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white shadow-md"
                    >
                      {provider === "google" && (
                        <div className="h-5 w-5">
                          <GoogleIcon />
                        </div>
                      )}
                      {provider === "facebook" && (
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#1877F2]">
                          <path
                            fill="currentColor"
                            d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5c0-.552.447-1 1-1h3v-4h-3c-2.761 0-5 2.239-5 5v2.01h-2.588l-.412 3.98h3v8.01z"
                          />
                        </svg>
                      )}
                      {provider === "apple" && (
                        <svg viewBox="0 0 24 24" className="h-5 w-5">
                          <path
                            fill="currentColor"
                            d="M16.7023 0C15.0734 0.0936 13.2299 1.0535 12.1241 2.3266C11.1205 3.4779 10.3452 5.1152 10.6766 6.7153C12.4356 6.7621 14.2484 5.7671 15.3241 4.4704C16.3999 3.1736 17.0996 1.5598 16.7023 0Z M21.3127 8.2654C19.8761 6.4767 17.8149 5.4113 15.8474 5.4113C13.2299 5.4113 12.0307 6.7081 10.1711 6.7081C8.2648 6.7081 6.7815 5.4113 4.5334 5.4113C2.3321 5.4113 0.0371094 6.8017 0.0371094 9.9558C0.0371094 14.9183 4.9775 21.1562 7.2724 21.1562C8.9481 21.1562 9.5544 20.1378 11.6623 20.1378C13.7702 20.1378 14.0548 21.1562 16.0223 21.1562C18.2236 21.1562 19.9461 18.0957 21.1453 15.8932C17.1618 14.1747 16.5087 8.7371 21.3127 8.2654Z"
                          />
                        </svg>
                      )}
                      {provider === "email" && (
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-cherry-600">
                          <path
                            fill="currentColor"
                            d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                          />
                        </svg>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Text content */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
                </motion.div>

                {/* Logo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6"
                >
                  <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-gradient-to-br from-cherry-800 to-cherry-900 p-0.5">
                    <div className="h-full w-full rounded-lg bg-white p-1">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                        alt="MIZIZZI"
                        width={24}
                        height={24}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

