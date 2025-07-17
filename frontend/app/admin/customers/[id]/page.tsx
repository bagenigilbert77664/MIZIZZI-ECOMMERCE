"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Heart,
  CreditCard,
  Edit,
  Ban,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { formatDate, formatCurrency } from "@/lib/utils"

interface CustomerDetails {
  id: number
  name: string
  email: string
  phone?: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  recent_orders: any[]
  addresses: any[]
  recent_reviews: any[]
  cart_items: any[]
  wishlist_items: any[]
}

export default function CustomerDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams()
  const customerId = params?.id as string

  const [customer, setCustomer] = useState<CustomerDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!customerId || !isAuthenticated) return

      try {
        setIsLoading(true)

        // Use the existing getUsers method with a specific user ID filter
        // Since there's no specific getUser method, we'll fetch users and filter
        const response = await adminService.getUsers({
          search: customerId,
          per_page: 1,
        })

        // Find the customer by ID
        const foundCustomer = response.items?.find((user: any) => user.id.toString() === customerId)

        if (foundCustomer) {
          // For now, we'll use the basic user data and add empty arrays for related data
          // In a real implementation, you'd fetch this data from separate endpoints
          setCustomer({
            ...foundCustomer,
            recent_orders: [],
            addresses: [],
            recent_reviews: [],
            cart_items: [],
            wishlist_items: [],
          })
        } else {
          toast({
            title: "Error",
            description: "Customer not found",
            variant: "destructive",
          })
          router.push("/admin/customers")
        }
      } catch (error) {
        console.error("Failed to fetch customer details:", error)
        toast({
          title: "Error",
          description: "Failed to load customer details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomerDetails()
  }, [customerId, isAuthenticated, router])

  const handleActivateCustomer = async () => {
    if (!customer) return

    try {
      setIsUpdating(true)
      await adminService.activateUser(customer.id.toString())
      setCustomer({ ...customer, is_active: true })
      toast({
        title: "Success",
        description: "Customer activated successfully",
      })
    } catch (error) {
      console.error("Failed to activate customer:", error)
      toast({
        title: "Error",
        description: "Failed to activate customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeactivateCustomer = async () => {
    if (!customer) return

    try {
      setIsUpdating(true)
      await adminService.deactivateUser(customer.id.toString())
      setCustomer({ ...customer, is_active: false })
      toast({
        title: "Success",
        description: "Customer deactivated successfully",
      })
    } catch (error) {
      console.error("Failed to deactivate customer:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
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

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold mb-4">Customer Not Found</h2>
        <p className="text-muted-foreground mb-4">The customer you're looking for doesn't exist.</p>
        <Button onClick={() => router.push("/admin/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/customers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground">Customer ID: {customer.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {customer.is_active ? (
            <Button variant="outline" onClick={handleDeactivateCustomer} disabled={isUpdating}>
              <Ban className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
          ) : (
            <Button variant="outline" onClick={handleActivateCustomer} disabled={isUpdating}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Activate
            </Button>
          )}
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Customer Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email</span>
                </div>
                <p className="text-sm">{customer.email}</p>
              </div>

              {customer.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Phone</span>
                  </div>
                  <p className="text-sm">{customer.phone}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Member Since</span>
                </div>
                <p className="text-sm">{formatDate(customer.created_at)}</p>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Role</span>
                <div>
                  {customer.role === "ADMIN" ? (
                    <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800">Customer</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Status</span>
                <div>
                  {customer.is_active ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Orders</span>
              </div>
              <span className="font-medium">{customer.recent_orders?.length || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Wishlist Items</span>
              </div>
              <span className="font-medium">{customer.wishlist_items?.length || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Cart Items</span>
              </div>
              <span className="font-medium">{customer.cart_items?.length || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Addresses</span>
              </div>
              <span className="font-medium">{customer.addresses?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest orders from this customer</CardDescription>
        </CardHeader>
        <CardContent>
          {customer.recent_orders && customer.recent_orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.recent_orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.order_number}</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No orders found for this customer</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>Addresses</CardTitle>
          <CardDescription>Customer's saved addresses</CardDescription>
        </CardHeader>
        <CardContent>
          {customer.addresses && customer.addresses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {customer.addresses.map((address, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{address.type || "Address"}</span>
                    {address.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      {address.first_name} {address.last_name}
                    </p>
                    <p>{address.address_line1}</p>
                    {address.address_line2 && <p>{address.address_line2}</p>}
                    <p>
                      {address.city}, {address.state} {address.postal_code}
                    </p>
                    <p>{address.country}</p>
                    {address.phone && <p>Phone: {address.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No addresses found for this customer</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
