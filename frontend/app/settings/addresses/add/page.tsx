"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddressForm } from "@/components/checkout/address-form"
import { addressService } from "@/services/address"
import { useToast } from "@/styles/hooks/use-toast"
import Link from "next/link"
import type { AddressFormValues } from "@/types/address"

export default function AddAddressPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (data: AddressFormValues) => {
    try {
      setIsSubmitting(true)
      await addressService.createAddress(data)

      toast({
        title: "Address Added",
        description: "Your new address has been saved successfully.",
      })

      // Redirect back to checkout if coming from there, otherwise to address list
      const referrer = document.referrer
      if (referrer && referrer.includes("/checkout")) {
        router.push("/checkout")
      } else {
        router.push("/settings/addresses")
      }
    } catch (error: any) {
      console.error("Error adding address:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()} asChild>
        <Link href="/checkout" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Add New Address</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Save Address"
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
