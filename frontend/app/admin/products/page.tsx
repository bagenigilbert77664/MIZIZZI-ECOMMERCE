"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Eye,
  ChevronDown,
  AlertCircle,
  Package,
  Filter,
  TagIcon,
  StarIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"

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

const sortOptions = [
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
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [perPage, setPerPage] = useState(10)
  const [sortBy, setSortBy] = useState("newest")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isBulkActionMenuOpen, setIsBulkActionMenuOpen] = useState(false)
  const [activeTabKey, setActiveTabKey] = useState("all")

  // Animation state
  const [animationKey, setAnimationKey] = useState(0)

  // Refetch trigger
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  // Tabs data
  const tabs = useMemo(
    () => [
      { key: "all", label: "All Products", count: totalProducts },
      { key: "featured", label: "Featured", count: products.filter((p) => p.is_featured).length },
      { key: "new", label: "New Arrivals", count: products.filter((p) => p.is_new).length },
      { key: "sale", label: "On Sale", count: products.filter((p) => p.is_sale).length },
      { key: "out_of_stock", label: "Out of Stock", count: products.filter((p) => p.stock === 0).length },
    ],
    [products, totalProducts],
  )

  // Reset selection when page changes
  useEffect(() => {
    setSelectedProducts(new Set())
  }, [currentPage])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchCategories = async () => {
      if (!isAuthenticated) return

      try {
        setIsLoadingCategories(true)
        const response = await adminService.getCategories()
        setCategories(response.items || [])
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [isAuthenticated])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        setAnimationKey((prev) => prev + 1)

        // Build query parameters
        const params: any = {
          page: currentPage,
          per_page: perPage,
          q: searchQuery || undefined,
        }

        // Add sort parameter
        if (sortBy) {
          switch (sortBy) {
            case "newest":
              params.sort = "created_at:desc"
              break
            case "oldest":
              params.sort = "created_at:asc"
              break
            case "price_low":
              params.sort = "price:asc"
              break
            case "price_high":
              params.sort = "price:desc"
              break
            case "name_asc":
              params.sort = "name:asc"
              break
            case "name_desc":
              params.sort = "name:desc"
              break
            case "stock_low":
              params.sort = "stock:asc"
              break
            case "stock_high":
              params.sort = "stock:desc"
              break
          }
        }

        // Add category filter
        if (filterCategory) {
          params.category_id = filterCategory
        }

        // Apply tab filters
        if (activeTabKey !== "all") {
          switch (activeTabKey) {
            case "featured":
              params.is_featured = true
              break
            case "new":
              params.is_new = true
              break
            case "sale":
              params.is_sale = true
              break
            case "out_of_stock":
              params.stock = 0
              break
          }
        }
        // Add status filter if not using tabs
        else if (filterStatus) {
          switch (filterStatus) {
            case "in_stock":
              params.stock_gt = 0
              break
            case "out_of_stock":
              params.stock = 0
              break
            case "low_stock":
              params.stock_gt = 0
              params.stock_lt = lowStockThreshold
              break
            case "featured":
              params.is_featured = true
              break
            case "sale":
              params.is_sale = true
              break
            case "new":
              params.is_new = true
              break
          }
        }

        const response = await adminService.getProducts(params)
        setProducts(
          (response.items || []).map((product: any) => ({
            ...product,
            // Ensure category is properly formatted
            category: typeof product.category === "string" ? product.category : product.category || undefined,
            // Ensure other fields match our interface
            sale_price: product.sale_price === null ? undefined : product.sale_price,
          })),
        )
        setTotalPages(response.pagination?.total_pages || 1)
        setTotalProducts(response.pagination?.total_items || 0)
      } catch (error) {
        console.error("Failed to fetch products:", error)
        toast({
          title: "Error",
          description: "Failed to load products. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchProducts()
    }
  }, [
    isAuthenticated,
    currentPage,
    perPage,
    searchQuery,
    sortBy,
    filterCategory,
    filterStatus,
    lowStockThreshold,
    activeTabKey,
    refetchTrigger,
  ])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page on new search
  }

  const handleDeleteProduct = (id: number | string) => {
    setProductToDelete(id.toString())
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return

    try {
      setIsDeleting(true)
      await adminService.deleteProduct(productToDelete)

      setProducts(products.filter((product) => product.id.toString() !== productToDelete))
      setSelectedProducts((prev) => {
        const newSelected = new Set(prev)
        newSelected.delete(productToDelete)
        return newSelected
      })

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

  const resetFilters = () => {
    setSearchQuery("")
    setSortBy("newest")
    setFilterCategory("")
    setFilterStatus("")
    setCurrentPage(1)
    setActiveTabKey("all")
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const bulkDelete = async () => {
    if (selectedProducts.size === 0) return

    try {
      setIsDeleting(true)
      const deletePromises = Array.from(selectedProducts).map((id) => adminService.deleteProduct(id))

      await Promise.all(deletePromises)

      toast({
        title: "Success",
        description: `${selectedProducts.size} products deleted successfully`,
      })

      setSelectedProducts(new Set())
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
      setIsBulkActionMenuOpen(false)
    }
  }

  const toggleProductSelection = (id: string) => {
    setSelectedProducts((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(id)) {
        newSelection.delete(id)
      } else {
        newSelection.add(id)
      }
      return newSelection
    })
  }

  const toggleAllProducts = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id.toString())))
    }
  }

  // Helper for stock display
  const getStockDisplay = (stock?: number) => {
    if (stock === undefined) return <Badge variant="outline">Unknown</Badge>
    if (stock <= 0) return <Badge variant="destructive">Out of stock</Badge>
    if (stock < lowStockThreshold) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
          Low stock ({stock})
        </Badge>
      )
    }
    return stock
  }

  // Helper for price display
  const getPriceDisplay = (price: number, sale_price?: number) => {
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

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-cherry-100"></div>
          <div className="h-4 w-40 rounded bg-cherry-100"></div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <motion.div
          className="space-y-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-cherry-900">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            onClick={() => router.push("/admin/products/new")}
            className="w-full md:w-auto premium-gradient hover:shadow-lg transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </motion.div>
      </div>

      <Card className="overflow-hidden border-cherry-100 shadow-md hover:shadow-lg transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-white to-cherry-50 border-b border-cherry-100">
          <CardTitle className="text-xl font-bold text-cherry-900">Product Management</CardTitle>
          <CardDescription>Manage your product catalog, inventory, and pricing with ease</CardDescription>
        </CardHeader>

        <Tabs defaultValue="all" value={activeTabKey} onValueChange={setActiveTabKey} className="w-full">
          <div className="px-6 pt-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-cherry-50 p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="data-[state=active]:bg-white data-[state=active]:text-cherry-800 data-[state=active]:shadow-sm flex justify-between items-center gap-2"
                >
                  <span>{tab.label}</span>
                  <Badge variant="outline" className="ml-auto rounded-full bg-white/50 px-2 py-0.5 text-xs">
                    {tab.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <form onSubmit={handleSearch} className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search products by name, SKU, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-cherry-100 focus-visible:ring-cherry-200"
                  />
                </form>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
                  <Select
                    value={filterCategory}
                    onValueChange={(value) => {
                      setFilterCategory(value === "all" ? "" : value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full md:w-[180px] border-cherry-100">
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

                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value)
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full md:w-[180px] border-cherry-100">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={resetFilters}
                          className="border-cherry-100 hover:bg-cherry-50"
                        >
                          <Filter className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset all filters</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {selectedProducts.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-cherry-50 p-3 rounded-md flex items-center justify-between"
                >
                  <span className="text-sm text-cherry-800 font-medium">{selectedProducts.size} products selected</span>
                  <div className="flex items-center gap-2">
                    <DropdownMenu open={isBulkActionMenuOpen} onOpenChange={setIsBulkActionMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="border-cherry-200 bg-white">
                          Bulk Actions <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={bulkDelete} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <TagIcon className="mr-2 h-4 w-4" /> Mark as Featured
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <StarIcon className="mr-2 h-4 w-4" /> Mark as New
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProducts(new Set())}
                      className="text-cherry-600 hover:text-cherry-800 hover:bg-cherry-100"
                    >
                      Clear selection
                    </Button>
                  </div>
                </motion.div>
              )}

              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[160px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <AnimatePresence mode="wait" key={animationKey}>
                  {products.length === 0 ? (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={fadeIn}
                      className="flex flex-col items-center justify-center py-12 space-y-4 bg-cherry-50/50 rounded-lg border border-cherry-100"
                    >
                      <Package className="h-12 w-12 text-cherry-300" />
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-medium text-cherry-900">No products found</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          No products match your search criteria. Try adjusting your filters or add new products.
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={resetFilters} className="border-cherry-200">
                          Reset Filters
                        </Button>
                        <Button onClick={() => router.push("/admin/products/new")}>Add Product</Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      variants={staggerContainer}
                      className="overflow-hidden rounded-md border border-cherry-100"
                    >
                      <Table>
                        <TableHeader className="bg-cherry-50/70">
                          <TableRow>
                            <TableHead className="w-[30px]">
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-cherry-200 text-cherry-600 focus:ring-cherry-500"
                                  checked={selectedProducts.size === products.length && products.length > 0}
                                  onChange={toggleAllProducts}
                                />
                              </div>
                            </TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {products.map((product) => (
                              <motion.tr
                                key={product.id}
                                variants={fadeInUp}
                                className={`group border-b border-cherry-100 hover:bg-cherry-50/40 ${
                                  selectedProducts.has(product.id.toString()) ? "bg-cherry-50/80" : ""
                                }`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <TableCell>
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-cherry-200 text-cherry-600 focus:ring-cherry-500"
                                      checked={selectedProducts.has(product.id.toString())}
                                      onChange={() => toggleProductSelection(product.id.toString())}
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 overflow-hidden rounded-md border border-cherry-100 bg-white flex-shrink-0">
                                      {product.thumbnail_url ||
                                      (product.image_urls && product.image_urls.length > 0) ? (
                                        <Image
                                          src={
                                            product.thumbnail_url || (product.image_urls && product.image_urls[0]) || ""
                                          }
                                          alt={product.name}
                                          width={40}
                                          height={40}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="h-full w-full bg-cherry-50 flex items-center justify-center">
                                          <Package className="h-5 w-5 text-cherry-300" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-0.5">
                                      <h3 className="text-sm font-medium line-clamp-1 group-hover:text-cherry-700 transition-colors">
                                        {product.name}
                                      </h3>
                                      <p className="text-xs text-muted-foreground">ID: {product.id}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="bg-cherry-50/50 text-cherry-700 border-cherry-100"
                                  >
                                    {typeof product.category === "string"
                                      ? product.category
                                      : product.category?.name || "Uncategorized"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{getPriceDisplay(product.price, product.sale_price ?? undefined)}</TableCell>
                                <TableCell>{getStockDisplay(product.stock)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {product.is_featured && (
                                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200">
                                        Featured
                                      </Badge>
                                    )}
                                    {product.is_new && (
                                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">
                                        New
                                      </Badge>
                                    )}
                                    {product.is_sale && (
                                      <Badge className="bg-cherry-100 text-cherry-800 hover:bg-cherry-200 border-cherry-200">
                                        Sale
                                      </Badge>
                                    )}
                                    {product.is_flash_sale && (
                                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">
                                        Flash Sale
                                      </Badge>
                                    )}
                                    {product.is_luxury_deal && (
                                      <Badge className="bg-gold-100 text-gold-800 hover:bg-gold-200 border-gold-200">
                                        Luxury
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end space-x-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-cherry-600 hover:text-cherry-700 hover:bg-cherry-100"
                                            onClick={() => router.push(`/admin/products/${product.id}`)}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View product</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                            onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Edit product</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                            onClick={() => handleDeleteProduct(product.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delete product</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {products.length > 0 && (
                <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, totalProducts)} of{" "}
                      {totalProducts} products
                    </span>
                    <div className="flex items-center gap-1 ml-4">
                      <span>Show</span>
                      <Select
                        value={perPage.toString()}
                        onValueChange={(value) => {
                          setPerPage(Number(value))
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px] border-cherry-100">
                          <SelectValue placeholder={perPage.toString()} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>per page</span>
                    </div>
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) handlePageChange(currentPage - 1)
                          }}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        // Logic to show pages around current page
                        let pageNum = i + 1
                        if (currentPage > 3 && totalPages > 5) {
                          if (i === 0) pageNum = 1
                          else if (i === 1)
                            return (
                              <PaginationItem key="ellipsis-start">
                                <PaginationEllipsis />
                              </PaginationItem>
                            )
                          else if (i === 4) pageNum = totalPages
                          else pageNum = currentPage + i - 2
                        } else if (totalPages > 5 && i === 4) {
                          return (
                            <PaginationItem key="ellipsis-end">
                              <PaginationEllipsis />
                            </PaginationItem>
                          )
                        } else if (totalPages > 5 && i === 3) {
                          pageNum = totalPages
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                handlePageChange(pageNum)
                              }}
                              isActive={currentPage === pageNum}
                              className={
                                currentPage === pageNum ? "bg-cherry-100 text-cherry-800 hover:bg-cherry-200" : ""
                              }
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) handlePageChange(currentPage + 1)
                          }}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </CardContent>
        </Tabs>

        <CardFooter className="border-t border-cherry-100 bg-cherry-50/40 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{totalProducts}</span> products in total
            </div>
            <Button
              onClick={() => router.push("/admin/products/new")}
              variant="premium"
              className="hover:shadow-md transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" /> Add New Product
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-cherry-900">Confirm deletion</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the product and remove it from your store.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-100 rounded-md p-3 text-sm text-red-800">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-red-600" />
              <div>
                <p className="font-medium">Warning</p>
                <p className="mt-1">
                  Deleting this product will also remove it from any active orders or customer carts.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="border-cherry-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProduct}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-t-transparent border-white" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
