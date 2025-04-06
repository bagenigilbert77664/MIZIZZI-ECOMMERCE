"use client"

import { cn } from "@/lib/utils"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Star,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Percent,
  Copy,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMobile } from "@/hooks/use-mobile"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { motion } from "framer-motion"

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

const renderProductSkeleton = (index: number) => (
  <Card key={index} className="overflow-hidden border-gray-200 shadow-sm">
    <div className="relative">
      <div className="relative aspect-square overflow-hidden bg-gray-50 h-[140px]">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="p-3">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-48 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  </Card>
)

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
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? "grid" : "grid")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(isMobile ? 8 : 12)
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
    setViewMode(isMobile ? "grid" : "grid")
    setPageSize(isMobile ? 8 : 12)
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

  // Render product card (grid view)
  const renderProductCard = (product: Product) => {
    // Calculate discount percentage
    const discountPercentage =
      product.sale_price && product.price > product.sale_price
        ? Math.round(((product.price - product.sale_price) / product.price) * 100)
        : 0

    return (
      <Card
        key={product.id}
        className="overflow-hidden border-cherry-100 shadow-sm hover:shadow-lg transition-all duration-300 group relative"
      >
        <div className="relative">
          {/* Gradient overlay that appears on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-cherry-800/0 via-cherry-700/0 to-cherry-900/0 opacity-0 group-hover:opacity-100 group-hover:from-cherry-800/20 group-hover:via-cherry-700/20 group-hover:to-cherry-900/20 transition-opacity duration-300 z-10 pointer-events-none"></div>

          <div className="absolute left-2 top-2 z-20">
            <Checkbox
              checked={selectedProducts.includes(product.id.toString())}
              onCheckedChange={() => toggleProductSelection(product.id.toString())}
              className="h-4 w-4 rounded-md border-2 border-white bg-white/80 shadow-sm data-[state=checked]:bg-cherry-600 data-[state=checked]:border-cherry-600 transition-colors duration-200"
            />
          </div>

          {/* Product badges */}
          <div className="absolute right-2 top-2 z-20 flex flex-col gap-1">
            {discountPercentage > 0 && (
              <Badge className="bg-cherry-600 text-white border-0 px-1.5 py-0.5 text-[10px] rounded-sm shadow-sm">
                -{discountPercentage}%
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="bg-cherry-50 text-cherry-600 border-0 text-[10px] shadow-sm">
                <Star className="h-2.5 w-2.5 mr-0.5 fill-cherry-600" /> Featured
              </Badge>
            )}
            {product.is_new && <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] shadow-sm">New</Badge>}
            {product.is_flash_sale && (
              <Badge className="bg-amber-50 text-amber-600 border-0 text-[10px] shadow-sm">Flash Sale</Badge>
            )}
          </div>

          {/* Product image */}
          <div className="relative aspect-square overflow-hidden bg-white h-[160px]">
            {product.image_urls && product.image_urls.length > 0 ? (
              <img
                src={product.image_urls[0] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-400">
                <Package className="h-8 w-8" />
              </div>
            )}

            {/* Stock badge with improved styling */}
            {product.stock === undefined || product.stock <= 0 ? (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-red-500 to-red-600 py-1 text-center text-[10px] font-medium text-white shadow-sm">
                Out of Stock
              </div>
            ) : product.stock !== undefined && product.stock > 0 && product.stock < 10 ? (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 py-1 text-center text-[10px] font-medium text-white shadow-sm">
                Low Stock: {product.stock}
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-emerald-600 py-1 text-center text-[10px] font-medium text-white shadow-sm">
                In Stock: {product.stock}
              </div>
            )}
          </div>

          <div className="p-4 bg-gradient-to-br from-white to-cherry-50/30">
            <div className="mb-0.5 flex items-center justify-between">
              <div className="text-[10px] text-cherry-600 font-medium">SKU: {product.sku || "N/A"}</div>
              <div className="text-[10px] text-cherry-600">ID: {product.id}</div>
            </div>

            <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 min-h-[2.5rem] group-hover:text-cherry-800 transition-colors duration-200">
              {product.name}
            </h3>

            <div className="mb-3 flex items-baseline gap-2">
              {product.sale_price && product.sale_price > 0 ? (
                <>
                  <span className="text-sm font-bold text-cherry-700">
                    KSh {product.sale_price?.toLocaleString() || 0}
                  </span>
                  <span className="text-xs line-through text-gray-500">KSh {product.price?.toLocaleString()}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-gray-900">KSh {product.price?.toLocaleString() || 0}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {product.category && (
                <Badge
                  variant="outline"
                  className="bg-cherry-50/50 text-cherry-700 border-cherry-200 text-[10px] px-1.5 py-0.5 rounded-sm"
                >
                  {typeof product.category === "object" ? product.category.name : product.category}
                </Badge>
              )}
              {product.brand && (
                <Badge
                  variant="outline"
                  className="bg-cherry-50/50 text-cherry-700 border-cherry-200 text-[10px] px-1.5 py-0.5 rounded-sm"
                >
                  {typeof product.brand === "object" ? product.brand.name : product.brand}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons with improved styling and animations */}
          <div className="flex justify-between border-t border-cherry-100 bg-gradient-to-r from-cherry-50 to-cherry-100/50 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-cherry-600 hover:bg-cherry-100 hover:text-cherry-700 transition-all duration-200"
              onClick={() => window.open(`/product/${product.id}`, "_blank")}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:scale-110 duration-300" /> View
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-cherry-600 hover:bg-cherry-100 hover:text-cherry-700 transition-all duration-200"
              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:scale-110 duration-300" /> Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-cherry-600 hover:bg-cherry-100 hover:text-cherry-700 transition-all duration-200"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 transition-transform group-hover:scale-110 duration-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-cherry-100 shadow-lg">
                <DropdownMenuLabel className="text-cherry-800">Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-cherry-100" />
                <DropdownMenuItem
                  onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                  className="cursor-pointer hover:bg-cherry-50 hover:text-cherry-700 focus:bg-cherry-50 focus:text-cherry-700"
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`/product/${product.id}`, "_blank")}
                  className="cursor-pointer hover:bg-cherry-50 hover:text-cherry-700 focus:bg-cherry-50 focus:text-cherry-700"
                >
                  <Eye className="mr-2 h-4 w-4" /> View on Store
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/admin/products/${product.id}`)}
                  className="cursor-pointer hover:bg-cherry-50 hover:text-cherry-700 focus:bg-cherry-50 focus:text-cherry-700"
                >
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-cherry-50 hover:text-cherry-700 focus:bg-cherry-50 focus:text-cherry-700">
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cherry-100" />
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
  }

  // Render product row (list view)
  const renderProductRow = (product: Product) => {
    // Calculate discount percentage
    const discountPercentage =
      product.sale_price && product.price > product.sale_price
        ? Math.round(((product.price - product.sale_price) / product.price) * 100)
        : 0

    return (
      <div
        key={product.id}
        className="flex items-center border-b border-gray-200 py-4 hover:bg-orange-50 transition-colors duration-200"
      >
        <div className="px-4">
          <Checkbox
            checked={selectedProducts.includes(product.id.toString())}
            onCheckedChange={() => toggleProductSelection(product.id.toString())}
            className="h-5 w-5 rounded-md border-gray-300 data-[state=checked]:bg-orange-600"
          />
        </div>

        <div className="flex-shrink-0 px-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-md">
            {product.image_urls && product.image_urls.length > 0 ? (
              <img
                src={product.image_urls[0] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                <Package className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow px-4">
          <h3 className="font-medium text-gray-900">{product.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {discountPercentage > 0 && (
              <Badge className="bg-orange-600 text-white border-0 px-2 py-0.5 rounded-sm">-{discountPercentage}%</Badge>
            )}
            {product.is_featured && (
              <Badge className="bg-orange-50 text-orange-600 border-0">
                <Star className="h-3 w-3 mr-1 fill-orange-600" /> Featured
              </Badge>
            )}
            {product.is_new && <Badge className="bg-blue-50 text-blue-600 border-0">New</Badge>}
            {product.is_flash_sale && <Badge className="bg-amber-50 text-amber-600 border-0">Flash Sale</Badge>}
          </div>
        </div>

        <div className="px-4 text-right">
          {product.sale_price && product.sale_price > 0 ? (
            <div>
              <div className="font-medium text-orange-600">KSh {product.sale_price?.toLocaleString() || 0}</div>
              <div className="text-sm line-through text-gray-500">KSh {product.price?.toLocaleString()}</div>
            </div>
          ) : (
            <div className="font-medium text-gray-900">KSh {product.price?.toLocaleString() || 0}</div>
          )}
        </div>

        <div className="px-4 w-24 text-center">
          {product.stock === undefined || product.stock <= 0 ? (
            <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 border-0">
              Out of Stock
            </Badge>
          ) : product.stock !== undefined && product.stock > 0 && product.stock < 10 ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
              Low: {product.stock}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
              {product.stock}
            </Badge>
          )}
        </div>

        <div className="px-4 w-32">
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {typeof product.category === "object" ? product.category?.name : product.category || "Uncategorized"}
          </Badge>
        </div>

        <div className="px-4 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => window.open(`/product/${product.id}`, "_blank")}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(`/product/${product.id}`, "_blank")}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" /> View on Store
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}`)} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setProductToDelete(product.id.toString())
                  setIsDeleteDialogOpen(true)
                }}
                className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // Mobile optimized row rendering
  const renderMobileProductRow = (product: Product) => {
    const discountPercentage =
      product.sale_price && product.price > product.sale_price
        ? Math.round(((product.price - product.sale_price) / product.price) * 100)
        : 0

    return (
      <div key={product.id} className="border-b border-gray-200 py-3">
        <div className="flex items-start">
          <div className="mr-3">
            <Checkbox
              checked={selectedProducts.includes(product.id.toString())}
              onCheckedChange={() => toggleProductSelection(product.id.toString())}
              className="h-5 w-5 rounded-md border-gray-300 data-[state=checked]:bg-orange-600 mt-1"
            />
          </div>

          <div className="flex-shrink-0 mr-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-md">
              {product.image_urls && product.image_urls.length > 0 ? (
                <img
                  src={product.image_urls[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                  <Package className="h-8 w-8" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 text-sm truncate">{product.name}</h3>

            <div className="flex items-center gap-1 mt-1">
              {product.stock === undefined || product.stock <= 0 ? (
                <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 border-0 text-xs">
                  Out of Stock
                </Badge>
              ) : product.stock !== undefined && product.stock > 0 && product.stock < 10 ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs">
                  Low: {product.stock}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-xs">
                  In Stock
                </Badge>
              )}

              {discountPercentage > 0 && (
                <Badge className="bg-orange-600 text-white border-0 text-xs">-{discountPercentage}%</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-2 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => window.open(`/product/${product.id}`, "_blank")}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setProductToDelete(product.id.toString())
                  setIsDeleteDialogOpen(true)
                }}
                className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  // Update the header section with orange red colors
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-cherry-50 to-white rounded-lg p-4 md:p-6 shadow-sm border border-cherry-100">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-cherry-900">Products</h1>
          <p className="text-cherry-600 text-sm">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-cherry-200 text-cherry-700 hover:bg-cherry-50 transition-colors duration-200"
            size={isMobile ? "sm" : "default"}
          >
            {isRefreshing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
            {isMobile ? "" : "Refresh"}
          </Button>

          <Button
            onClick={() => router.push("/admin/products/new")}
            className="bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800 text-white shadow-sm transition-all duration-200"
            size={isMobile ? "sm" : "default"}
          >
            <Plus className="mr-1 h-4 w-4" /> {isMobile ? "Add" : "Add Product"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
        <Card className="border-cherry-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 sm:p-6 bg-gradient-to-br from-white to-cherry-50">
              <div>
                <p className="text-xs sm:text-sm font-medium text-cherry-600">Total Products</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-cherry-900">{productStats.total}</h3>
              </div>
              <div className="rounded-full bg-cherry-100 p-2 sm:p-3 text-cherry-600">
                <Package className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-cherry-400 to-cherry-600"></div>
          </CardContent>
        </Card>

        <Card className="border-cherry-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 sm:p-6 bg-gradient-to-br from-white to-emerald-50">
              <div>
                <p className="text-xs sm:text-sm font-medium text-emerald-600">In Stock</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-emerald-700">{productStats.inStock}</h3>
              </div>
              <div className="rounded-full bg-emerald-100 p-2 sm:p-3 text-emerald-600">
                <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          </CardContent>
        </Card>

        <Card className="border-cherry-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 sm:p-6 bg-gradient-to-br from-white to-red-50">
              <div>
                <p className="text-xs sm:text-sm font-medium text-red-600">Out of Stock</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-red-700">{productStats.outOfStock}</h3>
              </div>
              <div className="rounded-full bg-red-100 p-2 sm:p-3 text-red-600">
                <XCircle className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-red-400 to-red-600"></div>
          </CardContent>
        </Card>

        <Card className="border-cherry-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 sm:p-6 bg-gradient-to-br from-white to-amber-50">
              <div>
                <p className="text-xs sm:text-sm font-medium text-amber-600">On Sale</p>
                <h3 className="mt-1 text-lg sm:text-2xl font-bold text-amber-700">{productStats.onSale}</h3>
              </div>
              <div className="rounded-full bg-amber-100 p-2 sm:p-3 text-amber-600">
                <Percent className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - scrollable on mobile */}
      <div className="bg-white rounded-lg shadow-sm border border-cherry-100 p-2 sm:p-4">
        <div className="overflow-x-auto pb-2">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 sm:grid-cols-7 gap-1 bg-cherry-50 p-1 rounded-lg min-w-[400px]">
              <TabsTrigger
                value="all"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                All Products
              </TabsTrigger>
              <TabsTrigger
                value="in_stock"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                In Stock
              </TabsTrigger>
              <TabsTrigger
                value="out_of_stock"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Out of Stock
              </TabsTrigger>
              <TabsTrigger
                value="featured"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Featured
              </TabsTrigger>
              <TabsTrigger
                value="on_sale"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                On Sale
              </TabsTrigger>
              <TabsTrigger
                value="new"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                New Arrivals
              </TabsTrigger>
              <TabsTrigger
                value="flash_sale"
                className="rounded-md text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                Flash Sales
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Mobile optimized search and filters */}
      {isMobile ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-cherry-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-cherry-200 rounded-md focus:border-cherry-300 focus:ring-cherry-300"
              />
            </div>

            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="border-cherry-200 text-cherry-700 hover:bg-cherry-50">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md border-cherry-100">
                <SheetHeader>
                  <SheetTitle className="text-cherry-900">Filter Products</SheetTitle>
                  <SheetDescription className="text-cherry-600">
                    Apply filters to narrow down your product list
                  </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-cherry-800">Sort By</h3>
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                      <SelectTrigger className="w-full border-cherry-200">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="border-cherry-100">
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

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-cherry-800">Filter By</h3>
                    <Select value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)}>
                      <SelectTrigger className="w-full border-cherry-200">
                        <SelectValue placeholder="Filter by" />
                      </SelectTrigger>
                      <SelectContent className="border-cherry-100">
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="on_sale">On Sale</SelectItem>
                        <SelectItem value="new">New Arrivals</SelectItem>
                        <SelectItem value="flash_sale">Flash Sales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-cherry-800">Category</h3>
                    <Select
                      value={categoryFilter?.toString() || "all"}
                      onValueChange={(value) => setCategoryFilter(value ? Number.parseInt(value) : null)}
                    >
                      <SelectTrigger className="w-full border-cherry-200">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="border-cherry-100">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <SheetFooter>
                  <SheetClose asChild>
                    <Button
                      className="w-full bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800 text-white shadow-sm transition-all duration-200"
                      onClick={() => {
                        setCurrentPage(1)
                        fetchProducts()
                      }}
                    >
                      Apply Filters
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* Selected products actions */}
          {selectedProducts.length > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-cherry-50 to-white p-3 rounded-lg shadow-sm border border-cherry-100">
              <div className="text-sm text-cherry-700">
                <span className="font-medium">{selectedProducts.length}</span> selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-cherry-200 text-cherry-700 hover:bg-cherry-50"
                  onClick={() => setSelectedProducts([])}
                >
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-cherry-100 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-cherry-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-cherry-200 rounded-md focus:border-cherry-300 focus:ring-cherry-300"
                />
              </div>

              <Select
                value={categoryFilter?.toString() || "all"}
                onValueChange={(value) => setCategoryFilter(value ? Number.parseInt(value) : null)}
              >
                <SelectTrigger className="w-[180px] border-cherry-200">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="border-cherry-100">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-sm text-cherry-600">
                    <span className="font-medium text-cherry-800">{selectedProducts.length}</span> selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-cherry-200 text-cherry-700 hover:bg-cherry-50"
                    onClick={() => setSelectedProducts([])}
                  >
                    Clear
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 bg-red-500 hover:bg-red-600"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    Delete Selected
                  </Button>
                </div>
              )}

              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger className="w-[180px] border-cherry-200">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="border-cherry-100">
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

              <div className="flex items-center border rounded-md overflow-hidden border-cherry-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-9 px-3 rounded-none border-r border-cherry-200",
                    viewMode === "grid"
                      ? "bg-cherry-100 text-cherry-800"
                      : "bg-white text-cherry-600 hover:text-cherry-800 hover:bg-cherry-50",
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
                      ? "bg-cherry-100 text-cherry-800"
                      : "bg-white text-cherry-600 hover:text-cherry-800 hover:bg-cherry-50",
                  )}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="bg-red-50 text-red-800 border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Products List */}
      <div className="bg-white rounded-lg shadow-sm border border-cherry-100">
        {isLoading ? (
          // Loading skeleton
          <div
            className={cn(
              "p-4",
              viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "",
            )}
          >
            {Array.from({ length: pageSize }).map((_, index) =>
              viewMode === "grid" ? (
                renderProductSkeleton(index)
              ) : (
                <div key={index} className="flex items-center border-b border-gray-200 py-4">
                  <div className="px-4">
                    <Skeleton className="h-5 w-5 rounded-md" />
                  </div>
                  <div className="flex-shrink-0 px-4">
                    <Skeleton className="h-16 w-16 rounded-md" />
                  </div>
                  <div className="flex-grow px-4">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="px-4 text-right">
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="px-4 w-24 text-center">
                    <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                  </div>
                  <div className="px-4 w-32">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <div className="px-4 flex gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : products.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
            <p className="text-gray-500 mb-4 max-w-md">
              {debouncedSearchQuery
                ? `No products match "${debouncedSearchQuery}". Try a different search term or clear filters.`
                : "Get started by adding your first product to your store."}
            </p>
            <Button
              onClick={() => router.push("/admin/products/new")}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="mr-1 h-4 w-4" /> Add Product
            </Button>
          </div>
        ) : (
          // Products list
          <div>
            {/* Table header for list view (desktop only) */}
            {!isMobile && viewMode === "list" && (
              <div className="flex items-center border-b border-gray-200 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="px-4">
                  <Checkbox
                    checked={selectedProducts.length === products.length && products.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="h-4 w-4 rounded-md border-gray-300 data-[state=checked]:bg-orange-600"
                  />
                </div>
                <div className="flex-shrink-0 px-4 w-24">Image</div>
                <div className="flex-grow px-4">Product Name</div>
                <div className="px-4 text-right">Price</div>
                <div className="px-4 w-24 text-center">Stock</div>
                <div className="px-4 w-32">Category</div>
                <div className="px-4 w-24 text-center">Actions</div>
              </div>
            )}

            {/* Products grid or list */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-6 bg-gradient-to-br from-white to-cherry-50/30">
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {renderProductCard(product)}
                  </motion.div>
                ))}
              </div>
            ) : isMobile ? (
              <div className="divide-y divide-cherry-100 px-4">
                {products.map((product) => renderMobileProductRow(product))}
              </div>
            ) : (
              <div>{products.map((product) => renderProductRow(product))}</div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-cherry-200 px-4 py-3 sm:px-6 bg-gradient-to-r from-white to-cherry-50/30">
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-cherry-700">
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
                      className="rounded-l-md border-cherry-200 text-cherry-700"
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
                            "border-cherry-200",
                            pageNum === currentPage
                              ? "bg-cherry-100 text-cherry-800 border-cherry-300 z-10"
                              : "hover:bg-cherry-50 text-cherry-700",
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
                      className="rounded-r-md border-cherry-200 text-cherry-700"
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
                  className="border-cherry-200 text-cherry-700"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="text-sm text-cherry-700">
                  Page <span className="font-medium">{currentPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-cherry-200 text-cherry-700"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Product Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
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
              className="bg-red-500 hover:bg-red-600"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Products</DialogTitle>
            <DialogDescription>
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
              className="bg-red-500 hover:bg-red-600"
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

