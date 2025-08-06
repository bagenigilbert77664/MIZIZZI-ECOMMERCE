"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"

export default function AdminVerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [sendingCode, setSendingCode] = useState(false)

  useEffect(() => {
    // Get userId and email from URL params
    const userIdParam = searchParams?.get("userId") || null
    const emailParam = searchParams?.get("email") || null
    const codeParam = searchParams?.get("code") || null

    if (userIdParam) {
      setUserId(userIdParam)
    }

    if (emailParam) {
      setEmail(emailParam)
    }

    if (codeParam) {
      setVerificationCode(codeParam)
      // Auto-verify if code is provided in URL
      if (userIdParam && codeParam) {
        handleVerifyCode(userIdParam, codeParam)
      }
    }
  }, [searchParams])

  async function handleVerifyCode(userIdToUse = userId, codeToUse = verificationCode) {
    if (!codeToUse || !userIdToUse) {
      setError("Please enter the verification code")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userIdToUse,
          code: codeToUse.trim(),
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

      setSuccess("Account verified successfully!")

      // Check if the user has admin role
      if (data.user && data.user.role === "admin") {
        // Show success message and redirect after a delay
        setTimeout(() => {
          router.push("/admin")
        }, 2000)
      } else {
        throw new Error("This account doesn't have admin privileges")
      }
    } catch (err: any) {
      console.error("Verification error:", err)
      setError(err instanceof Error ? err.message : "Failed to verify code")
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
    setSuccess(null)

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
        const data = await response.json()
        if (data.user_id) {
          setUserId(data.user_id)
        }
        setSuccess("Verification email sent. Please check your inbox for the code.")
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
    <div className="container flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-cherry-100 p-2">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Account Verification</h1>
          <p className="text-sm text-muted-foreground">
            Enter the verification code sent to your email to verify your admin account
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="mb-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {!email && (
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                placeholder="Enter your email"
                type="email"
                value={email || ""}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || sendingCode}
              />
            </div>
          )}

          <div className="grid gap-2">
            <label htmlFor="verification-code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="verification-code"
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={isLoading || sendingCode}
            />
          </div>

          <Button
            onClick={() => handleVerifyCode()}
            disabled={isLoading || sendingCode}
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

          <Button
            variant="outline"
            onClick={handleResendCode}
            disabled={isLoading || sendingCode || !email}
            className="w-full"
          >
            {sendingCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              "Resend Verification Code"
            )}
          </Button>

          <div className="text-center text-sm">
            <Link href="/admin/login" className="font-medium text-cherry-600 hover:text-cherry-700">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
