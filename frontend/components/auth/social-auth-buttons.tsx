"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth"  // Adjust the import path as needed
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

// Define the props for the component; you can later extend it if needed.
interface SocialAuthButtonsProps {
  mode: "login" | "register"
}

export function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const { socialLogin } = useAuth()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSocialAuth = async (provider: string) => {
    setIsLoading(provider)
    try {
      // Call the social login function from the auth context
      await socialLogin(provider)
      // On success, show a toast notification
      toast({
        title: "Success!",
        description: `You've successfully signed in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}.`,
      })
    } catch (error) {
      // Handle errors and show a destructive toast
      toast({
        title: "Authentication failed",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Divider with text */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Social buttons grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Google */}
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading !== null}
            className="w-full bg-white"
            onClick={() => handleSocialAuth("google")}
          >
            {isLoading === "google" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cherry-600 border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
          </Button>
        </motion.div>

        {/* Facebook */}
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading !== null}
            className="w-full bg-white"
            onClick={() => handleSocialAuth("facebook")}
          >
            {isLoading === "facebook" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cherry-600 border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" />
              </svg>
            )}
          </Button>
        </motion.div>

        {/* Apple */}
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            type="button"
            disabled={isLoading !== null}
            className="w-full bg-white"
            onClick={() => handleSocialAuth("apple")}
          >
            {isLoading === "apple" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-cherry-600 border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="black">
                <path d="M16.7023 0C15.0734 0.0936 13.2299 1.0535 12.1241 2.3266C11.1205 3.4779 10.3452 5.1152 10.6766 6.7153C12.4356 6.7621 14.2484 5.7671 15.3241 4.4704C16.3999 3.1736 17.0996 1.5598 16.7023 0Z" />
                <path d="M21.3127 8.2654C19.8761 6.4767 17.8149 5.4113 15.8474 5.4113C13.2299 5.4113 12.0307 6.7081 10.1711 6.7081C8.2648 6.7081 6.7815 5.4113 4.5334 5.4113C2.3321 5.4113 0.0371094 6.8017 0.0371094 9.9558C0.0371094 14.9183 4.9775 21.1562 7.2724 21.1562C8.9481 21.1562 9.5544 20.1378 11.6623 20.1378C13.7702 20.1378 14.0548 21.1562 16.0223 21.1562C18.2236 21.1562 19.9461 18.0957 21.1453 15.8932C17.1618 14.1747 16.5087 8.7371 21.3127 8.2654Z" />
              </svg>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
