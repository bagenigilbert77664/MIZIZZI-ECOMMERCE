"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { PlusCircle, Edit, Trash2, Check, Loader2, MapPin, Home, Star, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AddressForm } from "@/components/checkout/address-form"
import type { Address, AddressFormValues } from "@/types/address"
import axios from "axios"
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
    // Only fetch addresses if we're likely to have authentication
    if (localStorage.getItem("mizizzi_token") || sessionStorage.getItem("mizizzi_token")) {
      fetchAddresses()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchAddresses = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get the token from localStorage or sessionStorage
      const token = localStorage.getItem("mizizzi_token") || sessionStorage.getItem("mizizzi_token")

      if (!token) {
        console.warn("No authentication token found for fetching addresses")
        setAddresses([])
        return
      }

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      setAddresses(response.data.items || [])
    } catch (err) {
      console.error("Error fetching addresses:", err)
      // Don't show error toast for auth errors to avoid confusion
      if (axios.isAxiosError(err) && err.response?.status !== 401) {
        toast({
          title: "Error",
          description: "Failed to load your saved addresses. Please try again.",
          variant: "destructive",
        })
      }
      setAddresses([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddressSubmit = async (data: AddressFormValues) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Get the token from localStorage or sessionStorage
      const token = localStorage.getItem("mizizzi_token") || sessionStorage.getItem("mizizzi_token")

      if (!token) {
        throw new Error("Authentication required")
      }

      if (editingAddress) {
        // Update existing address
        const response = await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses/${editingAddress.id}`,
          data,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
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
              Authorization: `Bearer ${token}`,
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

  const handleDeleteAddress = async (addressId: number, e: React.MouseEvent) => {
    // Stop propagation to prevent card selection when clicking delete
    e.stopPropagation()

    if (!confirm("Are you sure you want to delete this address?")) {
      return
    }

    try {
      // Get the token from localStorage or sessionStorage
      const token = localStorage.getItem("mizizzi_token") || sessionStorage.getItem("mizizzi_token")

      if (!token) {
        throw new Error("Authentication required")
      }

      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses/${addressId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      // Get the token from localStorage or sessionStorage
      const token = localStorage.getItem("mizizzi_token") || sessionStorage.getItem("mizizzi_token")

      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/addresses/${addressId}/set-default`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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

  const handleEditAddress = (address: Address, e: React.MouseEvent) => {
    // Stop propagation to prevent card selection when clicking edit
    e.stopPropagation()
    setEditingAddress(address)
    setIsAddressFormOpen(true)
  }

  const handleAddNewAddress = () => {
    setEditingAddress(null)
    setIsAddressFormOpen(true)
  }

  const handleSelectAddress = (address: Address) => {
    onAddressSelect(address)
    if (!address.is_default) {
      handleSetDefaultAddress(address.id)
    }
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
              className="flex items-center gap-1 border-cherry-200 text-cherry-700 hover:bg-cherry-50"
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
          <TabsList className="w-full grid grid-cols-3 mb-4 rounded-xl overflow-hidden">
            <TabsTrigger
              value="all"
              className="py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm"
            >
              All Addresses
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm"
            >
              Shipping
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm"
            >
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
                  className="rounded-xl overflow-hidden"
                >
                  <Card
                    onClick={() => handleSelectAddress(address)}
                    className={`h-full overflow-hidden transition-all duration-300 cursor-pointer ${
                      selectedAddress?.id === address.id
                        ? "border-2 border-cherry-600 shadow-lg bg-cherry-50/30"
                        : "border hover:border-cherry-300 hover:shadow-md hover:bg-gray-50/80"
                    }`}
                  >
                    <CardHeader className="pb-2 bg-white border-b relative">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {address.first_name} {address.last_name}
                          </span>
                          {address.is_default && (
                            <Badge className="bg-green-100 text-green-700 border-none text-xs">
                              <Star className="h-3 w-3 mr-1 fill-green-500 text-green-500" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`capitalize text-xs ${
                            address.address_type === "shipping"
                              ? "bg-cherry-100 text-cherry-700 border-cherry-200"
                              : "bg-blue-100 text-blue-700 border-blue-200"
                          }`}
                        >
                          {address.address_type}
                        </Badge>
                      </div>

                      {selectedAddress?.id === address.id && (
                        <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-r-[40px] border-t-transparent border-r-cherry-600">
                          <Check className="absolute top-[-35px] right-[-35px] h-4 w-4 text-white" />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-cherry-50 p-2 mt-1 flex-shrink-0">
                          <MapPin className="h-4 w-4 text-cherry-600" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="text-sm space-y-1 text-gray-700">
                            <p>
                              {address.address_line1}
                              {address.address_line2 && <span>, {address.address_line2}</span>}
                            </p>
                            <p>
                              {address.city}, {address.state} {address.postal_code}
                            </p>
                            <p>{address.country}</p>
                          </div>
                          <div className="flex items-center text-sm text-cherry-700 font-medium pt-1">
                            <Phone className="h-3.5 w-3.5 mr-1.5" />
                            {address.phone}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end p-3 border-t bg-gray-50">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                          onClick={(e) => handleEditAddress(address, e)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={(e) => handleDeleteAddress(address.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>
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
