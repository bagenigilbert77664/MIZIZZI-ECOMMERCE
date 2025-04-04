"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  Package,
  Loader2,
  Star,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
  Filter,
  ArrowUpDown,
  X,
  AlertCircle,
  FileText,
  Zap,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define the filter and sort options
type SortOption =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "price_high"
  | "price_low"
  | "stock_high"
  | "stock_low"
type FilterOption = "all" | "in_stock" | "out_of_stock" | "featured" | "on_sale" | "new" | "flash_sale"
type ViewMode = "grid" | "list"

// Product Type
interface Product {
  id: number | string
  name: string
  slug?: string
  category?: { id: string | number; name: string } | string
  category_id?: string | number
  price: number
  sale_price?: number | null
  stock?: number
  is_featured?: boolean
  is_new?: boolean
  is_sale?: boolean
  is_flash_sale?: boolean
  is_luxury_deal?: boolean
  image_urls?: string[]
  thumbnail_url?: string | null
  description?: string
  created_at?: string
  updated_at?: string
  brand?: { id: string | number; name: string } | string
  sku?: string
}

// Categories Type
interface Category {
  id: number | string
  name: string
  slug?: string
}

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const isMobile = useMobile()

  // State for products and loading
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [totalProducts, setTotalProducts] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>("list") // Default to list view
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(isMobile ? 8 : 10)
  const [totalPages, setTotalPages] = useState(1)

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [filterOption, setFilterOption] = useState<FilterOption>("all")
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [isFilterActive, setIsFilterActive] = useState(false)

  // Stats
  const [productStats, setProductStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    featured: 0,
    onSale: 0,
    new: 0,
    flashSale: 0,
  })

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, sortOption, filterOption, categoryFilter, activeTab])

  // Set view mode based on screen size
  useEffect(() => {
    setPageSize(isMobile ? 8 : 10)
  }, [isMobile])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const response = await adminService.getCategories()
        setCategories(response.items || [])
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    if (isAuthenticated) {
      fetchCategories()
    }
  }, [isAuthenticated])

  // Calculate product stats
  const calculateProductStats = useCallback((products: Product[]) => {
    const stats = {
      total: products.length,
      inStock: products.filter((p) => p.stock !== undefined && p.stock > 0).length,
      outOfStock: products.filter((p) => p.stock === undefined || p.stock <= 0).length,
      featured: products.filter((p) => p.is_featured).length,
      onSale: products.filter((p) => p.is_sale).length,
      new: products.filter((p) => p.is_new).length,
      flashSale: products.filter((p) => p.is_flash_sale).length,
    }
    setProductStats(stats)
  }, [])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setError(null)

      // Prepare query parameters
      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchQuery,
      }

      // Add sort parameter
      switch (sortOption) {
        case "newest":
          params.sort = "created_at:desc"
          break
        case "oldest":
          params.sort = "created_at:asc"
          break
        case "name_asc":
          params.sort = "name:asc"
          break
        case "name_desc":
          params.sort = "name:desc"
          break
        case "price_high":
          params.sort = "price:desc"
          break
        case "price_low":
          params.sort = "price:asc"
          break
        case "stock_high":
          params.sort = "stock:desc"
          break
        case "stock_low":
          params.sort = "stock:asc"
          break
      }

      // Add filter parameters based on active tab
      if (activeTab !== "all") {
        switch (activeTab) {
          case "in_stock":
            params.in_stock = true
            break
          case "out_of_stock":
            params.out_of_stock = true
            break
          case "featured":
            params.is_featured = true
            break
          case "on_sale":
            params.is_sale = true
            break
          case "new":
            params.is_new = true
            break
          case "flash_sale":
            params.is_flash_sale = true
            break
        }
      } else {
        // Add filter parameters from dropdown
        switch (filterOption) {
          case "in_stock":
            params.in_stock = true
            break
          case "out_of_stock":
            params.out_of_stock = true
            break
          case "featured":
            params.is_featured = true
            break
          case "on_sale":
            params.is_sale = true
            break
          case "new":
            params.is_new = true
            break
          case "flash_sale":
            params.is_flash_sale = true
            break
        }
      }

      // Add category filter
      if (categoryFilter) {
        params.category_id = categoryFilter
      }

      // Check if any filter is active
      setIsFilterActive(
        debouncedSearchQuery !== "" || activeTab !== "all" || filterOption !== "all" || categoryFilter !== null,
      )

      // Fetch products with parameters
      const response = await adminService.getProducts(params)

      setProducts(response.items || [])
      setTotalProducts(response.meta?.total || 0)
      setTotalPages(Math.ceil((response.meta?.total || 0) / pageSize))
      calculateProductStats(response.items || [])
    } catch (error: any) {
      console.error("Error fetching products:", error)
      setError(error.message || "Failed to load products. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [
    isAuthenticated,
    currentPage,
    pageSize,
    debouncedSearchQuery,
    sortOption,
    filterOption,
    categoryFilter,
    calculateProductStats,
    activeTab,
  ])

  // Fetch products when dependencies change
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchProducts()
  }

  // Handle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  // Handle select all products
  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map((product) => product.id.toString()))
    }
  }

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      setIsDeleting(true)
      await adminService.deleteProduct(productToDelete)

      // Remove product from state
      setProducts((prev) => prev.filter((p) => p.id.toString() !== productToDelete))
      setTotalProducts((prev) => prev - 1)

      toast({
        title: "Success",
        description: "Product deleted successfully",
      })
    } catch (error) {
      console.error("Failed to delete product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return

    try {
      setIsDeleting(true)

      // Delete each selected product
      for (const productId of selectedProducts) {
        await adminService.deleteProduct(productId)
      }

      // Remove products from state
      setProducts((prev) => prev.filter((p) => !selectedProducts.includes(p.id.toString())))
      setTotalProducts((prev) => prev - selectedProducts.length)

      toast({
        title: "Success",
        description: `${selectedProducts.length} products deleted successfully`,
      })

      // Clear selection
      setSelectedProducts([])
    } catch (error) {
      console.error("Failed to delete products:", error)
      toast({
        title: "Error",
        description: "Failed to delete some products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsBulkDeleteDialogOpen(false)
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("")
    setDebouncedSearchQuery("")
    setActiveTab("all")
    setFilterOption("all")
    setCategoryFilter(null)
    setSortOption("newest")
  }

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null | undefined) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Get category name from ID
  const getCategoryName = (categoryId?: string | number) => {
    if (!categoryId) return "Uncategorized"

    const category = categories.find((c) => c.id.toString() === categoryId.toString())
    return category ? category.name : "Uncategorized"
  }

  // Get stock status with color
  const getStockStatus = (stock?: number) => {
    if (stock === undefined || stock <= 0) {
      return { label: "Out of Stock", color: "text-red-600 bg-red-50 border-red-200" }
    } else if (stock < 10) {
      return { label: `Low: ${stock}`, color: "text-amber-600 bg-amber-50 border-amber-200" }
    } else {
      return { label: `${stock}`, color: "text-emerald-600 bg-emerald-50 border-emerald-200" }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Products</h1>
            <p className="text-gray-500 text-sm">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
              size={isMobile ? "sm" : "default"}
            >
              {isRefreshing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              {isMobile ? "" : "Refresh"}
            </Button>

            <Button
              onClick={() => router.push("/admin/products/new")}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="mr-1 h-4 w-4" /> {isMobile ? "Add" : "Add Product"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
        <Card className="border-gray-100 shadow-sm overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 sm:p-6 bg-white">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">Total Products</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-gray-900">{productStats.total}</h3>
              </div>
              <div className="rounded-full bg-blue-50 p-2 sm:p-3 text-blue-600">
                <Package className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-blue-500"></div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 sm:p-6 bg-white">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">In Stock</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-gray-900">{productStats.inStock}</h3>
              </div>
              <div className="rounded-full bg-emerald-50 p-2 sm:p-3 text-emerald-600">
                <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-emerald-500"></div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 sm:p-6 bg-white">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">Out of Stock</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-gray-900">{productStats.outOfStock}</h3>
              </div>
              <div className="rounded-full bg-red-50 p-2 sm:p-3 text-red-600">
                <XCircle className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-red-500"></div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 sm:p-6 bg-white">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-500">On Sale</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-gray-900">{productStats.onSale}</h3>
              </div>
              <div className="rounded-full bg-amber-50 p-2 sm:p-3 text-amber-600">
                <Percent className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-amber-500"></div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-gray-200 rounded-md focus:border-blue-400 focus:ring-blue-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 border-gray-200">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filter Products</SheetTitle>
                  <SheetDescription>Apply filters to narrow down your product list</SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Category</h3>
                      <Select
                        value={categoryFilter?.toString() || "all"}
                        onValueChange={(value) => setCategoryFilter(value === "all" ? null : Number.parseInt(value))}
                      >
                        <SelectTrigger className="w-full border-gray-200">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Product Status</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-in-stock"
                            checked={activeTab === "in_stock"}
                            onCheckedChange={() => setActiveTab(activeTab === "in_stock" ? "all" : "in_stock")}
                          />
                          <label htmlFor="filter-in-stock" className="ml-2 text-sm">
                            In Stock
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-out-of-stock"
                            checked={activeTab === "out_of_stock"}
                            onCheckedChange={() => setActiveTab(activeTab === "out_of_stock" ? "all" : "out_of_stock")}
                          />
                          <label htmlFor="filter-out-of-stock" className="ml-2 text-sm">
                            Out of Stock
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-featured"
                            checked={activeTab === "featured"}
                            onCheckedChange={() => setActiveTab(activeTab === "featured" ? "all" : "featured")}
                          />
                          <label htmlFor="filter-featured" className="ml-2 text-sm">
                            Featured
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-on-sale"
                            checked={activeTab === "on_sale"}
                            onCheckedChange={() => setActiveTab(activeTab === "on_sale" ? "all" : "on_sale")}
                          />
                          <label htmlFor="filter-on-sale" className="ml-2 text-sm">
                            On Sale
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-new"
                            checked={activeTab === "new"}
                            onCheckedChange={() => setActiveTab(activeTab === "new" ? "all" : "new")}
                          />
                          <label htmlFor="filter-new" className="ml-2 text-sm">
                            New Arrivals
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-flash-sale"
                            checked={activeTab === "flash_sale"}
                            onCheckedChange={() => setActiveTab(activeTab === "flash_sale" ? "all" : "flash_sale")}
                          />
                          <label htmlFor="filter-flash-sale" className="ml-2 text-sm">
                            Flash Sale
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Sort By</h3>
                      <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                        <SelectTrigger className="w-full border-gray-200">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                          <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                          <SelectItem value="price_high">Price (High to Low)</SelectItem>
                          <SelectItem value="price_low">Price (Low to High)</SelectItem>
                          <SelectItem value="stock_high">Stock (High to Low)</SelectItem>
                          <SelectItem value="stock_low">Stock (Low to High)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                  <SheetClose asChild>
                    <Button>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            {isFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="border-gray-200 text-gray-600 hover:text-gray-900"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedProducts.length > 0 && (
              <div className="flex items-center gap-2 mr-2 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                <span className="text-sm text-blue-700">
                  <span className="font-medium text-blue-800">{selectedProducts.length}</span> selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-blue-200 text-blue-700 hover:bg-blue-100"
                  onClick={() => setSelectedProducts([])}
                >
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 bg-red-600 hover:bg-red-700"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  Delete Selected
                </Button>
              </div>
            )}

            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-[180px] border-gray-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="border-gray-200 shadow-md">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="price_high">Price (High to Low)</SelectItem>
                <SelectItem value="price_low">Price (Low to High)</SelectItem>
                <SelectItem value="stock_high">Stock (High to Low)</SelectItem>
                <SelectItem value="stock_low">Stock (Low to High)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md overflow-hidden border-gray-200 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-3 rounded-none border-r border-gray-200",
                  viewMode === "grid"
                    ? "bg-gray-100 text-gray-800 font-medium"
                    : "bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50",
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 px-3 rounded-none",
                  viewMode === "list"
                    ? "bg-gray-100 text-gray-800 font-medium"
                    : "bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50",
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load products</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={handleRefresh}>Try Again</Button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">
                {isFilterActive
                  ? "Try adjusting your filters to see more products"
                  : "Get started by adding your first product"}
              </p>
              {isFilterActive ? (
                <Button onClick={resetFilters} variant="outline" className="mr-2">
                  Reset Filters
                </Button>
              ) : null}
              <Button onClick={() => router.push("/admin/products/new")}>
                <Plus className="mr-2 h-4 w-4" /> Add New Product
              </Button>
            </div>
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-12 px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="h-4 w-4 rounded-sm border-gray-300 data-[state=checked]:bg-blue-600"
                    />
                  </th>
                  <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Product
                      <button
                        onClick={() => setSortOption(sortOption === "name_asc" ? "name_desc" : "name_asc")}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Price
                      <button
                        onClick={() => setSortOption(sortOption === "price_low" ? "price_high" : "price_low")}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Stock
                      <button
                        onClick={() => setSortOption(sortOption === "stock_low" ? "stock_high" : "stock_low")}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Date
                      <button
                        onClick={() => setSortOption(sortOption === "newest" ? "oldest" : "newest")}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.stock)
                  const discountPercentage = calculateDiscount(product.price, product.sale_price)

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Checkbox
                          checked={selectedProducts.includes(product.id.toString())}
                          onCheckedChange={() => toggleProductSelection(product.id.toString())}
                          className="h-4 w-4 rounded-sm border-gray-300 data-[state=checked]:bg-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="h-10 w-10 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                          {product.image_urls && product.image_urls.length > 0 ? (
                            <img
                              src={product.image_urls[0] || "/placeholder.svg"}
                              alt={product.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 truncate max-w-xs">{product.name}</span>
                          <span className="text-xs text-gray-500">SKU: {product.sku || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {product.sale_price && product.sale_price < product.price ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">KSh {product.sale_price.toLocaleString()}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 line-through">
                                KSh {product.price.toLocaleString()}
                              </span>
                              {discountPercentage > 0 && (
                                <span className="text-xs font-medium text-green-600">-{discountPercentage}%</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-gray-900">KSh {product.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={`${stockStatus.color} font-medium`}>{stockStatus.label}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{getCategoryName(product.category_id)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {product.is_featured && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    <Star className="h-3 w-3 mr-1 fill-blue-500" />
                                    <span className="sr-only">Featured</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Featured Product</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {product.is_new && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                  >
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    <span className="sr-only">New</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">New Arrival</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {product.is_flash_sale && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                    <Zap className="h-3 w-3 mr-1" />
                                    <span className="sr-only">Flash Sale</span>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Flash Sale</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{formatDate(product.created_at)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-500 hover:text-gray-900"
                                  onClick={() => window.open(`/product/${product.id}`, "_blank")}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">View Product</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-500 hover:text-gray-900"
                                  onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Edit Product</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 border-gray-100 shadow-lg">
                              <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-gray-100" />
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900"
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Product
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => window.open(`/product/${product.id}`, "_blank")}
                                className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900"
                              >
                                <Eye className="mr-2 h-4 w-4" /> View on Store
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/products/${product.id}`)}
                                className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900"
                              >
                                <FileText className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900">
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-100" />
                              <DropdownMenuItem
                                onClick={() => {
                                  setProductToDelete(product.id.toString())
                                  setIsDeleteDialogOpen(true)
                                }}
                                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {products.map((product) => {
              const stockStatus = getStockStatus(product.stock)
              const discountPercentage = calculateDiscount(product.price, product.sale_price)

              return (
                <Card
                  key={product.id}
                  className="overflow-hidden border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative"
                >
                  <div className="relative">
                    <div className="absolute left-2 top-2 z-20">
                      <Checkbox
                        checked={selectedProducts.includes(product.id.toString())}
                        onCheckedChange={() => toggleProductSelection(product.id.toString())}
                        className="h-4 w-4 rounded-sm border-2 border-white bg-white/80 shadow-sm data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors duration-200"
                      />
                    </div>

                    <div className="absolute right-2 top-2 z-20 flex flex-col gap-1">
                      {discountPercentage > 0 && (
                        <Badge className="bg-green-600 text-white border-0 px-2 py-0.5 text-[10px] rounded-sm font-medium shadow-sm">
                          -{discountPercentage}%
                        </Badge>
                      )}
                      {product.is_featured && (
                        <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] font-medium shadow-sm flex items-center">
                          <Star className="h-2.5 w-2.5 mr-0.5 fill-blue-600" /> Featured
                        </Badge>
                      )}
                      {product.is_new && (
                        <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] font-medium shadow-sm">
                          New
                        </Badge>
                      )}
                      {product.is_flash_sale && (
                        <Badge className="bg-amber-50 text-amber-600 border-0 text-[10px] font-medium shadow-sm">
                          Flash Sale
                        </Badge>
                      )}
                    </div>

                    <div className="relative aspect-square overflow-hidden bg-white">
                      {product.image_urls && product.image_urls.length > 0 ? (
                        <img
                          src={product.image_urls[0] || "/placeholder.svg"}
                          alt={product.name}
                          className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-400">
                          <Package className="h-10 w-10 opacity-50" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 translate-y-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 pb-4 z-20">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 rounded-full bg-white/90 hover:bg-white text-blue-700 shadow-md"
                          onClick={() => window.open(`/product/${product.id}`, "_blank")}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 rounded-full bg-white/90 hover:bg-white text-blue-700 shadow-md"
                          onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                        </Button>
                      </div>

                      <div
                        className={`absolute bottom-0 left-0 right-0 py-1 text-center text-[10px] font-medium text-white shadow-sm ${
                          product.stock === undefined || product.stock <= 0
                            ? "bg-red-600"
                            : product.stock < 10
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                      >
                        {product.stock === undefined || product.stock <= 0
                          ? "Out of Stock"
                          : product.stock < 10
                            ? `Low Stock: ${product.stock}`
                            : `In Stock: ${product.stock}`}
                      </div>
                    </div>

                    <div className="p-4 bg-white">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-[10px] text-blue-600 font-medium">SKU: {product.sku || "N/A"}</div>
                        <div className="text-[10px] text-gray-500">ID: {product.id}</div>
                      </div>

                      <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 min-h-[2.5rem] group-hover:text-blue-800 transition-colors duration-200">
                        {product.name}
                      </h3>

                      <div className="mb-3 flex items-baseline gap-2">
                        {product.sale_price && product.sale_price > 0 ? (
                          <>
                            <span className="text-sm font-bold text-gray-900">
                              KSh {product.sale_price?.toLocaleString() || 0}
                            </span>
                            <span className="text-xs line-through text-gray-500">
                              KSh {product.price?.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-gray-900">
                            KSh {product.price?.toLocaleString() || 0}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge
                          variant="outline"
                          className="bg-gray-50 text-gray-700 border-gray-200 text-[10px] px-1.5 py-0.5 rounded-sm"
                        >
                          {getCategoryName(product.category_id)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between border-t border-gray-100 bg-gray-50 p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 w-full justify-center"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5 mr-2" /> Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border-gray-100 shadow-lg">
                          <DropdownMenuLabel className="text-gray-700">Product Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-100" />
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                            className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900"
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Product
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/product/${product.id}`, "_blank")}
                            className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900"
                          >
                            <Eye className="mr-2 h-4 w-4" /> View on Store
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/admin/products/${product.id}`)}
                            className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900"
                          >
                            <FileText className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900">
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-100" />
                          <DropdownMenuItem
                            onClick={() => {
                              setProductToDelete(product.id.toString())
                              setIsDeleteDialogOpen(true)
                            }}
                            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {products.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-6 bg-gray-50">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(currentPage * pageSize, totalProducts)}</span> of{" "}
                  <span className="font-medium">{totalProducts}</span> products
                </p>
              </div>
              <div>
                <div className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-l-md border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2
                    if (pageNum > totalPages) return null

                    return (
                      <Button
                        key={pageNum}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "border-gray-200",
                          pageNum === currentPage
                            ? "bg-blue-50 text-blue-700 border-blue-200 font-medium z-10"
                            : "hover:bg-gray-50 text-gray-700",
                        )}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-r-md border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile pagination */}
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Product Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-gray-200 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Delete Product</DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="rounded-full bg-red-50 p-2 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-gray-900">
              This will permanently delete the product and all associated data.
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-gray-200 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Delete Products</DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete {selectedProducts.length} products? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="rounded-full bg-red-50 p-2 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium text-gray-900">
              This will permanently delete all selected products and their associated data.
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete {selectedProducts.length} Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

