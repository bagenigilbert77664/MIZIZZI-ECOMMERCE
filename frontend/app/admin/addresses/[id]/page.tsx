"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit, Trash2, MapPin, Phone, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function AddressDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams()
  const addressId = params?.id as string

  const [address, setAddress] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleEdit = () => {
    router.push(`/admin/addresses/${addressId}/edit`)
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await adminService.deleteAddress(addressId)

      toast({
        title: "Success",
        description: "Address deleted successfully.",
      })

      router.push("/admin/addresses")
    } catch (error: any) {
      console.error("Failed to delete address:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
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

  if (!address) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Address Not Found</h2>
          <p className="text-muted-foreground">The address you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/admin/addresses")} className="mt-4">
            Back to Addresses
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/addresses")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Address Details</h1>
            <p className="text-muted-foreground">View and manage address information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Address
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the address and remove it from the
                  customer's account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
                  {isDeleting ? "Deleting..." : "Delete Address"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Address Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Full Name</h4>
                  <p className="font-medium">
                    {address.first_name} {address.last_name}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Address Type</h4>
                  <Badge variant="outline" className="capitalize">
                    {address.address_type}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Street Address</h4>
                <p className="font-medium">{address.address_line1}</p>
                {address.address_line2 && <p className="text-muted-foreground">{address.address_line2}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">City</h4>
                  <p className="font-medium">{address.city}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">State/Province</h4>
                  <p className="font-medium">{address.state}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Postal Code</h4>
                  <p className="font-medium">{address.postal_code}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Country</h4>
                <p className="font-medium">{address.country}</p>
              </div>

              {address.additional_info && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Additional Information</h4>
                  <p className="text-sm">{address.additional_info}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer & Contact Information */}
        <div className="space-y-6">
          {/* Customer Information */}
          {address.user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Name</h4>
                  <p className="font-medium">{address.user.name}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Email</h4>
                  <p className="text-sm">{address.user.email}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
                  <Badge variant={address.user.is_active ? "default" : "secondary"}>
                    {address.user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/customers/${address.user.id}`)}
                  className="w-full"
                >
                  View Customer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Primary Phone</h4>
                <p className="font-medium">{address.phone}</p>
              </div>
              {address.alternative_phone && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Alternative Phone</h4>
                  <p className="text-sm">{address.alternative_phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Default Address</span>
                <Badge variant={address.is_default ? "default" : "secondary"}>
                  {address.is_default ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Created: {new Date(address.created_at).toLocaleDateString()}
              </div>
              {address.updated_at && (
                <div className="text-xs text-muted-foreground">
                  Updated: {new Date(address.updated_at).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
