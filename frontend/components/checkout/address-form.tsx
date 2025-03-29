"use client"

import type React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AddressFormValues } from "@/types/address"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  first_name: z.string().min(2, { message: "First name must be at least 2 characters" }),
  last_name: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  address_line1: z.string().min(5, { message: "Address must be at least 5 characters" }),
  address_line2: z.string().optional(),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().min(2, { message: "State/Province is required" }),
  postal_code: z.string().min(3, { message: "Postal code is required" }),
  country: z.string().min(2, { message: "Country is required" }),
  phone: z.string().min(5, { message: "Phone number is required" }).optional().or(z.literal("")),
  alternative_phone: z.string().optional(),
  address_type: z.enum(["shipping", "billing", "both"]).default("shipping"),
  is_default: z.boolean().default(true), // Default to true since we're only managing one address
})

interface AddressFormProps {
  initialValues?: Partial<AddressFormValues>
  onSubmit: (data: AddressFormValues) => void
  isSubmitting?: boolean
  submitLabel?: string
  showAddressType?: boolean
  onCancel?: () => void
}

export const AddressForm: React.FC<AddressFormProps> = ({
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Address",
  showAddressType = false,
  onCancel,
}) => {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialValues?.first_name || "",
      last_name: initialValues?.last_name || "",
      address_line1: initialValues?.address_line1 || "",
      address_line2: initialValues?.address_line2 || "",
      city: initialValues?.city || "",
      state: initialValues?.state || "",
      postal_code: initialValues?.postal_code || "",
      country: initialValues?.country || "Kenya",
      phone: initialValues?.phone || "",
      alternative_phone: initialValues?.alternative_phone || "",
      address_type: initialValues?.address_type || "shipping",
      is_default: true, // Always default to true for Jumia-style single address
    },
  })

  const handleSubmit = async (data: AddressFormValues) => {
    console.log("Address form data:", data)

    // Make sure phone is not undefined
    if (!data.phone) {
      data.phone = ""
    }

    // Make sure address_type is set and lowercase
    if (!data.address_type) {
      data.address_type = "shipping"
    }

    // Always set is_default to true since we're only managing one address
    data.is_default = true

    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="First Name"
                    {...field}
                    className="border-gray-300 focus-visible:ring-cherry-900"
                  />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last Name" {...field} className="border-gray-300 focus-visible:ring-cherry-900" />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address_line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Address Line 1</FormLabel>
              <FormControl>
                <Input
                  placeholder="Street Address"
                  {...field}
                  className="border-gray-300 focus-visible:ring-cherry-900"
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address_line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700">Address Line 2 (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Apartment, Suite, Unit, etc."
                  {...field}
                  className="border-gray-300 focus-visible:ring-cherry-900"
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">City</FormLabel>
                <FormControl>
                  <Input placeholder="City" {...field} className="border-gray-300 focus-visible:ring-cherry-900" />
                </FormControl>
                <FormMessage className="text-red-500" />
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
                  <Input
                    placeholder="State/Province"
                    {...field}
                    className="border-gray-300 focus-visible:ring-cherry-900"
                  />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Postal Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Postal Code"
                    {...field}
                    className="border-gray-300 focus-visible:ring-cherry-900"
                  />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Country</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || "Kenya"}>
                  <FormControl>
                    <SelectTrigger className="border-gray-300 focus-visible:ring-cherry-900">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Rwanda">Rwanda</SelectItem>
                    <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Phone Number"
                    {...field}
                    className="border-gray-300 focus-visible:ring-cherry-900"
                  />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="alternative_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Alternative Phone (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Alternative Phone"
                    {...field}
                    className="border-gray-300 focus-visible:ring-cherry-900"
                  />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
        </div>

        {showAddressType && (
          <FormField
            control={form.control}
            name="address_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700">Address Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-gray-300 focus-visible:ring-cherry-900">
                      <SelectValue placeholder="Select address type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="both">Both Shipping & Billing</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-4 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="bg-cherry-900 hover:bg-cherry-800 text-white" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}