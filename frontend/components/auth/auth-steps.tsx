"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { IdentifierStep } from "./identifier-step"
import { PasswordStep } from "./password-step"
import { RegisterStep } from "./register-step"
import { WelcomeScreen } from "./welcome-screen"
import { SuccessScreen } from "./success-screen"
import { LogoLoader } from "./logo-loader"
import { authService } from "@/services/auth"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth/auth-context"

export type AuthFlow = "login" | "register"

export function AuthSteps() {
  const [step, setStep] = useState<
    "identifier" | "password" | "register" | "verification" | "welcome" | "success" | "loading"
  >("identifier")
  const [flow, setFlow] = useState<AuthFlow>("login")
  const [identifier, setIdentifier] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { refreshAuthState } = useAuth() // Get the refreshAuthState function from auth context

  // Add a countdown timer for resending verification code
  const [resendCountdown, setResendCountdown] = useState(0)

  // Check if we have a stored verification state
  useEffect(() => {
    const storedState = localStorage.getItem("auth_verification_state")
    if (storedState) {
      try {
        const state = JSON.parse(storedState)
        if (state.identifier && state.step === "verification") {
          setIdentifier(state.identifier)
          setUserId(state.userId)
          setFlow("register")
          setStep("verification")
        }
      } catch (e) {
        localStorage.removeItem("auth_verification_state")
      }
    }
  }, [])

  // Add this useEffect to handle the countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1)
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [resendCountdown])

  const handleIdentifierSubmit = async (value: string, isEmail: boolean) => {
    setIsLoading(true)
    setIdentifier(value)

    try {
      // Check if user exists
      const response = await authService.checkAvailability(value)

      if ((isEmail && !response.email_available) || (!isEmail && !response.phone_available)) {
        // User exists - proceed to password step (login flow)
        setFlow("login")
        setStep("password")
        toast({
          title: "Account found",
          description: "Please enter your password to continue",
        })
      } else {
        // User doesn't exist - proceed to register step directly
        setFlow("register")
        setStep("register")
        toast({
          title: "Create an account",
          description: "Please complete your registration to continue",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process your request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationSuccess = async (userId: string, userData?: any) => {
    setUserId(userId)
    setIsVerified(true)

    // Clear verification state
    localStorage.removeItem("auth_verification_state")

    // If we have user data, go directly to success screen
    if (userData) {
      setStep("success")

      // Store user data in localStorage
      if (userData.user) {
        localStorage.setItem("user", JSON.stringify(userData.user))
      }

      // Update auth context state immediately
      await refreshAuthState()

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } else {
      // Otherwise go to register step
      setStep("register")
      toast({
        title: "Verification successful",
        description: "Please complete your registration",
      })
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    setIsLoading(true)
    try {
      const response = await authService.login(identifier, password)

      // Update auth context state immediately
      await refreshAuthState()

      // Show success screen
      setStep("success")

      toast({
        title: "Login successful",
        description: "Welcome back! You are now logged in.",
        variant: "success",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      // Check if this is a verification required error
      if (error.response?.data?.verification_required) {
        // Set user ID from the response
        setUserId(error.response.data.user_id || null)

        // Store verification state
        localStorage.setItem(
          "auth_verification_state",
          JSON.stringify({
            identifier: identifier,
            step: "verification",
            userId: error.response.data.user_id,
            timestamp: new Date().toISOString(),
          }),
        )

        // Show verification step
        setStep("verification")

        // Send verification code
        try {
          await authService.sendVerificationCode(identifier)
          toast({
            title: "Verification required",
            description: `Please verify your ${identifier.includes("@") ? "email" : "phone"} to continue.`,
          })
        } catch (verificationError: any) {
          toast({
            title: "Verification error",
            description: verificationError.message || "Failed to send verification code",
            variant: "destructive",
          })
        }
        return
      }

      let errorMessage = "Invalid credentials"

      // More specific error messages based on the error
      if (error.message?.includes("not found")) {
        errorMessage = "Account not found. Please check your email or phone number."
      } else if (error.message?.includes("password")) {
        errorMessage = "Incorrect password. Please try again."
      } else if (error.message?.includes("locked")) {
        errorMessage = "Your account has been locked. Please contact support."
      }

      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (name: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await authService.register({
        name,
        email: identifier.includes("@") ? identifier : undefined,
        phone: !identifier.includes("@") ? identifier : undefined,
        password,
      })

      if (response.user_id) {
        // If we have a user ID, we need to verify the account
        setUserId(response.user_id)

        // Send verification code
        try {
          await authService.sendVerificationCode(identifier)

          toast({
            title: "Verification code sent",
            description: `Please check your ${identifier.includes("@") ? "email" : "phone"} for the verification code.`,
          })

          // Store verification state
          localStorage.setItem(
            "auth_verification_state",
            JSON.stringify({
              identifier: identifier,
              step: "verification",
              userId: response.user_id,
              timestamp: new Date().toISOString(),
            }),
          )

          // Show verification step
          setStep("verification")
        } catch (verificationError: any) {
          toast({
            title: "Verification error",
            description: verificationError.message || "Failed to send verification code",
            variant: "destructive",
          })
        }
      } else {
        // Show welcome screen
        setStep("welcome")

        toast({
          title: "Account created",
          description: "Your account has been created successfully!",
          variant: "success",
        })

        // Redirect after a short delay - REMOVE THIS REDIRECTION
        // setTimeout(() => {
        //   router.push("/")
        // }, 3000)
      }
    } catch (error: any) {
      let errorMessage = "Failed to create account"

      // More specific error messages based on the error
      if (error.message?.includes("email") && error.message?.includes("exists")) {
        errorMessage = "This email is already registered. Please use a different email."
      } else if (error.message?.includes("phone") && error.message?.includes("exists")) {
        errorMessage = "This phone number is already registered. Please use a different number."
      } else if (error.message?.includes("password")) {
        errorMessage = "Password does not meet requirements. Please choose a stronger password."
      }

      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleResendVerification function
  const handleResendVerification = async () => {
    if (resendCountdown > 0) return

    setIsLoading(true)
    try {
      await authService.resendVerificationCode(identifier)

      // Start a 60-second countdown
      setResendCountdown(60)

      toast({
        title: "Verification code sent",
        description: `A new verification code has been sent to ${identifier}. Please check your ${
          identifier.includes("@") ? "inbox and spam folder" : "messages"
        }`,
        variant: "success",
        duration: 5000,
      })
    } catch (error: any) {
      let errorMessage = "Failed to resend verification code"

      if (error.message?.includes("too many")) {
        errorMessage = "Too many attempts. Please try again in a few minutes."
      } else if (error.message?.includes("not found")) {
        errorMessage = "Account not found. Please check your information."
      } else if (error.message?.includes("already verified")) {
        errorMessage = "This account is already verified. Please login."
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep("identifier")
  }

  if (step === "loading") {
    return <LogoLoader />
  }

  if (step === "identifier") {
    return <IdentifierStep onSubmit={handleIdentifierSubmit} isLoading={isLoading} />
  }

  // Update the verification code submission handler
  const handleVerificationSubmit = async (code: string) => {
    if (!code) {
      toast({
        title: "Verification code required",
        description: "Please enter the verification code",
        variant: "destructive",
      })
      return
    }

    if (code.length < 4) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid verification code",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Trim the code to remove any whitespace
      const trimmedCode = code.trim()
      console.log(`Attempting to verify code: ${trimmedCode} for user ID: ${userId}`)

      // Make sure userId is a string when passing to verifyCode
      const response = await authService.verifyCode(userId || "", trimmedCode, !identifier.includes("@"))

      if (response.verified) {
        toast({
          title: "Verification successful",
          description: "Your account has been verified",
          variant: "success",
        })

        // Update auth context state immediately
        await refreshAuthState()

        // If verification successful and we have user data, go to success screen
        await handleVerificationSuccess(userId || "", response)
      } else {
        toast({
          title: "Verification failed",
          description: "Invalid verification code. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Verification error:", error)
      let errorMessage = "Failed to verify code"

      // More specific error messages based on the error
      if (error.message?.includes("expired")) {
        errorMessage = "Verification code has expired. Please request a new one."
      } else if (error.message?.includes("invalid")) {
        errorMessage = "Invalid verification code. Please check and try again."
      } else if (error.message?.includes("attempts")) {
        errorMessage = "Too many failed attempts. Please request a new code."
      }

      toast({
        title: "Verification error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the verification form submission handler
  if (step === "verification") {
    return (
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Verify your {identifier.includes("@") ? "email" : "phone"}</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification code to <span className="font-medium">{identifier}</span>
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const codeInput = form.elements.namedItem("code") as HTMLInputElement
            const code = codeInput.value
            handleVerificationSubmit(code)
          }}
          className="space-y-3"
        >
          <div className="space-y-1">
            <input
              type="text"
              name="code"
              className="w-full p-3 border rounded-md text-center text-lg tracking-widest"
              placeholder="Enter verification code"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code sent to your {identifier.includes("@") ? "email" : "phone"}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          <div className="flex flex-col space-y-2 mt-4">
            <p className="text-xs text-center text-muted-foreground">Didn&apos;t receive the code?</p>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleResendVerification}
              disabled={isLoading || resendCountdown > 0}
            >
              {isLoading ? "Please wait..." : resendCountdown > 0 ? `Resend code (${resendCountdown}s)` : "Resend code"}
            </Button>
            <Button variant="link" className="w-full" onClick={handleBack}>
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to sign in
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (step === "password") {
    return (
      <PasswordStep identifier={identifier} onSubmit={handlePasswordSubmit} isLoading={isLoading} onBack={handleBack} />
    )
  }

  if (step === "register") {
    return (
      <RegisterStep identifier={identifier} onSubmit={handleRegisterSubmit} isLoading={isLoading} onBack={handleBack} />
    )
  }

  if (step === "welcome") {
    return <WelcomeScreen username={identifier.split("@")[0]} />
  }

  if (step === "success") {
    return <SuccessScreen />
  }

  return null
}