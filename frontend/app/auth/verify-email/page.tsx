"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth/auth-context"

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { refreshAuthState } = useAuth()

  const token = searchParams ? searchParams.get("token") : null
  const accessTokenFromUrl = searchParams ? searchParams.get("access_token") : null
  const refreshTokenFromUrl = searchParams ? searchParams.get("refresh_token") : null
  const csrfTokenFromUrl = searchParams ? searchParams.get("csrf_token") : null

  useEffect(() => {
    const handleVerification = async () => {
      // Prioritize tokens from URL query parameters (backend redirect flow)
      if (accessTokenFromUrl && refreshTokenFromUrl && csrfTokenFromUrl) {
        try {
          localStorage.setItem("mizizzi_token", accessTokenFromUrl)
          localStorage.setItem("mizizzi_refresh_token", refreshTokenFromUrl)
          localStorage.setItem("mizizzi_csrf_token", csrfTokenFromUrl)
          localStorage.removeItem("auth_verification_state") // Clear any pending verification state

          setStatus("success")
          setMessage("Your email has been verified successfully!")

          await refreshAuthState() // Refresh auth state to update the UI

          toast({
            title: "Email Verified",
            description: "Your email has been verified successfully. You are now signed in.",
            variant: "success",
          })

          setTimeout(() => {
            router.push("/")
          }, 2000)
        } catch (error) {
          console.error("Error processing tokens from URL:", error)
          setStatus("error")
          setMessage("An error occurred processing verification. Please try again later.")
        }
        return
      }

      // If no tokens in URL, proceed with direct API call (older flow or fallback)
      if (!token) {
        setStatus("error")
        setMessage("No verification token provided")
        return
      }

      try {
        // Call the backend API to verify the email token
        // The backend /api/auth/verify-email endpoint now handles the verification and returns JSON
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/verify-email?token=${token}`, // Updated endpoint
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json", // Request JSON response
            },
          },
        )

        const data = await response.json()

        if (response.ok && data.verified) {
          // Store tokens if provided in the JSON response
          if (data.access_token) {
            localStorage.setItem("mizizzi_token", data.access_token)
          }
          if (data.refresh_token) {
            localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
          }
          if (data.csrf_token) {
            localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
          }
          if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user))
          }

          localStorage.removeItem("auth_verification_state")

          setStatus("success")
          setMessage(data.message || "Your email has been verified successfully!")

          await refreshAuthState()

          toast({
            title: "Email Verified",
            description: "Your email has been verified successfully. You are now signed in.",
            variant: "success",
          })

          setTimeout(() => {
            router.push("/")
          }, 2000)
        } else {
          setStatus("error")
          setMessage(data.msg || data.error || "Verification failed. Please try again or contact support.")
        }
      } catch (error) {
        console.error("Error verifying email:", error)
        setStatus("error")
        setMessage("An error occurred during verification. Please try again later.")
      }
    }

    handleVerification()
  }, [token, accessTokenFromUrl, refreshTokenFromUrl, csrfTokenFromUrl, router, toast, refreshAuthState])

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center space-y-4">
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <h2 className="text-xl font-semibold">Verifying your email...</h2>
              <p className="text-gray-600">Please wait while we verify your email address.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="rounded-full bg-green-100 p-3 inline-flex mx-auto">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Email Verified</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">You will be redirected to the home page in a few seconds...</p>
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="rounded-full bg-red-100 p-3 inline-flex mx-auto">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold">Verification Failed</h2>
              <p className="text-gray-600">{message}</p>
              <div className="mt-4 space-y-2">
                <Button onClick={() => router.push("/auth")} className="w-full">
                  Go to Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Redirect to the manual verification page
                    const verificationState = localStorage.getItem("auth_verification_state")
                    if (verificationState) {
                      router.push("/auth") // Go back to auth steps to re-enter code
                    } else {
                      router.push("/auth/register") // If no state, suggest registration
                    }
                  }}
                  className="w-full"
                >
                  Try Manual Verification
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
