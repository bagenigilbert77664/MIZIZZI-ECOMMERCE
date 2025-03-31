"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, MoreHorizontal, Eye, UserCheck, UserX, Mail } from "lucide-react"
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

export default function CustomersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

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

        if (roleFilter) {
          params.role = roleFilter
        }

        if (statusFilter) {
          params.is_active = statusFilter === "active" ? true : false
        }

        const response = await adminService.getCustomers(params)
        setCustomers(response.items || [])
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
  }, [isAuthenticated, currentPage, searchQuery, roleFilter, statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page on new search
  }

  const handleActivateUser = async (id: string) => {
    try {
      await adminService.activateUser(id)
      setCustomers(customers.map((customer) => (customer.id === id ? { ...customer, is_active: true } : customer)))
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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
          <CardDescription>View and manage your customer accounts.</CardDescription>
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
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="CUSTOMER">Customers</option>
                  <option value="ADMIN">Admins</option>
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
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <Loader size="lg" />
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
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
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.email}</TableCell>
                            <TableCell>
                              {customer.role === "ADMIN" ? (
                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Admin</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Customer</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(customer.created_at)}</TableCell>
                            <TableCell>
                              {customer.is_active ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Active</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => (window.location.href = `mailto:${customer.email}`)}>
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
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
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
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
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

