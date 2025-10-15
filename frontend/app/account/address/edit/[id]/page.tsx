"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addressService } from "@/services/address"
import AddressForm from "@/components/checkout/address-form"
import type { Address, AddressFormValues } from "@/types/address"

export default function EditAddressPage() {
  const router = useRouter()
  const params = useParams()
  const addressId = params?.id ? Number.parseInt(params.id as string) : null
  const { toast } = useToast()

  const [address, setAddress] = useState<Address | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAddress = async () => {
      if (!addressId) {
        setError("Invalid address ID")
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const addressData = await addressService.getAddress(addressId)
        setAddress(addressData)
      } catch (error) {
        console.error("Failed to fetch address:", error)
        setError("Failed to load address. Please try again.")
        toast({
          title: "Error",
          description: "Failed to load address details.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddress()
  }, [addressId, toast])

  const handleSubmit = async (data: AddressFormValues) => {
    if (!addressId) return

    try {
      setIsSubmitting(true)
      setError(null)

      await addressService.updateAddress(addressId, data)

      toast({
        title: "Address Updated",
        description: "Your address has been updated successfully.",
      })

      // Navigate back to address book
      router.push("/account?tab=address")
    } catch (error) {
      console.error("Failed to update address:", error)
      setError("Failed to update address. Please try again.")
      toast({
        title: "Error",
        description: "Failed to update address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push("/account?tab=address")
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cherry-900" />
            <span className="ml-2 text-gray-600">Loading address...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error && !address) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Address Book
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container px-4 md:px-6 max-w-3xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Address Book
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Address</h1>
          <p className="text-sm text-gray-500 mt-1">Update your delivery address information</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Address Form Card */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-100 bg-white">
            <CardTitle className="text-lg font-semibold text-gray-800">Address Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 bg-white">
            {address && (
              <AddressForm
                initialValues={{
                  ...address,
                  address_type: (["shipping", "billing", "both"] as const).includes(address.address_type as any)
                    ? (address.address_type as "shipping" | "billing" | "both")
                    : "shipping",
                }}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                submitLabel="Save Address"
                showAddressType={false}
                onCancel={handleCancel}
              />
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          <p>Make sure your address is complete and accurate for successful delivery.</p>
        </div>
      </div>
    </div>
  )
}
