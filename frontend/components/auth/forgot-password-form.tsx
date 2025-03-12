"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const router = useRouter()
  const { forgotPassword } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setIsLoading(true)
      await forgotPassword(data.email)
      setSubmittedEmail(data.email)
      setIsSubmitted(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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

        {!isSubmitted ? (
          <>
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-semibold">Check your email</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              We've sent password reset instructions to <span className="font-medium">{submittedEmail}</span>
            </p>
          </>
        )}
      </div>

      {!isSubmitted ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Email Address<span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              className={`border-2 h-12 text-base ${
                errors.email ? "border-red-500" : "border-gray-300 focus:border-cherry-500"
              }`}
              disabled={isLoading}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-cherry-600 hover:bg-cherry-700 text-white font-semibold text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-center">
            Didn't receive the email? Check your spam folder or{" "}
            <button onClick={() => setIsSubmitted(false)} className="text-cherry-600 hover:underline font-medium">
              try again
            </button>
          </p>

          <Button
            variant="outline"
            className="w-full h-12 border-2 border-cherry-600 text-cherry-600 hover:bg-cherry-50"
            onClick={() => router.push("/auth/login")}
          >
            Back to Login
          </Button>
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/auth/login" className="inline-flex items-center text-sm text-cherry-600 hover:text-cherry-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}

