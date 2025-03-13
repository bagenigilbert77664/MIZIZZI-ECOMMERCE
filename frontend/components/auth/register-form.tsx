"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Check, AlertCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"
import { registerSchema, validatePasswordRequirements } from "@/lib/validations/auth"
import type { RegisterFormValues } from "@/lib/validations/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function RegisterForm() {
  const router = useRouter()
  const { register: registerUser } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    setError: setFormError,
    clearErrors,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  })

  const password = watch("password", "")
  const { requirements } = validatePasswordRequirements(password)

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true)
      setError(null)
      clearErrors()

      // Format phone number (ensure international format)
      const formattedPhone = data.phone?.startsWith("+") ? data.phone : `+${data.phone}`

      // Prepare the data for the backend
      const userData = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: formattedPhone,
      }

      await registerUser(userData)

      // The auth context will handle the redirect and toast
    } catch (err: any) {
      console.error("Registration error:", err)

      if (err.field === "email") {
        setFormError("email", {
          type: "manual",
          message: err.message,
        })
      } else if (err.field === "phone") {
        setFormError("phone", {
          type: "manual",
          message: err.message,
        })
      } else {
        setError(err.message || "Registration failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Enter your information below to create your account</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="name"
            placeholder="John Doe"
            autoComplete="name"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
            disabled={isLoading}
            aria-invalid={errors.name ? "true" : "false"}
          />
          {errors.name && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
            disabled={isLoading}
            aria-invalid={errors.email ? "true" : "false"}
          />
          {errors.email && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+254700000000"
            autoComplete="tel"
            {...register("phone")}
            className={errors.phone ? "border-red-500" : ""}
            disabled={isLoading}
            aria-invalid={errors.phone ? "true" : "false"}
          />
          {errors.phone && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.phone.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter your phone number in international format (e.g., +254700000000)
          </p>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">
            Password
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password")}
              className={errors.password ? "border-red-500 pr-10" : "pr-10"}
              disabled={isLoading}
              aria-invalid={errors.password ? "true" : "false"}
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
          {errors.password && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.password.message}
            </p>
          )}

          {/* Password Requirements */}
          <div className="space-y-2 rounded-md border p-4">
            <p className="text-sm font-medium">Password Requirements:</p>
            <div className="grid gap-2">
              {requirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={req.met ? "text-green-500" : "text-muted-foreground"}>{req.requirement}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            Confirm Password
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
              disabled={isLoading}
              aria-invalid={errors.confirmPassword ? "true" : "false"}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={watch("terms") || false}
              onCheckedChange={(checked) => {
                // Convert the checked value to a boolean
                const boolValue = checked === true
                // Update the form value
                setValue("terms", boolValue, { shouldValidate: true })
              }}
              disabled={isLoading}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm leading-tight">
              I agree to the{" "}
              <Link
                href="/terms"
                className="font-medium text-cherry-600 underline underline-offset-4 hover:text-cherry-700"
              >
                terms and conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-cherry-600 underline underline-offset-4 hover:text-cherry-700"
              >
                privacy policy
              </Link>
            </Label>
          </div>
          {errors.terms && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.terms.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading || !isValid} aria-disabled={isLoading || !isValid}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-cherry-600 underline underline-offset-4 hover:text-cherry-700"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}

