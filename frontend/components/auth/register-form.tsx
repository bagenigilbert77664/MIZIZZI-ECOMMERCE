"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"
import { SuccessScreen } from "./success-screen"
import { LogoLoader } from "./logo-loader"
import { PasswordStrength } from "./password-strength"
import { registerSchema } from "../../lib/validations/auth"
import type { RegisterFormValues } from "../../lib/validations/auth"

export function RegisterForm() {
  const router = useRouter()
  const { register: registerUser } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [registeredUser, setRegisteredUser] = useState("")
  const [socialAuthLoading, setSocialAuthLoading] = useState<"google" | "facebook" | null>(null)
  const [showLogoLoader, setShowLogoLoader] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty, isValid },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const password = watch("password")

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clear any stored data when component unmounts
      localStorage.removeItem("registration_progress")
    }
  }, [])

  const handleSocialAuth = async (provider: "google" | "facebook") => {
    try {
      setSocialAuthLoading(provider)
      // TODO: Implement social auth logic here
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API call
      throw new Error("Social authentication is not implemented yet")
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to authenticate with social provider",
        variant: "destructive",
      })
    } finally {
      setSocialAuthLoading(null)
    }
  }

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true)

      // Show loading toast
      const loadingToast = toast({
        title: "Creating your account",
        description: "Please wait while we set everything up...",
      })

      // Format phone number (remove spaces and ensure international format)
      const formattedPhone = data.phone.startsWith("+") ? data.phone : `+${data.phone}`

      // Register user
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: formattedPhone,
      })

      // Dismiss loading toast
      loadingToast.dismiss()

      // Set user name for welcome screen
      setRegisteredUser(data.name.split(" ")[0])
      setShowSuccess(true)

      // Clear any stored progress
      localStorage.removeItem("registration_progress")
    } catch (error: any) {
      const errorMessage = error.message || "Registration failed. Please try again."

      if (errorMessage.includes("Email already registered")) {
        setError("email", {
          type: "manual",
          message: "This email is already registered",
        })
      } else if (errorMessage.includes("Phone number already registered")) {
        setError("phone", {
          type: "manual",
          message: "This phone number is already registered",
        })
      } else {
        toast({
          title: "Registration failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
      setIsLoading(false)
    }
  }

  const handleWelcomeComplete = () => {
    setShowLogoLoader(true)
    // Wait for logo loader animation before redirecting
    setTimeout(() => {
      router.push("/")
      // Show welcome toast after redirect
      toast({
        title: "Welcome to Mizizzi!",
        description: "Your account has been created successfully. Start exploring our collection!",
      })
    }, 2000)
  }

  // Store form progress
  useEffect(() => {
    if (isDirty) {
      const formData = watch()
      localStorage.setItem(
        "registration_progress",
        JSON.stringify({
          ...formData,
          password: "", // Don't store passwords
          confirmPassword: "",
        }),
      )
    }
  }, [watch, isDirty])

  // Show logo loader if active
  if (showLogoLoader) {
    return <LogoLoader onLoadingComplete={() => router.push("/")} />
  }

  // Show welcome screen if registration is successful
  if (showSuccess) {
    return <SuccessScreen username={registeredUser} onComplete={handleWelcomeComplete} />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create an account</h1>
        <p className="text-muted-foreground">Enter your information to create an account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="John Doe"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
            disabled={isLoading}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
            disabled={isLoading}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+254 700 000 000"
            {...register("phone")}
            className={errors.phone ? "border-red-500" : ""}
            disabled={isLoading}
          />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          <p className="text-xs text-muted-foreground">
            Enter your phone number in international format (e.g., +254 700 000 000)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Password
            <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password")}
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          <PasswordStrength password={password || ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            Confirm Password
            <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <Controller
            name="terms"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="terms"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLoading}
                aria-describedby="terms-error"
              />
            )}
          />
          <label htmlFor="terms" className={`text-sm font-medium leading-none ${errors.terms ? "text-red-500" : ""}`}>
            I agree to the{" "}
            <Link href="/terms" className="font-semibold text-cherry-600 hover:text-cherry-800 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-cherry-600 hover:text-cherry-800 hover:underline">
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.terms && (
          <p id="terms-error" className="text-xs text-red-500 mt-1">
            {errors.terms.message}
          </p>
        )}

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button type="submit" className="w-full bg-cherry-600 hover:bg-cherry-700" disabled={isLoading || !isValid}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </motion.div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          disabled={isLoading || !!socialAuthLoading}
          onClick={() => handleSocialAuth("google")}
        >
          {socialAuthLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Google"}
        </Button>
        <Button
          variant="outline"
          disabled={isLoading || !!socialAuthLoading}
          onClick={() => handleSocialAuth("facebook")}
        >
          {socialAuthLoading === "facebook" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Facebook"}
        </Button>
      </div>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-cherry-600 hover:text-cherry-800 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
