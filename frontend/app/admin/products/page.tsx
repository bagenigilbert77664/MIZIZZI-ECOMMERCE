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
  Star,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
  Filter,
  X,
  AlertCircle,
  FileText,
  Zap,
  Crown,
  Copy,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  BarChart3,
  Download,
  Upload,
  MessageSquare,
  Share2,
  PieChart,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
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
import { motion, AnimatePresence } from "framer-motion"
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
import { OptimizedImage } from "@/components/ui/optimized-image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { imageBatchService } from "@/services/image-batch-service" // Imported imageBatchService
import { websocketService } from "@/services/websocket" // Imported websocketService
import type { Product } from "@/types" // Imported types

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
  | "sales_high"
  | "sales_low"
  | "rating_high"
  | "rating_low"
  | "views_high"
  | "views_low"
  | "profit_high"
  | "profit_low"
type FilterOption =
  | "all"
  | "in_stock"
  | "out_of_stock"
  | "featured"
  | "on_sale"
  | "new"
  | "flash_sale"
  | "luxury_deal"
  | "trending"
  | "low_stock"
  | "high_performing"
  | "needs_attention"
  | "draft"
  | "archived"
type ViewMode = "list" | "grid" | "analytics" // Added grid and analytics to ViewMode

// Product Type (Redeclared, removed to avoid lint error)
// interface Product {
//   id: number | string
//   name: string
//   slug?: string
//   category?: { id: string | number; name: string } | string
//   category_id?: string | number
//   price: number
//   sale_price?: number | null
//   stock?: number
//   is_featured?: boolean
//   is_new?: boolean
//   is_sale?: boolean
//   is_flash_sale?: boolean
//   is_luxury_deal?: boolean
//   image_urls?: string[]
//   thumbnail_url?: string | null
//   description?: string
//   short_description?: string
//   created_at?: string
//   updated_at?: string
//   brand?: { id: string | number; name: string } | string
//   sku?: string
//   weight?: number
//   dimensions?: { length: number; width: number; height: number }
//   tags?: string[]
//   seo_title?: string
//   seo_description?: string
//   meta_keywords?: string[]
//   rating?: number
//   review_count?: number
//   total_sales?: number
//   views?: number
//   wishlist_count?: number
//   conversion_rate?: number
//   profit_margin?: number
//   cost_price?: number
//   supplier?: string
//   warranty?: string
//   return_policy?: string
//   shipping_class?: string
//   tax_class?: string
//   status?: "active" | "inactive" | "draft" | "archived"
//   visibility?: "public" | "private" | "password_protected"
//   featured_image?: string
//   gallery_images?: string[]
//   video_url?: string
//   downloadable?: boolean
//   virtual?: boolean
//   manage_stock?: boolean
//   stock_status?: "in_stock" | "out_of_stock" | "on_backorder"
//   backorders?: "no" | "notify" | "yes"
//   low_stock_threshold?: number
//   sold_individually?: boolean
//   purchase_note?: string
//   menu_order?: number
//   cross_sell_ids?: string[]
//   upsell_ids?: string[]
//   grouped_products?: string[]
//   external_url?: string
//   button_text?: string
//   attributes?: Array<{
//     name: string
//     value: string
//     visible: boolean
//     variation: boolean
//   }>
//   variations?: Array<{
//     id: string
//     attributes: Record<string, string>
//     price: number
//     sale_price?: number
//     stock?: number
//     image?: string
//   }>
//   // New properties for updated ProductStats calculation
//   stock_quantity?: number
//   discount_percentage?: number
//   // Added properties for the new table view
//   category_name?: string
//   compare_at_price?: number
// }

// Categories Type (Redeclared, removed to avoid lint error)
// interface Category {
//   id: number | string
//   name: string
//   slug?: string
// }

interface ProductStats {
  totalProducts: number
  inStock: number
  outOfStock: number
  lowStock: number
  onSale: number
  featured: number
  newProducts: number
  totalInventoryValue: number
  averagePrice: number
  categoriesCount: number
  luxuryDeal: number // Added luxuryDeal to ProductStats
}

// Added Loader component
const Loader = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-white/90 backdrop-blur-md z-50 flex items-center justify-center"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 flex flex-col items-center gap-6 max-w-sm mx-4"
    >
      <div className="relative">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        <div
          className="absolute inset-0 w-12 h-12 border-3 border-transparent border-r-blue-500 rounded-full animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
      </div>
      <div className="text-center">
        <p className="text-gray-900 font-semibold text-lg">Loading your data...</p>
        <p className="text-gray-500 text-sm mt-1">Please wait a moment.</p>
      </div>
    </motion.div>
  </motion.div>
)

