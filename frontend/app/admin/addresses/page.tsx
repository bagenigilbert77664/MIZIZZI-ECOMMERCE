"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, User } from "lucide-react"
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

export default function AddressesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [addresses, setAddresses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState("")

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setIsLoading(true)
        const params: any = {
          page: currentPage,
          per_page: 10,
          search: searchQuery || undefined,
        }

        if (typeFilter) {
          params.type = typeFilter
        }

        const response = await adminService.getAddresses(params)
        setAddresses(response.items || [])
        setTotalPages(response.pagination?.total_pages || 1)
      } catch (error) {
        console.error("Failed to fetch addresses:", error)
        toast({
          title: "Error",
          description: "Failed to load addresses. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchAddresses()
    }
  }, [isAuthenticated, currentPage, searchQuery, typeFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page on new search
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleDeleteAddress = async (addressId: number) => {
    if (confirm("Are you sure you want to delete this address?")) {
      try {
        await adminService.deleteAddress(addressId.toString())
        toast({
          title: "Success",
          description: "Address deleted successfully.",
        })
        // Refresh the addresses list
        const response = await adminService.getAddresses({
          page: currentPage,
          per_page: 10,
          search: searchQuery || undefined,
          type: typeFilter || undefined,
        })
        setAddresses(response.items || [])
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete address.",
          variant: "destructive",
        })
      }
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
        <h1 className="text-3xl font-bold tracking-tight">Customer Addresses</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Address Management</CardTitle>
          <CardDescription>View and manage customer addresses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <form onSubmit={handleSearch} className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search addresses by name, city, or postal code..."
                    className="w-full pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                >
                  <option value="">All Types</option>
                  <option value="HOME">Home</option>
                  <option value="WORK">Work</option>
                  <option value="OTHER">Other</option>
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
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addresses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            No addresses found
                          </TableCell>
                        </TableRow>
                      ) : (
                        addresses.map((address) => (
                          <TableRow key={address.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {address.first_name} {address.last_name}
                                  </div>
                                  {address.user && (
                                    <div className="text-sm text-muted-foreground">{address.user.email}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <div>{address.address_line1}</div>
                                {address.address_line2 && (
                                  <div className="text-sm text-muted-foreground">{address.address_line2}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {address.city}, {address.state} {address.postal_code}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{address.address_type || "N/A"}</Badge>
                            </TableCell>
                            <TableCell>
                              {address.is_default ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Default</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
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
                                  <DropdownMenuItem onClick={() => router.push(`/admin/addresses/${address.id}`)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/admin/addresses/${address.id}/edit`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Address
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteAddress(address.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Address
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
