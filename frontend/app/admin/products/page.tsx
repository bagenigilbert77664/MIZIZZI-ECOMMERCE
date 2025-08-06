"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
  Filter,
  X,
  AlertCircle,
  FileText,
  Tag,
  TrendingUp,
  ImageIcon,
  Zap,
  Crown,
  Layers,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet"
import { motion } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
type FilterOption = "all" | "in_stock" | "out_of_stock" | "featured" | "on_sale" | "new" | "flash_sale" | "luxury_deal"
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
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const isMobile = useMobile()

  // State for products and loading
  const [allProducts, setAllProducts] = useState<Product[]>([]) // Store all products
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list") // Default to list view
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(isMobile ? 8 : 10)

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
  const [productImages, setProductImages] = useState<Record<string, string>>({})

  // Stats
  const [productStats, setProductStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    featured: 0,
    onSale: 0,
    new: 0,
    flashSale: 0,
    luxuryDeal: 0,
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
        console.log("Fetching all categories from database...")
        const response = await adminService.getCategories({ per_page: 10000 })

        const fetchedCategories = response.items || []
        console.log(`Successfully fetched ${fetchedCategories.length} categories from database`)

        setCategories(fetchedCategories)
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
      luxuryDeal: products.filter((p) => p.is_luxury_deal).length,
    }
    setProductStats(stats)
  }, [])

  // Fetch product images
  const fetchProductImages = useCallback(
    async (productIds: (string | number)[]) => {
      try {
        // Get the base API URL, ensuring it doesn't have trailing slashes
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "")

        // Filter out product IDs that we already have images for
        const idsToFetch = productIds.filter((id) => !productImages[id.toString()])

        if (idsToFetch.length === 0) {
          console.log("All product images already cached, skipping fetch")
          return
        }

        console.log(`Fetching images for ${idsToFetch.length} products that aren't cached yet`)

        const imagePromises = idsToFetch.map(async (id) => {
          try {
            // Construct the proper URL for the image endpoint
            const imageUrl = `${baseUrl}/api/admin/products/${id}/image`
            console.log(`Fetching image from: ${imageUrl}`)

            const response = await fetch(imageUrl, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
              },
              credentials: "include",
            })

            if (!response.ok) {
              console.warn(`Failed to fetch image for product ${id}:`, response.statusText)
              return [id.toString(), "/placeholder.svg"]
            }

            const data = await response.json()
            return [id.toString(), data.url || "/placeholder.svg"]
          } catch (error) {
            console.error(`Error fetching image for product ${id}:`, error)
            return [id.toString(), "/placeholder.svg"]
          }
        })

        const imageResults = await Promise.all(imagePromises)
        const newImages: Record<string, string> = {}

        imageResults.forEach(([id, url]) => {
          newImages[id] = url
        })

        setProductImages((prev) => ({ ...prev, ...newImages }))
      } catch (error) {
        console.error("Error fetching product images:", error)
      }
    },
    [productImages],
  )

  // Fetch all products
  const fetchAllProducts = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch all products with a very large limit
      console.log("Fetching all products from database...")
      const response = await adminService.getProducts({ per_page: 10000 })

      const fetchedProducts = response.items || []
      console.log(`Successfully fetched ${fetchedProducts.length} products from database`)

      setAllProducts(fetchedProducts)
      calculateProductStats(fetchedProducts)

      // Fetch images for the products (in batches to avoid too many requests)
      if (fetchedProducts.length > 0) {
        // Get first 50 products for immediate display
        const initialProductIds = fetchedProducts.slice(0, 50).map((p: Product) => p.id)
        fetchProductImages(initialProductIds)

        // Fetch remaining images in the background
        if (fetchedProducts.length > 50) {
          setTimeout(() => {
            const remainingProductIds = fetchedProducts.slice(50).map((p: Product) => p.id)
            fetchProductImages(remainingProductIds)
          }, 2000)
        }
      }
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
  }, [isAuthenticated, calculateProductStats, fetchProductImages])

  // Fetch products when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllProducts()
    }
  }, [isAuthenticated, fetchAllProducts])

  // Filter and sort products
  const filteredProducts = allProducts
    .filter((product) => {
      // Apply search filter
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase()
        if (
          !product.name.toLowerCase().includes(searchLower) &&
          !(product.sku && product.sku.toLowerCase().includes(searchLower)) &&
          !(product.description && product.description.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Apply category filter
      if (categoryFilter && product.category_id?.toString() !== categoryFilter.toString()) {
        return false
      }

      // Apply status filters
      if (activeTab !== "all") {
        switch (activeTab) {
          case "in_stock":
            return product.stock !== undefined && product.stock > 0
          case "out_of_stock":
            return product.stock === undefined || product.stock <= 0
          case "featured":
            return product.is_featured
          case "on_sale":
            return product.is_sale
          case "new":
            return product.is_new
          case "flash_sale":
            return product.is_flash_sale
          case "luxury_deal":
            return product.is_luxury_deal
          default:
            return true
        }
      } else if (filterOption !== "all") {
        switch (filterOption) {
          case "in_stock":
            return product.stock !== undefined && product.stock > 0
          case "out_of_stock":
            return product.stock === undefined || product.stock <= 0
          case "featured":
            return product.is_featured
          case "on_sale":
            return product.is_sale
          case "new":
            return product.is_new
          case "flash_sale":
            return product.is_flash_sale
          case "luxury_deal":
            return product.is_luxury_deal
          default:
            return true
        }
      }

      return true
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
        case "oldest":
          return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime()
        case "name_asc":
          return a.name.localeCompare(b.name)
        case "name_desc":
          return b.name.localeCompare(a.name)
        case "price_high":
          return (b.sale_price || b.price) - (a.sale_price || a.price)
        case "price_low":
          return (a.sale_price || a.price) - (b.sale_price || b.price)
        case "stock_high":
          return (b.stock || 0) - (a.stock || 0)
        case "stock_low":
          return (a.stock || 0) - (b.stock || 0)
        default:
          return 0
      }
    })

  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / pageSize)

  // Get current page products
  const currentProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    setProductImages({}) // Clear image cache
    fetchAllProducts()
  }

  // Handle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  // Handle select all products
  const toggleSelectAll = () => {
    if (selectedProducts.length === currentProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(currentProducts.map((product) => product.id.toString()))
    }
  }

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      setIsDeleting(true)

      // Check if admin token exists before making the API call
      const adminToken = localStorage.getItem("admin_token")
      if (!adminToken) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })

        // Redirect to login page
        router.push("/admin/login")
        return
      }

      const response = await adminService.deleteProduct(productToDelete)

      console.log("Delete response:", response)

      // Remove product from state
      setAllProducts((prev) => prev.filter((p) => p.id.toString() !== productToDelete))

      toast({
        title: "Success",
        description: "Product deleted successfully",
      })

      // Close dialog and reset state
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error: any) {
      console.error("Delete operation failed:", error)

      // Check if this is an authentication error
      if (error.message && error.message.includes("Authentication")) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })

        // Redirect to login page
        router.push("/admin/login")
        return
      }

      // Check if the error message actually indicates success
      if (error.message && error.message.includes("deleted successfully")) {
        // This is actually a success case
        setAllProducts((prev) => prev.filter((p) => p.id.toString() !== productToDelete))

        toast({
          title: "Success",
          description: "Product deleted successfully",
        })

        // Close dialog and reset state
        setIsDeleteDialogOpen(false)
        setProductToDelete(null)
      } else {
        // This is a real error
        toast({
          title: "Error",
          description: error.message || "Failed to delete product. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return

    try {
      setIsDeleting(true)

      // Check if admin token exists before making the API call
      const adminToken = localStorage.getItem("admin_token")
      if (!adminToken) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        })

        // Redirect to login page
        router.push("/admin/login")
        return
      }

      // Delete each selected product
      const successfulDeletes: string[] = []
      const failedDeletes: string[] = []

      for (const productId of selectedProducts) {
        try {
          await adminService.deleteProduct(productId)
          successfulDeletes.push(productId)
        } catch (error: any) {
          // Check if this is an authentication error
          if (error.message && error.message.includes("Authentication")) {
            toast({
              title: "Authentication Error",
              description: "Your session has expired. Please log in again.",
              variant: "destructive",
            })

            // Redirect to login page
            router.push("/admin/login")
            return
          }

          // Check if the error message actually indicates success
          if (error.message && error.message.includes("deleted successfully")) {
            successfulDeletes.push(productId)
          } else {
            failedDeletes.push(productId)
            console.error(`Failed to delete product ${productId}:`, error)
          }
        }
      }

      // Remove successfully deleted products from state
      if (successfulDeletes.length > 0) {
        setAllProducts((prev) => prev.filter((p) => !successfulDeletes.includes(p.id.toString())))
      }

      // Show appropriate toast message
      if (failedDeletes.length === 0) {
        toast({
          title: "Success",
          description: `${successfulDeletes.length} products deleted successfully`,
        })

        // Clear selection
        setSelectedProducts([])
      } else if (successfulDeletes.length > 0) {
        toast({
          title: "Partial Success",
          description: `${successfulDeletes.length} products deleted successfully. ${failedDeletes.length} failed.`,
          variant: "default",
        })

        // Update selection to only include failed deletes
        setSelectedProducts(failedDeletes)
      } else {
        toast({
          title: "Error",
          description: "Failed to delete products. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Bulk delete operation failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete products. Please try again.",
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
      return { label: "Out of Stock", color: "text-destructive bg-destructive/10 border-destructive/20" }
    } else if (stock < 10) {
      return { label: `Low: ${stock}`, color: "text-amber-600 bg-amber-50 border-amber-200" }
    } else {
      return { label: `${stock}`, color: "text-emerald-600 bg-emerald-50 border-emerald-200" }
    }
  }

  // Get product image
  const getProductImage = (product: Product) => {
    // First check if we have a cached image
    if (productImages[product.id.toString()]) {
      return productImages[product.id.toString()]
    }

    // Then check product's thumbnail_url
    if (product.thumbnail_url) {
      // Make sure the URL is absolute
      if (product.thumbnail_url.startsWith("http")) {
        return product.thumbnail_url
      } else {
        // If it's a relative URL, prepend the API base URL
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        return `${baseUrl}${product.thumbnail_url.startsWith("/") ? "" : "/"}${product.thumbnail_url}`
      }
    }

    // Then check product's image_urls
    if (product.image_urls && product.image_urls.length > 0) {
      const imageUrl = product.image_urls[0]
      // Make sure the URL is absolute
      if (imageUrl.startsWith("http")) {
        return imageUrl
      } else {
        // If it's a relative URL, prepend the API base URL
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        return `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`
      }
    }

    // Fallback to placeholder
    return "/placeholder.svg"
  }

  // Handle pagination
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // Generate pagination items
  const getPaginationItems = () => {
    const items = []
    const maxVisiblePages = isMobile ? 3 : 5

    // Always show first page
    items.push(1)

    // Calculate range of pages to show
    let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3)

    // Adjust if we're near the beginning
    if (startPage === 2) {
      endPage = Math.min(totalPages - 1, maxVisiblePages - 1)
    }

    // Adjust if we're near the end
    if (endPage === totalPages - 1) {
      startPage = Math.max(2, totalPages - maxVisiblePages + 2)
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      items.push("ellipsis-start")
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      items.push(i)
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      items.push("ellipsis-end")
    }

    // Always show last page if there is more than one page
    if (totalPages > 1) {
      items.push(totalPages)
    }

    return items
  }

  // Check if any filters are active
  useEffect(() => {
    setIsFilterActive(
      debouncedSearchQuery !== "" ||
        activeTab !== "all" ||
        filterOption !== "all" ||
        categoryFilter !== null ||
        sortOption !== "newest",
    )
  }, [debouncedSearchQuery, activeTab, filterOption, categoryFilter, sortOption])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-muted/50 to-muted rounded-xl p-6 shadow-sm border">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="transition-colors duration-200"
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
              className="shadow-sm transition-all duration-200"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="mr-1 h-4 w-4" /> {isMobile ? "Add" : "Add Product"}
            </Button>
          </div>
        </div>
      </div>

      {/* Special Product Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flash Sale Products Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-amber-500/80 to-amber-600 text-white rounded-xl shadow-md overflow-hidden cursor-pointer"
          onClick={() => router.push("/admin/products/flash-sale")}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Flash Sale Products</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold mb-1">{productStats.flashSale}</div>
                <div className="text-sm opacity-80">Products on flash sale</div>
              </div>
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push("/admin/products/flash-sale")
                }}
              >
                Manage
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Luxury Deals Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl shadow-md overflow-hidden cursor-pointer"
          onClick={() => router.push("/admin/products/luxury-deals")}
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Crown className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">Luxury Deal Products</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold mb-1">{productStats.luxuryDeal}</div>
                <div className="text-sm opacity-80">Premium luxury products</div>
              </div>
              <Button
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push("/admin/products/luxury-deals")
                }}
              >
                Manage
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
        {/* Total Products Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shadow-md rounded-xl overflow-hidden"
        >
          <div className="w-full h-full text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Package className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Total Products</span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-2xl font-bold mb-2">{allProducts.length}</div>
                <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm w-fit">
                  <Layers className="mr-1.5 h-4 w-4" />
                  <span>{categories.length || 0} categories</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* In Stock Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shadow-md rounded-xl overflow-hidden"
        >
          <div className="w-full h-full text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="font-medium">In Stock</span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-2xl font-bold mb-2">{productStats.inStock}</div>
                <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm w-fit">
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  <span>{Math.round((productStats.inStock / allProducts.length) * 100) || 0}% of inventory</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Out of Stock Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shadow-md rounded-xl overflow-hidden"
        >
          <div className="w-full h-full text-white bg-gradient-to-r from-destructive/80 to-destructive hover:from-destructive hover:to-destructive/90">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <span className="font-medium">Out of Stock</span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-2xl font-bold mb-2">{productStats.outOfStock}</div>
                {productStats.outOfStock > 0 ? (
                  <div className="flex items-center bg-destructive/20 rounded-full px-3 py-1 text-sm w-fit">
                    <AlertCircle className="mr-1.5 h-4 w-4" />
                    <span>Needs attention</span>
                  </div>
                ) : (
                  <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm w-fit">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    <span>All in stock</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* On Sale Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="shadow-md rounded-xl overflow-hidden"
        >
          <div className="w-full h-full text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Percent className="h-5 w-5" />
                  </div>
                  <span className="font-medium">On Sale</span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-2xl font-bold mb-2">{productStats.onSale}</div>
                <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm w-fit">
                  <Tag className="mr-1.5 h-4 w-4" />
                  <span>{Math.round((productStats.onSale / allProducts.length) * 100) || 0}% discounted</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-4">
            <TabsList className="grid grid-cols-4 md:grid-cols-8 gap-2">
              <TabsTrigger value="all" className="text-xs md:text-sm">
                All ({productStats.total})
              </TabsTrigger>
              <TabsTrigger value="in_stock" className="text-xs md:text-sm">
                In Stock ({productStats.inStock})
              </TabsTrigger>
              <TabsTrigger value="out_of_stock" className="text-xs md:text-sm">
                Out of Stock ({productStats.outOfStock})
              </TabsTrigger>
              <TabsTrigger value="featured" className="text-xs md:text-sm">
                Featured ({productStats.featured})
              </TabsTrigger>
              <TabsTrigger value="on_sale" className="text-xs md:text-sm">
                On Sale ({productStats.onSale})
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs md:text-sm">
                New ({productStats.new})
              </TabsTrigger>
              <TabsTrigger value="flash_sale" className="text-xs md:text-sm">
                Flash Sale ({productStats.flashSale})
              </TabsTrigger>
              <TabsTrigger value="luxury_deal" className="text-xs md:text-sm">
                Luxury ({productStats.luxuryDeal})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search and Filters */}
          <div className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-md"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10">
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
                            onValueChange={(value) =>
                              setCategoryFilter(value === "all" ? null : Number.parseInt(value))
                            }
                          >
                            <SelectTrigger className="w-full">
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
                                onCheckedChange={() =>
                                  setActiveTab(activeTab === "out_of_stock" ? "all" : "out_of_stock")
                                }
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
                            <div className="flex items-center">
                              <Checkbox
                                id="filter-luxury-deal"
                                checked={activeTab === "luxury_deal"}
                                onCheckedChange={() =>
                                  setActiveTab(activeTab === "luxury_deal" ? "all" : "luxury_deal")
                                }
                              />
                              <label htmlFor="filter-luxury-deal" className="ml-2 text-sm">
                                Luxury Deals
                              </label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium mb-2">Sort By</h3>
                          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent className="shadow-md">
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
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    <X className="h-4 w-4 mr-1" /> Clear Filters
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedProducts.length > 0 && (
                  <div className="flex items-center gap-2 mr-2 bg-muted px-3 py-1 rounded-md border">
                    <span className="text-sm">
                      <span className="font-medium">{selectedProducts.length}</span> selected
                    </span>
                    <Button variant="outline" size="sm" className="h-7" onClick={() => setSelectedProducts([])}>
                      Clear
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete {selectedProducts.length}
                    </Button>
                  </div>
                )}

                <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="shadow-md">
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

                <div className="flex items-center border rounded-md overflow-hidden shadow-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 px-3 rounded-none border-r",
                      viewMode === "grid" ? "bg-muted font-medium" : "bg-white hover:bg-muted",
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
                      viewMode === "list" ? "bg-muted font-medium" : "bg-white hover:bg-muted",
                    )}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mt-4">
              {isLoading ? (
                <div className="p-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </div>
              ) : error ? (
                <div className="p-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-medium mb-2">Failed to load products</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={handleRefresh}>Try Again</Button>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No products found</h3>
                    <p className="text-muted-foreground mb-4">
                      {isFilterActive
                        ? "Try adjusting your filters to see more products"
                        : "Get started by adding your first product"}
                    </p>
                    {isFilterActive ? (
                      <Button variant="outline" onClick={resetFilters} className="mr-2">
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
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="bg-muted/50 border-b">
                        <TableHead className="w-[300px] py-4">
                          <div className="flex items-center">
                            <Checkbox
                              checked={selectedProducts.length === currentProducts.length && currentProducts.length > 0}
                              onCheckedChange={toggleSelectAll}
                              className="h-4 w-4 rounded-sm"
                            />
                            <span className="ml-3 font-medium">Product</span>
                          </div>
                        </TableHead>
                        <TableHead className="font-medium">Price</TableHead>
                        <TableHead className="font-medium">Category</TableHead>
                        <TableHead className="font-medium">Stock</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="text-right font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            <div className="flex flex-col items-center">
                              <Package className="h-12 w-12 text-muted mb-2" />
                              <p className="text-muted-foreground">No products found</p>
                              <Button variant="outline" onClick={resetFilters} className="mt-4">
                                Reset Filters
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentProducts.map((product) => {
                          const discountPercentage = calculateDiscount(product.price, product.sale_price)
                          const productImage = getProductImage(product)

                          return (
                            <TableRow key={product.id} className="hover:bg-muted/50 border-b transition-colors">
                              <TableCell className="py-4">
                                <div className="flex items-center">
                                  <Checkbox
                                    checked={selectedProducts.includes(product.id.toString())}
                                    onCheckedChange={() => toggleProductSelection(product.id.toString())}
                                    className="h-4 w-4 rounded-sm"
                                  />
                                  <div className="ml-3 flex items-center">
                                    <div className="h-16 w-16 rounded-md border overflow-hidden bg-background p-1 mr-3 relative">
                                      {productImage ? (
                                        <img
                                          src={productImage || "/placeholder.svg"}
                                          alt={product.name}
                                          className="h-full w-full object-contain"
                                          onError={(e) => {
                                            e.currentTarget.src = "/placeholder.svg"
                                          }}
                                        />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-muted">
                                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium line-clamp-2">{product.name}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        SKU: {product.sku || "N/A"}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-0.5">{product.slug}</div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  {product.sale_price && product.sale_price < product.price ? (
                                    <>
                                      <span className="font-bold">KSh {product.sale_price?.toLocaleString()}</span>
                                      <span className="text-xs line-through text-muted-foreground">
                                        KSh {product.price?.toLocaleString()}
                                      </span>
                                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-sm w-fit mt-1">
                                        Save {discountPercentage}%
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-bold">KSh {product.price?.toLocaleString()}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-primary/10 border-primary/20 font-normal">
                                  {(typeof product.category === "object" && product.category?.name) ||
                                    getCategoryName(product.category_id) ||
                                    "Uncategorized"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                    product.stock === undefined || product.stock <= 0
                                      ? "bg-destructive/10 text-destructive"
                                      : product.stock < 10
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {product.stock === undefined || product.stock <= 0
                                    ? "Out of Stock"
                                    : product.stock < 10
                                      ? `Low: ${product.stock}`
                                      : `${product.stock} in stock`}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5">
                                  {product.is_featured && (
                                    <Badge className="bg-primary text-primary-foreground">
                                      <Star className="h-3 w-3 mr-1 fill-current" /> Featured
                                    </Badge>
                                  )}
                                  {product.is_new && <Badge className="bg-blue-600 text-white">New</Badge>}
                                  {product.is_sale && <Badge className="bg-orange-600 text-white">Sale</Badge>}
                                  {product.is_flash_sale && (
                                    <Badge className="bg-amber-500 text-white">Flash Sale</Badge>
                                  )}
                                  {product.is_luxury_deal && <Badge className="bg-purple-600 text-white">Luxury</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => window.open(`/product/${product.id}`, "_blank")}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => router.push(`/admin/products/${product.id}`)}
                                        className="cursor-pointer"
                                      >
                                        <FileText className="mr-2 h-4 w-4" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="cursor-pointer">
                                        <Copy className="mr-2 h-4 w-4" />
                                        Duplicate
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setProductToDelete(product.id.toString())
                                          setIsDeleteDialogOpen(true)
                                        }}
                                        className="cursor-pointer text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Product
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                  {currentProducts.map((product, index) => {
                    const discountPercentage = calculateDiscount(product.price, product.sale_price)
                    const productImage = getProductImage(product)

                    return (
                      <div
                        key={product.id}
                        className="bg-card rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                      >
                        <div className="relative aspect-square">
                          <div className="aspect-square bg-muted/50 flex items-center justify-center p-4">
                            {productImage ? (
                              <img
                                src={productImage || "/placeholder.svg"}
                                alt={product.name}
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            ) : (
                              <ImageIcon className="h-16 w-16 text-muted-foreground" />
                            )}
                          </div>
                          <div className="absolute top-2 right-2">
                            <Checkbox
                              checked={selectedProducts.includes(product.id.toString())}
                              onCheckedChange={() => toggleProductSelection(product.id.toString())}
                              className="h-5 w-5 rounded-sm"
                            />
                          </div>
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {product.is_featured && (
                              <Badge className="bg-primary/20 text-primary border-primary/20">
                                <Star className="h-3 w-3 mr-1 fill-primary" /> Featured
                              </Badge>
                            )}
                            {product.is_flash_sale && (
                              <Badge className="bg-amber-500 text-white">
                                <Zap className="h-3 w-3 mr-1" /> Flash Sale
                              </Badge>
                            )}
                            {product.is_luxury_deal && (
                              <Badge className="bg-purple-600 text-white">
                                <Crown className="h-3 w-3 mr-1" /> Luxury
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium line-clamp-2 mb-1">{product.name}</h3>
                          <div className="flex items-center justify-between mb-2 mt-2">
                            <div>
                              {product.sale_price && product.sale_price < product.price ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">KSh {product.sale_price?.toLocaleString()}</span>
                                  <span className="text-xs line-through text-muted-foreground">
                                    KSh {product.price?.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold">KSh {product.price?.toLocaleString()}</span>
                              )}
                            </div>
                            <div>
                              <Badge
                                variant="outline"
                                className={`${
                                  product.stock === undefined || product.stock <= 0
                                    ? "bg-destructive/10 text-destructive border-destructive/20"
                                    : product.stock < 10
                                      ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                }`}
                              >
                                {product.stock === undefined || product.stock <= 0
                                  ? "Out of Stock"
                                  : product.stock < 10
                                    ? `Low: ${product.stock}`
                                    : `${product.stock} in stock`}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant="outline" className="bg-primary/10 border-primary/20 font-normal">
                              {(typeof product.category === "object" && product.category?.name) ||
                                getCategoryName(product.category_id) ||
                                "Uncategorized"}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(`/product/${product.id}`, "_blank")}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/admin/products/${product.id}`)}
                                    className="cursor-pointer"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setProductToDelete(product.id.toString())
                                      setIsDeleteDialogOpen(true)
                                    }}
                                    className="cursor-pointer text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Product
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination */}
              {filteredProducts.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-medium">{Math.min(currentPage * pageSize, filteredProducts.length)}</span> of{" "}
                    <span className="font-medium">{filteredProducts.length}</span> products
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {!isMobile && <span className="ml-1">Previous</span>}
                    </Button>

                    {!isMobile && (
                      <div className="flex items-center">
                        {getPaginationItems().map((item, index) => {
                          if (item === "ellipsis-start" || item === "ellipsis-end") {
                            return (
                              <div key={item} className="px-2 py-1 text-muted-foreground">
                                ...
                              </div>
                            )
                          }

                          return (
                            <Button
                              key={index}
                              variant={currentPage === item ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0 mx-1"
                              onClick={() => goToPage(item as number)}
                            >
                              {item}
                            </Button>
                          )
                        })}
                      </div>
                    )}

                    {isMobile && (
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      {!isMobile && <span className="mr-1">Next</span>}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProducts.length} products?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected products and remove them from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete {selectedProducts.length} Products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
