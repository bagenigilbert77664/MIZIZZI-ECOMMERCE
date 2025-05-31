"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Image from "next/image"

// Add global type for window.google
declare global {
  interface Window {
    google?: any
  }
}

// Define the props for the GoogleAuthButton component
interface GoogleAuthButtonProps {
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  text?: string
  fullWidth?: boolean
}

// Google client ID from environment variable
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export function GoogleAuthButton({
  className = "",
  variant = "outline",
  size = "default",
  text = "Sign in with Google",
  fullWidth = false,
}: GoogleAuthButtonProps) {
  const { googleAuth } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  // Load the Google API script
  useEffect(() => {
    // Check if the script is already loaded
    if (window.google) {
      setGoogleLoaded(true)
      return
    }

    // Create script element
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => {
      setGoogleLoaded(true)
    }
    script.onerror = () => {
      console.error("Failed to load Google API script")
      toast({
        title: "Google Sign-In Error",
        description: "Failed to load Google authentication. Please try again later.",
        variant: "destructive",
      })
    }

    // Add script to document
    document.body.appendChild(script)

    // Clean up
    return () => {
      document.body.removeChild(script)
    }
  }, [toast])

  // Initialize Google One Tap
  useEffect(() => {
    if (!googleLoaded || !GOOGLE_CLIENT_ID) return

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
    } catch (error) {
      console.error("Error initializing Google One Tap:", error)
    }
  }, [googleLoaded])

  // Handle the response from Google
  const handleGoogleResponse = async (response: any) => {
    if (!response.credential) {
      console.error("No credential received from Google")
      return
    }

    setIsLoading(true)
    try {
      await googleAuth(response.credential)
      // The auth context will handle the redirect and success message
    } catch (error: any) {
      console.error("Google authentication error:", error)
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate with Google. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle button click to prompt Google sign-in
  const handleGoogleSignIn = () => {
    if (!googleLoaded || !window.google?.accounts?.id) {
      toast({
        title: "Google Sign-In Error",
        description: "Google authentication is not available. Please try again later.",
        variant: "destructive",
      })
      return
    }

    try {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One Tap is not displayed or skipped, use the standard OAuth flow
          window.google.accounts.oauth2
            .initCodeClient({
              client_id: GOOGLE_CLIENT_ID!,
              scope: "email profile",
              callback: (response: any) => {
                if (response.code) {
                  // Exchange code for tokens on your backend
                  console.log("OAuth code received:", response.code)
                }
              },
            })
            .requestCode()
        }
      })
    } catch (error) {
      console.error("Error prompting Google sign-in:", error)
      toast({
        title: "Google Sign-In Error",
        description: "Failed to initialize Google authentication. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`${className} ${fullWidth ? "w-full" : ""} relative`}
      onClick={handleGoogleSignIn}
      disabled={isLoading || !googleLoaded}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Image
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          width={18}
          height={18}
          className="mr-2"
        />
      )}
      {text}
    </Button>
  )
}
