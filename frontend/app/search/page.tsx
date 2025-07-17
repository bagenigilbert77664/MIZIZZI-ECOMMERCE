"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SearchBar } from "@/components/search/search-bar"
import { SearchFiltersComponent } from "@/components/search/search-filters"
import { ProductGrid } from "@/components/products/product-grid"
import { searchService, type SearchParams, type SearchFilters } from "@/services/search"
import { Loader2, SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [searchResults, setSearchResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [currentParams, setCurrentParams] = useState<SearchParams>({})

  useEffect(() => {
    // Parse URL parameters and perform search
    const params = searchService.parseSearchParams(searchParams)
    setCurrentParams(params)

    if (params.q || Object.keys(params).length > 1) {
      performSearch(params)
    }
  }, [searchParams])

  const performSearch = async (params: SearchParams) => {
    try {
      setIsLoading(true)
      const results = await searchService.searchProducts(params)
      setSearchResults(results)
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults({
        success: false,
        products: [],
        pagination: { total_items: 0 },
        search_metadata: { query: params.q || "" },
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSearchParams = (newParams: SearchParams) => {
    const url = searchService.buildSearchUrl(newParams)
    router.push(url)
  }

  const handleSearch = (query: string) => {
    const newParams = { ...currentParams, q: query, page: 1 }
    updateSearchParams(newParams)
  }

  const handleFiltersChange = (filters: SearchFilters) => {
    const newParams = { ...currentParams, ...filters, page: 1 }
    updateSearchParams(newParams)
  }

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    const newParams = { ...currentParams, sort_by: sortBy, sort_order: sortOrder, page: 1 }
    updateSearchParams(newParams)
  }

  const handlePageChange = (page: number) => {
    const newParams = { ...currentParams, page }
    updateSearchParams(newParams)
  }

  const clearSearch = () => {
    router.push("/search")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 max-w-2xl">
              <SearchBar
                initialValue={currentParams.q || ""}
                onSearch={handleSearch}
                placeholder="Search for products..."
              />
            </div>

            <div className="flex items-center space-x-4">
              {/* Sort dropdown */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={`${currentParams.sort_by || "relevance"}-${currentParams.sort_order || "desc"}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split("-")
                    handleSortChange(sortBy, sortOrder)
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="relevance-desc">Relevance</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="price-desc">Price (High to Low)</option>
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                </select>
              </div>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters sidebar */}
          <div className={cn("lg:w-64 lg:flex-shrink-0", showFilters ? "block" : "hidden lg:block")}>
            <div className="sticky top-6">
              {/* Mobile filter header */}
              <div className="lg:hidden flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <button onClick={() => setShowFilters(false)} className="p-2 text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <SearchFiltersComponent filters={currentParams} onFiltersChange={handleFiltersChange} />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results header */}
            {searchResults && (
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {currentParams.q ? `Search results for "${currentParams.q}"` : "All Products"}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">{searchResults.pagination.total_items} products found</p>
                  </div>

                  {currentParams.q && (
                    <button
                      onClick={clearSearch}
                      className="mt-2 sm:mt-0 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Searching...</span>
              </div>
            )}

            {/* Results */}
            {!isLoading && searchResults && (
              <>
                {searchResults.products.length > 0 ? (
                  <ProductGrid
                    products={searchResults.products}
                    pagination={searchResults.pagination}
                    onPageChange={handlePageChange}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 014.93 12.66l6 6a1 1 0 01-1.42 1.42l-6-6A7 7 0 1121 21z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600 mb-4">
                      {currentParams.q
                        ? `We couldn't find any products matching "${currentParams.q}"`
                        : "No products match your current filters"}
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Try:</p>
                      <ul className="text-sm text-gray-500 space-y-1">
                        <li>• Checking your spelling</li>
                        <li>• Using different keywords</li>
                        <li>• Removing some filters</li>
                        <li>• Browsing our categories</li>
                      </ul>
                    </div>
                    {(currentParams.q || Object.keys(currentParams).length > 1) && (
                      <button
                        onClick={clearSearch}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        View All Products
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Error state */}
            {!isLoading && searchResults && !searchResults.success && (
              <div className="text-center py-12">
                <div className="text-red-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
                <p className="text-gray-600 mb-4">Something went wrong while searching. Please try again.</p>
                <button
                  onClick={() => performSearch(currentParams)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
