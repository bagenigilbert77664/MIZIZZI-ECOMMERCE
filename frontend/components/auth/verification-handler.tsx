"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"

export function VerificationHandler() {
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { checkVerificationState } = useAuth()

  useEffect(() => {
    const checkState = async () => {
      try {
        setIsChecking(true)
        const state = checkVerificationState()

        if (state.needsVerification) {
          // If verification is needed, redirect to auth page
          if (!window.location.pathname.includes("/auth")) {
            router.push("/auth")
            toast({
              title: "Verification Required",
              description: "Please complete your account verification.",
            })
          }
        } else {
          // Check if we're on the auth page but don't need verification
          if (window.location.pathname.includes("/auth") && !localStorage.getItem("auth_verification_state")) {
            // Only redirect away from auth if we're not in the middle of a verification flow
            const user = localStorage.getItem("user")
            if (user) {
              // If user is logged in, redirect to home
              router.push("/")
            }
          }
        }
      } catch (error) {
        console.error("Error checking verification state:", error)
      } finally {
        setIsChecking(false)
      }
    }

    checkState()
  }, [router, toast, checkVerificationState])

  return null // This is a utility component with no UI
}