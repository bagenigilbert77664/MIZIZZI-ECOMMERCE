"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function OrdersPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/account?tab=orders")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        <p className="mt-4 text-gray-600">Redirecting to your account...</p>
      </div>
    </div>
  )
}
