"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { AddressBook } from "@/components/checkout/address-book"
import { AddressForm } from "@/components/checkout/address-form"
import { addressService } from "@/services/address"
import type { Address, AddressFormValues } from "@/types/address"
import { useToast } from "@/hooks/use-toast"

interface CheckoutDeliveryProps {
  selectedAddressId: number | null
  onAddressSelect: (address: Address) => void
}

export function CheckoutDelivery({ selectedAddressId, onAddressSelect }: CheckoutDeliveryProps) {
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleAddNewAddress = () => {
    setEditingAddress(null)
    setShowAddressForm(true)
  }

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address)
    setShowAddressForm(true)
  }

  const handleCancelForm = () => {
    setShowAddressForm(false)
    setEditingAddress(null)
  }

  const handleSubmitAddress = async (data: AddressFormValues) => {
    setIsSubmitting(true)
    try {
      let address: Address

      if (editingAddress) {
        // Update existing address
        address = await addressService.updateAddress(editingAddress.id, data)
        toast({
          title: "Address Updated",
          description: "Your address has been updated successfully.",
        })
      } else {
        // Create new address
        address = await addressService.createAddress(data)
        toast({
          title: "Address Added",
          description: "Your new address has been added successfully.",
        })
      }

      // Select the new/updated address
      onAddressSelect(address)

      // Close the form
      setShowAddressForm(false)
      setEditingAddress(null)
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

  if (showAddressForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{editingAddress ? "Edit Address" : "Add New Address"}</h3>
          <Button variant="ghost" size="sm" onClick={handleCancelForm}>
            Cancel
          </Button>
        </div>

        <AddressForm
          initialValues={
            editingAddress
              ? {
                  ...editingAddress,
                  address_type: ["shipping", "billing"].includes(editingAddress.address_type)
                    ? (editingAddress.address_type as "shipping" | "billing")
                    : undefined,
                }
              : undefined
          }
          onSubmit={handleSubmitAddress}
          isSubmitting={isSubmitting}
          submitLabel={editingAddress ? "Update Address" : "Save Address"}
          onCancel={handleCancelForm}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AddressBook
        selectedAddressId={selectedAddressId}
        onSelectAddress={onAddressSelect}
        onAddNewAddress={handleAddNewAddress}
        onEditAddress={handleEditAddress}
      />

      {!showAddressForm && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={handleAddNewAddress} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Add New Address
          </Button>
        </div>
      )}
    </div>
  )
}
