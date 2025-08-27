"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { PlusCircle, Edit, Trash2, Check, Loader2, MapPin, Home, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AddressForm } from "@/components/checkout/address-form"
import type { Address, AddressFormValues } from "@/types/address"
import { addressService } from "@/services/address" // Import addressService
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  const [activeTab, setActiveTab] = useState("all")
  const { toast } = useToast()

  // Fetch addresses on component mount
  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const addressList = await addressService.getAddresses()
      setAddresses(addressList)
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
        const updatedAddress = await addressService.updateAddress(editingAddress.id, data)

        toast({
          title: "Address updated",
          description: "Your address has been updated successfully.",
        })

        // Update addresses list
        setAddresses((prevAddresses) =>
          prevAddresses.map((addr) => (addr.id === editingAddress.id ? updatedAddress : addr)),
        )

        // If this was the selected address, update it
        if (selectedAddress?.id === editingAddress.id) {
          onAddressSelect(updatedAddress)
        }
      } else {
        const newAddress = await addressService.createAddress(data)

        toast({
          title: "Address added",
          description: "Your new address has been added successfully.",
        })

        // Add to addresses list
        setAddresses((prevAddresses) => [...prevAddresses, newAddress])

        // Select the new address if no address was selected before
        if (!selectedAddress) {
          onAddressSelect(newAddress)
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
      await addressService.deleteAddress(addressId)

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
      const updatedAddress = await addressService.setDefaultAddress(addressId)

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
      onAddressSelect(updatedAddress)
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

  const filteredAddresses =
    activeTab === "all" ? addresses : addresses.filter((addr) => addr.address_type === activeTab)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-cherry-900" />
        <span className="ml-2">Loading addresses...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center">
          <Home className="mr-2 h-5 w-5 text-cherry-600" />
          Your Addresses
        </h3>
        <Sheet open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-1 border-cherry-200 text-cherry-700 hover:bg-cherry-50 bg-transparent"
              onClick={handleAddNewAddress}
            >
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

      {addresses.length > 0 && (
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all" className="text-sm">
              All Addresses
            </TabsTrigger>
            <TabsTrigger value="shipping" className="text-sm">
              Shipping
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-sm">
              Billing
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {addresses.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-gray-50">
          <div className="mx-auto w-16 h-16 rounded-full bg-cherry-50 flex items-center justify-center mb-4">
            <MapPin className="h-8 w-8 text-cherry-500" />
          </div>
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
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {filteredAddresses.length === 0 ? (
              <div className="md:col-span-2 text-center p-6 border border-dashed rounded-lg">
                <p className="text-gray-500">No {activeTab} addresses found.</p>
              </div>
            ) : (
              filteredAddresses.map((address) => (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    duration: 0.4,
                  }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  }}
                  className="rounded-xl overflow-hidden"
                >
                  <Card
                    className={`h-full overflow-hidden transition-all duration-300 ${
                      selectedAddress?.id === address.id
                        ? "border-2 border-cherry-600 shadow-lg"
                        : "border hover:border-cherry-300"
                    }`}
                  >
                    <CardHeader className="pb-2 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center">
                          <span className="flex items-center">
                            {address.first_name} {address.last_name}
                          </span>
                          {address.is_default && (
                            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                              <Star className="h-3 w-3 mr-1 fill-green-500 text-green-500" />
                              Default
                            </Badge>
                          )}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="capitalize text-xs bg-cherry-50 text-cherry-700 border-cherry-200"
                        >
                          {address.address_type}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <CardDescription className="text-sm flex items-center">
                          {/* Placeholder for Phone icon */}
                          <span className="h-3.5 w-3.5 mr-1.5 text-gray-400">Phone Icon</span>
                          {address.phone}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-cherry-50 p-2 mt-1 flex-shrink-0">
                          <MapPin className="h-4 w-4 text-cherry-600" />
                        </div>
                        <div className="text-sm space-y-1 text-gray-600">
                          <p>
                            {address.address_line1}
                            {address.address_line2 && <span>, {address.address_line2}</span>}
                          </p>
                          <p>
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                          <p>{address.country}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-3 border-t bg-gray-50">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 bg-transparent"
                          onClick={() => handleEditAddress(address)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 bg-transparent"
                          onClick={() => handleDeleteAddress(address.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                      </div>
                      {selectedAddress?.id !== address.id ? (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 bg-cherry-700 hover:bg-cherry-800 text-white"
                            onClick={() => {
                              onAddressSelect(address)
                              if (!address.is_default) {
                                handleSetDefaultAddress(address.id)
                              }
                            }}
                          >
                            Use This Address
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 bg-green-600 hover:bg-green-700 text-white cursor-default"
                            disabled
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Selected
                          </Button>
                        </motion.div>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

function Phone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
