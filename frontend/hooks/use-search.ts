"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "@/lib/api"

interface UseSearchProps {
  initialQuery?: string
  delay?: number
  onSearch?: (value: string) => void
}

interface SearchResult {
  id: number
  name: string
  description: string
  price: number
  image: string
  thumbnail_url?: string
  slug?: string
  category?: string
  brand?: string
  score?: number // Semantic search relevance score
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  search_time: number
  suggestions?: string[]
}

interface Product {
  id: number
  name: string
  category?: string | { name: string }
  brand?: string | { name: string }
  price: number
  image?: string
}

interface Category {
  id: number
  name: string
  slug: string
}

export function useSearch({ initialQuery = "", delay = 300, onSearch }: UseSearchProps = {}) {
  const [query, setQuery] = useState<string>(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTime, setSearchTime] = useState<number>(0)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  const fetchRecentSearches = useCallback(async () => {
    try {
      const response = await api.get("/api/products/recent-searches", {
        params: {
          limit: 8,
        },
      })

      if (response.data && Array.isArray(response.data)) {
        const backendRecent = response.data

        // Also get localStorage recent searches for user's personal history
        const localRecent = JSON.parse(localStorage.getItem("recentSearches") || "[]")

        // Combine backend suggestions with user's local history
        const combinedRecent = [
          ...localRecent.slice(0, 4), // User's recent searches (top priority)
          ...backendRecent.filter((item: any) => !localRecent.includes(item.search_term || item.name)).slice(0, 4), // Backend suggestions (fill remaining slots)
        ]

        setRecentSearches(combinedRecent.slice(0, 8))
      } else {
        // Fallback to localStorage only
        const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
        setRecentSearches(recent.slice(0, 8))
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error("[v0] Failed to fetch recent searches from backend:", error)
      }
      // Fallback to localStorage
      const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
      setRecentSearches(recent.slice(0, 8))
    }
  }, [])

  const fetchInitialData = useCallback(async () => {
    try {
      await fetchRecentSearches()

      // Fetch trending/popular products
      const productsResponse = await api.get("/api/products", {
        params: {
          limit: 10,
          sort_by: "popularity",
          sort_order: "desc",
        },
      })

      if (productsResponse.data && Array.isArray(productsResponse.data)) {
        setTrendingProducts(productsResponse.data)
      }

      // Fetch categories
      const categoriesResponse = await api.get("/api/categories")
      if (categoriesResponse.data && Array.isArray(categoriesResponse.data)) {
        setCategories(categoriesResponse.data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch initial search data:", error)
    }
  }, [fetchRecentSearches])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setIsSearching(true)
    setError(null)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery("")
    setDebouncedQuery("")
    setIsSearching(false)
    setResults([])
    setError(null)
    setSuggestions([])
    setSearchTime(0)
  }, [])

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setResults([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log("[v0] Performing semantic search for:", searchQuery)

        const response = await api.get<SearchResponse>("/api/search", {
          params: {
            q: searchQuery.trim(),
            limit: 8, // Reduced for more compact display
          },
        })

        const searchData = response.data
        console.log("[v0] Search results received:", searchData)

        if (!searchData) {
          console.warn("[v0] No search data received")
          setResults([])
          setSuggestions([])
          setSearchTime(0)
          return
        }

        let resultsArray: any[] = []
        let searchTime = 0
        let suggestions: string[] = []

        // Use the correct SearchResponse structure
        if (searchData.results && Array.isArray(searchData.results)) {
          resultsArray = searchData.results
          searchTime = searchData.search_time || 0
          suggestions = searchData.suggestions || []
        }
        // Handle case where response might be typed differently from backend
        else if ((searchData as any).items && Array.isArray((searchData as any).items)) {
          resultsArray = (searchData as any).items
          searchTime = (searchData as any).search_metadata?.search_time || 0
          suggestions = (searchData as any).suggestions || []
        }
        // Check if response is directly an array (some APIs return this way)
        else if (Array.isArray(searchData)) {
          resultsArray = searchData as any[]
        }
        // Check if response has data property with results
        else if ((searchData as any).data && Array.isArray((searchData as any).data)) {
          resultsArray = (searchData as any).data
        }
        // Check if response has products property (common in e-commerce APIs)
        else if ((searchData as any).products && Array.isArray((searchData as any).products)) {
          resultsArray = (searchData as any).products
        } else {
          console.warn("[v0] Invalid search response structure:", searchData)
          setResults([])
          setSuggestions([])
          setSearchTime(0)
          return
        }

        // Transform results to match expected format
        const transformedResults = resultsArray.map((result) => ({
          id: result.id || result.product_id,
          name: result.name || result.title || result.product_name,
          description: result.description || result.desc || "",
          price: result.price || result.cost || 0,
          image: result.image || result.thumbnail || result.image_url || result.photo,
          thumbnail_url: result.image || result.thumbnail || result.image_url || result.photo,
          slug: `/product/${result.id || result.product_id}`,
          category: typeof result.category === "object" ? result.category?.name : result.category,
          brand: typeof result.brand === "object" ? result.brand?.name : result.brand,
          score: result.score || result.relevance || 0,
        }))

        setResults(transformedResults)
        setSearchTime(searchTime)

        if (transformedResults.length === 0) {
          const smartSuggestions = generateSmartSuggestionsFromData(searchQuery)
          setSuggestions(smartSuggestions)
        } else {
          setSuggestions(suggestions)
        }

        if (transformedResults.length > 0) {
          const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
          const updated = [searchQuery, ...recent.filter((s: string) => s !== searchQuery)].slice(0, 10)
          localStorage.setItem("recentSearches", JSON.stringify(updated))
          setRecentSearches(updated)
        }

        if (onSearchRef.current) {
          onSearchRef.current(searchQuery)
        }
      } catch (error: any) {
        console.error("[v0] Search API error:", error)

        // Handle different error types
        if (error.response?.status === 404) {
          setError("Search service not available")
        } else if (error.response?.status >= 500) {
          setError("Search service temporarily unavailable")
        } else if (!error.response) {
          setError("Network error - please check your connection")
        } else {
          setError("Search failed - please try again")
        }

        setResults([])

        const smartSuggestions = generateSmartSuggestionsFromData(searchQuery)
        setSuggestions(smartSuggestions)
      } finally {
        setIsLoading(false)
        setIsSearching(false)
      }
    },
    [trendingProducts, categories], // Added dependencies for real data
  )

  const generateSmartSuggestionsFromData = (searchQuery: string): string[] => {
    const q = searchQuery.toLowerCase().trim()
    const suggestions: string[] = []

    // Match against real categories
    categories.forEach((category) => {
      if (category.name.toLowerCase().includes(q) || q.includes(category.name.toLowerCase())) {
        suggestions.push(category.name)
        suggestions.push(`${category.name} deals`)
        suggestions.push(`best ${category.name}`)
      }
    })

    // Match against real product names and brands
    trendingProducts.forEach((product) => {
      const productName = product.name.toLowerCase()
      const brand = typeof product.brand === "object" ? product.brand?.name : product.brand
      const category = typeof product.category === "object" ? product.category?.name : product.category

      if (productName.includes(q) || q.includes(productName.split(" ")[0])) {
        suggestions.push(product.name)
        if (brand) suggestions.push(`${brand} products`)
        if (category) suggestions.push(`${category}`)
      }

      if (brand && (brand.toLowerCase().includes(q) || q.includes(brand.toLowerCase()))) {
        suggestions.push(`${brand} products`)
        suggestions.push(`${brand} ${q}`)
      }
    })

    // Add query variations if we have some matches
    if (suggestions.length > 0 && q.length > 2) {
      suggestions.push(`${q} for men`, `${q} for women`, `${q} accessories`, `cheap ${q}`)
    }

    // Remove duplicates and limit to 8 suggestions
    return [...new Set(suggestions)].slice(0, 8)
  }

  const getRecentSearches = () => recentSearches
  const getTrendingProducts = () => trendingProducts.slice(0, 6)
  const getCategories = () => categories.slice(0, 8)

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [query, delay])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery !== query) {
      setIsSearching(false)
    }

    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  return {
    query,
    debouncedQuery,
    isSearching,
    isLoading,
    results,
    error,
    searchTime,
    suggestions,
    handleSearch,
    clearSearch,
    getRecentSearches,
    getTrendingProducts,
    getCategories,
    fetchRecentSearches,
  }
}
