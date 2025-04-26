"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { passwordSchema } from "@/lib/validations/auth"
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PasswordStepProps {
  identifier: string
  onSubmit: (password: string) => void
  isLoading: boolean
  onBack?: () => void
}

export function PasswordStep({ identifier, onSubmit, isLoading, onBack }: PasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
    mode: "onChange", // Add this to enable real-time validation
  })

  const handleSubmit = (data: z.infer<typeof passwordSchema>) => {
    onSubmit(data.password)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Enter password</h1>
        <p className="text-sm text-muted-foreground">Welcome back! Please enter your password.</p>
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-cherry-700 font-medium">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      {...field}
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
                <FormMessage className="text-xs" />
                {!form.formState.errors.password && (
                  <p className="text-xs text-muted-foreground">Enter your password to sign in</p>
                )}
              </FormItem>
            )}
          />

          <div className="text-xs text-right">
            <Link href="/auth/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full h-14 text-lg font-medium" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
