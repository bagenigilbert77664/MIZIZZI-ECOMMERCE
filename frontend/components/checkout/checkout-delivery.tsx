"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2, MapPin, Loader2, CheckCircle2, Home, ArrowRight, Phone } from "lucide-react"
import { AddressForm } from "@/components/checkout/address-form"
import { addressService } from "@/services/address"
import type { Address, AddressFormValues } from "@/types/address"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { AddressBook } from "@/components/checkout/address-book"
import { Badge } from "@/components/ui/badge"

interface CheckoutDeliveryProps {
  onAddressSelect: (address: Address) => void
  selectedAddress: Address | null
  onContinue?: () => void
}

export function CheckoutDelivery({ onAddressSelect, selectedAddress, onContinue }: CheckoutDeliveryProps) {
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState<Address | null>(null)
  const [showAddressBook, setShowAddressBook] = useState(false)
  const { toast } = useToast()

  // Fetch the user's address on component mount
  useEffect(() => {
    const fetchAddress = async () => {
      setIsLoading(true)
      try {
        setError(null)

        // Get the user's address (default or first available)
        const fetchedAddress = await addressService.getAddressForCheckout()

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
    setShowAddressBook(false)
  }

  const handleEditAddress = () => {
    setShowAddressForm(true)
    setShowAddressBook(false)
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

  const handleAddressSelect = (selectedAddress: Address) => {
    setAddress(selectedAddress)
    onAddressSelect(selectedAddress)
    setShowAddressBook(false)

    // Set this address as default in the database
    addressService
      .setDefaultAddress(selectedAddress.id)
      .then(() => {
        toast({
          title: "Delivery Address Set",
          description: "Your selected address will be used for delivery.",
        })
      })
      .catch((error) => {
        console.error("Error setting default address:", error)
      })
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

  if (showAddressBook) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Select Delivery Address</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowAddressBook(false)}>
            Back
          </Button>
        </div>

        <AddressBook onAddressSelect={handleAddressSelect} selectedAddress={selectedAddress} />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Delivery Address</h3>
        {address && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddressBook(true)}
            className="text-cherry-600 border-cherry-200 hover:bg-cherry-50"
          >
            <Home className="mr-2 h-4 w-4" />
            Address Book
          </Button>
        )}
      </div>

      {!isLoading && !address && !showAddressForm && (
        <div className="p-4 border rounded-md mb-4">
          <p className="text-gray-600 mb-4">No delivery address found. Please add one to continue.</p>
          <AddressForm onSubmit={handleAddAddress} isSubmitting={isSubmitting} submitLabel="Add Address" />
        </div>
      )}

      {address ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-cherry-700 to-cherry-800 py-3 px-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Delivery Location</span>
                  {address.is_default && <Badge className="bg-white/20 text-white border-none text-xs">Default</Badge>}
                </div>
                <Badge variant="outline" className="capitalize text-xs bg-white/10 text-white border-white/20">
                  {address.address_type}
                </Badge>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-cherry-50 p-3 mt-1">
                      <MapPin className="h-5 w-5 text-cherry-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center">
                        {address.first_name} {address.last_name}
                        <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p>{address.address_line1}</p>
                        {address.address_line2 && <p>{address.address_line2}</p>}
                        <p>
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                        <p>{address.country}</p>
                        <div className="flex items-center text-cherry-700 font-medium pt-1">
                          <Phone className="h-3.5 w-3.5 mr-1.5" />
                          {address.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                      onClick={handleEditAddress}
                      disabled={isSubmitting}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={handleDeleteAddress}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5" />
                      <span>Address confirmed for delivery</span>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-cherry-600 hover:bg-cherry-700 text-white text-sm rounded-md h-10"
                      onClick={() => setShowAddressBook(true)}
                    >
                      Change
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        !showAddressForm && (
          <div className="rounded-md border border-dashed border-cherry-200 p-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-cherry-50 flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-cherry-500" />
            </div>
            <p className="text-gray-500 mb-4">You don't have any saved address yet.</p>
            <Button onClick={handleAddNewAddress} className="bg-cherry-600 hover:bg-cherry-700 text-white">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Delivery Address
            </Button>
          </div>
        )
      )}
      {selectedAddress && onContinue && (
        <div className="mt-6 flex justify-end">
          <Button
            onClick={onContinue}
            className="bg-cherry-600 hover:bg-cherry-700 text-white h-12 text-sm font-medium rounded-md"
          >
            Continue to Payment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  )
}