const LoadingOverlay = ({ message }: { message: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-white/90 backdrop-blur-md z-50 flex items-center justify-center"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 flex flex-col items-center gap-6 max-w-sm mx-4"
    >
      <div className="relative">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        <div
          className="absolute inset-0 w-12 h-12 border-3 border-transparent border-r-blue-500 rounded-full animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
      </div>
      <div className="text-center">
        <p className="text-gray-900 font-semibold text-lg">{message}</p>
        <p className="text-gray-500 text-sm mt-1">Please wait...</p>
      </div>
    </motion.div>
  </motion.div>
)

const MiniSpinner = () => (
  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
)

const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 transition-all duration-200">
    <div className="flex items-start justify-between mb-4">
      <div className="p-2.5 bg-gray-50 rounded-xl">
        <Icon className="h-5 w-5 text-gray-700" strokeWidth={1.5} />
      </div>
      {trend && (
        <span
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            trend === "up"
              ? "bg-green-50 text-green-700"
              : trend === "down"
                ? "bg-red-50 text-red-700"
                : "bg-gray-50 text-gray-600",
          )}
        >
          {trendValue}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-semibold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  </div>
)

const EnhancedProductCard = ({
  product,
  isSelected,
  onSelect,
  onEdit,
  onView,
  onDelete,
}: {
  product: Product
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onView: () => void
  onDelete: () => void
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    whileHover={{ y: -4 }}
    className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
  >
    <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
      <OptimizedImage
        src={product.thumbnail_url || product.featured_image || "/placeholder.svg?height=300&width=300&query=product"}
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
        }
      />

      {/* Enhanced overlay with more actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

      {/* Selection checkbox */}
      <div className="absolute top-4 right-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="bg-white/90 backdrop-blur-sm border-white shadow-lg"
        />
      </div>

      {/* Status badges */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {product.is_featured && (
          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-lg">
            <Star className="h-3 w-3 mr-1 fill-current" /> Featured
          </Badge>
        )}
        {product.is_flash_sale && (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg">
            <Zap className="h-3 w-3 mr-1" /> Flash Sale
          </Badge>
        )}
        {product.is_luxury_deal && (
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg">
            <Crown className="h-3 w-3 mr-1" /> Luxury
          </Badge>
        )}
        {product.is_new && (
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-lg">
            <Sparkles className="h-3 w-3 mr-1" /> New
          </Badge>
        )}
      </div>

      {/* Quick actions */}
      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      {/* Performance indicator */}
      {product.conversion_rate && (
        <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-700 shadow-lg">
            {product.conversion_rate}% conversion
          </div>
        </div>
      )}
    </div>

    <div className="p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 line-clamp-2 text-lg leading-tight">{product.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-0 shadow-xl">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onView}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare className="mr-2 h-4 w-4" />
                Reviews ({product.review_count || 0})
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Enhanced pricing with profit margin */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          {product.sale_price && product.sale_price < product.price ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-gray-900">KSh {product.sale_price?.toLocaleString()}</span>
              <span className="text-sm line-through text-gray-500">KSh {product.price?.toLocaleString()}</span>
              <Badge variant="secondary" className="bg-red-100 text-red-700 rounded-full">
                -{Math.round(((product.price - product.sale_price) / product.price) * 100)}%
              </Badge>
            </div>
          ) : (
            <span className="font-bold text-xl text-gray-900">KSh {product.price?.toLocaleString()}</span>
          )}
          {product.profit_margin && (
            <p className="text-xs text-gray-500">
              Profit: {product.profit_margin}% • Cost: KSh {product.cost_price?.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Enhanced metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <div className="text-lg font-bold text-gray-900">{product.total_sales || 0}</div>
          <div className="text-xs text-gray-500">Sales</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-center gap-1">
            <div className="text-lg font-bold text-gray-900">{product.rating || 0}</div>
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
          </div>
          <div className="text-xs text-gray-500">({product.review_count || 0} reviews)</div>
        </div>
      </div>

      {/* Stock status with progress bar */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Stock Level</span>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full",
              product.stock === undefined || product.stock <= 0
                ? "bg-red-50 text-red-600 border-red-200"
                : product.stock < 10
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : "bg-green-50 text-green-600 border-green-200",
            )}
          >
            {product.stock === undefined || product.stock <= 0
              ? "Out of Stock"
              : product.stock < 10
                ? `Low: ${product.stock}`
                : `${product.stock} in stock`}
          </Badge>
        </div>
        {product.stock !== undefined && product.stock > 0 && (
          <Progress value={Math.min((product.stock / 100) * 100, 100)} className="h-2" />
        )}
      </div>

      {/* Category and tags */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 rounded-full">
          {(typeof product.category === "object" && product.category?.name) || "Uncategorized"}
        </Badge>
        {product.tags?.slice(0, 2).map((tag, index) => (
          <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 rounded-full">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  </motion.div>
)

export default function AdminProductsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAdminAuth() // Added isAdmin
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
  const [viewMode, setViewMode] = useState<ViewMode>("list") // Updated ViewMode
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [isFilterActive, setIsFilterActive] = useState(false)
  const [productImages, setProductImages] = useState<Record<string, string>>({})
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({})

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(isMobile ? 8 : 10)

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [filterOption, setFilterOption] = useState<FilterOption>("all")
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [categories, setCategories] = useState<any[]>([]) // Use the imported Category type
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, boolean>>({})
  const [operationLoading, setOperationLoading] = useState<{
    type: "refresh" | "fetch_images" | "bulk" | null
    message: string
  }>({ type: null, message: "" })

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
  const calculateProductStats = useCallback(
    (products: Product[]) => {
      const stats: ProductStats = {
        totalProducts: products.length,
        inStock: products.filter((p) => p.stock !== undefined && p.stock > 0).length,
        outOfStock: products.filter((p) => p.stock === undefined || p.stock <= 0).length,
        lowStock: products.filter(
          (p) => p.stock !== undefined && p.stock > 0 && p.stock <= (p.low_stock_threshold || 10),
        ).length,
        onSale: products.filter((p) => p.is_sale).length,
        featured: products.filter((p) => p.is_featured).length,
        newProducts: products.filter((p) => p.is_new).length,
        totalInventoryValue: products.reduce((sum, p) => sum + p.price * (p.stock || 0), 0),
        averagePrice: products.length > 0 ? products.reduce((sum, p) => sum + p.price, 0) / products.length : 0,
        categoriesCount: categories.length,
        luxuryDeal: products.filter((p) => p.is_luxury_deal).length, // Added calculation for luxuryDeal
      }
      setProductStats(stats)
      console.log("[v0] Product stats calculated:", stats)
    },
    [categories.length],
  ) // Added categories.length as dependency

  const fetchProductImages = useCallback(async (products: Product[]) => {
    if (!products.length) return

    const newImages: Record<string | number, string> = {}

    // Fetch actual ProductImage records for each product
    for (const product of products) {
      try {
        const images = await adminService.getProductImages(product.id)

        if (images && images.length > 0) {
          // Find primary image or use first image
          const primaryImage = images.find((img: any) => img.is_primary)
          const selectedImage = primaryImage || images[0]

          if (selectedImage && selectedImage.url) {
            newImages[product.id] = selectedImage.url
          }
        }
      } catch (error) {
        console.error(`[v0] Error fetching images for product ${product.id}:`, error)
        // Continue with next product instead of failing completely
      }
    }

    if (Object.keys(newImages).length > 0) {
      setProductImages(newImages)
      console.log("[v0] Updated product images from ProductImage table:", Object.keys(newImages).length, "products")
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    // Renamed from fetchAllProducts
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
        setOperationLoading({ type: "fetch_images", message: "Loading product images..." })

        try {
          // Pass the actual product objects to fetchProductImages
          await fetchProductImages(fetchedProducts)
        } finally {
          setOperationLoading({ type: null, message: "" })
        }
      }

      // Removed analytics fetching as it's no longer used
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
      fetchProducts() // Use the renamed function
    }
  }, [isAuthenticated, fetchProducts])

  useEffect(() => {
    if (!isAuthenticated) return

    console.log("[v0] Setting up WebSocket listener for product updates...")

    const handleWebSocketProductUpdate = async (data: any) => {
      console.log("[v0] Received WebSocket product_update event:", data)

      const productId = data.product_id || data.productId

      if (productId) {
        console.log("[v0] Clearing cached image for product:", productId)

        setProductImages((prev) => {
          const updated = { ...prev }
          delete updated[productId]
          return updated
        })

        setImageVersions((prev) => ({
          ...prev,
          [productId]: (prev[productId] || 0) + 1,
        }))

        // Also invalidate the image batch service cache
        imageBatchService.invalidateCache(productId)

        if (typeof localStorage !== "undefined") {
          try {
            localStorage.removeItem(`product_images_${productId}`)
            console.log("[v0] Cleared localStorage cache for product:", productId)
          } catch (error) {
            console.error("[v0] Error clearing localStorage:", error)
          }
        }
      }

      // Wait a moment for backend to finish processing
      console.log("[v0] Waiting 500ms for backend to process...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Refetch all products to get updated data
      console.log("[v0] Refetching products with fresh data...")
      await fetchProducts()
    }

    // Subscribe to WebSocket product_update events
    const unsubscribe = websocketService.on("product_update", handleWebSocketProductUpdate)

    return () => {
      console.log("[v0] Cleaning up WebSocket listener")
      unsubscribe()
    }
  }, [isAuthenticated, fetchProducts])

  // Add event listener for product image updates
  useEffect(() => {
    const handleProductImagesUpdated = async (event: CustomEvent) => {
      const { productId } = event.detail
      console.log("[v0] Product images updated via custom event for product:", productId)

      if (productId) {
        setProductImages((prev) => {
          const updated = { ...prev }
          delete updated[productId]
          console.log("[v0] Cleared cached image for product:", productId)
          return updated
        })

        setImageVersions((prev) => ({
          ...prev,
          [productId]: (prev[productId] || 0) + 1,
        }))

        imageBatchService.invalidateCache(productId)

        if (typeof localStorage !== "undefined") {
          try {
            localStorage.removeItem(`product_images_${productId}`)
            console.log("[v0] Cleared localStorage cache for product:", productId)
          } catch (error) {
            console.error("[v0] Error clearing localStorage:", error)
          }
        }
      }

      console.log("[v0] Waiting 500ms for backend to process image update...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      console.log("[v0] Refetching all products with fresh data...")
      await fetchProducts()
    }

    window.addEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)

    return () => {
      window.removeEventListener("productImagesUpdated", handleProductImagesUpdated as EventListener)
    }
  }, [fetchProducts]) // Add fetchProducts to dependency array

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
          case "trending": // Placeholder for trending filter
            return product.views !== undefined && product.views > 100 // Example: products with more than 100 views
          case "low_stock":
            return product.stock !== undefined && product.stock < (product.low_stock_threshold || 10)
          case "high_performing": // Placeholder for high performing filter
            return product.conversion_rate !== undefined && product.conversion_rate > 5 // Example: conversion rate > 5%
          case "needs_attention": // Placeholder for needs attention filter
            return (
              product.stock === undefined ||
              product.stock <= 0 ||
              (product.stock !== undefined && product.stock < (product.low_stock_threshold || 10))
            )
          case "draft":
            return product.status === "draft"
          case "archived":
            return product.status === "archived"
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
          case "trending": // Placeholder for trending filter
            return product.views !== undefined && product.views > 100 // Example: products with more than 100 views
          case "low_stock":
            return product.stock !== undefined && product.stock < (product.low_stock_threshold || 10)
          case "high_performing": // Placeholder for high performing filter
            return product.conversion_rate !== undefined && product.conversion_rate > 5 // Example: conversion rate > 5%
          case "needs_attention": // Placeholder for needs attention filter
            return (
              product.stock === undefined ||
              product.stock <= 0 ||
              (product.stock !== undefined && product.stock < (product.low_stock_threshold || 10))
            )
          case "draft":
            return product.status === "draft"
          case "archived":
            return product.status === "archived"
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
        case "sales_high":
          return (b.total_sales || 0) - (a.total_sales || 0)
        case "sales_low":
          return (a.total_sales || 0) - (b.total_sales || 0)
        case "rating_high":
          return (b.rating || 0) - (a.rating || 0)
        case "rating_low":
          return (a.rating || 0) - (b.rating || 0)
        case "views_high":
          return (b.views || 0) - (a.views || 0)
        case "views_low":
          return (a.views || 0) - (b.views || 0)
        case "profit_high":
          return (b.profit_margin || 0) - (a.profit_margin || 0)
        case "profit_low":
          return (a.profit_margin || 0) - (b.profit_margin || 0)
        default:
          return 0
      }
    })

  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / pageSize)

  // Get current page products
  const currentProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleRefresh = async () => {
    setOperationLoading({ type: "refresh", message: "Refreshing products..." })
    try {
      setIsRefreshing(true)
      setProductImages({})
      setImageVersions({})
      imageBatchService.clearCache()

      if (typeof localStorage !== "undefined") {
        try {
          const keys = Object.keys(localStorage)
          keys.forEach((key) => {
            if (key.startsWith("product_images_")) {
              localStorage.removeItem(key)
            }
          })
          console.log("[v0] Cleared all localStorage image caches")
        } catch (error) {
          console.error("[v0] Error clearing localStorage:", error)
        }
      }

      console.log("[v0] Cleared all image caches, refetching products...")
      await fetchProducts()
    } finally {
      setOperationLoading({ type: null, message: "" })
    }
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
      // Recalculate stats after deletion
      calculateProductStats(allProducts.filter((p) => p.id.toString() !== productToDelete))

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
        calculateProductStats(allProducts.filter((p) => p.id.toString() !== productToDelete))

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
        calculateProductStats(allProducts.filter((p) => !successfulDeletes.includes(p.id.toString())))
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
    setIsFilterSheetOpen(false) // Close the filter sheet
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

  const getProductImage = (product: Product) => {
    const cachedImage = productImages[product.id.toString()]
    if (cachedImage) {
      const version = imageVersions[product.id] || 0
      const separator = cachedImage.includes("?") ? "&" : "?"
      return `${cachedImage}${separator}v=${version}`
    }

    // Fallback to fetching from ProductImage table if not in cache
    // Note: This part might need adjustment depending on how you want to handle initial load vs. cache misses
    // For now, we rely on the fetchProductImages to populate the cache.
    // If a product is not in the cache, we'll return a placeholder or try to fetch it.

    return `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(product.name || "Product")}`
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 md:p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Products</h1>
            <p className="text-gray-600 text-lg">Manage your product catalog with advanced tools and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                /* Export functionality */
              }}
              className="rounded-full border-gray-200 hover:bg-gray-50 transition-all duration-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                /* Import functionality */
              }}
              className="rounded-full border-gray-200 hover:bg-gray-50 transition-all duration-200"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="rounded-full border-gray-200 hover:bg-gray-50 transition-all duration-200 bg-transparent"
            >
              {isLoading ? <MiniSpinner /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isMobile ? "" : "Refresh"}
            </Button>
            <Button
              onClick={() => router.push("/admin/products/new")}
              className="rounded-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white shadow-lg transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" /> {isMobile ? "Add" : "Add Product"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Simplified stats grid layout with better spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Products"
          value={productStats?.totalProducts || 0}
          subtitle={`${productStats?.categoriesCount || 0} categories`}
          icon={Package}
        />
        <StatsCard
          title="In Stock"
          value={productStats?.inStock || 0}
          subtitle={`${productStats?.outOfStock || 0} out of stock`}
          icon={CheckCircle}
          trend={productStats?.inStock > 0 ? "up" : "neutral"}
          trendValue={productStats?.inStock > 0 ? "Available" : "None"}
        />
        <StatsCard
          title="Low Stock"
          value={productStats?.lowStock || 0}
          subtitle="Need restocking"
          icon={AlertTriangle}
          trend={productStats?.lowStock > 0 ? "down" : "up"}
          trendValue={productStats?.lowStock > 0 ? "Alert" : "Good"}
        />
        <StatsCard
          title="On Sale"
          value={productStats?.onSale || 0}
          subtitle={`${productStats?.featured || 0} featured`}
          icon={Tag}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="New Products"
          value={productStats?.newProducts || 0}
          subtitle="Recently added"
          icon={Sparkles}
        />
        <StatsCard
          title="Inventory Value"
          value={`KSh ${(productStats?.totalInventoryValue || 0).toLocaleString()}`}
          subtitle="Total stock value"
          icon={DollarSign}
        />
        <StatsCard
          title="Average Price"
          value={`KSh ${(productStats?.averagePrice || 0).toLocaleString()}`}
          subtitle="Per product"
          icon={TrendingUp}
        />
        <StatsCard
          title="Luxury Deals"
          value={productStats?.luxuryDeal || 0}
          subtitle="Exclusive offers"
          icon={Crown}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 rounded-full border-gray-200 focus:border-gray-300"
                />
              </div>
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-full border-gray-200 hover:bg-gray-50 transition-all duration-200",
                      isFilterActive && "bg-blue-50 border-blue-200 text-blue-700",
                    )}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Filters{" "}
                    {isFilterActive &&
                      `(${Object.values({ searchQuery, filterOption, categoryFilter }).filter(Boolean).length})`}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-96">
                  <SheetHeader>
                    <SheetTitle className="text-xl font-semibold">Filter Products</SheetTitle>
                    <SheetDescription className="text-gray-600">
                      Apply filters to narrow down your product list
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Category</h3>
                      <Select
                        value={categoryFilter?.toString() || "all"}
                        onValueChange={(value) => setCategoryFilter(value === "all" ? null : Number.parseInt(value))}
                      >
                        <SelectTrigger className="w-full rounded-full border-gray-200">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
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
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Product Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-in-stock"
                            checked={activeTab === "in_stock"}
                            onCheckedChange={() => setActiveTab(activeTab === "in_stock" ? "all" : "in_stock")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-in-stock" className="ml-2 text-sm text-gray-700">
                            In Stock
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-out-of-stock"
                            checked={activeTab === "out_of_stock"}
                            onCheckedChange={() => setActiveTab(activeTab === "out_of_stock" ? "all" : "out_of_stock")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-out-of-stock" className="ml-2 text-sm text-gray-700">
                            Out of Stock
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-featured"
                            checked={activeTab === "featured"}
                            onCheckedChange={() => setActiveTab(activeTab === "featured" ? "all" : "featured")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-featured" className="ml-2 text-sm text-gray-700">
                            Featured
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-on-sale"
                            checked={activeTab === "on_sale"}
                            onCheckedChange={() => setActiveTab(activeTab === "on_sale" ? "all" : "on_sale")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-on-sale" className="ml-2 text-sm text-gray-700">
                            On Sale
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-new"
                            checked={activeTab === "new"}
                            onCheckedChange={() => setActiveTab(activeTab === "new" ? "all" : "new")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-new" className="ml-2 text-sm text-gray-700">
                            New Arrivals
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-flash-sale"
                            checked={activeTab === "flash_sale"}
                            onCheckedChange={() => setActiveTab(activeTab === "flash_sale" ? "all" : "flash_sale")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-flash-sale" className="ml-2 text-sm text-gray-700">
                            Flash Sale
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-luxury-deal"
                            checked={activeTab === "luxury_deal"}
                            onCheckedChange={() => setActiveTab(activeTab === "luxury_deal" ? "all" : "luxury_deal")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-luxury-deal" className="ml-2 text-sm text-gray-700">
                            Luxury Deals
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-trending"
                            checked={activeTab === "trending"}
                            onCheckedChange={() => setActiveTab(activeTab === "trending" ? "all" : "trending")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-trending" className="ml-2 text-sm text-gray-700">
                            Trending
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-low-stock"
                            checked={activeTab === "low_stock"}
                            onCheckedChange={() => setActiveTab(activeTab === "low_stock" ? "all" : "low_stock")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-low-stock" className="ml-2 text-sm text-gray-700">
                            Low Stock
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-high-performing"
                            checked={activeTab === "high_performing"}
                            onCheckedChange={() =>
                              setActiveTab(activeTab === "high_performing" ? "all" : "high_performing")
                            }
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-high-performing" className="ml-2 text-sm text-gray-700">
                            High Performing
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-needs-attention"
                            checked={activeTab === "needs_attention"}
                            onCheckedChange={() =>
                              setActiveTab(activeTab === "needs_attention" ? "all" : "needs_attention")
                            }
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-needs-attention" className="ml-2 text-sm text-gray-700">
                            Needs Attention
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-draft"
                            checked={activeTab === "draft"}
                            onCheckedChange={() => setActiveTab(activeTab === "draft" ? "all" : "draft")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-draft" className="ml-2 text-sm text-gray-700">
                            Draft
                          </label>
                        </div>
                        <div className="flex items-center">
                          <Checkbox
                            id="filter-archived"
                            checked={activeTab === "archived"}
                            onCheckedChange={() => setActiveTab(activeTab === "archived" ? "all" : "archived")}
                            className="h-4 w-4 rounded-md border-gray-300"
                          />
                          <label htmlFor="filter-archived" className="ml-2 text-sm text-gray-700">
                            Archived
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Sort By</h3>
                      <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                        <SelectTrigger className="w-full rounded-full border-gray-200">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                          <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                          <SelectItem value="price_high">Price (High to Low)</SelectItem>
                          <SelectItem value="price_low">Price (Low to High)</SelectItem>
                          <SelectItem value="stock_high">Stock (High to Low)</SelectItem>
                          <SelectItem value="stock_low">Stock (Low to High)</SelectItem>
                          <SelectItem value="sales_high">Best Selling</SelectItem>
                          <SelectItem value="rating_high">Highest Rated</SelectItem>
                          <SelectItem value="profit_high">Most Profitable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <SheetFooter className="gap-2 pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={resetFilters} className="rounded-full bg-transparent">
                      Reset Filters
                    </Button>
                    <SheetClose asChild>
                      <Button className="rounded-full bg-gray-900 hover:bg-gray-800">Apply Filters</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              {isFilterActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="rounded-full border-gray-200 hover:bg-gray-50 bg-transparent"
                >
                  <X className="h-4 w-4 mr-1" /> Clear Filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {selectedProducts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full"
                >
                  <span className="text-sm font-medium">{selectedProducts.length} selected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProducts([])}
                    className="h-6 px-2 rounded-full"
                  >
                    Clear
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                    className="rounded-full"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </motion.div>
              )}

              <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                <SelectTrigger className="w-[180px] rounded-full border-gray-200">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price_high">Price (High to Low)</SelectItem>
                  <SelectItem value="price_low">Price (Low to High)</SelectItem>
                  <SelectItem value="stock_high">Stock (High to Low)</SelectItem>
                  <SelectItem value="stock_low">Stock (Low to High)</SelectItem>
                  <SelectItem value="sales_high">Best Selling</SelectItem>
                  <SelectItem value="rating_high">Highest Rated</SelectItem>
                  <SelectItem value="profit_high">Most Profitable</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-full"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-full"
                >
                  <Package className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "analytics" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("analytics")}
                  className="rounded-full"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 py-4 border-b border-gray-100">
            <TabsList className="grid grid-cols-4 md:grid-cols-8 gap-1 bg-gray-50 p-1 rounded-2xl">
              {[
                { value: "all", label: "All", count: allProducts.length, icon: Package },
                { value: "in_stock", label: "In Stock", count: productStats?.inStock || 0, icon: CheckCircle2 },
                { value: "out_of_stock", label: "Out of Stock", count: productStats?.outOfStock || 0, icon: XCircle },
                { value: "featured", label: "Featured", count: productStats?.featured || 0, icon: Star },
                { value: "on_sale", label: "On Sale", count: productStats?.onSale || 0, icon: Percent },
                { value: "new", label: "New", count: productStats?.newProducts || 0, icon: Sparkles },
                { value: "trending", label: "Trending", count: 0, icon: TrendingUp }, // Placeholder count
                { value: "luxury_deal", label: "Luxury", count: productStats?.luxuryDeal || 0, icon: Crown }, // Use luxuryDeal count
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs md:text-sm rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">{tab.label.slice(0, 3)}</span>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Failed to load products</h3>
                <p className="text-gray-600 mb-6 max-w-md">{error}</p>
                <Button onClick={fetchProducts} className="rounded-full bg-gray-900 hover:bg-gray-800">
                  {" "}
                  {/* Use fetchProducts */}
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="h-16 w-16 text-gray-400 mb-6" />
                <h3 className="text-2xl font-bold mb-3">No products found</h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  {isFilterActive
                    ? "Try adjusting your filters to see more results"
                    : "Get started by adding your first product to the catalog"}
                </p>
                <div className="flex gap-3">
                  {isFilterActive && (
                    <Button variant="outline" onClick={resetFilters} className="rounded-full bg-transparent">
                      <X className="mr-2 h-4 w-4" />
                      Reset Filters
                    </Button>
                  )}
                  <Button
                    onClick={() => router.push("/admin/products/new")}
                    className="rounded-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Your First Product
                  </Button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                <AnimatePresence>
                  {currentProducts.map((product, index) => (
                    <EnhancedProductCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProducts.includes(product.id.toString())}
                      onSelect={() => toggleProductSelection(product.id.toString())}
                      onEdit={() => router.push(`/admin/products/${product.id}/edit`)}
                      onView={() => window.open(`/product/${product.id}`, "_blank")}
                      onDelete={() => {
                        setProductToDelete(product.id.toString())
                        setIsDeleteDialogOpen(true)
                      }}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : viewMode === "analytics" ? (
              <div className="space-y-8">
                {/* Analytics dashboard content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Sales Performance
                      </CardTitle>
                      <CardDescription>Overview of your sales over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Chart component would go here */}
                      <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                        <p className="text-gray-500">Sales chart visualization</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Category Distribution
                      </CardTitle>
                      <CardDescription>Breakdown of products by category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                        <p className="text-gray-500">Category chart visualization</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              // Enhanced table view
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-gray-200">
                      <TableHead className="w-[40px] py-4">
                        <Checkbox
                          checked={selectedProducts.length === currentProducts.length && currentProducts.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="ml-2"
                        />
                      </TableHead>
                      <TableHead className="w-[300px] py-4">
                        <span className="font-semibold text-gray-900">Product</span>
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900">Price</TableHead>
                      <TableHead className="font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="font-semibold text-gray-900">Stock</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-gray-50 border-gray-100">
                        <TableCell className="py-4">
                          <Checkbox
                            checked={selectedProducts.includes(product.id.toString())}
                            onCheckedChange={() => toggleProductSelection(product.id.toString())}
                            className="ml-2"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-12 w-12 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 mr-3">
                              <OptimizedImage
                                src={getProductImage(product)}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                fallback={
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Package className="h-5 w-5 text-gray-400" />
                                  </div>
                                }
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 line-clamp-1">{product.name}</div>
                              <div className="text-sm text-gray-500">SKU: {product.sku || "N/A"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {product.sale_price && product.sale_price < product.price ? (
                              <>
                                <span className="font-bold text-gray-900">
                                  KSh {product.sale_price?.toLocaleString()}
                                </span>
                                <div className="text-sm line-through text-gray-500">
                                  KSh {product.price?.toLocaleString()}
                                </div>
                              </>
                            ) : (
                              <span className="font-bold text-gray-900">KSh {product.price?.toLocaleString()}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-700 rounded-full">
                            {(typeof product.category === "object" && product.category?.name) ||
                              getCategoryName(product.category_id) ||
                              "Uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full",
                              product.stock === undefined || product.stock <= 0
                                ? "bg-red-50 text-red-600 border-red-200"
                                : product.stock < 10
                                  ? "bg-amber-50 text-amber-600 border-amber-200"
                                  : "bg-green-50 text-green-600 border-green-200",
                            )}
                          >
                            {product.stock === undefined || product.stock <= 0
                              ? "Out of Stock"
                              : product.stock < 10
                                ? `Low: ${product.stock}`
                                : `${product.stock} in stock`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {product.is_featured && (
                              <Badge className="bg-blue-500 text-white rounded-full">
                                <Star className="h-3 w-3 mr-1 fill-current" /> Featured
                              </Badge>
                            )}
                            {product.is_new && <Badge className="bg-green-500 text-white rounded-full">New</Badge>}
                            {product.is_sale && <Badge className="bg-orange-500 text-white rounded-full">Sale</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                              onClick={() => window.open(`/product/${product.id}`, "_blank")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}`)}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setProductToDelete(product.id.toString())
                                    setIsDeleteDialogOpen(true)
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Enhanced pagination */}
            {filteredProducts.length > 0 && totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold">{Math.min(currentPage * pageSize, filteredProducts.length)}</span> of{" "}
                  <span className="font-semibold">{filteredProducts.length}</span> products
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-full"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {getPaginationItems().map((pageItem, index) =>
                      pageItem === "ellipsis-start" || pageItem === "ellipsis-end" ? (
                        <span
                          key={pageItem + index}
                          className="flex items-center justify-center w-10 h-10 text-sm text-gray-500"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={pageItem}
                          variant={currentPage === pageItem ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageItem as number)}
                          className="rounded-full w-10 h-10"
                        >
                          {pageItem}
                        </Button>
                      ),
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-full"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </motion.div>

      {/* Enhanced loading overlay */}
      <AnimatePresence>
        {operationLoading.type && <LoadingOverlay message={operationLoading.message} />}
      </AnimatePresence>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action cannot be undone. The product will be permanently removed from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="rounded-full bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <MiniSpinner /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">
              Delete {selectedProducts.length} Products?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              This action cannot be undone. All selected products will be permanently removed from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="rounded-full bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <MiniSpinner /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete {selectedProducts.length} Products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
