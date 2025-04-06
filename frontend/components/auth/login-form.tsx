"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Eye, EyeOff, AlertCircle, LogIn, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/auth/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginSchema } from "@/lib/validations/auth"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams ? searchParams.get("redirect") || "/" : "/"
  const sessionExpired = searchParams ? searchParams.get("session") === "expired" : false

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 2

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
    mode: "onChange",
  })

  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100

  // Function to handle next step
  const handleNextStep = async () => {
    let canProceed = false

    // Validate current step fields before proceeding
    switch (currentStep) {
      case 1:
        canProceed = await trigger("email")
        break
      case 2:
        canProceed = await trigger("password")
        break
    }

    if (canProceed) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  // Function to handle previous step
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Add a debug mode flag at the top of the component
  const DEBUG_MODE = false // Set to false in production

  // Modify the onSubmit function to include more detailed debugging
  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    setError(null)

    if (DEBUG_MODE) {
      console.log("Login attempt with:", { email: data.email, remember: data.remember })
    }

    try {
      // First, try to get a CSRF token
      try {
        const csrfResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/csrf`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          },
        )

        if (DEBUG_MODE) {
          console.log("CSRF token response status:", csrfResponse.status)
          const csrfData = await csrfResponse.clone().json()
          console.log("CSRF token response:", csrfData)
        }
      } catch (csrfError) {
        console.log("CSRF preflight request failed, continuing with login attempt", csrfError)
        // Continue with login attempt even if CSRF request fails
      }

      // Now attempt login
      await login(data.email, data.password, data.remember)

      // Show success state briefly before redirect
      setLoginSuccess(true)

      // The auth context will handle the redirect after a brief delay
      setTimeout(() => {
        router.push(redirect)
      }, 1000)
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in")
      setIsLoading(false)
      // If login fails, go back to the first step
      setCurrentStep(1)
    }
  }

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  }

  if (loginSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center text-center py-12"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, type: "spring" }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Successful!</h2>
        <p className="text-gray-600 mb-4">Welcome back to Mizizzi</p>
        <div className="w-full max-w-xs mx-auto">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8 }}
              className="h-full bg-cherry-600 rounded-full"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">Redirecting to your dashboard...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header with logo */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 mr-3 shadow-lg">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
            alt="Mizizzi Logo"
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <span className="text-2xl font-bold tracking-tight text-cherry-900">Mizizzi</span>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2 bg-gray-100" indicatorClassName="bg-cherry-600" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-4 mb-8">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep > index + 1
                ? "bg-cherry-600 text-white"
                : currentStep === index + 1
                  ? "bg-cherry-100 text-cherry-800 border-2 border-cherry-600"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {currentStep > index + 1 ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </div>
        ))}
      </div>

      {sessionExpired && (
        <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Your session has expired. Please log in again to continue.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
          <AlertDescription className="text-red-800">
            {error.includes("credentials") ? "Invalid email or password. Please try again." : error}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Email */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
                <p className="text-gray-600">Sign in to your account to continue</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                  Email Address
                </Label>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  {...register("email")}
                  className={`${errors.email ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} h-12 rounded-lg shadow-sm transition-colors duration-200`}
                />
                {errors?.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/register"
                    className="font-medium text-cherry-700 hover:text-cherry-800 transition-colors"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Password */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter your password</h2>
                <p className="text-gray-600">Hello, {getValues("email")}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 block">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-medium text-cherry-700 hover:text-cherry-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    disabled={isLoading}
                    {...register("password")}
                    className={`${errors.password ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} pr-10 h-12 rounded-lg shadow-sm transition-colors duration-200`}
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
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors?.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  {...register("remember")}
                  className="text-cherry-700 border-gray-300 rounded focus:ring-cherry-500"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex-1 h-12 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" /> Sign In
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  )
}

