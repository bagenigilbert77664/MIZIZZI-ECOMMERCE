"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.id as string | undefined

  useEffect(() => {
    if (orderId) {
      router.replace(`/account?tab=order-details&id=${orderId}`)
    }
  }, [orderId, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-sm text-gray-600">Redirecting to order details...</p>
      </div>
    </div>
  )
}
