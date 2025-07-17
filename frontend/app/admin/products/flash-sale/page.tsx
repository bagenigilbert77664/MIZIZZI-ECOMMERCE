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
  RefreshCw,
  Search,
  Zap,
  X,
  AlertCircle,
  ArrowLeft,
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
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
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

export default function FlashSalePage() {
  const router = useRouter()
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [productImages, setProductImages] = useState<Record<string, string>>({})

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<string>("newest")
  const [isFilterActive, setIsFilterActive] = useState(false)

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

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

  // Fetch flash sale products
  const fetchFlashSaleProducts = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch products with flash_sale filter
      console.log("Fetching flash sale products...")
      const response = await adminService.getProducts({ flash_sale: true, per_page: 10000 })

      const fetchedProducts = response.items || []
      console.log(`Successfully fetched ${fetchedProducts.length} flash sale products`)

      setProducts(fetchedProducts)

      // Fetch images for the products
      if (fetchedProducts.length > 0) {
        const productIds = fetchedProducts.map((p: Product) => p.id)
        fetchProductImages(productIds)
      }
    } catch (error: any) {
      console.error("Error fetching flash sale products:", error)
      setError(error.message || "Failed to load flash sale products. Please try again.")
      toast({
        title: "Error",
        description: "Failed to load flash sale products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isAuthenticated, fetchProductImages])

  // Fetch products when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFlashSaleProducts()
    }
  }, [isAuthenticated, fetchFlashSaleProducts])

  // Filter and sort products
  const filteredProducts = products
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
        default:
          return 0
      }
    })

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    setProductImages({}) // Clear image cache
    fetchFlashSaleProducts()
  }

  // Handle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  // Handle select all products
  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map((product) => product.id.toString()))
    }
  }

  // Handle remove from flash sale
  const handleRemoveFromFlashSale = async (productId: string) => {
    try {
      setIsDeleting(true)

      // Update product to remove flash sale flag
      await adminService.updateProduct(productId, { is_flash_sale: false })

      // Remove product from state
      setProducts((prev) => prev.filter((p) => p.id.toString() !== productId))

      toast({
        title: "Success",
        description: "Product removed from flash sale",
      })

      // Close dialog and reset state
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error: any) {
      console.error("Remove from flash sale operation failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove product from flash sale. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle bulk remove from flash sale
  const handleBulkRemoveFromFlashSale = async () => {
    if (selectedProducts.length === 0) return

    try {
      setIsDeleting(true)

      // Remove each selected product from flash sale
      const successfulUpdates: string[] = []
      const failedUpdates: string[] = []

      for (const productId of selectedProducts) {
        try {
          await adminService.updateProduct(productId, { is_flash_sale: false })
          successfulUpdates.push(productId)
        } catch (error: any) {
          failedUpdates.push(productId)
          console.error(`Failed to remove product ${productId} from flash sale:`, error)
        }
      }

      // Remove successfully updated products from state
      if (successfulUpdates.length > 0) {
        setProducts((prev) => prev.filter((p) => !successfulUpdates.includes(p.id.toString())))
      }

      // Show appropriate toast message
      if (failedUpdates.length === 0) {
        toast({
          title: "Success",
          description: `${successfulUpdates.length} products removed from flash sale`,
        })

        // Clear selection
        setSelectedProducts([])
      } else if (successfulUpdates.length > 0) {
        toast({
          title: "Partial Success",
          description: `${successfulUpdates.length} products removed from flash sale. ${failedUpdates.length} failed.`,
          variant: "default",
        })

        // Update selection to only include failed updates
        setSelectedProducts(failedUpdates)
      } else {
        toast({
          title: "Error",
          description: "Failed to remove products from flash sale. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Bulk remove from flash sale operation failed:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove products from flash sale. Please try again.",
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
    setSortOption("newest")
  }

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null | undefined) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
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

  // Check if any filters are active
  useEffect(() => {
    setIsFilterActive(debouncedSearchQuery !== "" || sortOption !== "newest")
  }, [debouncedSearchQuery, sortOption])

  // Render product card
  const renderProductCard = (product: Product) => {
    const discountPercentage = calculateDiscount(product.price, product.sale_price)
    const productImage = getProductImage(product)

    return (
      <Card
        key={product.id}
        className="overflow-hidden border-amber-100 shadow-sm hover:shadow-md transition-all duration-300 group relative"
      >
        <div className="relative">
          {/* Gradient overlay that appears on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-800/0 via-amber-700/0 to-amber-900/0 opacity-0 group-hover:opacity-100 group-hover:from-amber-800/20 group-hover:via-amber-700/20 group-hover:to-amber-900/20 transition-opacity duration-300 z-10 pointer-events-none"></div>

          <div className="absolute left-2 top-2 z-20">
            <Checkbox
              checked={selectedProducts.includes(product.id.toString())}
              onCheckedChange={() => toggleProductSelection(product.id.toString())}
              className="h-4 w-4 rounded-md border-2 border-white bg-white/80 shadow-sm data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 transition-colors duration-200"
            />
          </div>

          {/* Product badges */}
          <div className="absolute right-2 top-2 z-20 flex flex-col gap-1">
            {discountPercentage > 0 && (
              <Badge className="bg-amber-600 text-white border-0 px-1.5 py-0.5 text-[10px] rounded-sm shadow-sm">
                -{discountPercentage}%
              </Badge>
            )}
            <Badge className="bg-amber-500 text-white border-0 text-[10px] shadow-sm">
              <Zap className="h-2.5 w-2.5 mr-0.5" /> Flash Sale
            </Badge>
            {product.is_featured && (
              <Badge className="bg-amber-50 text-amber-600 border-0 text-[10px] shadow-sm">
                <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-600" /> Featured
              </Badge>
            )}
          </div>

          {/* Product image */}
          <div className="relative aspect-square overflow-hidden bg-white h-[160px]">
            {productImage ? (
              <img
                src={productImage || "/placeholder.svg"}
                alt={product.name}
                className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg"
                }}
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

          <div className="p-4 bg-gradient-to-br from-white to-amber-50/30">
            <div className="mb-0.5 flex items-center justify-between">
              <div className="text-[10px] text-amber-600 font-medium">SKU: {product.sku || "N/A"}</div>
              <div className="text-[10px] text-amber-600">ID: {product.id}</div>
            </div>

            <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 min-h-[2.5rem] group-hover:text-amber-800 transition-colors duration-200">
              {product.name}
            </h3>

            <div className="mb-3 flex items-baseline gap-2">
              {product.sale_price && product.sale_price < product.price ? (
                <>
                  <span className="text-sm font-bold text-amber-700">
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
                  className="bg-amber-50/50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0.5 rounded-sm"
                >
                  {typeof product.category === "object" ? product.category.name : product.category}
                </Badge>
              )}
              {product.brand && (
                <Badge
                  variant="outline"
                  className="bg-amber-50/50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0.5 rounded-sm"
                >
                  {typeof product.brand === "object" ? product.brand.name : product.brand}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons with improved styling and animations */}
          <div className="flex justify-between border-t border-amber-100 bg-gradient-to-r from-amber-50 to-amber-100/50 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-all duration-200"
              onClick={() => window.open(`/product/${product.id}`, "_blank")}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:scale-110 duration-300" /> View
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-all duration-200"
              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:scale-110 duration-300" /> Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-all duration-200"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 transition-transform group-hover:scale-110 duration-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-amber-100 shadow-lg">
                <DropdownMenuLabel className="text-amber-800">Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-amber-100" />
                <DropdownMenuItem
                  onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                  className="cursor-pointer hover:bg-amber-50 hover:text-amber-700 focus:bg-amber-50 focus:text-amber-700"
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`/product/${product.id}`, "_blank")}
                  className="cursor-pointer hover:bg-amber-50 hover:text-amber-700 focus:bg-amber-50 focus:text-amber-700"
                >
                  <Eye className="mr-2 h-4 w-4" /> View on Store
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-amber-100" />
                <DropdownMenuItem
                  onClick={() => {
                    setProductToDelete(product.id.toString())
                    setIsDeleteDialogOpen(true)
                  }}
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove from Flash Sale
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-white rounded-lg p-4 md:p-6 shadow-sm border border-amber-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 -ml-2"
                onClick={() => router.push("/admin/products")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-900">Flash Sale Products</h1>
            <p className="text-amber-600 text-sm">Manage products in flash sale</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors duration-200"
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
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm transition-all duration-200"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="mr-1 h-4 w-4" /> {isMobile ? "Add" : "Add Product"}
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-amber-100 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-amber-400" />
              <Input
                placeholder="Search flash sale products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-amber-200 rounded-md focus:border-amber-300 focus:ring-amber-300"
              />
            </div>

            {isFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <X className="h-4 w-4 mr-1" /> Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedProducts.length > 0 && (
              <div className="flex items-center gap-2 mr-2 bg-amber-50 px-3 py-1 rounded-md border border-amber-100">
                <span className="text-sm text-amber-700">
                  <span className="font-medium">{selectedProducts.length}</span> selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => setSelectedProducts([])}
                >
                  Clear
                </Button>
                <Button variant="destructive" size="sm" className="h-7" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Remove
                </Button>
              </div>
            )}

            <Select value={sortOption} onValueChange={(value) => setSortOption(value)}>
              <SelectTrigger className="w-[180px] border-amber-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="border-amber-100">
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                <SelectItem value="price_high">Price (High to Low)</SelectItem>
                <SelectItem value="price_low">Price (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-amber-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load flash sale products</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={handleRefresh} className="bg-amber-600 hover:bg-amber-700 text-white">
              Try Again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Zap className="h-12 w-12 text-amber-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No flash sale products found</h3>
            <p className="text-gray-500 mb-4">
              {debouncedSearchQuery
                ? "Try adjusting your search to see more products"
                : "Add products to flash sale by editing them and enabling the flash sale option"}
            </p>
            {debouncedSearchQuery ? (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="mb-4 border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                Clear Search
              </Button>
            ) : null}
            <Button
              onClick={() => router.push("/admin/products")}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm"
            >
              Go to All Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-6 bg-gradient-to-br from-white to-amber-50/30">
            {filteredProducts.map((product, index) => (
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
        )}
      </div>

      {/* Remove from Flash Sale Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-amber-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Flash Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product from flash sale but will not delete the product itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="border-amber-200 text-amber-700 hover:bg-amber-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToDelete && handleRemoveFromFlashSale(productToDelete)}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Remove Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="border-amber-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedProducts.length} products from Flash Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the selected products from flash sale but will not delete the products themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="border-amber-200 text-amber-700 hover:bg-amber-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRemoveFromFlashSale}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove {selectedProducts.length} Products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
