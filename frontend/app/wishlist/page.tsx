"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function WishlistPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to account page with wishlist tab
    router.replace("/account?tab=wishlist")
  }, [router])

  return null
}
