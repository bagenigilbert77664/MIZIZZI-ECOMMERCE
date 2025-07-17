"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  MoreHorizontal,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"

interface CustomerProfile {
  id: string
  name: string
  email: string
  phone?: string
  avatar_url?: string
  profileCompletion: number
  status: "active" | "inactive" | "suspended"
  verificationStatus: "verified" | "pending" | "unverified"
  joinDate: string
  lastActive: string
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  loyaltyPoints: number
  preferredCategories: string[]
  address?: {
    street?: string
    city?: string
    country?: string
  }
  preferences?: {
    newsletter?: boolean
    smsNotifications?: boolean
    emailNotifications?: boolean
  }
  riskLevel: "low" | "medium" | "high"
  role: string
  email_verified: boolean
  phone_verified: boolean
  is_active: boolean
  created_at: string
  last_login?: string
}

export default function CustomerProfilesPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerProfile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [verificationFilter, setVerificationFilter] = useState<string>("all")
  const [completionFilter, setCompletionFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const { toast } = useToast()

  // Calculate profile completion based on available data
  const calculateProfileCompletion = (customer: any): number => {
    let completion = 0
    const fields = [
      customer.name,
      customer.email,
      customer.phone,
      customer.avatar_url,
      customer.address?.street,
      customer.address?.city,
      customer.address?.country,
      customer.email_verified,
      customer.phone_verified,
    ]

    const filledFields = fields.filter((field) => field && field !== "").length
    completion = Math.round((filledFields / fields.length) * 100)

    return Math.min(completion, 100)
  }

  // Calculate risk level based on customer data
  const calculateRiskLevel = (customer: any): "low" | "medium" | "high" => {
    let riskScore = 0

    // Email not verified
    if (!customer.email_verified) riskScore += 2

    // Phone not verified
    if (!customer.phone_verified) riskScore += 2

    // No recent activity (more than 30 days)
    if (customer.last_login) {
      const daysSinceLogin = Math.floor((Date.now() - new Date(customer.last_login).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLogin > 30) riskScore += 1
      if (daysSinceLogin > 90) riskScore += 2
    } else {
      riskScore += 3 // Never logged in
    }

    // Account not active
    if (!customer.is_active) riskScore += 3

    if (riskScore >= 5) return "high"
    if (riskScore >= 3) return "medium"
    return "low"
  }

  // Transform API customer data to our interface
  const transformCustomerData = (apiCustomer: any): CustomerProfile => {
    const profileCompletion = calculateProfileCompletion(apiCustomer)
    const riskLevel = calculateRiskLevel(apiCustomer)

    // Determine verification status
    let verificationStatus: "verified" | "pending" | "unverified" = "unverified"
    if (apiCustomer.email_verified && apiCustomer.phone_verified) {
      verificationStatus = "verified"
    } else if (apiCustomer.email_verified || apiCustomer.phone_verified) {
      verificationStatus = "pending"
    }

    // Determine account status
    let status: "active" | "inactive" | "suspended" = "inactive"
    if (apiCustomer.is_active) {
      status = "active"
    }
    // Note: We don't have suspended status in the current API, but we can add it later

    return {
      id: apiCustomer.id.toString(),
      name: apiCustomer.name || "Unknown User",
      email: apiCustomer.email || "",
      phone: apiCustomer.phone || "",
      avatar_url: apiCustomer.avatar_url,
      profileCompletion,
      status,
      verificationStatus,
      joinDate: apiCustomer.created_at || "",
      lastActive: apiCustomer.last_login || apiCustomer.created_at || "",
      totalOrders: 0, // Will be calculated from orders API
      totalSpent: 0, // Will be calculated from orders API
      averageOrderValue: 0, // Will be calculated from orders API
      loyaltyPoints: 0, // Will be added when loyalty system is implemented
      preferredCategories: [], // Will be calculated from order history
      address: apiCustomer.address || {},
      preferences: {
        newsletter: true, // Default values, will be updated when preferences are implemented
        smsNotifications: false,
        emailNotifications: true,
      },
      riskLevel,
      role: apiCustomer.role || "user",
      email_verified: apiCustomer.email_verified || false,
      phone_verified: apiCustomer.phone_verified || false,
      is_active: apiCustomer.is_active || false,
      created_at: apiCustomer.created_at || "",
      last_login: apiCustomer.last_login,
    }
  }

  // Fetch customers from API
  const fetchCustomers = async (page = 1) => {
    setIsLoading(true)
    try {
      console.log("Fetching customers from API...")

      const response = await adminService.getUsers({
        page,
        per_page: 50, // Get more customers per page
        role: "user", // Only get regular users, not admins
      })

      console.log("API Response:", response)

      if (response && response.items) {
        const transformedCustomers = response.items.map(transformCustomerData)
        setCustomers(transformedCustomers)
        setFilteredCustomers(transformedCustomers)

        if (response.pagination) {
          setCurrentPage(response.pagination.page)
          setTotalPages(response.pagination.total_pages)
          setTotalItems(response.pagination.total_items)
        }

        toast({
          title: "Success",
          description: `Loaded ${transformedCustomers.length} customer profiles.`,
        })
      } else {
        console.warn("No customer data received from API")
        setCustomers([])
        setFilteredCustomers([])
        toast({
          title: "No Data",
          description: "No customer profiles found.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast({
        title: "Error",
        description: "Failed to load customer profiles. Please try again.",
        variant: "destructive",
      })
      setCustomers([])
      setFilteredCustomers([])
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchCustomers()
  }, [])

  // Filter customers based on search and filters
  useEffect(() => {
    const filtered = customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchTerm))

      const matchesStatus = statusFilter === "all" || customer.status === statusFilter
      const matchesVerification = verificationFilter === "all" || customer.verificationStatus === verificationFilter

      let matchesCompletion = true
      if (completionFilter === "high") matchesCompletion = customer.profileCompletion >= 80
      else if (completionFilter === "medium")
        matchesCompletion = customer.profileCompletion >= 50 && customer.profileCompletion < 80
      else if (completionFilter === "low") matchesCompletion = customer.profileCompletion < 50

      return matchesSearch && matchesStatus && matchesVerification && matchesCompletion
    })

    setFilteredCustomers(filtered)
  }, [customers, searchTerm, statusFilter, verificationFilter, completionFilter])

  const handleUpdateStatus = async (customerId: string, newStatus: "active" | "inactive" | "suspended") => {
    setIsUpdating(true)
    try {
      // Map our status to API status
      const apiStatus = newStatus === "active"

      await adminService.updateUser(customerId, { is_active: apiStatus })

      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId ? { ...customer, status: newStatus, is_active: apiStatus } : customer,
        ),
      )

      toast({
        title: "Status Updated",
        description: `Customer status has been updated to ${newStatus}.`,
      })
    } catch (error) {
      console.error("Error updating customer status:", error)
      toast({
        title: "Error",
        description: "Failed to update customer status.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleVerifyProfile = async (customerId: string) => {
    setIsUpdating(true)
    try {
      // In a real implementation, this would call an API to verify the profile
      // For now, we'll just update the local state
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId
            ? { ...customer, verificationStatus: "verified" as const, email_verified: true, phone_verified: true }
            : customer,
        ),
      )

      toast({
        title: "Profile Verified",
        description: "Customer profile has been verified successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify customer profile.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
    }
    return variants[status as keyof typeof variants] || variants.inactive
  }

  const getVerificationBadge = (status: string) => {
    const variants = {
      verified: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      unverified: "bg-red-100 text-red-800",
    }
    return variants[status as keyof typeof variants] || variants.unverified
  }

  const getRiskBadge = (level: string) => {
    const variants = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    }
    return variants[level as keyof typeof variants] || variants.low
  }

  // Calculate statistics
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    verified: customers.filter((c) => c.verificationStatus === "verified").length,
    highCompletion: customers.filter((c) => c.profileCompletion >= 80).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading customer profiles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Profiles</h1>
          <p className="text-muted-foreground">Manage and monitor customer profile information and completion status</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchCustomers(currentPage)} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All customer profiles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Profiles</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verified}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.verified / stats.total) * 100).toFixed(1) : 0}% verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complete Profiles</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highCompletion}</div>
            <p className="text-xs text-muted-foreground">80%+ completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Management</CardTitle>
          <CardDescription>Search, filter, and manage customer profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={completionFilter} onValueChange={setCompletionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Completion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Completion</SelectItem>
                <SelectItem value="high">High (80%+)</SelectItem>
                <SelectItem value="medium">Medium (50-79%)</SelectItem>
                <SelectItem value="low">Low (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Profiles ({filteredCustomers.length})</CardTitle>
          {totalItems > 0 && (
            <CardDescription>
              Showing {filteredCustomers.length} of {totalItems} total customers
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No customers found</h3>
              <p className="text-muted-foreground">
                {customers.length === 0
                  ? "No customer profiles are available in the database."
                  : "No customers match your current filters. Try adjusting your search criteria."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Profile Completion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Account Info</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={customer.avatar_url || "/placeholder.svg"} alt={customer.name} />
                            <AvatarFallback>
                              {customer.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">ID: {customer.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                            {customer.email_verified && <UserCheck className="h-3 w-3 ml-1 text-green-600" />}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" />
                              {customer.phone}
                              {customer.phone_verified && <UserCheck className="h-3 w-3 ml-1 text-green-600" />}
                            </div>
                          )}
                          {customer.address?.city && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {customer.address.city}
                              {customer.address.country && `, ${customer.address.country}`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{customer.profileCompletion}%</span>
                          </div>
                          <Progress value={customer.profileCompletion} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(customer.status)}>{customer.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getVerificationBadge(customer.verificationStatus)}>
                          {customer.verificationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-1" />
                            Joined {new Date(customer.joinDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">Role: {customer.role}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskBadge(customer.riskLevel)}>{customer.riskLevel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          {customer.lastActive ? new Date(customer.lastActive).toLocaleDateString() : "Never"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isUpdating}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => window.open(`/admin/customers/${customer.id}`, "_blank")}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {customer.verificationStatus !== "verified" && (
                              <DropdownMenuItem onClick={() => handleVerifyProfile(customer.id)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Verify Profile
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => window.open(`mailto:${customer.email}`, "_blank")}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {customer.status !== "active" && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(customer.id, "active")}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            {customer.status === "active" && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(customer.id, "inactive")}>
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
