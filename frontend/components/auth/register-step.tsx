"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { PasswordStrength } from "./password-strength"
import { checkPasswordStrength, registerSchema } from "@/lib/validations/auth" // Import registerSchema

interface RegisterStepProps {
  identifier: string
  onSubmit: (name: string, password: string) => void
  isLoading: boolean
  onBack: () => void
}

export function RegisterStep({ identifier, onSubmit, isLoading, onBack }: RegisterStepProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
      terms: false,
      // Set email or phone based on identifier
      email: identifier.includes("@") ? identifier : "",
      phone: !identifier.includes("@") ? identifier : "",
    },
    mode: "onChange", // Add this to enable real-time validation
  })

  // Load saved form data if available
  useEffect(() => {
    const savedData = localStorage.getItem("register_form_data")
    if (savedData) {
      try {
        const data = JSON.parse(savedData)
        if (data.identifier === identifier) {
          form.setValue("name", data.name || "")
          // Don't restore password for security reasons
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, [identifier, form]) // Added form to dependency array

  // Save form data when it changes
  useEffect(() => {
    if (form.getValues("name")) {
      localStorage.setItem(
        "register_form_data",
        JSON.stringify({
          identifier,
          name: form.getValues("name"),
          // Don't save password for security reasons
        }),
      )
    }
  }, [identifier, form.getValues("name")])

  const handleSubmit = (data: z.infer<typeof registerSchema>) => {
    // Zod resolver handles validation, so we can directly call onSubmit
    // Clear saved form data
    localStorage.removeItem("register_form_data")
    onSubmit(data.name, data.password)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value
    form.setValue("password", password)
    setPasswordStrength(checkPasswordStrength(password))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Your {identifier.includes("@") ? "email" : "phone"} has been verified
        </p>
      </div>

      <div className="bg-muted/50 p-2 rounded-md flex items-center justify-between">
        <span className="text-sm font-medium truncate">{identifier}</span>
        {onBack && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onBack}>
            <ArrowLeft className="mr-1 h-3 w-3" />
            Change
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-cherry-700 font-medium">Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
                {!form.formState.errors.name && (
                  <p className="text-xs text-muted-foreground">
                    Enter your full name as it appears on official documents
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-cherry-700 font-medium">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Create a password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...field}
                      onChange={handlePasswordChange}
                      className={form.formState.errors.password ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <PasswordStrength strength={passwordStrength} />
                <FormMessage className="text-xs" />
                {/* Display password requirements based on validation */}
                {!form.formState.errors.password && passwordStrength < 5 && (
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    <li>At least 8 characters long</li>
                    <li>Contains at least one number</li>
                    <li>Contains at least one uppercase letter</li>
                    <li>Contains at least one lowercase letter</li>
                    <li>Contains at least one special character</li>
                  </ul>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-cherry-700 font-medium">Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Confirm your password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
                {!form.formState.errors.confirmPassword && (
                  <p className="text-xs text-muted-foreground">Re-enter your password to confirm</p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-3 border">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-xs">
                    I agree to the{" "}
                    <a href="/terms" className="text-primary hover:underline">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </a>
                  </FormLabel>
                  <FormMessage className="text-xs" />
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-14 text-lg font-medium" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
