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
  RefreshCw,
  Search,
  Zap,
  ArrowLeft,
  Clock,
  X,
  AlertCircle,
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
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function FlashSalePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const isMobile = useMobile()

  // State for products and loading
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [productImages, setProductImages] = useState<Record<string, string>>({})

  // Redirect if not authenticated
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
            const url = `${baseUrl}/api/admin/products/${id}/images`
            console.log(`Fetching images from: ${url}`)

            const response = await fetch(url, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}`,
              },
              credentials: "include",
            })

            if (!response.ok) {
              console.warn(`Failed to fetch images for product ${id}:`, response.statusText)
              return [id.toString(), "/placeholder.svg"]
            }

            const data = await response.json()

            let productImageUrl = "/placeholder.svg"

            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
              // Find primary image first, or use the first image
              const primaryImage = data.items.find((img: any) => img.is_primary)
              const firstImage = data.items[0]
              const selectedImage = primaryImage || firstImage

              if (selectedImage && selectedImage.url) {
                productImageUrl = selectedImage.url.startsWith("http")
                  ? selectedImage.url
                  : `${baseUrl}${selectedImage.url.startsWith("/") ? "" : "/"}${selectedImage.url}`
              }
            } else if (Array.isArray(data) && data.length > 0) {
              // Handle direct array response
              const primaryImage = data.find((img: any) => img.is_primary)
              const firstImage = data[0]
              const selectedImage = primaryImage || firstImage

              if (selectedImage && selectedImage.url) {
                productImageUrl = selectedImage.url.startsWith("http")
                  ? selectedImage.url
                  : `${baseUrl}${selectedImage.url.startsWith("/") ? "" : "/"}${selectedImage.url}`
              }
            }

            return [id.toString(), productImageUrl]
          } catch (error) {
            console.error(`Error fetching images for product ${id}:`, error)
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

      console.log("Fetching flash sale products...")
      const response = await adminService.getProducts({ flash_sale: true, per_page: 10000 })

      const fetchedProducts = response.items || []
      console.log(`Successfully fetched ${fetchedProducts.length} flash sale products`)

      setFlashSaleProducts(fetchedProducts)

      // Fetch images for the products
      if (fetchedProducts.length > 0) {
        const productIds = fetchedProducts.map((p: any) => p.id)
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
    if (selectedProducts.length === flashSaleProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(flashSaleProducts.map((product) => product.id.toString()))
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
      setFlashSaleProducts((prev) => prev.filter((p) => p.id.toString() !== productToDelete))

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
        setFlashSaleProducts((prev) => prev.filter((p) => p.id.toString() !== productToDelete))

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
        setFlashSaleProducts((prev) => prev.filter((p) => !successfulDeletes.includes(p.id.toString())))
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

  // Calculate discount percentage
  const calculateDiscount = (price: number, salePrice: number | null | undefined) => {
    if (!salePrice || salePrice >= price) return 0
    return Math.round(((price - salePrice) / price) * 100)
  }

  // Get product image
  const getProductImage = (product: any) => {
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

  // Filter products by search query
  const filteredProducts = flashSaleProducts.filter((product) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      product.name.toLowerCase().includes(query) ||
      (product.sku && product.sku.toLowerCase().includes(query)) ||
      (product.description && product.description.toLowerCase().includes(query))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-xl p-6 shadow-sm border">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => router.push("/admin/products")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-tight flex items-center">
                <Zap className="mr-2 h-5 w-5 text-amber-500" /> Flash Sale Products
              </h1>
            </div>
            <p className="text-muted-foreground">Manage products in flash sales with limited-time discounts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="transition-colors duration-200 bg-transparent"
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
              onClick={() => router.push("/admin/products/new?preset=flash_sale")}
              className="shadow-sm transition-all duration-200 bg-amber-600 hover:bg-amber-700 text-white"
              size={isMobile ? "sm" : "default"}
            >
              <Plus className="mr-1 h-4 w-4" /> {isMobile ? "Add" : "Add Flash Sale Product"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <Zap className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">Flash Sale Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm opacity-80 mb-1">Total Flash Sale Products</div>
            <div className="text-2xl font-bold">{flashSaleProducts.length}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm opacity-80 mb-1">Average Discount</div>
            <div className="text-2xl font-bold">
              {flashSaleProducts.length > 0
                ? Math.round(
                    flashSaleProducts.reduce(
                      (acc, product) => acc + calculateDiscount(product.price, product.sale_price),
                      0,
                    ) / flashSaleProducts.length,
                  )
                : 0}
              %
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 flex items-center">
            <div>
              <div className="text-sm opacity-80 mb-1">Flash Sale Status</div>
              <div className="text-lg font-bold">Active</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Ends in 16h 55m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flash sale products..."
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
          </div>

          <div className="flex items-center gap-2">
            {selectedProducts.length > 0 && (
              <div className="flex items-center gap-2 mr-2 bg-muted px-3 py-1 rounded-md border">
                <span className="text-sm">
                  <span className="font-medium">{selectedProducts.length}</span> selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 bg-transparent"
                  onClick={() => setSelectedProducts([])}
                >
                  Clear
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete {selectedProducts.length} Products
                </Button>
              </div>
            )}
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
                <h3 className="text-lg font-medium mb-2">Failed to load flash sale products</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={handleRefresh}>Try Again</Button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6">
              <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No flash sale products found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search to see more products"
                    : "Get started by adding your first flash sale product"}
                </p>
                {searchQuery ? (
                  <Button variant="outline" onClick={() => setSearchQuery("")} className="mr-2">
                    Clear Search
                  </Button>
                ) : null}
                <Button
                  onClick={() => router.push("/admin/products/new?preset=flash_sale")}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Flash Sale Product
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b">
                    <TableHead className="w-[300px] py-4">
                      <div className="flex items-center">
                        <Checkbox
                          checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="h-4 w-4 rounded-sm"
                        />
                        <span className="ml-3 font-medium">Product</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-medium">Regular Price</TableHead>
                    <TableHead className="font-medium">Sale Price</TableHead>
                    <TableHead className="font-medium">Discount</TableHead>
                    <TableHead className="font-medium">Stock</TableHead>
                    <TableHead className="text-right font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
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
                                <img
                                  src={productImage || "/placeholder.svg"}
                                  alt={product.name}
                                  className="h-full w-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg"
                                  }}
                                />
                                <Badge className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] px-1 py-0 rounded-sm">
                                  Flash
                                </Badge>
                              </div>
                              <div>
                                <div className="font-medium line-clamp-2">{product.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">SKU: {product.sku || "N/A"}</div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground line-through">
                            KSh {product.price?.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-amber-600">
                            KSh {product.sale_price?.toLocaleString() || product.price?.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            {discountPercentage}% OFF
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
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Product Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Flash Sale Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium">This will permanently delete the product and all associated data.</div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={isDeleting}>
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
            <DialogTitle>Delete Flash Sale Products</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProducts.length} products? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium">
              This will permanently delete all selected products and their associated data.
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete {selectedProducts.length} Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
