"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import Image from "next/image"
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authService } from "@/services/auth"

// Form schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true)
    setError(null)
    setEmail(data.email)

    try {
      await authService.forgotPassword(data.email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cherry-950 overflow-hidden relative flex items-center justify-center">
        {/* Background elements */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-04-09%2009-17-02-BQXMGELSvRMZnOdcW9r3N4cdzJNNHy.png"
            alt="Luxury Background"
            fill
            className="object-cover opacity-20 mix-blend-overlay"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-cherry-950/95 via-cherry-950/90 to-cherry-900/85" />
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto p-8">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden border border-white/70 p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a password reset link to <span className="font-medium">{email}</span>. Please check your inbox
              and follow the instructions.
            </p>

            <div className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/auth/login">Return to login</Link>
              </Button>

              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or{" "}
                <button onClick={() => setSuccess(false)} className="text-cherry-700 hover:text-cherry-800 font-medium">
                  try again
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cherry-950 overflow-hidden relative flex items-center justify-center">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-04-09%2009-17-02-BQXMGELSvRMZnOdcW9r3N4cdzJNNHy.png"
          alt="Luxury Background"
          fill
          className="object-cover opacity-20 mix-blend-overlay"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cherry-950/95 via-cherry-950/90 to-cherry-900/85" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto p-8">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden border border-white/70 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cherry-50 to-white p-2 mr-3 shadow-lg border border-cherry-100">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                alt="Mizizzi Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-cherry-900">Mizizzi</span>
              <span className="text-sm text-cherry-600/70">Password Recovery</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot your password?</h2>
            <p className="text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50 rounded-xl">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={isLoading}
                  {...register("email")}
                  className={`${errors.email ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} h-12 rounded-xl shadow-sm transition-colors duration-200 pl-12`}
                />
                <div className="absolute left-0 top-0 h-full flex items-center justify-center w-12 text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
              </div>
              {errors?.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                asChild
                variant="outline"
                className="flex-1 h-12 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl shadow-sm transition-all duration-300"
              >
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12 bg-gradient-to-r from-cherry-700 to-cherry-800 hover:from-cherry-800 hover:to-cherry-900 text-white font-medium rounded-xl shadow-sm transition-all duration-300 hover:shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
