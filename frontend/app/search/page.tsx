"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ProductFilters } from "@/components/products/product-filters"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Filter, Grid, List } from "lucide-react"
import { searchApi } from "@/lib/api"
import Link from "next/link"
import { SearchProductImage } from "@/components/products/search-product-image"
import { imageBatchService } from "@/services/image-batch-service"

interface SearchResult {
  id: number
  name: string
  description: string
  price: number
  image: string
  category?: string | { name: string }
  brand?: string
  score?: number
}

interface CategoryResult {
  id: number
  name: string
  description: string
  slug: string
  image_url?: string
  banner_url?: string
  is_featured: boolean
  products_count: number
  subcategories_count?: number
}

interface SearchResponse {
  products: {
    results: SearchResult[]
    total: number
  }
  categories: {
    results: CategoryResult[]
    total: number
  }
  query: string
  search_time: number
  suggestions?: string[]
  total_results: number
}

function SearchProductGrid({
  products,
  isLoading,
  emptyMessage,
}: {
  products: SearchResult[]
  isLoading: boolean
  emptyMessage: string
}) {
  useEffect(() => {
    if (products.length > 0) {
      const productIds = products.map((p) => p.id.toString())
      console.log(`[v0] Prefetching images for ${productIds.length} valid products`)
      imageBatchService.prefetchProductImages(productIds)
    }
  }, [products])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/3] bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3">
      {products.map((product) => (
        <Link key={product.id} href={`/product/${product.id}`} className="group">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] relative">
              <SearchProductImage
                productId={product.id}
                productName={product.name}
                className="w-full h-full object-cover"
              />
              {product.score && product.score > 0.8 && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  {Math.round(product.score * 100)}% match
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
              <p className="text-gray-600 text-xs line-clamp-1 mb-2">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">KSh {product.price.toLocaleString()}</span>
                {product.category && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {typeof product.category === "string" ? product.category : product.category.name || "Category"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function CategoryGrid({
  categories,
  isLoading,
}: {
  categories: CategoryResult[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Grid className="h-5 w-5" />
        Categories ({categories.length})
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((category) => (
          <Link key={category.id} href={`/category/${category.slug}`} className="group">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square relative bg-gray-50">
                {category.image_url ? (
                  <img
                    src={category.image_url || "/placeholder.svg"}
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                {category.is_featured && (
                  <div className="absolute top-2 right-2 bg-cherry-500 text-white text-xs px-2 py-1 rounded">
                    Featured
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm line-clamp-1 mb-1">{category.name}</h4>
                <p className="text-gray-600 text-xs">
                  {category.products_count} product{category.products_count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams?.get("q") || ""

  const [results, setResults] = useState<SearchResult[]>([])
  const [categories, setCategories] = useState<CategoryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTime, setSearchTime] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalCategories, setTotalCategories] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const [categoriesFilter] = useState<string[]>([
    "All Categories",
    "Jewelry",
    "Accessories",
    "Bags",
    "Clothing",
    "Shoes",
  ])
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories")
  const [priceRange] = useState<[number, number]>([0, 100000])
  const [selectedPriceRange, setSelectedPriceRange] = useState<[number, number]>([0, 100000])

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([])
        setCategories([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log("[v0] Performing unified search for:", query)

        const response = await searchApi.searchProducts(query, {
          limit: 50,
        })

        const searchData = response.data
        console.log("[v0] Search products results:", searchData)

        setResults(searchData.results || [])
        setTotalProducts(searchData.total || 0)
        setTotalResults(searchData.total || 0)
        setSearchTime(searchData.search_time || 0)
        setSuggestions(searchData.suggestions || [])
        setCategories([]) // No categories returned from searchProducts
        setTotalCategories(0)
      } catch (error: any) {
        console.error("[v0] Unified search error:", error)
        setError("Failed to search. Please try again.")
        setResults([])
        setCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    performSearch()
  }, [query])

  const formatSearchTime = (time: number) => {
    return time < 1 ? `${Math.round(time * 1000)}ms` : `${time.toFixed(2)}s`
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/search">Search</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-medium text-foreground">{query || "Results"}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Search Results
              {query && <span className="text-cherry-600 ml-2">for "{query}"</span>}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {!isLoading && (
                <>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {totalResults} result{totalResults !== 1 ? "s" : ""} found
                    {totalCategories > 0 && (
                      <span className="ml-1">
                        ({totalProducts} product{totalProducts !== 1 ? "s" : ""}, {totalCategories} categor
                        {totalCategories !== 1 ? "ies" : "y"})
                      </span>
                    )}
                  </span>
                  {searchTime > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatSearchTime(searchTime)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Search Suggestions */}
        {suggestions.length > 0 && !isLoading && results.length === 0 && categories.length === 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Did you mean:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200"
                  onClick={() => {
                    window.location.href = `/search?q=${encodeURIComponent(suggestion)}`
                  }}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-64 flex-shrink-0">
            <ProductFilters
              categories={categoriesFilter}
              priceRange={priceRange}
              selectedCategory={selectedCategory}
              selectedPriceRange={selectedPriceRange}
              onCategoryChange={setSelectedCategory}
              onPriceRangeChange={setSelectedPriceRange}
            />
          </div>
        )}

        {/* Results */}
        <div className="flex-1">
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <div>
              <CategoryGrid categories={categories} isLoading={isLoading} />

              {/* Products Section */}
              {(results.length > 0 || isLoading) && (
                <div>
                  {categories.length > 0 && (
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <List className="h-5 w-5" />
                      Products ({totalProducts})
                    </h3>
                  )}
                  <SearchProductGrid
                    products={results}
                    isLoading={isLoading}
                    emptyMessage={query ? `No products found for "${query}"` : "Enter a search term to find products"}
                  />
                </div>
              )}

              {/* Empty state when no results at all */}
              {!isLoading && results.length === 0 && categories.length === 0 && query && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No results found for "{query}"</p>
                  <p className="text-sm text-gray-400">Try different keywords or check your spelling</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
