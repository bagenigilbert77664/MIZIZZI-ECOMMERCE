"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Package,
  Activity,
  Settings,
  MoreVertical,
  Download,
  Trash2,
  Lock,
  Unlock,
  MessageSquare,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
  avatar_url?: string
  address?: string
  city?: string
  country?: string
  postal_code?: string
  notes?: string
}

interface Order {
  id: number
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  created_at: string
  items_count: number
}

interface ActivityLog {
  id: string
  action: string
  description: string
  timestamp: string
  ip_address?: string
}

export default function CustomerProfilePage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "activity" | "settings">("overview")
  const [editedCustomer, setEditedCustomer] = useState<Partial<Customer>>({})

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    lastOrderDate: null as string | null,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!isAuthenticated || !customerId) return

      try {
        setIsLoading(true)

        // Fetch customer details
        const usersResponse = await adminService.getUsers({ q: customerId })
        const customerData = usersResponse.items?.find((u: any) => u.id === customerId)

        if (!customerData) {
          toast({
            title: "Error",
            description: "Customer not found",
            variant: "destructive",
          })
          router.push("/admin/customers")
          return
        }

        setCustomer(customerData)
        setEditedCustomer(customerData)

        // Fetch customer orders
        try {
          const ordersResponse = await adminService.getOrders({ search: customerData.email })
          const customerOrders = ordersResponse.items || []
          setOrders(customerOrders)

          // Calculate stats
          const totalSpent = customerOrders.reduce((sum: number, order: Order) => sum + order.total_amount, 0)
          const avgOrderValue = customerOrders.length > 0 ? totalSpent / customerOrders.length : 0
          const lastOrder = customerOrders.length > 0 ? customerOrders[0].created_at : null

          setStats({
            totalOrders: customerOrders.length,
            totalSpent,
            averageOrderValue: avgOrderValue,
            lastOrderDate: lastOrder,
          })
        } catch (error) {
          console.error("Failed to fetch orders:", error)
        }

        // Mock activity logs (replace with actual API call when available)
        setActivityLogs([
          {
            id: "1",
            action: "Account Created",
            description: "Customer account was created",
            timestamp: customerData.created_at,
          },
          {
            id: "2",
            action: "Profile Updated",
            description: "Customer updated their profile information",
            timestamp: customerData.updated_at,
          },
        ])
      } catch (error) {
        console.error("Failed to fetch customer data:", error)
        toast({
          title: "Error",
          description: "Failed to load customer data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomerData()
  }, [isAuthenticated, customerId, router])

  const handleSave = async () => {
    if (!customer) return

    try {
      setIsSaving(true)
      // TODO: Implement update customer API
      // await adminService.updateUser(customer.id, editedCustomer)

      setCustomer({ ...customer, ...editedCustomer })
      setIsEditing(false)

      toast({
        title: "Success",
        description: "Customer profile updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!customer) return

    try {
      if (customer.is_active) {
        await adminService.deactivateUser(customer.id)
        setCustomer({ ...customer, is_active: false })
        toast({
          title: "Success",
          description: "Customer account deactivated",
        })
      } else {
        await adminService.activateUser(customer.id)
        setCustomer({ ...customer, is_active: true })
        toast({
          title: "Success",
          description: "Customer account activated",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer status",
        variant: "destructive",
      })
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!customer) {
    return null
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      PENDING: { label: "Pending", className: "apple-badge-gray", icon: Clock },
      CONFIRMED: { label: "Confirmed", className: "apple-badge-blue", icon: CheckCircle2 },
      PROCESSING: { label: "Processing", className: "apple-badge-blue", icon: Package },
      SHIPPED: { label: "Shipped", className: "apple-badge-purple", icon: Package },
      DELIVERED: { label: "Delivered", className: "apple-badge-green", icon: CheckCircle2 },
      CANCELLED: { label: "Cancelled", className: "apple-badge-red", icon: XCircle },
      RETURNED: { label: "Returned", className: "apple-badge-gray", icon: AlertCircle },
    }

    const config = statusConfig[status] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <Badge className={`apple-badge ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Pending", className: "apple-badge-gray" },
      PAID: { label: "Paid", className: "apple-badge-green" },
      FAILED: { label: "Failed", className: "apple-badge-red" },
      REFUNDED: { label: "Refunded", className: "apple-badge-purple" },
    }

    const config = statusConfig[status] || statusConfig.PENDING

    return <Badge className={`apple-badge ${config.className}`}>{config.label}</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/customers")}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Profile</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage customer information and activity</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setEditedCustomer(customer)
                    }}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
                    {isSaving ? (
                      <>
                        <Loader className="h-4 w-4 mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-gray-100 dark:hover:bg-gray-800 bg-transparent"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => (window.location.href = `mailto:${customer.email}`)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleToggleStatus}>
                        {customer.is_active ? (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Deactivate Account
                          </>
                        ) : (
                          <>
                            <Unlock className="mr-2 h-4 w-4" />
                            Activate Account
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Customer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Customer Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="apple-profile-card p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 border-4 border-gray-100 dark:border-gray-800">
                  <AvatarImage src={customer.avatar_url || "/placeholder.svg"} alt={customer.name} />
                  <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                    {customer.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="mt-4 space-y-2">
                  {isEditing ? (
                    <Input
                      value={editedCustomer.name || ""}
                      onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                      className="text-center font-semibold"
                    />
                  ) : (
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{customer.name}</h2>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    {customer.role === "ADMIN" ? (
                      <Badge className="apple-badge apple-badge-purple">
                        <Shield className="h-3 w-3" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge className="apple-badge apple-badge-blue">Customer</Badge>
                    )}

                    {customer.is_active ? (
                      <Badge className="apple-badge apple-badge-green">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="apple-badge apple-badge-red">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="w-full space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editedCustomer.email || ""}
                          onChange={(e) => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{customer.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                      {isEditing ? (
                        <Input
                          type="tel"
                          value={editedCustomer.phone || ""}
                          onChange={(e) => setEditedCustomer({ ...editedCustomer, phone: e.target.value })}
                          placeholder="Add phone number"
                          className="text-sm"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.phone || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Address</p>
                      {isEditing ? (
                        <Textarea
                          value={editedCustomer.address || ""}
                          onChange={(e) => setEditedCustomer({ ...editedCustomer, address: e.target.value })}
                          placeholder="Add address"
                          className="text-sm min-h-[60px]"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer.address || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Member Since</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(customer.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="apple-stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                    <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalOrders}</p>
                  </div>
                </div>
              </Card>

              <Card className="apple-stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(stats.totalSpent)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="apple-stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Avg Order</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(stats.averageOrderValue)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="apple-stat-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Last Order</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {stats.lastOrderDate ? formatDate(stats.lastOrderDate) : "Never"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Notes Section */}
            {isEditing && (
              <Card className="apple-profile-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Internal Notes</h3>
                </div>
                <Textarea
                  value={editedCustomer.notes || ""}
                  onChange={(e) => setEditedCustomer({ ...editedCustomer, notes: e.target.value })}
                  placeholder="Add internal notes about this customer..."
                  className="min-h-[100px]"
                />
              </Card>
            )}
          </div>

          {/* Right Column - Tabs Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <Card className="apple-profile-card">
              <div className="border-b border-gray-200 dark:border-gray-800">
                <div className="flex gap-8 px-6">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`apple-tab ${activeTab === "overview" ? "apple-tab-active" : ""}`}
                  >
                    <Activity className="h-4 w-4 inline mr-2" />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`apple-tab ${activeTab === "orders" ? "apple-tab-active" : ""}`}
                  >
                    <Package className="h-4 w-4 inline mr-2" />
                    Orders ({stats.totalOrders})
                  </button>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`apple-tab ${activeTab === "activity" ? "apple-tab-active" : ""}`}
                  >
                    <Clock className="h-4 w-4 inline mr-2" />
                    Activity
                  </button>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className={`apple-tab ${activeTab === "settings" ? "apple-tab-active" : ""}`}
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Settings
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Overview</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Status</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {customer.is_active ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Type</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">{customer.role}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Updated</p>
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {formatDate(customer.updated_at)}
                          </p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Customer ID</p>
                          <p className="text-base font-mono text-gray-900 dark:text-white">{customer.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </div>

                    {customer.notes && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Internal Notes</h3>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {customer.notes}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h3>
                      {orders.length > 0 ? (
                        <div className="space-y-3">
                          {orders.slice(0, 3).map((order) => (
                            <div
                              key={order.id}
                              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                              onClick={() => router.push(`/admin/orders/${order.id}`)}
                            >
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                                  <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{order.order_number}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDate(order.created_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {getStatusBadge(order.status)}
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(order.total_amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Orders Tab */}
                {activeTab === "orders" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order History</h3>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    {orders.length > 0 ? (
                      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Payment</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders.map((order) => (
                              <TableRow
                                key={order.id}
                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                              >
                                <TableCell className="font-medium">{order.order_number}</TableCell>
                                <TableCell>{formatDate(order.created_at)}</TableCell>
                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                                <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(order.total_amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">No orders found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === "activity" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>

                    <div className="space-y-4">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{log.description}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{formatDate(log.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === "settings" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Account Status</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {customer.is_active ? "Account is active" : "Account is deactivated"}
                            </p>
                          </div>
                          <Button variant="outline" onClick={handleToggleStatus}>
                            {customer.is_active ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Manage email notification preferences
                            </p>
                          </div>
                          <Button variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Export Customer Data</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Download all customer information
                            </p>
                          </div>
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900">
                          <div>
                            <p className="font-medium text-red-900 dark:text-red-400">Delete Customer</p>
                            <p className="text-sm text-red-700 dark:text-red-500 mt-1">
                              Permanently delete this customer and all associated data
                            </p>
                          </div>
                          <Button variant="destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
