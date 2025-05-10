"use client"

import { useState, useEffect } from "react"
import { PlusCircle, Edit, Trash2, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AddressForm } from "@/components/checkout/address-form"
import type { Address, AddressFormValues } from "@/types/address"
import axios from "axios"

interface AddressBookProps {
  onAddressSelect: (address: Address) => void
  selectedAddress?: Address | null
}

export function AddressBook({ onAddressSelect, selectedAddress }: AddressBookProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const { toast } = useToast()

  // Fetch addresses on component mount
  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses`, {
        headers: {
          "Content-Type": "application/json",
          // Include authorization if needed
          // "Authorization": `Bearer ${token}`
        },
      })

      setAddresses(response.data.items || [])
    } catch (err: any) {
      console.error("Error fetching addresses:", err)
      setError(
        err.response?.data?.error || err.response?.data?.message || "Failed to load addresses. Please try again.",
      )

      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem loading your addresses.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddressSubmit = async (data: AddressFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (editingAddress) {
        // Update existing address
        const response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses/${editingAddress.id}`,
          data,
          {
            headers: {
              "Content-Type": "application/json",
              // Include authorization if needed
              // "Authorization": `Bearer ${token}`
            },
          },
        )

        toast({
          title: "Address updated",
          description: "Your address has been updated successfully.",
        })

        // Update addresses list
        setAddresses((prevAddresses) =>
          prevAddresses.map((addr) => (addr.id === editingAddress.id ? response.data.address : addr)),
        )

        // If this was the selected address, update it
        if (selectedAddress?.id === editingAddress.id) {
          onAddressSelect(response.data.address)
        }
      } else {
        // Create new address
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses`,
          data,
          {
            headers: {
              "Content-Type": "application/json",
              // Include authorization if needed
              // "Authorization": `Bearer ${token}`
            },
          },
        )

        toast({
          title: "Address added",
          description: "Your new address has been added successfully.",
        })

        // Add to addresses list
        setAddresses((prevAddresses) => [...prevAddresses, response.data.address])

        // Select the new address if no address was selected before
        if (!selectedAddress) {
          onAddressSelect(response.data.address)
        }
      }

      // Close the form
      setIsAddressFormOpen(false)
      setEditingAddress(null)
    } catch (err: any) {
      console.error("Error saving address:", err)
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to save address. Please try again.")

      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem saving your address.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm("Are you sure you want to delete this address?")) {
      return
    }

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses/${addressId}`, {
        headers: {
          "Content-Type": "application/json",
          // Include authorization if needed
          // "Authorization": `Bearer ${token}`
        },
      })

      toast({
        title: "Address deleted",
        description: "Your address has been deleted successfully.",
      })

      // Remove from addresses list
      setAddresses((prevAddresses) => prevAddresses.filter((addr) => addr.id !== addressId))

      // If this was the selected address, clear selection
      if (selectedAddress?.id === addressId) {
        const nextAddress = addresses.find((addr) => addr.id !== addressId)
        if (nextAddress) {
          onAddressSelect(nextAddress)
        }
      }
    } catch (err: any) {
      console.error("Error deleting address:", err)

      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem deleting your address.",
      })
    }
  }

  const handleSetDefaultAddress = async (addressId: number) => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses/${addressId}/set-default`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            // Include authorization if needed
            // "Authorization": `Bearer ${token}`
          },
        },
      )

      toast({
        title: "Default address set",
        description: "Your default address has been updated.",
      })

      // Update addresses list to reflect new default
      setAddresses((prevAddresses) =>
        prevAddresses.map((addr) => ({
          ...addr,
          is_default: addr.id === addressId,
        })),
      )

      // Select this address
      onAddressSelect(response.data.address)
    } catch (err: any) {
      console.error("Error setting default address:", err)

      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem setting your default address.",
      })
    }
  }

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address)
    setIsAddressFormOpen(true)
  }

  const handleAddNewAddress = () => {
    setEditingAddress(null)
    setIsAddressFormOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-cherry-900" />
        <span className="ml-2">Loading addresses...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Addresses</h3>
        <Sheet open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center gap-1" onClick={handleAddNewAddress}>
              <PlusCircle className="h-4 w-4" />
              <span>Add New Address</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingAddress ? "Edit Address" : "Add New Address"}</SheetTitle>
              <SheetDescription>
                {editingAddress ? "Update your address information below." : "Fill in your address details below."}
              </SheetDescription>
            </SheetHeader>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6">
              <AddressForm
                initialValues={editingAddress || undefined}
                onSubmit={handleAddressSubmit}
                isSubmitting={isSubmitting}
                submitLabel={editingAddress ? "Update Address" : "Save Address"}
                showAddressType={true}
                onCancel={() => setIsAddressFormOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {error && !isAddressFormOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {addresses.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-gray-50">
          <p className="text-muted-foreground mb-4">You don't have any saved addresses yet.</p>
          <Button
            variant="default"
            className="bg-cherry-900 hover:bg-cherry-800 text-white"
            onClick={handleAddNewAddress}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Your First Address
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`${selectedAddress?.id === address.id ? "border-2 border-cherry-900" : "border"}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between items-center">
                  <span>
                    {address.first_name} {address.last_name}
                    {address.is_default && (
                      <span className="ml-2 text-xs bg-cherry-100 text-cherry-900 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{address.address_type}</span>
                </CardTitle>
                <CardDescription className="text-sm">{address.phone}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm">
                  {address.address_line1}
                  {address.address_line2 && <span>, {address.address_line2}</span>}
                </p>
                <p className="text-sm">
                  {address.city}, {address.state} {address.postal_code}
                </p>
                <p className="text-sm">{address.country}</p>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                    onClick={() => handleEditAddress(address)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit Address
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDeleteAddress(address.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remove
                  </Button>
                </div>
                {selectedAddress?.id !== address.id ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 bg-cherry-900 hover:bg-cherry-800 text-white"
                    onClick={() => {
                      onAddressSelect(address)
                      if (!address.is_default) {
                        handleSetDefaultAddress(address.id)
                      }
                    }}
                  >
                    Use This Address
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 bg-green-600 hover:bg-green-700 text-white cursor-default"
                    disabled
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Selected
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
