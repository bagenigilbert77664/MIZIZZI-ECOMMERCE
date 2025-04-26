"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { PasswordStrength } from "./password-strength"
import { checkPasswordStrength } from "@/lib/validations/auth"

interface RegisterStepProps {
  identifier: string
  onSubmit: (name: string, password: string) => void
  isLoading: boolean
  onBack: () => void
}

const registerFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export function RegisterStep({ identifier, onSubmit, isLoading, onBack }: RegisterStepProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [error, setError] = useState("")

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
      terms: false,
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
  }, [identifier])

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

  const handleSubmit = (data: z.infer<typeof registerFormSchema>) => {
    // Validate form
    if (!data.name.trim()) {
      setError("Please enter your name")
      return
    }

    if (data.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match")
      return
    }

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
                {!form.formState.errors.password && passwordStrength < 3 && (
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters
                  </p>
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

          {error && <p className="text-sm text-red-500">{error}</p>}

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
