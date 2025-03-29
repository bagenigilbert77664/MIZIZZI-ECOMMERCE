"use client"

import { useState, useEffect, useRef } from "react"
import { PlusCircle, Edit, Check, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { addressService } from "@/services/address"
import type { Address } from "@/types/address"

interface AddressBookProps {
  selectedAddressId: number | null
  onSelectAddress: (address: Address) => void
  onAddNewAddress: () => void
  onEditAddress: (address: Address) => void
}

export function AddressBook({ selectedAddressId, onSelectAddress, onAddNewAddress, onEditAddress }: AddressBookProps) {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const isFetchingRef = useRef(false)

  // Fetch addresses on component mount
  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) return

    try {
      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      console.log("[AddressBook] Fetching addresses...")
      const addressList = await addressService.getAddresses()
      console.log("[AddressBook] Fetched addresses:", addressList)

      setAddresses(addressList || [])

      // If there's a default address and no address is selected, select it
      if (!selectedAddressId && addressList.length > 0) {
        const defaultAddress = addressList.find((addr) => addr.is_default)
        if (defaultAddress) {
          onSelectAddress(defaultAddress)
        } else if (addressList.length > 0) {
          // If no default, select the first one
          onSelectAddress(addressList[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error)
      setError("Failed to load your saved addresses. Please try again.")
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }

  // Set an address as default
  const handleSetDefault = async (addressId: number) => {
    try {
      await addressService.setDefaultAddress(addressId)

      // Update the local state to reflect the change
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

  // Delete an address
  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm("Are you sure you want to delete this address?")) return

    try {
      await addressService.deleteAddress(addressId)

      // Remove the address from local state
      setAddresses((prevAddresses) => prevAddresses.filter((addr) => addr.id !== addressId))

      // If the deleted address was selected, select another one
      if (selectedAddressId === addressId) {
        const defaultAddress = addresses.find((addr) => addr.is_default && addr.id !== addressId)
        if (defaultAddress) {
          onSelectAddress(defaultAddress)
        } else if (addresses.length > 1) {
          // Find the first address that's not the one being deleted
          const nextAddress = addresses.find((addr) => addr.id !== addressId)
          if (nextAddress) onSelectAddress(nextAddress)
        }
      }

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchAddresses}>
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Address Book ({addresses.length})</h3>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 text-primary" onClick={onAddNewAddress}>
          <PlusCircle className="h-4 w-4" />
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
          <p className="text-gray-500">You don't have any saved addresses yet.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onAddNewAddress}>
            Add your first address
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`border ${selectedAddressId === address.id ? "border-cherry-900" : "border-gray-200"} transition-colors hover:border-cherry-200`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-5 w-5 rounded-full border ${selectedAddressId === address.id ? "border-cherry-900 bg-cherry-900 text-white" : "border-gray-300"} flex items-center justify-center cursor-pointer`}
                      onClick={() => onSelectAddress(address)}
                    >
                      {selectedAddressId === address.id && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="font-medium">
                        {address.first_name} {address.last_name}
                        {address.is_default && (
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            DEFAULT ADDRESS
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {address.city} - {address.state}
                      </div>
                      <div className="text-sm text-gray-600">
                        +{address.phone}
                        {address.alternative_phone && ` / +${address.alternative_phone}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-amber-500"
                      onClick={() => onEditAddress(address)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => handleDeleteAddress(address.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
                {!address.is_default && selectedAddressId === address.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-cherry-900"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      Set as default address
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}