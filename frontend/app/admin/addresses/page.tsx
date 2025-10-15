"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  MoreHorizontal,
  Eye,
  MapPin,
  Phone,
  Download,
  RefreshCw,
  Home,
  Building2,
  Star,
  X,
  Edit,
  Trash2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { formatDate } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function AddressesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [addresses, setAddresses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalAddresses, setTotalAddresses] = useState(0)
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedAddress, setSelectedAddress] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [perPage, setPerPage] = useState(10)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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
          per_page: perPage,
          q: searchQuery || undefined,
        }

        if (typeFilter !== "all") {
          params.type = typeFilter
        }

        const response = await adminService.getAddresses(params)
        setAddresses(response.items || [])
        setTotalPages(response.totalPages || 1)
        setTotalAddresses(response.totalItems || 0)
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
  }, [isAuthenticated, currentPage, searchQuery, typeFilter, perPage, refreshTrigger])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleViewDetails = (address: any) => {
    setSelectedAddress(address)
    setIsDetailsOpen(true)
  }

  const handleEdit = (address: any) => {
    setSelectedAddress(address)
    setEditFormData({
      first_name: address.first_name || "",
      last_name: address.last_name || "",
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      postal_code: address.postal_code || "",
      country: address.country || "",
      phone: address.phone || "",
      alternative_phone: address.alternative_phone || "",
      address_type: address.address_type || "SHIPPING",
      is_default: address.is_default || false,
      additional_info: address.additional_info || "",
    })
    setIsEditOpen(true)
    setIsDetailsOpen(false)
  }

  const handleUpdateAddress = async () => {
    if (!selectedAddress) return

    try {
      setIsSubmitting(true)
      await adminService.updateAddress(selectedAddress.id, editFormData)

      toast({
        title: "Success",
        description: "Address updated successfully",
      })

      setIsEditOpen(false)
      setRefreshTrigger((prev) => prev + 1)
    } catch (error: any) {
      console.error("Failed to update address:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (address: any) => {
    setSelectedAddress(address)
    setIsDeleteDialogOpen(true)
    setIsDetailsOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (!selectedAddress) return

    try {
      setIsDeleting(true)
      await adminService.deleteAddress(selectedAddress.id)

      toast({
        title: "Success",
        description: "Address deleted successfully",
      })

      setIsDeleteDialogOpen(false)
      setRefreshTrigger((prev) => prev + 1)
    } catch (error: any) {
      console.error("Failed to delete address:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete address. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRefresh = () => {
    setCurrentPage(1)
    setSearchQuery("")
    setTypeFilter("all")
    setRefreshTrigger((prev) => prev + 1)
    toast({
      title: "Refreshed",
      description: "Address data has been refreshed",
    })
  }

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Address data is being exported...",
    })
  }

  const getAddressTypeIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "SHIPPING":
        return <Home className="h-3.5 w-3.5" />
      case "BILLING":
        return <Building2 className="h-3.5 w-3.5" />
      case "BOTH":
        return <Star className="h-3.5 w-3.5" />
      default:
        return <MapPin className="h-3.5 w-3.5" />
    }
  }

  const getAddressTypeBadge = (type: string) => {
    switch (type?.toUpperCase()) {
      case "SHIPPING":
        return (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0 font-medium">
            {getAddressTypeIcon(type)}
            <span className="ml-1.5">Shipping</span>
          </Badge>
        )
      case "BILLING":
        return (
          <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-0 font-medium">
            {getAddressTypeIcon(type)}
            <span className="ml-1.5">Billing</span>
          </Badge>
        )
      case "BOTH":
        return (
          <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-0 font-medium">
            {getAddressTypeIcon(type)}
            <span className="ml-1.5">Both</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-gray-50 text-gray-700 hover:bg-gray-100 border-0 font-medium">
            {getAddressTypeIcon(type)}
            <span className="ml-1.5">Address</span>
          </Badge>
        )
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  const activeFiltersCount = [typeFilter !== "all"].filter(Boolean).length

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Addresses</h1>
            <p className="text-[15px] text-gray-600 mt-1.5 font-normal">
              Manage customer shipping and billing addresses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="font-medium">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-9 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="font-medium">Export</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Addresses</p>
              <p className="text-3xl font-semibold text-gray-900 tracking-tight">{totalAddresses}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Shipping</p>
              <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                {addresses.filter((a) => a.address_type === "SHIPPING").length}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Billing</p>
              <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                {addresses.filter((a) => a.address_type === "BILLING").length}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-2.5">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Default</p>
              <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                {addresses.filter((a) => a.is_default).length}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-2.5">
              <Star className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-5 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by name, city, or postal code..."
                  className="pl-10 h-10 border-gray-200 rounded-lg font-normal text-[15px] placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setTypeFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[150px] h-10 border-gray-200 rounded-lg font-medium text-sm hover:border-gray-300 transition-colors">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTypeFilter("all")
                      setCurrentPage(1)
                    }}
                    className="h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    <span className="font-medium">Clear ({activeFiltersCount})</span>
                  </Button>
                )}
              </div>
            </div>
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
                  <TableRow className="hover:bg-transparent border-b border-gray-200">
                    <TableHead className="h-12 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Customer
                    </TableHead>
                    <TableHead className="h-12 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Address
                    </TableHead>
                    <TableHead className="h-12 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Type
                    </TableHead>
                    <TableHead className="h-12 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Contact
                    </TableHead>
                    <TableHead className="h-12 text-xs font-semibold text-gray-700 uppercase tracking-wide text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addresses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="rounded-full bg-gray-100 p-4">
                            <MapPin className="h-8 w-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[15px] font-medium text-gray-900">No addresses found</p>
                            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    addresses.map((address) => (
                      <TableRow
                        key={address.id}
                        className="group border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-medium text-gray-900">
                                {address.first_name} {address.last_name}
                              </span>
                              {address.is_default && (
                                <Badge
                                  variant="secondary"
                                  className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-0 text-xs font-medium px-2 py-0.5"
                                >
                                  <Star className="h-3 w-3 mr-1 fill-yellow-700" />
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5 max-w-xs">
                            <span className="text-[15px] text-gray-900 font-normal">{address.address_line1}</span>
                            {address.address_line2 && (
                              <span className="text-sm text-gray-500">{address.address_line2}</span>
                            )}
                            <span className="text-sm text-gray-500">
                              {address.city}, {address.state} {address.postal_code}
                            </span>
                            <span className="text-sm text-gray-500">{address.country}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">{getAddressTypeBadge(address.address_type)}</TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-normal">{address.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(address)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                            >
                              <Eye className="h-4 w-4 text-gray-600" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-100 text-gray-600"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs font-semibold text-gray-700">
                                  Actions
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(address)}
                                  className="text-sm font-normal"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(address)} className="text-sm font-normal">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Address
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(address)}
                                  className="text-sm font-normal text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
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

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
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
                  {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalAddresses)} of{" "}
                  {totalAddresses}
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
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold text-gray-900">Address Details</SheetTitle>
            <SheetDescription className="text-[15px] text-gray-600">View complete address information</SheetDescription>
          </SheetHeader>
          {selectedAddress && (
            <div className="mt-6 space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-semibold text-lg flex-shrink-0">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {selectedAddress.first_name} {selectedAddress.last_name}
                    </h3>
                    {selectedAddress.is_default && (
                      <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-0 text-xs font-medium">
                        <Star className="h-3 w-3 mr-1 fill-yellow-700" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{getAddressTypeBadge(selectedAddress.address_type)}</div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Address</label>
                  <div className="mt-2 space-y-1">
                    <p className="text-[15px] text-gray-900">{selectedAddress.address_line1}</p>
                    {selectedAddress.address_line2 && (
                      <p className="text-[15px] text-gray-900">{selectedAddress.address_line2}</p>
                    )}
                    <p className="text-[15px] text-gray-900">
                      {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
                    </p>
                    <p className="text-[15px] text-gray-900">{selectedAddress.country}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contact</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2.5 text-[15px] text-gray-900">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedAddress.phone}</span>
                    </div>
                    {selectedAddress.alternative_phone && (
                      <div className="flex items-center gap-2.5 text-[15px] text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedAddress.alternative_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedAddress.additional_info && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Additional Info
                    </label>
                    <p className="mt-2 text-[15px] text-gray-900">{selectedAddress.additional_info}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Created</label>
                  <p className="mt-2 text-[15px] text-gray-900">{formatDate(selectedAddress.created_at)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => handleEdit(selectedAddress)}
                  variant="outline"
                  className="w-full justify-start h-11 border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium bg-transparent"
                >
                  <Edit className="mr-2.5 h-4 w-4" />
                  Edit Address
                </Button>
                <Button
                  onClick={() => handleDelete(selectedAddress)}
                  variant="outline"
                  className="w-full justify-start h-11 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 font-medium bg-transparent"
                >
                  <Trash2 className="mr-2.5 h-4 w-4" />
                  Delete Address
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Edit Address</DialogTitle>
            <DialogDescription className="text-[15px] text-gray-600">
              Update customer address information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  value={editFormData.first_name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium text-gray-700">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  value={editFormData.last_name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line1" className="text-sm font-medium text-gray-700">
                Address Line 1
              </Label>
              <Input
                id="address_line1"
                value={editFormData.address_line1 || ""}
                onChange={(e) => setEditFormData({ ...editFormData, address_line1: e.target.value })}
                className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2" className="text-sm font-medium text-gray-700">
                Address Line 2 (Optional)
              </Label>
              <Input
                id="address_line2"
                value={editFormData.address_line2 || ""}
                onChange={(e) => setEditFormData({ ...editFormData, address_line2: e.target.value })}
                className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                  City
                </Label>
                <Input
                  id="city"
                  value={editFormData.city || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                  State/Province
                </Label>
                <Input
                  id="state"
                  value={editFormData.state || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-sm font-medium text-gray-700">
                  Postal Code
                </Label>
                <Input
                  id="postal_code"
                  value={editFormData.postal_code || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, postal_code: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                  Country
                </Label>
                <Input
                  id="country"
                  value={editFormData.country || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={editFormData.phone || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternative_phone" className="text-sm font-medium text-gray-700">
                  Alternative Phone (Optional)
                </Label>
                <Input
                  id="alternative_phone"
                  value={editFormData.alternative_phone || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, alternative_phone: e.target.value })}
                  className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_type" className="text-sm font-medium text-gray-700">
                Address Type
              </Label>
              <Select
                value={editFormData.address_type || "SHIPPING"}
                onValueChange={(value) => setEditFormData({ ...editFormData, address_type: value })}
              >
                <SelectTrigger className="h-10 border-gray-200 rounded-lg font-normal text-[15px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIPPING">Shipping</SelectItem>
                  <SelectItem value="BILLING">Billing</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_info" className="text-sm font-medium text-gray-700">
                Additional Information (Optional)
              </Label>
              <Input
                id="additional_info"
                value={editFormData.additional_info || ""}
                onChange={(e) => setEditFormData({ ...editFormData, additional_info: e.target.value })}
                className="h-10 border-gray-200 rounded-lg font-normal text-[15px] focus-visible:ring-1 focus-visible:ring-gray-900 focus-visible:border-gray-900"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is_default"
                checked={editFormData.is_default || false}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_default: checked })}
              />
              <Label
                htmlFor="is_default"
                className="text-sm font-medium text-gray-700 cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Set as default address
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitting}
              className="h-10 border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateAddress}
              disabled={isSubmitting}
              className="h-10 bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader />
                  Updating...
                </>
              ) : (
                "Update Address"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Delete Address</DialogTitle>
            <DialogDescription className="text-[15px] text-gray-600">
              Are you sure you want to delete this address? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedAddress && (
            <div className="py-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="font-medium text-gray-900">
                  {selectedAddress.first_name} {selectedAddress.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-1">{selectedAddress.address_line1}</p>
                <p className="text-sm text-gray-600">
                  {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="h-10 border-gray-200 hover:bg-gray-50 hover:border-gray-300 font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-10 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isDeleting ? (
                <>
                  <Loader  />
                  Deleting...
                </>
              ) : (
                "Delete Address"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
