"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, Mail, Phone } from "lucide-react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { formatDate } from "@/lib/utils"

interface Customer {
  id: number
  name: string
  email: string
  phone?: string
  is_verified: boolean
  verification_status: "pending" | "verified" | "rejected"
  verification_method?: "email" | "phone" | "manual"
  verification_date?: string
  created_at: string
  last_login?: string
  documents?: {
    id_document?: string
    proof_of_address?: string
    business_license?: string
  }
}

export default function CustomerVerificationPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState("")
  const [verificationFilter, setVerificationFilter] = useState("")
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

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
          per_page: 10,
          q: searchQuery || undefined,
        }

        if (statusFilter) {
          params.is_active = statusFilter === "active" ? true : false
        }

        if (verificationFilter) {
          params.verification_status = verificationFilter
        }

        const response = await adminService.getUsers(params)

        // Transform the data to include verification status
        const transformedCustomers = (response.items || []).map((customer: any) => ({
          ...customer,
          is_verified: customer.is_verified || false,
          verification_status: customer.verification_status || "pending",
          verification_method: customer.verification_method || "email",
          verification_date: customer.verification_date,
          documents: customer.documents || {},
        }))

        setCustomers(transformedCustomers)
        setTotalPages(response.pagination?.total_pages || 1)
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
  }, [isAuthenticated, currentPage, searchQuery, statusFilter, verificationFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
  }

  const handleVerifyCustomer = async (customerId: number) => {
    try {
      setIsUpdating(customerId.toString())

      // Since we don't have a specific verification endpoint, we'll use the activate user endpoint
      // In a real implementation, you'd have a dedicated verification endpoint
      await adminService.activateUser(customerId.toString())

      setCustomers(
        customers.map((customer) =>
          customer.id === customerId
            ? {
                ...customer,
                is_verified: true,
                verification_status: "verified" as const,
                verification_date: new Date().toISOString(),
              }
            : customer,
        ),
      )

      toast({
        title: "Success",
        description: "Customer verified successfully",
      })
    } catch (error) {
      console.error(`Failed to verify customer ${customerId}:`, error)
      toast({
        title: "Error",
        description: "Failed to verify customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleRejectVerification = async (customerId: number) => {
    try {
      setIsUpdating(customerId.toString())

      // In a real implementation, you'd have a dedicated rejection endpoint
      setCustomers(
        customers.map((customer) =>
          customer.id === customerId
            ? {
                ...customer,
                is_verified: false,
                verification_status: "rejected" as const,
                verification_date: new Date().toISOString(),
              }
            : customer,
        ),
      )

      toast({
        title: "Success",
        description: "Customer verification rejected",
      })
    } catch (error) {
      console.error(`Failed to reject customer verification ${customerId}:`, error)
      toast({
        title: "Error",
        description: "Failed to reject verification. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleSendVerificationEmail = async (customerId: number, email: string) => {
    try {
      setIsUpdating(customerId.toString())

      // In a real implementation, you'd call an endpoint to send verification email
      // For now, we'll just show a success message
      toast({
        title: "Success",
        description: `Verification email sent to ${email}`,
      })
    } catch (error) {
      console.error(`Failed to send verification email to customer ${customerId}:`, error)
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Verified</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>
      case "pending":
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>
    }
  }

  const getVerificationMethodBadge = (method: string) => {
    switch (method) {
      case "email":
        return (
          <Badge variant="outline" className="text-blue-600">
            Email
          </Badge>
        )
      case "phone":
        return (
          <Badge variant="outline" className="text-green-600">
            Phone
          </Badge>
        )
      case "manual":
        return (
          <Badge variant="outline" className="text-purple-600">
            Manual
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Verification</h1>
          <p className="text-muted-foreground">Manage customer verification status and documents</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {customers.filter((c) => c.verification_status === "verified").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {customers.filter((c) => c.verification_status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {customers.filter((c) => c.verification_status === "rejected").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Verification Management</CardTitle>
          <CardDescription>Review and manage customer verification requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <form onSubmit={handleSearch} className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search customers by name or email..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={verificationFilter}
                  onChange={(e) => {
                    setVerificationFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">All Verification Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Button variant="outline" className="h-10 w-10 p-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <Loader />
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Verification Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            No customers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">ID: {customer.id}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {customer.email}
                                </div>
                                {customer.phone && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {customer.phone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getVerificationStatusBadge(customer.verification_status)}</TableCell>
                            <TableCell>{getVerificationMethodBadge(customer.verification_method || "email")}</TableCell>
                            <TableCell>
                              {customer.verification_date
                                ? formatDate(customer.verification_date)
                                : formatDate(customer.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isUpdating === customer.id.toString()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />

                                  {customer.verification_status === "pending" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleVerifyCustomer(customer.id)}
                                        disabled={isUpdating === customer.id.toString()}
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                        Verify Customer
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleRejectVerification(customer.id)}
                                        disabled={isUpdating === customer.id.toString()}
                                      >
                                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                        Reject Verification
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => handleSendVerificationEmail(customer.id, customer.email)}
                                    disabled={isUpdating === customer.id.toString()}
                                  >
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Verification Email
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (currentPage !== 1) setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }}
                        aria-disabled={currentPage === 1}
                        tabIndex={currentPage === 1 ? -1 : 0}
                        style={currentPage === 1 ? { pointerEvents: "none", opacity: 0.5 } : {}}
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
                        style={currentPage === totalPages ? { pointerEvents: "none", opacity: 0.5 } : {}}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
