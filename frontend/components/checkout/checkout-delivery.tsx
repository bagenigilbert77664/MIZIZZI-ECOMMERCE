"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, MapPin, Loader2 } from "lucide-react"
import { AddressForm } from "@/components/checkout/address-form"
import { addressService } from "@/services/address"
import type { Address, AddressFormValues } from "@/types/address"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface CheckoutDeliveryProps {
  onAddressSelect: (address: Address) => void
  selectedAddress: Address | null
}

export function CheckoutDelivery({ onAddressSelect, selectedAddress }: CheckoutDeliveryProps) {
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState<Address | null>(null)
  const { toast } = useToast()

  // Fetch the user's address on component mount
  useEffect(() => {
    const fetchAddress = async () => {
      setIsLoading(true)
      try {
        setError(null)

        // Get the user's address (default or first available)
        const fetchedAddress = await addressService.getOrCreateCheckoutAddress()

        if (fetchedAddress) {
          setAddress(fetchedAddress)
          onAddressSelect(fetchedAddress)
        } else {
          // Handle the case when no address is found
          setAddress(null)
          setShowAddressForm(true) // Show the form to create a new address
        }
      } catch (error: any) {
        console.error("Failed to fetch address:", error)
        if (error.message !== "No address found") {
          setError("Failed to load your address. Please try again.")
        }
        setAddress(null)
        setShowAddressForm(true) // Show the form on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddress()
  }, [onAddressSelect])

  const handleAddNewAddress = () => {
    setShowAddressForm(true)
  }

  const handleEditAddress = () => {
    setShowAddressForm(true)
  }

  const handleDeleteAddress = async () => {
    if (!address) return

    if (!confirm("Are you sure you want to delete this address?")) return

    try {
      setIsSubmitting(true)
      await addressService.deleteAddress(address.id)

      setAddress(null)
      onAddressSelect(null as any) // Clear selected address

      toast({
        title: "Address Deleted",
        description: "The address has been removed from your address book.",
      })
    } catch (error) {
      console.error("Failed to delete address:", error)
      toast({
        title: "Error",
        description: "Failed to delete address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelForm = () => {
    setShowAddressForm(false)
  }

  const handleSubmitAddress = async (data: AddressFormValues) => {
    setIsSubmitting(true)
    try {
      let updatedAddress: Address

      if (address) {
        // Update existing address
        updatedAddress = await addressService.updateAddress(address.id, data)
        toast({
          title: "Address Updated",
          description: "Your address has been updated successfully.",
        })
      } else {
        // Create new address
        updatedAddress = await addressService.createAddress(data)
        toast({
          title: "Address Added",
          description: "Your address has been added successfully.",
        })
      }

      // Update local state
      setAddress(updatedAddress)

      // Select the address
      onAddressSelect(updatedAddress)

      // Close the form
      setShowAddressForm(false)
    } catch (error) {
      console.error("Error saving address:", error)
      toast({
        title: "Error",
        description: "There was a problem saving your address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAddress = async (data: AddressFormValues) => {
    setIsSubmitting(true)
    try {
      const newAddress = await addressService.createAddress(data)
      setAddress(newAddress)
      onAddressSelect(newAddress)
      setShowAddressForm(false)
      toast({
        title: "Address Added",
        description: "Your address has been added successfully.",
      })
    } catch (error) {
      console.error("Error adding address:", error)
      toast({
        title: "Error",
        description: "Failed to add your address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Alert>
    )
  }

  if (showAddressForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{address ? "Edit Delivery Address" : "Add Delivery Address"}</h3>
          <Button variant="ghost" size="sm" onClick={handleCancelForm}>
            Cancel
          </Button>
        </div>

        <AddressForm
          initialValues={
            address
              ? {
                  ...address,
                  address_type:
                    address.address_type === "shipping" || address.address_type === "billing"
                      ? address.address_type
                      : undefined,
                }
              : undefined
          }
          onSubmit={handleSubmitAddress}
          isSubmitting={isSubmitting}
          submitLabel={address ? "Update Address" : "Save Address"}
          onCancel={handleCancelForm}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Delivery Address</h3>
      </div>

      {!isLoading && !address && !showAddressForm && (
        <div className="p-4 border rounded-md mb-4">
          <p className="text-gray-600 mb-4">No delivery address found. Please add one to continue.</p>
          <AddressForm onSubmit={handleAddAddress} isSubmitting={isSubmitting} submitLabel="Add Address" />
        </div>
      )}

      {address ? (
        <Card className="border border-gray-200 shadow-sm hover:border-red-200 transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-red-50 p-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {address.first_name} {address.last_name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {address.city} - {address.state}
                  </div>
                  <div className="text-sm text-gray-600">+{address.phone}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-amber-500"
                  onClick={handleEditAddress}
                  disabled={isSubmitting}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500"
                  onClick={handleDeleteAddress}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        !showAddressForm && (
          <div className="rounded-md border border-dashed border-red-200 p-6 text-center">
            <p className="text-gray-500 mb-4">You don't have any saved address yet.</p>
            <Button onClick={handleAddNewAddress} className="bg-red-600 hover:bg-red-700 text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Delivery Address
            </Button>
          </div>
        )
      )}
    </div>
  )
}
