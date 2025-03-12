"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"
import { LogoLoader } from "./logo-loader"
import { authService } from "@/services/auth"

// Validation schemas
const identifierSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
})

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
})

type IdentifierFormValues = z.infer<typeof identifierSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState<"identifier" | "password">("identifier")
  const [identifier, setIdentifier] = useState("")
  const [showLogoLoader, setShowLogoLoader] = useState(false)

  // Identifier form
  const {
    register: registerIdentifier,
    handleSubmit: handleSubmitIdentifier,
    formState: { errors: identifierErrors },
  } = useForm<IdentifierFormValues>({
    resolver: zodResolver(identifierSchema),
    defaultValues: {
      identifier: "",
    },
  })

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    setValue,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      remember: false,
    },
  })

  useEffect(() => {
    // Check for stored identifier (if user has started the login process)
    const storedIdentifier = authService.getStoredIdentifier()
    if (storedIdentifier) {
      setIdentifier(storedIdentifier)
      setCurrentStep("password")
    }
  }, [])

  const handleBack = () => {
    setCurrentStep("identifier")
    authService.clearStoredIdentifier()
  }

  const handleIdentifierSubmit = async (data: IdentifierFormValues) => {
    try {
      setIsLoading(true)
      const { requiresPassword } = await login(data.identifier)

      if (requiresPassword) {
        setIdentifier(data.identifier)
        setCurrentStep("password")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    try {
      setIsLoading(true)
      await login(identifier, data.password)

      // Show success animation
      setShowLogoLoader(true)

      // Wait for animation and redirect
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid password",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (showLogoLoader) {
    return <LogoLoader onLoadingComplete={() => router.push("/")} />
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 bg-cherry-50 rounded-full flex items-center justify-center">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === "identifier" ? (
            <motion.div
              key="identifier"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              <h1 className="text-2xl font-semibold">Welcome to Mizizzi</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Type your e-mail or phone number to log in or create a Mizizzi account.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-2"
            >
              <h1 className="text-2xl font-semibold">Welcome back!</h1>
              <p className="text-muted-foreground mt-2 text-sm">Log back into your Mizizzi account.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {currentStep === "identifier" ? (
          <motion.form
            key="identifier-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmitIdentifier(handleIdentifierSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email or Mobile Number<span className="text-red-500">*</span>
              </label>
              <Input
                id="identifier"
                placeholder="name@example.com or +123456789"
                {...registerIdentifier("identifier")}
                className={`border-2 h-12 text-base ${
                  identifierErrors.identifier ? "border-red-500" : "border-gray-300 focus:border-cherry-500"
                }`}
                disabled={isLoading}
              />
              {identifierErrors.identifier && (
                <p className="text-xs text-red-500">{identifierErrors.identifier.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-cherry-600 hover:bg-cherry-700 text-white font-semibold text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking...
                </>
              ) : (
                "Continue"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By continuing you agree to Mizizzi&apos;s{" "}
              <Link href="/terms" className="text-cherry-600 hover:underline">
                Terms and Conditions
              </Link>
            </p>
          </motion.form>
        ) : (
          <motion.form
            key="password-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmitPassword(handlePasswordSubmit)}
            className="space-y-4"
          >
            <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">{identifier}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-cherry-600 hover:text-cherry-700 text-sm"
              >
                Edit
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Password<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...registerPassword("password")}
                  className={`border-2 h-12 text-base ${
                    passwordErrors.password ? "border-red-500" : "border-gray-300 focus:border-cherry-500"
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordErrors.password && <p className="text-xs text-red-500">{passwordErrors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-cherry-600 hover:bg-cherry-700 text-white font-semibold text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <Link
              href="/auth/forgot-password"
              className="block text-center text-sm text-cherry-600 hover:text-cherry-700 hover:underline"
            >
              Forgot your password?
            </Link>
          </motion.form>
        )}
      </AnimatePresence>

      {currentStep === "identifier" && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link href="/auth/register">
            <Button
              variant="outline"
              className="w-full h-12 border-2 border-cherry-600 text-cherry-600 hover:bg-cherry-50"
            >
              Create a New Account
            </Button>
          </Link>
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          For further support, you may visit our{" "}
          <Link href="/help" className="text-cherry-600 hover:text-cherry-700 hover:underline">
            Help Center
          </Link>{" "}
          or contact our customer service team.
        </p>
      </div>
    </div>
  )
}

