"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    // Here you would handle sign out logic
    // For now, just redirect to home
    router.push("/")
  }, [router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p>Signing out...</p>
    </div>
  )
}

