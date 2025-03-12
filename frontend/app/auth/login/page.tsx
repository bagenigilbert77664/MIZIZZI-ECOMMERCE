"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/contexts/auth/auth-context"
import { Loader } from "@/components/ui/loader"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <Loader />
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-full max-w-md mx-auto">
          <LoginForm />
        </div>

        <div className="mt-6 text-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
            alt="Mizizzi"
            width={120}
            height={40}
            className="h-8 w-auto mx-auto"
          />
        </div>
      </div>
    )
  }

  return null
}

