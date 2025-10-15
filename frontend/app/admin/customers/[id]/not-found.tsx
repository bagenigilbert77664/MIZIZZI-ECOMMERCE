"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CustomerNotFound() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold mb-4">Customer Not Found</h2>
      <p className="text-muted-foreground mb-4">The customer you're looking for doesn't exist.</p>
      <Button onClick={() => router.push("/admin/customers")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Customers
      </Button>
    </div>
  )
}
