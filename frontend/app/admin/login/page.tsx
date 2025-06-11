"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import Image from "next/image"
import * as z from "zod"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
  const { login } = useAdminAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)

  // Update the useEffect to better handle session expiration and token refresh failures
  useEffect(() => {
    // Clear any existing redirect flags when landing on login page
    sessionStorage.removeItem("auth_redirecting")

    // Check if we were redirected here due to session expiration or other reasons
    const redirectReason = new URLSearchParams(window.location.search).get("reason")

    if (redirectReason === "session_expired") {
      setError("Your session has expired. Please sign in again.")
    } else if (redirectReason === "token_refresh_failed") {
      setError("Your authentication token could not be refreshed. Please sign in again.")
    } else if (redirectReason === "refresh_error") {
      setError("There was a problem with your authentication. Please sign in again.")
    } else if (redirectReason === "token_expired") {
      setError("Your access token has expired. Please sign in again.")
    } else if (redirectReason === "no_refresh_token") {
      setError("Your session cannot be renewed. Please sign in again.")
    }

    // Always clear tokens when landing on login page to ensure clean state
    localStorage.removeItem("mizizzi_token")
    localStorage.removeItem("mizizzi_refresh_token")
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_refresh_token")
    localStorage.removeItem("user")
    localStorage.removeItem("admin_user")
  }, [])

  // Update the handleSubmit function to better handle login and token storage
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Clear any existing tokens first to prevent conflicts
      localStorage.removeItem("mizizzi_token")
      localStorage.removeItem("mizizzi_refresh_token")
      localStorage.removeItem("mizizzi_csrf_token")
      localStorage.removeItem("admin_token")
      localStorage.removeItem("admin_refresh_token")
      localStorage.removeItem("user")

      // Use the API URL from environment variables
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      console.log(`Attempting login to ${apiUrl}/api/login with email: ${email}`)

      // Make direct fetch request to match the backend format exactly
      const response = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          identifier: email,
          password: password,
        }),
        credentials: "include",
      })

      console.log(`Login response status: ${response.status}`)

      // Get the response data
      const responseData = await response.json()
      console.log("Login response data:", responseData)

      if (!response.ok) {
        // Handle specific error status codes
        if (response.status === 401) {
          throw new Error("Invalid email or password")
        } else if (response.status === 403) {
          // Check for specific error messages in the response
          if (responseData.msg && responseData.msg.includes("verified")) {
            setShowVerification(true)
            setUserId(responseData.user_id || null)
            throw new Error(
              "This account needs to be verified. Please check your email for a verification link or code.",
            )
          } else if (responseData.msg && responseData.msg.includes("inactive")) {
            throw new Error("This account is inactive. Please contact the system administrator.")
          } else if (responseData.verification_required) {
            setShowVerification(true)
            setUserId(responseData.user_id || null)
            throw new Error("Email verification required. Please verify your email before logging in.")
          } else {
            throw new Error(responseData.msg || "Access forbidden. You may not have the required permissions.")
          }
        } else {
          throw new Error(responseData.msg || responseData.message || `Login failed with status: ${response.status}`)
        }
      }

      // Check if the user has admin role
      const userRole = responseData.user?.role
      const isAdmin =
        userRole === "admin" || userRole === "ADMIN" || (typeof userRole === "object" && userRole?.value === "admin")

      if (responseData.user && isAdmin) {
        console.log("Admin login successful:", responseData)

        // Store tokens in localStorage with better error handling
        if (responseData.access_token) {
          localStorage.setItem("mizizzi_token", responseData.access_token)
          localStorage.setItem("admin_token", responseData.access_token)
          console.log("✅ Access token stored")
        } else {
          throw new Error("No access token received from server")
        }

        if (responseData.refresh_token) {
          localStorage.setItem("mizizzi_refresh_token", responseData.refresh_token)
          localStorage.setItem("admin_refresh_token", responseData.refresh_token)
          console.log("✅ Refresh token stored")
        } else {
          console.warn("⚠️ No refresh token received - sessions may expire quickly")
        }

        if (responseData.csrf_token) {
          localStorage.setItem("mizizzi_csrf_token", responseData.csrf_token)
          console.log("✅ CSRF token stored")
        }

        // Store user data
        localStorage.setItem("user", JSON.stringify(responseData.user))
        localStorage.setItem("admin_user", JSON.stringify(responseData.user))
        console.log("✅ User data stored")

        // Clear any existing redirection flags
        sessionStorage.removeItem("auth_redirecting")

        // Get the intended destination
        const queryDestination = new URLSearchParams(window.location.search).get("from")
        const sessionDestination = sessionStorage.getItem("admin_redirect_after_login")
        const destination = queryDestination || sessionDestination || "/admin"

        // Clear the stored redirect path
        sessionStorage.removeItem("admin_redirect_after_login")

        console.log(`✅ Login successful, redirecting to: ${destination}`)
        router.push(destination)
      } else {
        // User doesn't have admin role
        throw new Error(
          "You don't have permission to access the admin area. This account doesn't have admin privileges.",
        )
      }
    } catch (err) {
      console.error("Login error:", err)
      setError((err as Error).message || "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (!verificationCode || !userId) {
      setError("Please enter the verification code")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          code: verificationCode.trim(),
          is_phone: false,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.msg || "Failed to verify code")
      }

      const data = await response.json()

      // Store tokens in localStorage
      if (data.access_token) {
        localStorage.setItem("mizizzi_token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("mizizzi_refresh_token", data.refresh_token)
      }
      if (data.csrf_token) {
        localStorage.setItem("mizizzi_csrf_token", data.csrf_token)
      }

      // Store user data
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user))
      }

      // Check if the user has admin role
      if (data.user && data.user.role === "admin") {
        // Redirect to admin dashboard
        router.push("/admin")
      } else {
        throw new Error("This account doesn't have admin privileges")
      }
    } catch (err) {
      console.error("Verification error:", err)
      setError((err as Error).message || "Failed to verify code")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendCode() {
    if (!email) {
      setError("Email is required to resend verification code")
      return
    }

    setSendingCode(true)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: email,
          }),
        },
      )

      if (response.ok) {
        setError("Verification email sent. Please check your inbox and follow the instructions.")
      } else {
        const data = await response.json().catch(() => ({}))
        setError(data.msg || "Failed to send verification email. Please try again later.")
      }
    } catch (err) {
      setError("Failed to send verification email. Please try again later.")
    } finally {
      setSendingCode(false)
    }
  }

  return (
    <div className="container relative flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left side: Promotional content */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-cherry-900">
          <Image
            src="https://images.unsplash.com/photo-1661956602868-6ae368943878?q=80&w=1470&auto=format&fit=crop"
            alt="Admin Dashboard Background"
            fill
            className="object-cover opacity-30 mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-cherry-950/90 via-cherry-900/80 to-cherry-800/70" />
        </div>

        <div className="relative z-20 flex items-center text-lg font-medium">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-white p-1 mr-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-xl font-bold tracking-tight">Mizizzi Admin</span>
        </div>

        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "The Mizizzi admin dashboard provides powerful tools to manage your e-commerce platform efficiently and
              effectively."
            </p>
            <footer className="text-sm">Mizizzi Management Team</footer>
          </blockquote>
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Admin Login</h1>
            <p className="text-sm text-muted-foreground">Enter your credentials to access the admin dashboard</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showVerification ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="verification-code" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="verification-code"
                  placeholder="Enter verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleVerifyCode}
                disabled={isLoading}
                className="w-full bg-cherry-600 hover:bg-cherry-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
              <Button variant="outline" onClick={handleResendCode} disabled={sendingCode} className="w-full">
                {sendingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                  </>
                ) : (
                  "Resend Verification Code"
                )}
              </Button>
              <Button variant="link" onClick={() => setShowVerification(false)} className="w-full">
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      autoCapitalize="none"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(checked as boolean)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </label>
                </div>
                <Button disabled={isLoading} className="bg-cherry-600 hover:bg-cherry-700">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </form>
          )}

          <div className="text-center text-sm">
            <Link href="/" className="font-medium text-cherry-600 hover:text-cherry-700">
              Return to Store
            </Link>
          </div>

          {/* Add admin credentials hint for development */}
          <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs text-gray-600">
            <p className="font-semibold">Admin Login Credentials:</p>
            <p>Email: REDACTED-SENDER-EMAIL</p>
            <p>Password: junior2020</p>
          </div>
        </div>
      </div>
    </div>
  )
}
