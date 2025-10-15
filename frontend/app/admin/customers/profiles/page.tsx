"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  MoreHorizontal,
  Eye,
  UserCheck,
  UserX,
  Mail,
  Download,
  RefreshCw,
  Users,
  Clock,
  X,
  TrendingUp,
  CheckCircle2,
  Ban,
  Edit,
  Trash2,
  MessageSquare,
  Activity,
  ShoppingBag,
  Calendar,
  CreditCard,
  Star,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { formatDate } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmailComposer } from "@/components/admin/email-composer"

export default function CustomerProfilesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")
  const [verificationFilter, setVerificationFilter] = useState("all")
  const [completionFilter, setCompletionFilter] = useState("all")
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [perPage, setPerPage] = useState(10)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    verified: 0,
    complete: 0,
  })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Email Composer State
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState<{ email: string; name: string } | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true)
        const params: any = {
          page: currentPage,
          per_page: perPage,
          q: searchQuery || undefined,
        }

        if (statusFilter !== "all") {
          params.is_active = statusFilter === "active"
        }

        // NOTE: verificationFilter and completionFilter are not yet implemented in the backend API
        // if (verificationFilter !== "all") {
        //   params.is_verified = verificationFilter === "verified"
        // }
        // if (completionFilter !== "all") {
        //   params.is_complete = completionFilter === "complete"
        // }

        const response = await adminService.getUsers(params)
        const items = response.items || []
        setCustomers(items)
        setTotalPages(response.pagination?.total_pages || 1)
        setTotalCustomers(response.pagination?.total_items || 0)

        // Calculate stats
        setStats({
          total: response.pagination?.total_items || 0,
          active: items.filter((c: any) => c.is_active).length,
          verified: 0, // Would come from backend
          complete: 0, // Would come from backend
        })
      } catch (error) {
        console.error("Failed to fetch customers:", error)
        toast({
          title: "Error",
          description: "Failed to load customer profiles. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchCustomers()
    }
  }, [isAuthenticated, currentPage, searchQuery, statusFilter, verificationFilter, completionFilter, perPage])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleActivateUser = async (id: string) => {
    try {
      await adminService.activateUser(id)
      setCustomers(customers.map((customer) => (customer.id === id ? { ...customer, is_active: true } : customer)))
      // Update stats if the user was previously inactive
      setStats((prev) => ({
        ...prev,
        active: prev.active + 1,
      }))
      toast({
        title: "Success",
        description: "Customer activated successfully",
      })
    } catch (error) {
      console.error(`Failed to activate customer ${id}:`, error)
      toast({
        title: "Error",
        description: "Failed to activate customer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeactivateUser = async (id: string) => {
    try {
      await adminService.deactivateUser(id)
      setCustomers(customers.map((customer) => (customer.id === id ? { ...customer, is_active: false } : customer)))
      // Update stats if the user was previously active
      setStats((prev) => ({
        ...prev,
        active: prev.active - 1,
      }))
      toast({
        title: "Success",
        description: "Customer deactivated successfully",
      })
    } catch (error) {
      console.error(`Failed to deactivate customer ${id}:`, error)
      toast({
        title: "Error",
        description: "Failed to deactivate customer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(customers.map((c) => c.id))
    } else {
      setSelectedCustomers([])
    }
  }

  const handleSelectCustomer = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, id])
    } else {
      setSelectedCustomers(selectedCustomers.filter((cid) => cid !== id))
    }
  }

  const handleBulkActivate = async () => {
    try {
      await Promise.all(selectedCustomers.map((id) => adminService.activateUser(id)))
      const updatedCustomers = customers.map((customer) =>
        selectedCustomers.includes(customer.id) ? { ...customer, is_active: true } : customer,
      )
      setCustomers(updatedCustomers)

      // Update active count based on initially selected customers
      const newlyActiveCount = updatedCustomers.filter((c) => selectedCustomers.includes(c.id) && c.is_active).length
      setStats((prev) => ({
        ...prev,
        active: prev.active + newlyActiveCount,
      }))

      setSelectedCustomers([])
      toast({
        title: "Success",
        description: `${selectedCustomers.length} customers activated successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate customers. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(selectedCustomers.map((id) => adminService.deactivateUser(id)))
      const updatedCustomers = customers.map((customer) =>
        selectedCustomers.includes(customer.id) ? { ...customer, is_active: false } : customer,
      )
      setCustomers(updatedCustomers)

      // Update active count based on initially selected customers
      const newlyInactiveCount = updatedCustomers.filter((c) => selectedCustomers.includes(c.id) && !c.is_active).length
      setStats((prev) => ({
        ...prev,
        active: prev.active - newlyInactiveCount,
      }))

      setSelectedCustomers([])
      toast({
        title: "Success",
        description: `${selectedCustomers.length} customers deactivated successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate customers. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleViewDetails = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDetailsOpen(true)
  }

  const handleRefresh = () => {
    setCurrentPage(1)
    setSearchQuery("")
    setStatusFilter("all")
    setVerificationFilter("all")
    setCompletionFilter("all")
    setSelectedCustomers([])
    // Re-fetch data to ensure accuracy after refresh
    // fetchCustomers() -- This would require fetching within this handler or using a refetch function
  }

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Customer profile data is being exported...",
    })
    // TODO: Implement actual export functionality
  }

  const handleEditProfile = (customer: any) => {
    setSelectedCustomer(customer)
    setEditFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      role: customer.role || "USER", // Default to USER if role is missing
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateProfile = async () => {
    if (!selectedCustomer) return

    try {
      setIsSubmitting(true)
      const { role, ...updateData } = editFormData
      await adminService.updateUser(selectedCustomer.id, updateData)

      // Update local state
      setCustomers(
        customers.map((customer) => (customer.id === selectedCustomer.id ? { ...customer, ...updateData } : customer)),
      )

      // Update selected customer if details sheet is open
      if (isDetailsOpen) {
        setSelectedCustomer({ ...selectedCustomer, ...updateData })
      }

      toast({
        title: "Success",
        description: "Customer profile updated successfully",
      })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Failed to update customer:", error)
      toast({
        title: "Error",
        description: "Failed to update customer profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProfile = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return

    try {
      setIsSubmitting(true)
      await adminService.deleteUser(selectedCustomer.id)

      // Remove from local state
      setCustomers(customers.filter((customer) => customer.id !== selectedCustomer.id))

      // Update stats
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        active: selectedCustomer.is_active ? prev.active - 1 : prev.active,
      }))

      toast({
        title: "Success",
        description: "Customer profile deleted successfully",
      })
      setIsDeleteDialogOpen(false)
      setIsDetailsOpen(false)

      if (customers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    } catch (error) {
      console.error("Failed to delete customer:", error)
      toast({
        title: "Error",
        description: "Failed to delete customer profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate profile completion percentage (mock data)
  const getProfileCompletion = (customer: any) => {
    let completion = 0
    if (customer.name) completion += 20
    if (customer.email) completion += 20
    if (customer.phone) completion += 20
    if (customer.address) completion += 20 // Assuming address is a field
    if (customer.is_active) completion += 20
    // Add more fields as needed for completion calculation
    return completion
  }

  // Get risk level (mock data)
  const getRiskLevel = (customer: any) => {
    // This is a placeholder. Real risk assessment would involve more factors.
    const random = Math.random()
    if (random < 0.7) return "low"
    if (random < 0.9) return "medium"
    return "high"
  }

  // Function to open email composer
  const handleSendEmail = (customer: any) => {
    setEmailRecipient({ email: customer.email, name: customer.name })
    setSelectedCustomer(customer) // Store the full customer object to access userId
    setIsEmailComposerOpen(true)
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const activeFiltersCount = [statusFilter !== "all", verificationFilter !== "all", completionFilter !== "all"].filter(
    Boolean,
  ).length

  return (
    <div className="flex flex-col gap-8 p-8 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Customer Profiles
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Manage and monitor customer profile information and completion status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={handleExport}
              className="h-10 px-4 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              className="h-10 px-4 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Profiles</p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{stats.total}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">All customer profiles</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                  <Users className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Customers</p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{stats.active}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% of total
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Verified Profiles</p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {stats.verified}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {stats.total > 0 ? ((stats.verified / stats.total) * 100).toFixed(1) : 0}% verified
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Complete Profiles</p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    {stats.complete}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">80%+ completion rate</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                  <Activity className="h-7 w-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg">
        {/* Filters and Search */}
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search customers..."
                  className="pl-11 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 transition-colors text-base"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-[160px] h-11 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                  <SelectTrigger className="w-full lg:w-[180px] h-11 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <SelectValue placeholder="All Verification" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verification</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={completionFilter} onValueChange={setCompletionFilter}>
                  <SelectTrigger className="w-full lg:w-[180px] h-11 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <SelectValue placeholder="All Completion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Completion</SelectItem>
                    <SelectItem value="complete">Complete (80%+)</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>

                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => {
                      setStatusFilter("all")
                      setVerificationFilter("all")
                      setCompletionFilter("all")
                    }}
                    className="h-11 px-4"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear ({activeFiltersCount})
                  </Button>
                )}
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedCustomers.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white font-semibold">
                    {selectedCustomers.length}
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedCustomers.length} customer{selectedCustomers.length > 1 ? "s" : ""} selected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkActivate}
                    className="h-9 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDeactivate}
                    className="h-9 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-700 dark:text-red-300"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomers([])} className="h-9">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex h-[500px] items-center justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-slate-800/60">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCustomers.length === customers.length && customers.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="border-slate-300 dark:border-slate-700"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Customer</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Contact</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                      Profile Completion
                    </TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Verification</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Account Info</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Risk Level</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Last Active</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                            <Users className="h-8 w-8 text-slate-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-medium text-slate-900 dark:text-white">No customers found</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Try adjusting your search or filters
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => {
                      const completion = getProfileCompletion(customer)
                      const riskLevel = getRiskLevel(customer)

                      return (
                        <TableRow
                          key={customer.id}
                          className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60 transition-colors"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedCustomers.includes(customer.id)}
                              onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                              className="border-slate-300 dark:border-slate-700"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white font-semibold shadow-sm">
                                {customer.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <div className="space-y-0.5">
                                <p className="font-medium text-slate-900 dark:text-white">{customer.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">ID: {customer.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {customer.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 min-w-[120px]">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {completion}%
                                </span>
                              </div>
                              <Progress value={completion} className="h-2 bg-slate-100 dark:bg-slate-800" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.is_active ? (
                              <Badge className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 font-medium">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                                active
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium">
                                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-2" />
                                inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/30 font-medium">
                              unverified
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Calendar className="h-3 w-3" />
                                Joined {formatDate(customer.created_at)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-500">
                                Role: {customer.role?.toLowerCase() || "user"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {riskLevel === "low" && (
                              <Badge className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 font-medium">
                                low
                              </Badge>
                            )}
                            {riskLevel === "medium" && (
                              <Badge className="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 hover:bg-amber-100 dark:hover:bg-amber-950/30 font-medium">
                                medium
                              </Badge>
                            )}
                            {riskLevel === "high" && (
                              <Badge className="bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/30 font-medium">
                                high
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(customer.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(customer)}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel className="font-semibold">Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Full Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditProfile(customer)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendEmail(customer)}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Add Note
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {customer.is_active ? (
                                    <DropdownMenuItem
                                      onClick={() => handleDeactivateUser(customer.id)}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <Ban className="mr-2 h-4 w-4" />
                                      Suspend Account
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleActivateUser(customer.id)}
                                      className="text-emerald-600 dark:text-emerald-400"
                                    >
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Activate Account
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteProfile(customer)}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Profile
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Rows per page</span>
                  <Select
                    value={perPage.toString()}
                    onValueChange={(value) => {
                      setPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-9 border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalCustomers)} of{" "}
                  {totalCustomers}
                </p>
              </div>
              <Pagination>
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (currentPage !== 1) setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }}
                      aria-disabled={currentPage === 1}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-40"
                          : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber =
                      currentPage <= 3
                        ? i + 1
                        : currentPage >= totalPages - 2
                          ? totalPages - 4 + i
                          : currentPage - 2 + i

                    if (pageNumber <= 0 || pageNumber > totalPages) return null

                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          isActive={currentPage === pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={
                            currentPage === pageNumber
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          }
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        if (currentPage !== totalPages) setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }}
                      aria-disabled={currentPage === totalPages}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-40"
                          : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </Card>

      {/* Customer Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-white dark:bg-slate-900">
          <SheetHeader className="space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800">
            <SheetTitle className="text-2xl font-semibold">Customer Profile</SheetTitle>
            <SheetDescription className="text-base">
              Complete profile information and management controls
            </SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <div className="mt-6 space-y-6">
              {/* Profile Header */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-white font-bold text-2xl shadow-lg">
                      {selectedCustomer.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedCustomer.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{selectedCustomer.email}</p>
                      <div className="flex items-center gap-2 pt-1">
                        {selectedCustomer.is_active ? (
                          <Badge className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                            Inactive
                          </Badge>
                        )}
                        <Badge className="bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-900">
                          {selectedCustomer.role || "Customer"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-12 bg-slate-100 dark:bg-slate-800">
                  <TabsTrigger value="overview" className="text-sm font-medium">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="text-sm font-medium">
                    Orders
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-sm font-medium">
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-sm font-medium">
                    Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 dark:text-slate-400">Customer ID</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedCustomer.id}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 dark:text-slate-400">Member Since</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatDate(selectedCustomer.created_at)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 dark:text-slate-400">Last Updated</Label>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatDate(selectedCustomer.updated_at)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 dark:text-slate-400">Profile Completion</Label>
                          <div className="flex items-center gap-2">
                            <Progress value={getProfileCompletion(selectedCustomer)} className="h-2 flex-1" />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {getProfileCompletion(selectedCustomer)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <ShoppingBag className="h-5 w-5 mx-auto text-blue-500" />
                          <p className="text-2xl font-semibold text-slate-900 dark:text-white">0</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Total Orders</p>
                        </div>
                        <div className="space-y-2 text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <CreditCard className="h-5 w-5 mx-auto text-emerald-500" />
                          <p className="text-2xl font-semibold text-slate-900 dark:text-white">$0</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Total Spent</p>
                        </div>
                        <div className="space-y-2 text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <Star className="h-5 w-5 mx-auto text-amber-500" />
                          <p className="text-2xl font-semibold text-slate-900 dark:text-white">0</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Reviews</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="orders" className="space-y-4 mt-4">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-8 text-center">
                      <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No orders yet</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 mt-4">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-8 text-center">
                      <Activity className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No activity recorded</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4 mt-4">
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-4 space-y-3">
                      <Textarea placeholder="Add a note about this customer..." className="min-h-[120px] resize-none" />
                      <Button size="sm" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Account Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-11 bg-transparent"
                    onClick={() => handleSendEmail(selectedCustomer)}
                  >
                    <Mail className="mr-3 h-4 w-4" />
                    Send Email
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-11 bg-transparent"
                    onClick={() => handleEditProfile(selectedCustomer)}
                  >
                    <Edit className="mr-3 h-4 w-4" />
                    Edit Profile
                  </Button>
                  {selectedCustomer.is_active ? (
                    <Button
                      variant="outline"
                      className="w-full justify-start h-11 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 bg-transparent"
                      onClick={() => {
                        handleDeactivateUser(selectedCustomer.id)
                        setIsDetailsOpen(false) // Close details sheet after action
                      }}
                    >
                      <Ban className="mr-3 h-4 w-4" />
                      Suspend Account
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start h-11 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 bg-transparent"
                      onClick={() => {
                        handleActivateUser(selectedCustomer.id)
                        setIsDetailsOpen(false) // Close details sheet after action
                      }}
                    >
                      <UserCheck className="mr-3 h-4 w-4" />
                      Activate Account
                    </Button>
                  )}
                  <Separator className="my-2" />
                  <Button
                    variant="outline"
                    className="w-full justify-start h-11 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 bg-transparent"
                    onClick={() => handleDeleteProfile(selectedCustomer)}
                  >
                    <Trash2 className="mr-3 h-4 w-4" />
                    Delete Profile
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Edit Customer Profile</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Update customer information and account details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter customer name"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Enter email address"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={isSubmitting}
              className="h-10 bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader  />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl font-semibold">Delete Customer Profile</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-slate-600 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{selectedCustomer?.name}</span>? This
              action cannot be undone and will permanently remove all customer data, orders, and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isSubmitting} className="h-10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="h-10 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader />
                  Deleting...
                </>
              ) : (
                "Delete Profile"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailRecipient && selectedCustomer && (
        <EmailComposer
          isOpen={isEmailComposerOpen}
          onClose={() => {
            setIsEmailComposerOpen(false)
            setEmailRecipient(null)
            // No longer clearing selectedCustomer here.
          }}
          recipientEmail={emailRecipient.email}
          recipientName={emailRecipient.name}
          userId={selectedCustomer.id}
        />
      )}
    </div>
  )
}
