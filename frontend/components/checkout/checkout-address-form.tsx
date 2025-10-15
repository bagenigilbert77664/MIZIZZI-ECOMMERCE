"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { addressService } from "@/services/address"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  Home,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  Globe,
  CreditCard,
  ShieldCheck,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// Define the form schema with validation
const formSchema = z
  .object({
    firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
    lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    phone: z.string().min(10, { message: "Phone number must be at least 10 characters" }),
    addressLine1: z.string().min(5, { message: "Address must be at least 5 characters" }),
    addressLine2: z.string().optional(),
    city: z.string().min(2, { message: "City is required" }),
    state: z.string().min(2, { message: "State/Province is required" }),
    postalCode: z.string().min(3, { message: "Postal code is required" }),
    country: z.string().min(2, { message: "Country is required" }),
    useAsBilling: z.boolean().default(true),
    // Billing address fields (only required if useAsBilling is false)
    billingFirstName: z.string().optional(),
    billingLastName: z.string().optional(),
    billingAddressLine1: z.string().optional(),
    billingAddressLine2: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingPostalCode: z.string().optional(),
    billingCountry: z.string().optional(),
  })
  .refine(
    (data) => {
      // If not using shipping address as billing, validate billing fields
      if (!data.useAsBilling) {
        return (
          data.billingFirstName &&
          data.billingLastName &&
          data.billingAddressLine1 &&
          data.billingCity &&
          data.billingState &&
          data.billingPostalCode &&
          data.billingCountry
        )
      }
      return true
    },
    {
      message: "Billing address is required when not using shipping address",
      path: ["billingFirstName"],
    },
  )

// Define the component props
interface CheckoutAddressFormProps {
  onAddressSaved: (shippingAddress: any, billingAddress: any) => void
  initialData?: any
}

