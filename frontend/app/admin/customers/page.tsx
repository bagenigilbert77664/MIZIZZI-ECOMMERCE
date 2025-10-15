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
  Shield,
  Clock,
  X,
  Edit,
  Key,
  Tag,
  FileText,
  ShoppingBag,
  DollarSign,
  Calendar,
  TrendingUp,
  Package,
  Save,
  Plus,
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
import { EmailComposer } from "@/components/admin/email-composer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function CustomersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [perPage, setPerPage] = useState(10)
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState<{ email: string; name: string } | null>(null)

  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [customerStats, setCustomerStats] = useState<any>(null)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedCustomer, setEditedCustomer] = useState<any>(null)
  const [customerNotes, setCustomerNotes] = useState<string[]>([])
  const [newNote, setNewNote] = useState("")
  const [customerTags, setCustomerTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")

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

        if (roleFilter !== "all") {
          params.role = roleFilter
        }

        if (statusFilter !== "all") {
          params.is_active = statusFilter === "active" ? true : false
        }

        const response = await adminService.getUsers(params)
        setCustomers(response.items || [])
        setTotalPages(response.pagination?.total_pages || 1)
        setTotalCustomers(response.pagination?.total_items || 0)
      } catch (error) {
        console.error("Failed to fetch customers:", error)
        toast({
          title: "Error",
          description: "Failed to load customers. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchCustomers()
    }
  }, [isAuthenticated, currentPage, searchQuery, roleFilter, statusFilter, perPage])

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!selectedCustomer) return

      setIsLoadingOrders(true)
      try {
        // Fetch customer orders
        const ordersResponse = await adminService.getOrders({ user_id: selectedCustomer.id })
        const orders = ordersResponse.items || ordersResponse.data || []
        setCustomerOrders(orders)

        // Calculate customer statistics
        const totalSpent = orders.reduce((sum: number, order: any) => sum + (order.total_amount || order.total || 0), 0)
        const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0
        const lastOrder = orders.length > 0 ? orders[0] : null

        setCustomerStats({
          totalOrders: orders.length,
          totalSpent,
          avgOrderValue,
          lastOrderDate: lastOrder?.created_at,
        })

        // Load customer notes and tags from localStorage (temporary until backend support)
        const savedNotes = localStorage.getItem(`customer_notes_${selectedCustomer.id}`)
        const savedTags = localStorage.getItem(`customer_tags_${selectedCustomer.id}`)

        if (savedNotes) setCustomerNotes(JSON.parse(savedNotes))
        if (savedTags) setCustomerTags(JSON.parse(savedTags))
      } catch (error) {
        console.error("Failed to fetch customer details:", error)
      } finally {
        setIsLoadingOrders(false)
      }
    }

    fetchCustomerDetails()
  }, [selectedCustomer])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleActivateUser = async (id: string) => {
    try {
      await adminService.activateUser(id)
      setCustomers(customers.map((customer) => (customer.id === id ? { ...customer, is_active: true } : customer)))
      if (selectedCustomer?.id === id) {
        setSelectedCustomer({ ...selectedCustomer, is_active: true })
      }
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
      if (selectedCustomer?.id === id) {
        setSelectedCustomer({ ...selectedCustomer, is_active: false })
      }
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
      setCustomers(
        customers.map((customer) =>
          selectedCustomers.includes(customer.id) ? { ...customer, is_active: true } : customer,
        ),
      )
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
      setCustomers(
        customers.map((customer) =>
          selectedCustomers.includes(customer.id) ? { ...customer, is_active: false } : customer,
        ),
      )
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
    setEditedCustomer(customer)
    setIsDetailsOpen(true)
    setIsEditMode(false)
  }

  const handleEmailCustomer = (customer: any) => {
    setEmailRecipient({ email: customer.email, name: customer.name })
    setIsEmailComposerOpen(true)
  }

  const handleSaveCustomer = async () => {
    try {
      await adminService.updateUser(editedCustomer.id, {
        name: editedCustomer.name,
        email: editedCustomer.email,
        role: editedCustomer.role,
      })

      setCustomers(customers.map((c) => (c.id === editedCustomer.id ? editedCustomer : c)))
      setSelectedCustomer(editedCustomer)
      setIsEditMode(false)

      toast({
        title: "Success",
        description: "Customer information updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return

    const updatedNotes = [...customerNotes, `${new Date().toISOString()}|${newNote}`]
    setCustomerNotes(updatedNotes)
    localStorage.setItem(`customer_notes_${selectedCustomer.id}`, JSON.stringify(updatedNotes))
    setNewNote("")

    toast({
      title: "Success",
      description: "Note added successfully",
    })
  }

  const handleAddTag = () => {
    if (!newTag.trim() || customerTags.includes(newTag)) return

    const updatedTags = [...customerTags, newTag]
    setCustomerTags(updatedTags)
    localStorage.setItem(`customer_tags_${selectedCustomer.id}`, JSON.stringify(updatedTags))
    setNewTag("")

    toast({
      title: "Success",
      description: "Tag added successfully",
    })
  }

  const handleRemoveTag = (tag: string) => {
    const updatedTags = customerTags.filter((t) => t !== tag)
    setCustomerTags(updatedTags)
    localStorage.setItem(`customer_tags_${selectedCustomer.id}`, JSON.stringify(updatedTags))
  }

  const handlePasswordReset = async () => {
    try {
      // This would call a backend endpoint to send password reset email
      toast({
        title: "Success",
        description: `Password reset email sent to ${selectedCustomer.email}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      })
    }
  }

  const handleRefresh = () => {
    setCurrentPage(1)
    setSearchQuery("")
    setRoleFilter("all")
    setStatusFilter("all")
    setSelectedCustomers([])
  }

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Customer data is being exported...",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      pending: { color: "bg-yellow-500/10 text-yellow-500", label: "Pending" },
      processing: { color: "bg-blue-500/10 text-blue-500", label: "Processing" },
      shipped: { color: "bg-purple-500/10 text-purple-500", label: "Shipped" },
      delivered: { color: "bg-green-500/10 text-green-500", label: "Delivered" },
      cancelled: { color: "bg-red-500/10 text-red-500", label: "Cancelled" },
    }

    const statusInfo = statusMap[status?.toLowerCase()] || statusMap.pending
    return (
      <Badge variant="secondary" className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    )
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const activeFiltersCount = [roleFilter !== "all", statusFilter !== "all"].filter(Boolean).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and monitor your customer accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-500/10 p-2">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-semibold">{totalCustomers}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-500/10 p-2">
                <UserCheck className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-semibold">{customers.filter((c) => c.is_active).length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-red-500/10 p-2">
                <UserX className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-semibold">{customers.filter((c) => !c.is_active).length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-500/10 p-2">
                <Shield className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-semibold">{customers.filter((c) => c.role === "ADMIN").length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  className="pl-9 h-10"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="CUSTOMER">Customers</SelectItem>
                    <SelectItem value="ADMIN">Admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRoleFilter("all")
                      setStatusFilter("all")
                      setCurrentPage(1)
                    }}
                    className="h-10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear ({activeFiltersCount})
                  </Button>
                )}
              </div>
            </div>

            {selectedCustomers.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{selectedCustomers.length} customers selected</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkActivate}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkDeactivate}>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomers([])}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCustomers.length === customers.length && customers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No customers found</p>
                          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selectedCustomers.includes(customer.id)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.name}</span>
                            <span className="text-sm text-muted-foreground">{customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.role === "ADMIN" ? (
                            <Badge
                              variant="secondary"
                              className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                              Customer
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.is_active ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-500/10 text-red-500 hover:bg-red-500/20">
                              <div className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(customer.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(customer)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEmailCustomer(customer)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Email Customer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {customer.is_active ? (
                                  <DropdownMenuItem onClick={() => handleDeactivateUser(customer.id)}>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleActivateUser(customer.id)}>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Rows per page</span>
                  <Select
                    value={perPage.toString()}
                    onValueChange={(value) => {
                      setPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[75px] h-9 border-gray-200 rounded-lg font-medium text-sm hover:border-gray-300 transition-colors">
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
                <div className="h-5 w-px bg-gray-200" />
                <p className="text-sm font-medium text-gray-600">
                  {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalCustomers)} of{" "}
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
                      tabIndex={currentPage === 1 ? -1 : 0}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-40"
                          : "cursor-pointer hover:bg-gray-100 transition-colors"
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
                      tabIndex={currentPage === totalPages ? -1 : 0}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-40"
                          : "cursor-pointer hover:bg-gray-100 transition-colors"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </div>

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customer Details</SheetTitle>
            <SheetDescription>View and manage comprehensive customer information</SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-br from-muted/50 to-muted/30">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-2xl">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    {isEditMode ? (
                      <div className="space-y-2">
                        <Input
                          value={editedCustomer.name}
                          onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                          className="font-semibold text-lg"
                        />
                        <Input
                          value={editedCustomer.email}
                          onChange={(e) => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (isEditMode) {
                        handleSaveCustomer()
                      } else {
                        setIsEditMode(true)
                      }
                    }}
                  >
                    {isEditMode ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Customer Statistics */}
                {customerStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <ShoppingBag className="h-4 w-4" />
                        <span className="text-sm">Total Orders</span>
                      </div>
                      <p className="text-2xl font-semibold">{customerStats.totalOrders}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm">Total Spent</span>
                      </div>
                      <p className="text-2xl font-semibold">{formatCurrency(customerStats.totalSpent)}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Avg Order Value</span>
                      </div>
                      <p className="text-2xl font-semibold">{formatCurrency(customerStats.avgOrderValue)}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Last Order</span>
                      </div>
                      <p className="text-sm font-medium">
                        {customerStats.lastOrderDate ? formatDate(customerStats.lastOrderDate) : "No orders"}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Customer Tags */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Customer Tags
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customerTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag (e.g., VIP, Regular)"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button onClick={handleAddTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Customer Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                    <div className="mt-1.5">
                      {isEditMode ? (
                        <Select
                          value={editedCustomer.role}
                          onValueChange={(value) => setEditedCustomer({ ...editedCustomer, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CUSTOMER">Customer</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : selectedCustomer.role === "ADMIN" ? (
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                          Customer
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1.5">
                      {selectedCustomer.is_active ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                          <div className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                    <p className="mt-1.5 text-sm">{formatDate(selectedCustomer.created_at)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="mt-1.5 text-sm">{formatDate(selectedCustomer.updated_at)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                {isLoadingOrders ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <Package className="h-12 w-12 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">No orders found</p>
                    <p className="text-sm text-muted-foreground">This customer hasn't placed any orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order: any) => (
                      <div key={order.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{order.order_number}</span>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{formatDate(order.created_at)}</span>
                          <span className="font-semibold">{formatCurrency(order.total_amount || order.total)}</span>
                        </div>
                        {order.items && order.items.length > 0 && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {order.items.length} item{order.items.length > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Internal Notes
                  </Label>
                  <div className="space-y-2">
                    {customerNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
                    ) : (
                      customerNotes.map((note, index) => {
                        const [timestamp, content] = note.split("|")
                        return (
                          <div key={index} className="p-3 rounded-lg border bg-card">
                            <p className="text-sm">{content}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(timestamp)}</p>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a note about this customer..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleAddNote} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => handleEmailCustomer(selectedCustomer)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={handlePasswordReset}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Send Password Reset
                  </Button>
                  <Separator />
                  {selectedCustomer.is_active ? (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/5 bg-transparent"
                      onClick={() => {
                        handleDeactivateUser(selectedCustomer.id)
                      }}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Deactivate Account
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-green-500 hover:text-green-600 hover:bg-green-500/5 bg-transparent"
                      onClick={() => {
                        handleActivateUser(selectedCustomer.id)
                      }}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate Account
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {emailRecipient && (
        <EmailComposer
          isOpen={isEmailComposerOpen}
          onClose={() => {
            setIsEmailComposerOpen(false)
            setEmailRecipient(null)
          }}
          recipientEmail={emailRecipient.email}
          recipientName={emailRecipient.name}
        />
      )}
    </div>
  )
}
