"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
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
  Tag,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Percent,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductUpdateNotification } from "@/components/admin/product-update-notification"
import type { Product } from "@/types"

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

// Animations
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// Product Type
interface ProductOld {
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
  thumbnail_url?: string
  description?: string
  created_at?: string
  updated_at?: string
}

// Pagination Type
interface PaginationType {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
}

// Categories Type
interface Category {
  id: number | string
  name: string
  slug?: string
}

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "featured", label: "Featured" },
  { value: "sale", label: "On Sale" },
  { value: "new", label: "New Arrivals" },
]

const sortOptionsOld = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
  { value: "stock_low", label: "Stock: Low to High" },
  { value: "stock_high", label: "Stock: High to Low" },
]

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()

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
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
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

  // Animation state
  const [animationKey, setAnimationKey] = useState(0)

  // Refetch trigger
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  // Tabs data
  /*const tabs = useMemo(
    () => [
      { key: "all", label: "All Products", count: totalProducts },
      { key: "featured", label: "Featured", count: products.filter((p) => p.is_featured).length },
      { key: "new", label: "New Arrivals", count: products.filter((p) => p.is_new).length },
      { key: "sale", label: "On Sale", count: products.filter((p) => p.is_sale).length },
      { key: "out_of_stock", label: "Out of Stock", count: products.filter((p) => p.stock === 0).length },
    ],
    [products, totalProducts],
  )*/

  // Reset selection when page changes
  /*useEffect(() => {
    setSelectedProducts(new Set())
  }, [currentPage])*/

  // Reset selection when page changes
  /*useEffect(() => {
    setSelectedProducts([])
  }, [currentPage])*/

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
  }, [debouncedSearchQuery, sortOption, filterOption, categoryFilter])

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
      inStock: products.filter((p) => p.stock > 0).length,
      outOfStock: products.filter((p) => p.stock <= 0).length,
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

      // Add filter parameters
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
  ])

  // Fetch products when dependencies change
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

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

  const handleSearchOld = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page on new search
  }

  const handleDeleteProductOld = (id: number | string) => {
    setProductToDelete(id.toString())
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteProductOld = async () => {
    if (!productToDelete) return

    try {
      setIsDeleting(true)
      await adminService.deleteProduct(productToDelete)

      setProducts(products.filter((product) => product.id.toString() !== productToDelete))
      setSelectedProducts((prev) => prev.filter((id) => id !== productToDelete))

      toast({
        title: "Success",
        description: "Product deleted successfully",
      })

      // If we deleted the last product on the page, go to previous page
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      } else {
        // Refresh the current page
        setRefetchTrigger((prev) => prev + 1)
      }
    } catch (error) {
      console.error(`Failed to delete product ${productToDelete}:`, error)
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

  const resetFiltersOld = () => {
    setSearchQuery("")
    //setSortBy("newest")
    //setFilterCategory("")
    //setFilterStatus("")
    setCurrentPage(1)
    //setActiveTabKey("all")
  }

  const handlePageChangeOld = (page: number) => {
    setCurrentPage(page)
  }

  const bulkDeleteOld = async () => {
    if (selectedProducts.length === 0) return

    try {
      setIsDeleting(true)
      const deletePromises = selectedProducts.map((id) => adminService.deleteProduct(id))

      await Promise.all(deletePromises)

      toast({
        title: "Success",
        description: `${selectedProducts.length} products deleted successfully`,
      })

      setSelectedProducts([])
      // Refresh the current page
      setRefetchTrigger((prev) => prev + 1)
    } catch (error) {
      console.error("Failed to delete products:", error)
      toast({
        title: "Error",
        description: "Failed to delete some products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      //setIsBulkActionMenuOpen(false)
    }
  }

  const toggleProductSelectionOld = (id: string) => {
    setSelectedProducts((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const toggleAllProductsOld = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(products.map((p) => p.id.toString()))
    }
  }

  // Helper for stock display
  const getStockDisplayOld = (stock?: number) => {
    if (stock === undefined) return <Badge variant="outline">Unknown</Badge>
    //if (stock <= 0) return <Badge variant="destructive">Out of stock</Badge>
    //if (stock < lowStockThreshold) {
    //  return (
    //    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
    //      Low stock ({stock})
    //    </Badge>
    //  )
    //}
    return stock
  }

  // Helper for price display
  const getPriceDisplayOld = (price: number, sale_price?: number) => {
    if (sale_price) {
      const discountPercentage = Math.round(((price - sale_price) / price) * 100)
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-cherry-600">KSh {sale_price.toLocaleString()}</span>
            <Badge variant="outline" className="bg-cherry-50 text-cherry-600 text-xs">
              -{discountPercentage}%
            </Badge>
          </div>
          <div className="text-muted-foreground text-xs line-through">KSh {price.toLocaleString()}</div>
        </div>
      )
    }
    return <span>KSh {price.toLocaleString()}</span>
  }

  // Loading state while authenticating
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
          <p className="text-lg font-medium text-orange-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Render product card (grid view)
  const renderProductCard = (product: Product) => {
    return (
      <Card
        key={product.id}
        className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="relative">
          <div className="absolute left-3 top-3 z-10">
            <Checkbox
              checked={selectedProducts.includes(product.id.toString())}
              onCheckedChange={() => toggleProductSelection(product.id.toString())}
              className="h-5 w-5 rounded-md border-2 border-white bg-white/80 shadow-sm data-[state=checked]:bg-orange-500"
            />
          </div>

          {/* Product badges */}
          <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
            {product.is_featured && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                <Star className="h-3 w-3 mr-1 fill-purple-500" /> Featured
              </Badge>
            )}
            {product.is_new && <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>}
            {product.is_sale && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <Percent className="h-3 w-3 mr-1" /> Sale
              </Badge>
            )}
            {product.is_flash_sale && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">Flash Sale</Badge>
            )}
          </div>

          {/* Product image */}
          <div className="relative aspect-square overflow-hidden bg-slate-100">
            {product.image_urls && product.image_urls.length > 0 ? (
              <img
                src={product.image_urls[0] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                <Package className="h-12 w-12" />
              </div>
            )}

            {/* Stock badge */}
            {product.stock <= 0 ? (
              <div className="absolute bottom-0 left-0 right-0 bg-red-500 py-1 text-center text-xs font-medium text-white">
                Out of Stock
              </div>
            ) : product.stock < 10 ? (
              <div className="absolute bottom-0 left-0 right-0 bg-amber-500 py-1 text-center text-xs font-medium text-white">
                Low Stock: {product.stock} left
              </div>
            ) : (
              <div className="absolute bottom-0 left-0 right-0 bg-green-500 py-1 text-center text-xs font-medium text-white">
                In Stock: {product.stock}
              </div>
            )}
          </div>

          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-xs text-slate-500">SKU: {product.sku || "N/A"}</div>
              <div className="text-xs text-slate-500">ID: {product.id}</div>
            </div>

            <h3 className="mb-1 line-clamp-2 font-medium text-slate-900 min-h-[2.5rem]">{product.name}</h3>

            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">KSh {product.price?.toLocaleString() || 0}</span>
              {product.sale_price && product.sale_price > 0 && (
                <span className="text-sm line-through text-slate-500">KSh {product.sale_price?.toLocaleString()}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {product.category && (
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                  {typeof product.category === "object" ? product.category.name : product.category}
                </Badge>
              )}
              {product.brand && (
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                  {typeof product.brand === "object" ? product.brand.name : product.brand}
                </Badge>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50 p-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => window.open(`/product/${product.id}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-1" /> View
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
          </CardFooter>
        </div>
      </Card>
    )
  }

  // Render product row (list view)
  const renderProductRow = (product: Product) => {
    return (
      <div
        key={product.id}
        className="flex items-center border-b border-slate-200 py-4 hover:bg-slate-50 transition-colors duration-200"
      >
        <div className="px-4">
          <Checkbox
            checked={selectedProducts.includes(product.id.toString())}
            onCheckedChange={() => toggleProductSelection(product.id.toString())}
            className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-orange-500"
          />
        </div>

        <div className="flex-shrink-0 px-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-md">
            {product.image_urls && product.image_urls.length > 0 ? (
              <img
                src={product.image_urls[0] || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                <Package className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow px-4">
          <h3 className="font-medium text-slate-900">{product.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {product.is_featured && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                <Star className="h-3 w-3 mr-1 fill-purple-500" /> Featured
              </Badge>
            )}
            {product.is_new && <Badge className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>}
            {product.is_sale && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <Percent className="h-3 w-3 mr-1" /> Sale
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 text-right">
          <div className="font-medium text-slate-900">KSh {product.price?.toLocaleString() || 0}</div>
          {product.sale_price && product.sale_price > 0 && (
            <div className="text-sm line-through text-slate-500">KSh {product.sale_price?.toLocaleString()}</div>
          )}
        </div>

        <div className="px-4 w-24 text-center">
          {product.stock <= 0 ? (
            <Badge variant="destructive">Out of Stock</Badge>
          ) : product.stock < 10 ? (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
              Low: {product.stock}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              {product.stock}
            </Badge>
          )}
        </div>

        <div className="px-4 w-32">
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            {typeof product.category === "object" ? product.category?.name : product.category || "Uncategorized"}
          </Badge>
        </div>

        <div className="px-4 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => window.open(`/product/${product.id}`, "_blank")}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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

  // Render product skeleton (loading state)
  const renderProductSkeleton = (index: number) => {
    return (
      <Card key={index} className="overflow-hidden border-slate-200">
        <div>
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-4">
            <Skeleton className="mb-2 h-4 w-1/3" />
            <Skeleton className="mb-2 h-5 w-full" />
            <Skeleton className="mb-3 h-6 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50 p-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-8" />
          </CardFooter>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white rounded-xl p-6 shadow-md border border-slate-100">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Products</h1>
          <p className="text-slate-500">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>

          <Button
            onClick={() => router.push("/admin/products/new")}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Products</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{productStats.total}</h3>
              </div>
              <div className="rounded-full bg-orange-100 p-3 text-orange-600">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">In Stock</p>
                <h3 className="mt-1 text-2xl font-bold text-green-600">{productStats.inStock}</h3>
              </div>
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Out of Stock</p>
                <h3 className="mt-1 text-2xl font-bold text-red-600">{productStats.outOfStock}</h3>
              </div>
              <div className="rounded-full bg-red-100 p-3 text-red-600">
                <XCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Featured</p>
                <h3 className="mt-1 text-2xl font-bold text-purple-600">{productStats.featured}</h3>
              </div>
              <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                <Star className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200"
            />
          </div>

          <div className="flex gap-2">
            <Select value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)}>
              <SelectTrigger className="w-[180px] border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="on_sale">On Sale</SelectItem>
                <SelectItem value="new">New Products</SelectItem>
                <SelectItem value="flash_sale">Flash Sale</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
              <SelectTrigger className="w-[180px] border-slate-200">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="price_high">Price (High-Low)</SelectItem>
                <SelectItem value="price_low">Price (Low-High)</SelectItem>
                <SelectItem value="stock_high">Stock (High-Low)</SelectItem>
                <SelectItem value="stock_low">Stock (Low-High)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter?.toString() || "all"}
              onValueChange={(value) => setCategoryFilter(value ? Number.parseInt(value) : null)}
            >
              <SelectTrigger className="w-[180px] border-slate-200">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {isLoadingCategories ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Loading categories...</span>
                  </div>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div className="flex items-center border border-slate-200 rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-none rounded-l-md ${viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-none rounded-r-md ${viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Selected products actions */}
        {selectedProducts.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 border border-slate-200">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedProducts.length === products.length && products.length > 0}
                onCheckedChange={toggleSelectAll}
                className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-orange-500"
              />
              <span className="text-sm font-medium text-slate-700">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => setSelectedProducts([])}
              >
                Clear Selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Products grid/list */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => renderProductSkeleton(index))}
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center border-b border-slate-200 bg-slate-50 py-3">
              <div className="px-4 w-10">
                <Checkbox disabled className="h-5 w-5 rounded-md border-slate-300" />
              </div>
              <div className="flex-shrink-0 px-4 w-24">Image</div>
              <div className="flex-grow px-4">Product</div>
              <div className="px-4 w-32 text-right">Price</div>
              <div className="px-4 w-24 text-center">Stock</div>
              <div className="px-4 w-32">Category</div>
              <div className="px-4 w-28">Actions</div>
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center border-b border-slate-200 py-4">
                <div className="px-4 w-10">
                  <Skeleton className="h-5 w-5 rounded-md" />
                </div>
                <div className="flex-shrink-0 px-4 w-24">
                  <Skeleton className="h-16 w-16 rounded-md" />
                </div>
                <div className="flex-grow px-4">
                  <Skeleton className="h-5 w-full max-w-xs mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="px-4 w-32 text-right">
                  <Skeleton className="h-5 w-20 ml-auto" />
                </div>
                <div className="px-4 w-24 text-center">
                  <Skeleton className="h-5 w-16 mx-auto" />
                </div>
                <div className="px-4 w-32">
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="px-4 w-28">
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )
      ) : products.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-slate-100 p-4 text-slate-400">
              <Package className="h-12 w-12" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-slate-900">No products found</h3>
            <p className="mt-1 text-center text-slate-500">
              {debouncedSearchQuery
                ? `No products match "${debouncedSearchQuery}"`
                : "There are no products in your catalog yet."}
            </p>
            <Button
              onClick={() => router.push("/admin/products/new")}
              className="mt-6 bg-orange-500 text-white hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => renderProductCard(product))}
        </div>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center border-b border-slate-200 bg-slate-50 py-3">
            <div className="px-4 w-10">
              <Checkbox
                checked={selectedProducts.length === products.length && products.length > 0}
                onCheckedChange={toggleSelectAll}
                className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-orange-500"
              />
            </div>
            <div className="flex-shrink-0 px-4 w-24">Image</div>
            <div className="flex-grow px-4">Product</div>
            <div className="px-4 w-32 text-right">Price</div>
            <div className="px-4 w-24 text-center">Stock</div>
            <div className="px-4 w-32">Category</div>
            <div className="px-4 w-28">Actions</div>
          </div>
          {products.map((product) => renderProductRow(product))}
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && products.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalProducts)} of{" "}
            {totalProducts} products
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }).map((_, index) => {
              // Calculate page numbers to show (centered around current page)
              let pageNum = currentPage
              if (totalPages <= 5) {
                pageNum = index + 1
              } else if (currentPage <= 3) {
                pageNum = index + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + index
              } else {
                pageNum = currentPage - 2 + index
              }

              return (
                <Button
                  key={index}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={
                    pageNum === currentPage
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete product dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="border-none bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Delete this product?</DialogTitle>
            <DialogDescription className="text-white/70">
              This action cannot be undone. This will permanently delete the product and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-lg bg-red-500/10 p-4 text-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-300" />
              <div>
                <h4 className="font-medium">Warning</h4>
                <p className="text-sm text-red-200/80">
                  Deleting this product will remove it from all collections, orders, and customer carts.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="border-none bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Delete {selectedProducts.length} products?</DialogTitle>
            <DialogDescription className="text-white/70">
              This action cannot be undone. This will permanently delete the selected products and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-lg bg-red-500/10 p-4 text-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-300" />
              <div>
                <h4 className="font-medium">Warning</h4>
                <p className="text-sm text-red-200/80">
                  Deleting these products will remove them from all collections, orders, and customer carts.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete {selectedProducts.length} Products
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real-time product update notification */}
      <ProductUpdateNotification showToasts={true} />
    </div>
  )
}