export function CheckoutAddressForm({ onAddressSaved, initialData }: CheckoutAddressFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddressForm, setShowNewAddressForm] = useState(false)
  const [activeTab, setActiveTab] = useState<"saved" | "new">("saved")
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const { toast } = useToast()

  // Load saved addresses when component mounts
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        setIsLoadingAddresses(true)
        const addresses = await addressService.getAddresses()
        setSavedAddresses(addresses)

        // If we have addresses and no address is selected yet, select the default one
        if (addresses.length > 0 && !selectedAddressId) {
          const defaultAddress = addresses.find((addr) => addr.is_default) || addresses[0]
          setSelectedAddressId(defaultAddress.id.toString())
        } else if (addresses.length === 0) {
          // If no addresses, show the new address form
          setActiveTab("new")
        }
      } catch (error) {
        console.error("Failed to load addresses:", error)
      } finally {
        setIsLoadingAddresses(false)
      }
    }

    loadAddresses()
  }, [selectedAddressId])

  // Initialize the form with react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      addressLine1: initialData?.addressLine1 || "",
      addressLine2: initialData?.addressLine2 || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      postalCode: initialData?.postalCode || "",
      country: initialData?.country || "Kenya",
      useAsBilling: initialData?.useAsBilling !== false, // Default to true
      billingFirstName: initialData?.billingFirstName || "",
      billingLastName: initialData?.billingLastName || "",
      billingAddressLine1: initialData?.billingAddressLine1 || "",
      billingAddressLine2: initialData?.billingAddressLine2 || "",
      billingCity: initialData?.billingCity || "",
      billingState: initialData?.billingState || "",
      billingPostalCode: initialData?.billingPostalCode || "",
      billingCountry: initialData?.billingCountry || "",
    },
  })

  // Watch the useAsBilling field to conditionally render billing address form
  const useAsBilling = form.watch("useAsBilling")

  // Handle editing an existing address
  const handleEditAddress = (address: any) => {
    setIsEditing(address.id.toString())
    form.reset({
      firstName: address.first_name,
      lastName: address.last_name,
      email: address.email,
      phone: address.phone,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2 || "",
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
      useAsBilling: true,
    })
    setActiveTab("new")
  }

  // Handle deleting an address
  const handleDeleteAddress = async (addressId: string) => {
    if (confirm("Are you sure you want to delete this address?")) {
      try {
        await addressService.deleteAddress(Number(addressId))
        const updatedAddresses = savedAddresses.filter((addr) => addr.id.toString() !== addressId)
        setSavedAddresses(updatedAddresses)

        if (selectedAddressId === addressId) {
          setSelectedAddressId(updatedAddresses.length > 0 ? updatedAddresses[0].id.toString() : null)
        }

        toast({
          title: "Address deleted",
          description: "The address has been removed from your account.",
        })
      } catch (error) {
        console.error("Failed to delete address:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete the address. Please try again.",
        })
      }
    }
  }

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create a single address object based on the backend's expected format
      const addressData = {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone,
        address_line1: values.addressLine1,
        address_line2: values.addressLine2 || "",
        city: values.city,
        state: values.state,
        postal_code: values.postalCode,
        country: values.country,
        address_type: values.useAsBilling ? ("both" as const) : ("shipping" as const),
        is_default: true,
      }

      // If separate billing address is needed
      let billingAddressData = null
      if (!values.useAsBilling) {
        billingAddressData = {
          first_name: values.billingFirstName,
          last_name: values.billingLastName,
          email: values.email,
          phone: values.phone,
          address_line1: values.billingAddressLine1,
          address_line2: values.billingAddressLine2 || "",
          city: values.billingCity,
          state: values.billingState,
          postal_code: values.billingPostalCode,
          country: values.billingCountry,
          address_type: "billing",
          is_default: false,
        }
      }

      let shippingAddress

      if (isEditing) {
        // Update existing address
        shippingAddress = await addressService.updateAddress(Number(isEditing), addressData)
        toast({
          title: "Address updated",
          description: "Your address has been updated successfully.",
        })
      } else {
        // Create new address
        shippingAddress = await addressService.createAddress(addressData)
        toast({
          title: "Address saved",
          description: "Your address has been saved successfully.",
        })
      }

      // If we have a separate billing address, save it too
      let billingAddress = null
      if (billingAddressData) {
        billingAddress = await addressService.createAddress(billingAddressData)
      }

      // Refresh the saved addresses list
      const addresses = await addressService.getAddresses()
      setSavedAddresses(addresses)

      // Reset editing state
      setIsEditing(null)
      setActiveTab("saved")

      // Select the newly created/updated address
      setSelectedAddressId(shippingAddress.id.toString())

      // Call the callback function with the saved addresses
      onAddressSaved(shippingAddress, billingAddress || (values.useAsBilling ? shippingAddress : null))
    } catch (err: any) {
      console.error("Error saving address:", err)

      // Extract error message from response if available
      let errorMessage = "Failed to save address. Please try again."
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.data?.errors) {
        // Handle validation errors array
        const errors = err.response.data.errors
        if (Array.isArray(errors) && errors.length > 0) {
          errorMessage = errors.map((e) => e.message || e).join(", ")
        } else if (typeof errors === "object") {
          // Handle object of errors
          errorMessage = Object.values(errors).flat().join(", ")
        }
      }

      setError(errorMessage)

      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem saving your address.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle selecting a saved address
  const handleSelectAddress = (addressId: string) => {
    setSelectedAddressId(addressId)
  }

  // Handle using a selected address for checkout
  const handleUseSelectedAddress = () => {
    if (!selectedAddressId) {
      toast({
        variant: "destructive",
        title: "No address selected",
        description: "Please select an address or add a new one.",
      })
      return
    }

    const selectedAddress = savedAddresses.find((addr) => addr.id.toString() === selectedAddressId)
    if (!selectedAddress) {
      toast({
        variant: "destructive",
        title: "Address not found",
        description: "The selected address could not be found. Please try again.",
      })
      return
    }

    // Call the callback function with the selected address
    onAddressSaved(selectedAddress, selectedAddress)
  }

  // List of African countries for the dropdown
  const countries = [
    { value: "Kenya", label: "Kenya" },
    { value: "Nigeria", label: "Nigeria" },
    { value: "South Africa", label: "South Africa" },
    { value: "Ghana", label: "Ghana" },
    { value: "Egypt", label: "Egypt" },
    { value: "Tanzania", label: "Tanzania" },
    { value: "Uganda", label: "Uganda" },
    { value: "Ethiopia", label: "Ethiopia" },
    { value: "Rwanda", label: "Rwanda" },
    { value: "Morocco", label: "Morocco" },
  ]

  // Loading skeleton for addresses
  if (isLoadingAddresses) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 space-y-3">
              <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Your Delivery Information</h2>
          <p className="text-muted-foreground mt-1">Choose an address for delivery or add a new one.</p>
        </div>
        <div className="flex items-center space-x-1 text-sm text-green-600">
          <ShieldCheck className="h-4 w-4" />
          <span>Secure Checkout</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tab navigation */}
      {savedAddresses.length > 0 && (
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab("saved")}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all relative focus:outline-none",
              activeTab === "saved"
                ? "text-cherry-600 border-b-2 border-cherry-600"
                : "text-gray-500 hover:text-cherry-600",
            )}
          >
            Saved Addresses
            <span className="ml-2 bg-gray-100 text-gray-700 rounded-full h-5 w-5 inline-flex items-center justify-center text-xs">
              {savedAddresses.length}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab("new")
              setIsEditing(null)
              form.reset()
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all relative focus:outline-none",
              activeTab === "new"
                ? "text-cherry-600 border-b-2 border-cherry-600"
                : "text-gray-500 hover:text-cherry-600",
            )}
          >
            {isEditing ? "Edit Address" : "Add New Address"}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === "saved" && savedAddresses.length > 0 ? (
          <motion.div
            key="saved-addresses"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {savedAddresses.map((address) => (
              <motion.div
                key={address.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -2 }}
              >
                <Card
                  className={cn(
                    "overflow-hidden transition-all duration-200 cursor-pointer group relative border-2",
                    selectedAddressId === address.id.toString()
                      ? "border-cherry-600 bg-cherry-50"
                      : "border-gray-200 hover:border-cherry-300",
                  )}
                  onClick={() => handleSelectAddress(address.id.toString())}
                >
                  {selectedAddressId === address.id.toString() && (
                    <div className="absolute top-3 right-3 bg-cherry-600 rounded-full p-1">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 rounded-full bg-cherry-100 p-2">
                        <Home className="h-5 w-5 text-cherry-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {address.first_name} {address.last_name}
                          </h3>
                          {address.is_default && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-gray-500">
                          <p>{address.address_line1}</p>
                          {address.address_line2 && <p>{address.address_line2}</p>}
                          <p>
                            {address.city}, {address.state}, {address.postal_code}
                          </p>
                          <p>{address.country}</p>
                          <p className="text-gray-600 font-medium mt-1">+{address.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex mt-4 pt-4 border-t border-gray-100 justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mr-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditAddress(address)
                        }}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAddress(address.id.toString())
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <Card
                className="border-2 border-dashed border-gray-300 hover:border-cherry-300 bg-gray-50 flex items-center justify-center h-full cursor-pointer transition-all duration-200"
                onClick={() => {
                  setActiveTab("new")
                  setIsEditing(null)
                  form.reset()
                }}
              >
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-cherry-100 flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-cherry-600" />
                  </div>
                  <h3 className="font-medium text-gray-900">Add a new address</h3>
                  <p className="text-sm text-gray-500 mt-1">Save a new delivery address</p>
                </CardContent>
              </Card>
            </motion.div>

            <div className="md:col-span-2 mt-4">
              <Button
                type="button"
                size="lg"
                className="w-full bg-cherry-600 hover:bg-cherry-700 text-white"
                disabled={!selectedAddressId}
                onClick={handleUseSelectedAddress}
              >
                Deliver to this Address
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="new-address-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-cherry-50 to-cherry-100 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-semibold text-cherry-800 flex items-center">
                          <User className="mr-2 h-5 w-5 text-cherry-600" />
                          Personal Information
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">First Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="John"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Last Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Doe"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type="email"
                                    placeholder="john.doe@example.com"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Phone Number</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="+254 712 345 678"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="bg-gradient-to-r from-cherry-50 to-cherry-100 rounded-lg p-4 mt-8">
                        <h3 className="text-lg font-semibold text-cherry-800 flex items-center">
                          <MapPin className="mr-2 h-5 w-5 text-cherry-600" />
                          Address Information
                        </h3>
                      </div>

                      <FormField
                        control={form.control}
                        name="addressLine1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Address Line 1</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="123 Main St"
                                  {...field}
                                  className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                />
                                <Home className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="addressLine2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">
                              Address Line 2 <span className="text-gray-400 text-sm">(Optional)</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Apartment, suite, unit, etc."
                                  {...field}
                                  className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                />
                                <Home className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">City</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Nairobi"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">State/Province</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Nairobi County"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Postal Code</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="00100"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Country</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <div className="relative">
                                    <SelectTrigger className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm">
                                      <SelectValue placeholder="Select a country" />
                                    </SelectTrigger>
                                    <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                  </div>
                                </FormControl>
                                <SelectContent className="max-h-60">
                                  {countries.map((country) => (
                                    <SelectItem key={country.value} value={country.value} className="cursor-pointer">
                                      {country.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="useAsBilling"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md bg-gradient-to-r from-cherry-50 to-white p-4 border border-cherry-100">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-cherry-600 data-[state=checked]:border-cherry-600"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-gray-700 font-medium">
                                Use shipping address as billing address
                              </FormLabel>
                              <FormDescription className="text-gray-500">
                                Check this box if your billing and shipping addresses are the same.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Billing Address Section (only shown if useAsBilling is false) */}
                    {!useAsBilling && (
                      <div className="space-y-6">
                        <Separator className="my-8" />

                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <CreditCard className="mr-2 h-5 w-5 text-gray-600" />
                            Billing Address
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="billingFirstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">First Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      placeholder="John"
                                      {...field}
                                      className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                    />
                                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="billingLastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">Last Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      placeholder="Doe"
                                      {...field}
                                      className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                    />
                                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="billingAddressLine1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Address Line 1</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="123 Main St"
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <Home className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="billingAddressLine2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">
                                Address Line 2 <span className="text-gray-400 text-sm">(Optional)</span>
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Apartment, suite, unit, etc."
                                    {...field}
                                    className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                  />
                                  <Home className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="billingCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">City</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      placeholder="Nairobi"
                                      {...field}
                                      className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                    />
                                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="billingState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">State/Province</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      placeholder="Nairobi County"
                                      {...field}
                                      className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                    />
                                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="billingPostalCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">Postal Code</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      placeholder="00100"
                                      {...field}
                                      className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm"
                                    />
                                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="billingCountry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">Country</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <div className="relative">
                                      <SelectTrigger className="pl-10 rounded-lg h-11 border-gray-300 focus:border-cherry-300 focus:ring focus:ring-cherry-200 focus:ring-opacity-50 shadow-sm">
                                        <SelectValue placeholder="Select a country" />
                                      </SelectTrigger>
                                      <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    </div>
                                  </FormControl>
                                  <SelectContent className="max-h-60">
                                    {countries.map((country) => (
                                      <SelectItem key={country.value} value={country.value} className="cursor-pointer">
                                        {country.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-4 pt-4">
                      {savedAddresses.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-12 rounded-lg border-gray-300 hover:bg-gray-50 text-gray-700"
                          onClick={() => setActiveTab("saved")}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className="flex-1 h-12 bg-cherry-600 hover:bg-cherry-700 text-white rounded-lg shadow-md transition-all"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            {isEditing ? "Updating..." : "Saving..."}
                          </>
                        ) : (
                          <>{isEditing ? "Update Address" : "Save Address"}</>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
