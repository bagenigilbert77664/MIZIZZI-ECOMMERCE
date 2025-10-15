"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, PlusCircle, Edit, Trash2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { addressService } from "@/services/address"
import AddressForm from "@/components/checkout/address-form"
import type { Address, AddressFormValues } from "@/types/address"

export function AddressManagement() {
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"view" | "add" | "edit">("view")
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const addressList = await addressService.getAddresses()
        setAddresses(addressList)
      } catch (error) {
        console.error("Failed to fetch addresses:", error)
        setError("Failed to load your saved addresses. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAddresses()
  }, [])

  const handleSetDefault = async (addressId: number) => {
    try {
      await addressService.setDefaultAddress(addressId)

      setAddresses((prevAddresses) =>
        prevAddresses.map((addr) => ({
          ...addr,
          is_default: addr.id === addressId,
        })),
      )

      toast({
        title: "Default Address Updated",
        description: "Your default shipping address has been updated.",
      })
    } catch (error) {
      console.error("Failed to set default address:", error)
      toast({
        title: "Error",
        description: "Failed to update default address. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm("Are you sure you want to delete this address?")) return

    try {
      await addressService.deleteAddress(addressId)

      setAddresses((prevAddresses) => prevAddresses.filter((addr) => addr.id !== addressId))

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
    }
  }

  const handleAddNewClick = () => {
    setMode("add")
  }

  const handleEditClick = (address: Address) => {
    setEditingAddress(address)
    setMode("edit")
  }

  const handleFormSuccess = async (data: AddressFormValues) => {
    try {
      if (mode === "edit" && editingAddress) {
        const updatedAddress = await addressService.updateAddress(editingAddress.id, data)
        setAddresses((prev) => prev.map((addr) => (addr.id === editingAddress.id ? updatedAddress : addr)))
        toast({
          title: "Address Updated",
          description: "Your address has been updated successfully.",
        })
      } else {
        const newAddress = await addressService.createAddress(data)
        setAddresses((prev) => [...prev, newAddress])
        toast({
          title: "Address Added",
          description: "Your new address has been added successfully.",
        })
      }
      setMode("view")
      setEditingAddress(null)
    } catch (error) {
      console.error("Failed to save address:", error)
      toast({
        title: "Error",
        description: `Failed to ${mode === "edit" ? "update" : "add"} address. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const handleFormCancel = () => {
    setMode("view")
    setEditingAddress(null)
  }

  if (mode === "add" || mode === "edit") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleFormCancel} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{mode === "edit" ? "Edit Address" : "Add New Address"}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "edit" ? "Update your delivery address information" : "Add a new delivery address"}
          </p>
        </CardHeader>
        <CardContent>
          <AddressForm
            onSubmit={handleFormSuccess}
            onCancel={handleFormCancel}
            initialValues={editingAddress || undefined}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Addresses</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-transparent"
          onClick={handleAddNewClick}
        >
          <PlusCircle className="h-4 w-4" />
          Add New Address
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : addresses.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
            <p className="text-gray-500">You don't have any saved addresses yet.</p>
            <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={handleAddNewClick}>
              Add your first address
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card key={address.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {address.first_name} {address.last_name}
                        {address.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">DEFAULT</span>
                        )}
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50 bg-transparent"
                        onClick={() => handleEditClick(address)}
                      >
                        <Edit className="h-4 w-4 mr-1.5" />
                        Edit Address
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 ml-2 bg-transparent"
                        onClick={() => handleDeleteAddress(address.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  {!address.is_default && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-primary"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Set as default address
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
