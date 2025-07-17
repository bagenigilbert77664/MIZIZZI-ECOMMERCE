"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"

interface AddressFormData {
  first_name: string
  last_name: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  alternative_phone: string
  address_type: string
  is_default: boolean
  additional_info: string
}

export default function EditAddressPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams()
  const addressId = params?.id as string

  const [address, setAddress] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<AddressFormData>({
    first_name: "",
    last_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    phone: "",
    alternative_phone: "",
    address_type: "shipping",
    is_default: false,
    additional_info: "",
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        setIsLoading(true)
        const response = await adminService.getAddress(addressId)
        setAddress(response)

        // Populate form data
        setFormData({
          first_name: response.first_name || "",
          last_name: response.last_name || "",
          address_line1: response.address_line1 || "",
          address_line2: response.address_line2 || "",
          city: response.city || "",
          state: response.state || "",
          postal_code: response.postal_code || "",
          country: response.country || "",
          phone: response.phone || "",
          alternative_phone: response.alternative_phone || "",
          address_type: response.address_type || "shipping",
          is_default: response.is_default || false,
          additional_info: response.additional_info || "",
        })
      } catch (error) {
        console.error("Failed to fetch address:", error)
        toast({
          title: "Error",
          description: "Failed to load address details. Please try again.",
          variant: "destructive",
        })
        router.push("/admin/addresses")
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && addressId) {
      fetchAddress()
    }
  }, [isAuthenticated, addressId, router])

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSaving(true)

      // Validate required fields
      const requiredFields = [
        "first_name",
        "last_name",
        "address_line1",
        "city",
        "state",
        "postal_code",
        "country",
        "phone",
      ]
      const missingFields = requiredFields.filter((field) => !formData[field as keyof AddressFormData])

      if (missingFields.length > 0) {
        toast({
          title: "Validation Error",
          description: `Please fill in all required fields: ${missingFields.join(", ")}`,
          variant: "destructive",
        })
        return
      }

      await adminService.updateAddress(addressId, formData)

      toast({
        title: "Success",
        description: "Address updated successfully.",
      })

      router.push("/admin/addresses")
    } catch (error: any) {
      console.error("Failed to update address:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push("/admin/addresses")
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/addresses")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Address</h1>
          <p className="text-muted-foreground">Update address details for {address?.user?.name || "customer"}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
          <CardDescription>Update the address details below. All fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  value={formData.address_line1}
                  onChange={(e) => handleInputChange("address_line1", e.target.value)}
                  placeholder="Enter street address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_line2}
                  onChange={(e) => handleInputChange("address_line2", e.target.value)}
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Enter city"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="Enter state or province"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange("postal_code", e.target.value)}
                  placeholder="Enter postal code"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kenya">Kenya</SelectItem>
                  <SelectItem value="Uganda">Uganda</SelectItem>
                  <SelectItem value="Tanzania">Tanzania</SelectItem>
                  <SelectItem value="Rwanda">Rwanda</SelectItem>
                  <SelectItem value="Burundi">Burundi</SelectItem>
                  <SelectItem value="South Sudan">South Sudan</SelectItem>
                  <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                  <SelectItem value="Somalia">Somalia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternative_phone">Alternative Phone</Label>
                <Input
                  id="alternative_phone"
                  value={formData.alternative_phone}
                  onChange={(e) => handleInputChange("alternative_phone", e.target.value)}
                  placeholder="Enter alternative phone (optional)"
                />
              </div>
            </div>

            {/* Address Type and Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_type">Address Type</Label>
                <Select
                  value={formData.address_type}
                  onValueChange={(value) => handleInputChange("address_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select address type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => handleInputChange("is_default", checked as boolean)}
                />
                <Label htmlFor="is_default">Set as default address</Label>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-2">
              <Label htmlFor="additional_info">Additional Information</Label>
              <Textarea
                id="additional_info"
                value={formData.additional_info}
                onChange={(e) => handleInputChange("additional_info", e.target.value)}
                placeholder="Any additional delivery instructions or notes..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader  />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
