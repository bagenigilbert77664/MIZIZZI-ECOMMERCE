"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search,
  X,
  Heart,
  ShoppingBag,
  ChevronRight,
  Home,
  Grid3X3,
  Rows3,
  ArrowUpDown,
  Filter,
  Check,
  ChevronDown,
  Star,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { productService } from "@/services/product"
import { categoryService, type Category } from "@/services/category"
import type { Product } from "@/types"
import Image from "next/image"
import Link from "next/link"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { ProductSort } from "@/components/products/product-sort"
import { Loader } from "@/components/ui/loader"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ProductsPage() {
  // State management
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [wishlist, setWishlist] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [priceInputMin, setPriceInputMin] = useState("0")
  const [priceInputMax, setPriceInputMax] = useState("1,000,000")

  const isMobile = useMediaQuery("(max-width: 768px)")
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      const fetchedCategories = await categoryService.getCategories({ parent_id: null })
      setCategories(fetchedCategories)
    } catch (err) {
      console.error("Error fetching categories:", err)
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  // Fetch initial products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setInitialLoading(true)

      await fetchCategories()

      const fetchedProducts = await productService.getProducts({
        limit: 24,
      })

      console.log(`Fetched ${fetchedProducts.length} products for display`)
      setProducts(fetchedProducts)
      setFilteredProducts(fetchedProducts)
      setHasMore(fetchedProducts.length >= 24)
    } catch (err) {
      console.error("Error fetching products:", err)
      setError("Failed to load products")
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [fetchCategories])

  // Initial data fetching
  useEffect(() => {
    fetchCategories()
    fetchProducts()

    const savedWishlist = localStorage.getItem("wishlist")
    if (savedWishlist) {
      try {
        setWishlist(JSON.parse(savedWishlist))
      } catch (e) {
        console.error("Error parsing wishlist from localStorage:", e)
      }
    }
  }, [fetchCategories, fetchProducts])

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (loadMoreRef.current && !initialLoading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loadingMore) {
            loadMoreProducts()
          }
        },
        { threshold: 0.1 },
      )

      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadingMore, initialLoading])

  // Filter products
  useEffect(() => {
    if (loading) return

    let filtered = [...products]

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.description && product.description.toLowerCase().includes(query)) ||
          (product.category_id && product.category_id.toString().toLowerCase().includes(query)) ||
          (typeof product.category === "string" && product.category.toLowerCase().includes(query)) ||
          (product.category?.name && product.category.name.toLowerCase().includes(query)),
      )
    }

    // Apply category filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => {
        const categoryId =
          typeof product.category_id === "string" ? Number.parseInt(product.category_id, 10) : product.category_id

        return selectedCategories.includes(Number(categoryId))
      })
    }

    // Apply price range filter
    filtered = filtered.filter((product) => {
      const productPrice =
        typeof product.sale_price === "number" && product.sale_price > 0
          ? product.sale_price
          : typeof product.price === "number"
            ? product.price
            : 0

      return productPrice >= priceRange[0] && productPrice <= priceRange[1]
    })

    // Apply sorting
    filtered.sort((a, b) => {
      const priceA =
        typeof a.sale_price === "number" && a.sale_price > 0 ? a.sale_price : typeof a.price === "number" ? a.price : 0

      const priceB =
        typeof b.sale_price === "number" && b.sale_price > 0 ? b.sale_price : typeof b.price === "number" ? b.price : 0

      switch (sortBy) {
        case "price-asc":
          return priceA - priceB
        case "price-desc":
          return priceB - priceA
        case "discount":
          const discountA =
            typeof a.sale_price === "number" && typeof a.price === "number" && a.sale_price < a.price
              ? (a.price - a.sale_price) / a.price
              : 0

          const discountB =
            typeof b.sale_price === "number" && typeof b.price === "number" && b.sale_price < b.price
              ? (b.price - b.sale_price) / b.price
              : 0

          return discountB - discountA
        case "newest":
        default:
          return Number(b.id) - Number(a.id)
      }
    })

    setFilteredProducts(filtered)

    // Update active filters
    const newActiveFilters: string[] = []
    if (debouncedSearchQuery) newActiveFilters.push(`Search: ${debouncedSearchQuery}`)
    if (selectedCategories.length > 0) {
      const categoryNames = selectedCategories
        .map((id) => categories.find((cat) => cat.id === id)?.name)
        .filter(Boolean)
      newActiveFilters.push(`Categories: ${categoryNames.join(", ")}`)
    }
    if (priceRange[0] > 0 || priceRange[1] < 1000000) {
      newActiveFilters.push(`Price: KSh ${priceRange[0].toLocaleString()} - KSh ${priceRange[1].toLocaleString()}`)
    }

    setActiveFilters(newActiveFilters)
  }, [debouncedSearchQuery, products, selectedCategories, priceRange, sortBy, loading, categories])

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist))
  }, [wishlist])

  // Handle price input changes
  const handlePriceInputChange = (value: string, isMin: boolean) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "")

    if (isMin) {
      setPriceInputMin(numericValue)
    } else {
      setPriceInputMax(numericValue)
    }
  }

  // Apply price range from inputs
  const applyPriceRange = () => {
    const min = Number.parseInt(priceInputMin.replace(/,/g, ""), 10) || 0
    const max = Number.parseInt(priceInputMax.replace(/,/g, ""), 10) || 1000000

    // Ensure min is not greater than max
    const validMin = Math.min(min, max)
    const validMax = Math.max(min, max)

    setPriceRange([validMin, validMax])

    // Format the display values
    setPriceInputMin(validMin.toLocaleString())
    setPriceInputMax(validMax.toLocaleString())
  }

  // Load more products function
  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1

      const moreProducts = await productService.getProducts({
        page: nextPage,
        limit: 12,
      })

      if (moreProducts.length === 0) {
        setHasMore(false)
      } else {
        const typedProducts = moreProducts.map((product) => {
          const typedProduct: Product = {
            ...product,
            product_type: product.is_flash_sale ? "flash_sale" : product.is_luxury_deal ? "luxury" : "regular",
          }
          return typedProduct
        })

        setProducts((prev) => [...prev, ...typedProducts])
        setPage(nextPage)
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Toggle category selection
  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  // Toggle wishlist
  const toggleWishlist = (productId: number, e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    setWishlist((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]))
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedCategories([])
    setPriceRange([0, 1000000])
    setPriceInputMin("0")
    setPriceInputMax("1,000,000")
    setSortBy("newest")
  }

  // Calculate discount percentage
  const calculateDiscount = (price: number | undefined, salePrice: number | null | undefined) => {
    // Ensure price is a valid number
    const validPrice = typeof price === "number" ? price : 0

    // Ensure salePrice is either a valid number or null
    const validSalePrice = typeof salePrice === "number" ? salePrice : null

    if (!validSalePrice || validSalePrice >= validPrice || validPrice === 0) return 0
    return Math.round(((validPrice - validSalePrice) / validPrice) * 100)
  }

  // Get product image URL with fallback
  const getProductImageUrl = (product: Product): string => {
    if (product.image_urls && product.image_urls.length > 0) {
      return product.image_urls[0]
    }
    if (product.thumbnail_url) {
      return product.thumbnail_url
    }
    if (product.images && product.images.length > 0 && product.images[0].url) {
      return product.images[0].url
    }
    return "/placeholder.svg?height=300&width=300"
  }

  // Product Card Component (same as product grid)
  const ProductCard = ({ product }: { product: Product }) => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const price = typeof product.price === "number" ? product.price : 0
    const salePrice = typeof product.sale_price === "number" ? product.sale_price : null
    const imageUrl = getProductImageUrl(product)
    const isOnSale = salePrice !== null && salePrice < price && price > 0

    return (
      <Link href={`/product/${product.id}`} prefetch={false}>
        <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99] font-sans">
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
            {!imageLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlZWVlIiAvPjwvc3ZnPg=="
            />
            {isOnSale && (
              <div className="absolute left-0 top-2 bg-red-700 px-2 py-1 text-[10px] font-semibold text-white">
                -{calculateDiscount(price, salePrice)}%
              </div>
            )}
            <button
              onClick={(e) => toggleWishlist(Number(product.id), e)}
              className={cn(
                "absolute right-2 top-2 rounded-full p-1.5 transition-colors",
                wishlist.includes(Number(product.id))
                  ? "bg-red-50 text-red-600"
                  : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-600",
              )}
            >
              <Heart className={cn("h-4 w-4", wishlist.includes(Number(product.id)) && "fill-red-600")} />
            </button>
          </div>
          <CardContent className="p-2 font-sans">
            <div className="mb-1">
              <span className="inline-block rounded-sm bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                MIZIZZI
              </span>
            </div>
            <div className="space-y-0.5">
              <h3 className="line-clamp-2 text-sm font-medium leading-tight text-gray-800">{product.name}</h3>
              <div className="text-base font-semibold text-gray-900">KSh {(salePrice || price).toLocaleString()}</div>
              {isOnSale && <div className="text-sm text-gray-500 line-through">KSh {price.toLocaleString()}</div>}
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-red-100 bg-red-50 p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Oops! Something went wrong</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          {/* Breadcrumb navigation */}
          <nav className="py-3 flex items-center text-sm text-gray-500 overflow-x-auto">
            <Link href="/" className="flex items-center hover:text-red-600 transition-colors whitespace-nowrap">
              <Home className="mr-1 h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <ChevronRight className="mx-2 h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-gray-900 whitespace-nowrap">All Products</span>
          </nav>

          {/* Main header */}
          <div className="py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">All Products</h1>
                <p className="text-sm text-gray-600">
                  <span>
                    Showing {filteredProducts.length} of {products.length} products
                  </span>
                </p>
              </div>

              {/* Search and controls */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    className="pl-10 pr-10 h-11 border-gray-300 focus:border-red-500 focus:ring-red-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Mobile filter button */}
                <Sheet open={showFilters} onOpenChange={setShowFilters}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 border-gray-300 lg:hidden"
                      aria-label="Filter products"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-white">
                    <SheetHeader className="mb-6">
                      <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6">
                      {/* Mobile sort options */}
                      <div>
                        <h3 className="mb-3 text-sm font-medium text-gray-900">Sort By</h3>
                        <ProductSort value={sortBy} onValueChange={setSortBy} />
                      </div>

                      <Separator />

                      {/* Mobile price range filter */}
                      <div>
                        <h3 className="mb-3 text-sm font-medium text-gray-900">Price Range</h3>
                        <div className="px-1">
                          <Slider
                            min={0}
                            max={1000000}
                            step={5000}
                            value={priceRange}
                            onValueChange={(value) => setPriceRange(value as [number, number])}
                            className="py-4"
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-xs text-gray-500">
                              KSh
                            </span>
                            <input
                              type="text"
                              value={priceInputMin}
                              onChange={(e) => handlePriceInputChange(e.target.value, true)}
                              onBlur={applyPriceRange}
                              className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                            />
                          </div>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-xs text-gray-500">
                              KSh
                            </span>
                            <input
                              type="text"
                              value={priceInputMax}
                              onChange={(e) => handlePriceInputChange(e.target.value, false)}
                              onBlur={applyPriceRange}
                              className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Mobile category filter */}
                      <div>
                        <h3 className="mb-3 text-sm font-medium text-gray-900">Categories</h3>
                        {loadingCategories ? (
                          <div className="flex justify-center py-4">
                            <Loader />
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {categories.map((category) => (
                              <label key={category.id} className="flex items-center cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(category.id)}
                                  onChange={() => toggleCategory(category.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                                  {category.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button variant="outline" size="sm" onClick={resetFilters}>
                          Reset All
                        </Button>
                        <SheetClose asChild>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                            Apply Filters
                          </Button>
                        </SheetClose>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 px-4 border-gray-300 text-gray-600 hover:text-gray-900 hidden lg:flex"
                    >
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Sort
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => setSortBy("newest")}
                      className={cn("cursor-pointer", sortBy === "newest" && "bg-gray-100")}
                    >
                      {sortBy === "newest" && <Check className="mr-2 h-4 w-4" />}
                      Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortBy("price-asc")}
                      className={cn("cursor-pointer", sortBy === "price-asc" && "bg-gray-100")}
                    >
                      {sortBy === "price-asc" && <Check className="mr-2 h-4 w-4" />}
                      Price: Low to High
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortBy("price-desc")}
                      className={cn("cursor-pointer", sortBy === "price-desc" && "bg-gray-100")}
                    >
                      {sortBy === "price-desc" && <Check className="mr-2 h-4 w-4" />}
                      Price: High to Low
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortBy("discount")}
                      className={cn("cursor-pointer", sortBy === "discount" && "bg-gray-100")}
                    >
                      {sortBy === "discount" && <Check className="mr-2 h-4 w-4" />}
                      Discount
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View mode toggle */}
                <div className="hidden lg:flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-11 px-4 rounded-none border-0",
                      viewMode === "grid"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                    )}
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-11 px-4 rounded-none border-0 border-l border-gray-300",
                      viewMode === "list"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                    )}
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <Rows3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active filters */}
            {activeFilters.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                {activeFilters.map((filter, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
                  >
                    {filter}
                    <button onClick={resetFilters} className="ml-1 hover:bg-red-200 rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop sidebar filters */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-red-600 hover:text-red-700">
                  Reset
                </Button>
              </div>

              <Separator className="mb-6" />

              {/* Enhanced price range filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
                <div className="px-1">
                  <Slider
                    min={0}
                    max={1000000}
                    step={5000}
                    value={priceRange}
                    onValueChange={(value) => {
                      setPriceRange(value as [number, number])
                      setPriceInputMin(value[0].toLocaleString())
                      setPriceInputMax(value[1].toLocaleString())
                    }}
                    className="py-4"
                  />
                </div>
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Price</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-xs text-gray-500">KSh</span>
                      <input
                        type="text"
                        value={priceInputMin}
                        onChange={(e) => handlePriceInputChange(e.target.value, true)}
                        onBlur={applyPriceRange}
                        className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Maximum Price</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-xs text-gray-500">KSh</span>
                      <input
                        type="text"
                        value={priceInputMax}
                        onChange={(e) => handlePriceInputChange(e.target.value, false)}
                        onBlur={applyPriceRange}
                        className="block w-full rounded-md border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={applyPriceRange}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Apply Price Range
                  </Button>
                </div>
              </div>

              <Separator className="mb-6" />

              {/* Categories filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
                {loadingCategories ? (
                  <div className="flex justify-center py-4">
                    <Loader />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {category.name}
                        </span>
                        {/* <span className="ml-auto text-xs text-gray-500">({category.products_count})</span> */}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Products grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">We couldn't find any products matching your criteria.</p>
                <Button onClick={resetFilters} className="bg-red-600 hover:bg-red-700 text-white">
                  Reset Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Grid view */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-2 gap-x-[1px] gap-y-6 bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {initialLoading ? (
                      // Skeleton cards
                      <>
                        {[...Array(20)].map((_, index) => (
                          <div key={`skeleton-${index}`} className="bg-white p-2">
                            <div className="aspect-[4/3] bg-gray-200 animate-pulse mb-2"></div>
                            <div className="space-y-2">
                              <div className="h-3 w-16 rounded bg-gray-200 animate-pulse"></div>
                              <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse"></div>
                              <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse"></div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)
                    )}
                  </div>
                )}

                {/* List view - redesigned to match grid styling */}
                {viewMode === "list" && (
                  <div className="space-y-4">
                    {initialLoading ? (
                      // List view skeleton
                      <>
                        {[...Array(10)].map((_, index) => (
                          <div
                            key={`skeleton-list-${index}`}
                            className="bg-white rounded-lg border border-gray-200 p-4"
                          >
                            <div className="flex">
                              <div className="w-48 h-48 bg-gray-200 animate-pulse rounded"></div>
                              <div className="flex-1 ml-6 space-y-3">
                                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse"></div>
                                <div className="h-6 w-3/4 rounded bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                                <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse"></div>
                                <div className="flex items-center justify-between mt-4">
                                  <div className="h-6 w-24 rounded bg-gray-200 animate-pulse"></div>
                                  <div className="h-10 w-32 rounded bg-gray-200 animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      filteredProducts.map((product) => {
                        const price = typeof product.price === "number" ? product.price : 0
                        const salePrice = typeof product.sale_price === "number" ? product.sale_price : null
                        const imageUrl = getProductImageUrl(product)
                        const isOnSale = salePrice !== null && salePrice < price && price > 0

                        return (
                          <Link key={product.id} href={`/product/${product.id}`}>
                            <Card className="group overflow-hidden bg-white border border-gray-200 hover:border-red-200 hover:shadow-lg transition-all duration-300">
                              <div className="flex">
                                <div className="relative w-48 h-48 flex-shrink-0">
                                  <Image
                                    src={imageUrl || "/placeholder.svg"}
                                    alt={product.name}
                                    fill
                                    sizes="192px"
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  {isOnSale && (
                                    <div className="absolute left-2 top-2 bg-red-700 text-white px-2 py-1 text-xs font-semibold">
                                      -{calculateDiscount(price, salePrice)}%
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => toggleWishlist(Number(product.id), e)}
                                    className={cn(
                                      "absolute right-2 top-2 rounded-full p-1.5 transition-colors",
                                      wishlist.includes(Number(product.id))
                                        ? "bg-red-50 text-red-600"
                                        : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-600",
                                    )}
                                  >
                                    <Heart
                                      className={cn("h-4 w-4", wishlist.includes(Number(product.id)) && "fill-red-600")}
                                    />
                                  </button>
                                </div>

                                <div className="flex-1 p-6">
                                  <div className="mb-1">
                                    <span className="inline-block rounded-sm bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                      MIZIZZI
                                    </span>
                                  </div>

                                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                                    {product.name}
                                  </h3>

                                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                    {product.description || "Premium quality product from Mizizzi collection."}
                                  </p>

                                  {/* Rating display */}
                                  <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "h-4 w-4",
                                          i < 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300",
                                        )}
                                      />
                                    ))}
                                    <span className="text-sm text-gray-600 ml-1">(24 reviews)</span>
                                  </div>

                                  <div className="space-y-0.5">
                                    <div className="text-base font-semibold text-gray-900">
                                      KSh {(salePrice || price).toLocaleString()}
                                    </div>
                                    {isOnSale && (
                                      <div className="text-sm text-gray-500 line-through">
                                        KSh {price.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </Link>
                        )
                      })
                    )}
                  </div>
                )}

                {/* Load more indicator */}
                {hasMore && (
                  <div ref={loadMoreRef} className="mt-8 flex items-center justify-center py-8">
                    {loadingMore ? (
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-red-600"></div>
                        <span>Loading more products...</span>
                      </div>
                    ) : (
                      <div className="h-8 w-full max-w-sm rounded-full bg-gray-200"></div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
