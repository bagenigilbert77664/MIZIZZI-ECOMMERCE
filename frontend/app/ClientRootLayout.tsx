"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error occurred:", {
      message: error.message || "Unknown error",
      stack: error.stack || "",
      digest: error.digest || "",
    })
  }, [error])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">Something went wrong!</h2>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
