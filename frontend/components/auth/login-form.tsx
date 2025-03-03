"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"
import { LogoLoader } from "./logo-loader"
import { loginSchema } from "@/lib/validations/auth"
import type { LoginFormValues } from "@/lib/validations/auth"

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [socialAuthLoading, setSocialAuthLoading] = useState<"google" | "facebook" | null>(null)
  const [showLogoLoader, setShowLogoLoader] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  })

  useEffect(() => {
    // Check for remembered email
    const rememberedEmail = localStorage.getItem("mizizzi_remembered_email")
    if (rememberedEmail) {
      setValue("email", rememberedEmail)
      setValue("remember", true)
    }
  }, [setValue])

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

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true)

      // Show loading toast
      const loadingToast = toast({
        title: "Signing in",
        description: "Please wait while we verify your credentials...",
      })

      await login(data.email, data.password, data.remember)

      // Handle remember me
      if (data.remember) {
        localStorage.setItem("mizizzi_remembered_email", data.email)
      } else {
        localStorage.removeItem("mizizzi_remembered_email")
      }

      // Dismiss loading toast
      loadingToast.dismiss()

      // Show logo loader
      setShowLogoLoader(true)

      // Wait for logo loader animation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      })

      router.push("/")
    } catch (error: any) {
      const errorMessage = error.message || "Invalid email or password"

      if (errorMessage.includes("Invalid email or password")) {
        setError("password", {
          type: "manual",
          message: "Invalid email or password combination",
        })
      } else if (errorMessage.includes("Account not verified")) {
        toast({
          title: "Account not verified",
          description: "Please check your email for verification instructions.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (showLogoLoader) {
    return <LogoLoader onLoadingComplete={() => router.push("/")} />
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">Enter your credentials to access your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">
              Password
              <span className="text-red-500">*</span>
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-cherry-600 hover:text-cherry-800 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox id="remember" {...register("remember")} disabled={isLoading} />
          <label
            htmlFor="remember"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me
          </label>
        </div>

        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button type="submit" className="w-full bg-cherry-600 hover:bg-cherry-700" disabled={isLoading || !isValid}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
              </>
            ) : (
              "Sign In"
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
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-semibold text-cherry-600 hover:text-cherry-800 hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}

