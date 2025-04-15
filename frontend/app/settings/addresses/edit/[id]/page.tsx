"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddressForm } from "@/components/checkout/address-form"
import { addressService } from "@/services/address"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import type { Address, AddressFormValues } from "@/types/address"

export default function EditAddressPage() {
  const [address, setAddress] = useState<Address | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const addressId = params.id as string

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        setIsLoading(true)
        const data = await addressService.getAddress(addressId)
        setAddress(data)
      } catch (error) {
        console.error("Failed to fetch address:", error)
        toast({
          title: "Error",
          description: "Failed to load address details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (addressId) {
      fetchAddress()
    }
  }, [addressId, toast])

  const handleSubmit = async (data: AddressFormValues) => {
    try {
      setIsSubmitting(true)
      await addressService.updateAddress(addressId, data)

      toast({
        title: "Address Updated",
        description: "Your address has been updated successfully.",
      })

      // Redirect back to checkout if coming from there, otherwise to address list
      const referrer = document.referrer
      if (referrer && referrer.includes("/checkout")) {
        router.push("/checkout")
      } else {
        router.push("/settings/addresses")
      }
    } catch (error: any) {
      console.error("Error updating address:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading address details...</p>
        </div>
      </div>
    )
  }

  if (!address) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Address not found.</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
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
          <CardTitle className="text-2xl">Edit Address</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressForm
            initialValues={address}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Update Address"
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  )
}
