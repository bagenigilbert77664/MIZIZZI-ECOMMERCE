"use client"

import type React from "react"
import { useAuth } from "@/contexts/auth/auth-context"

import { useCallback, useEffect, useRef, useState, memo } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Menu, X, Search, User, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "@/components/layout/mobile-nav"
import { AccountDropdown } from "@/components/auth/account-dropdown"
import { useStateContext } from "@/components/providers"
import { Input } from "@/components/ui/input"
import { ProductSearchResults } from "@/components/products/product-search-results"
import { useSearch } from "@/hooks/use-search"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ErrorBoundary, type FallbackProps } from "react-error-boundary"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { CartIndicator } from "@/components/cart/cart-indicator"
import { HelpDropdown } from "@/components/layout/help-dropdown"

// Error logging function (replace with your preferred logging service)
const logError = (error: Error, errorInfo?: any) => {
  console.error("Header Error:", error, errorInfo)
  // Add your error logging service here (e.g., Sentry)
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps & { resetErrorBoundary: () => void }) {
  // Only render error UI for non-extension errors
  if (error.message?.includes("chrome-extension://")) {
    return null
  }

  // Log the error
  logError(error)

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
      <h2 className="text-red-800 font-semibold mb-2">Something went wrong with the header</h2>
      <p className="text-red-600 text-sm mb-3">We're sorry for the inconvenience. Please try refreshing the page.</p>
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        size="sm"
        className="text-red-700 border-red-300 hover:bg-red-50 bg-transparent"
      >
        Try again
      </Button>
    </div>
  )
}

// Memoized Logo Component
const Logo = memo(() => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6 }}
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.96 }}
    className="relative h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 overflow-hidden rounded-xl bg-gradient-to-br from-cherry-800 to-cherry-900 p-1 shadow-lg flex-shrink-0"
  >
    <Link href="/" className="block h-full w-full" aria-label="Mizizzi Store - Go to homepage">
      <div className="h-full w-full rounded-xl bg-white p-1">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
          alt="Mizizzi Store Logo - Premium E-commerce"
          width={48}
          height={48}
          className="h-full w-full object-contain"
          priority
        />
      </div>
    </Link>
  </motion.div>
))

Logo.displayName = "Logo"

// Memoized Brand Name Component
const BrandName = memo(() => (
  <div className="hidden sm:block flex-shrink-0">
    <Link href="/" className="block" aria-label="Mizizzi Store - Premium E-commerce">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-black tracking-tight leading-none font-serif">
        Mizizzi Store
      </h1>
      <p className="text-xs md:text-sm text-gray-600 font-medium tracking-wide">Premium E-commerce</p>
    </Link>
  </div>
))

BrandName.displayName = "BrandName"

// Memoized Search Input Component
const SearchInput = memo(
  ({
    inputRef,
    value,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    placeholder,
    className,
    onClear,
  }: {
    inputRef: React.RefObject<HTMLInputElement>
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onFocus: () => void
    onBlur: () => void
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    placeholder: string
    className: string
    onClear: () => void
  }) => (
    <div className="relative flex-1 mr-2">
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        style={{ boxShadow: "none", outline: "none" }}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
      {value && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 hover:bg-gray-100"
          onClick={onClear}
          aria-label="Clear search"
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  ),
)

SearchInput.displayName = "SearchInput"

const SearchSuggestions = memo(
  ({
    query,
    onSelect,
    searchHook,
  }: {
    query: string
    onSelect: (suggestion: string | any) => void
    searchHook: any
  }) => {
    const [suggestions, setSuggestions] = useState<string[]>([])
    const router = useRouter()

    useEffect(() => {
      if (query.length > 0) {
        // Use suggestions from search hook which are based on real data
        setSuggestions(searchHook.suggestions || [])
      } else {
        setSuggestions([])
      }
    }, [query, searchHook.suggestions])

    const handleSuggestionClick = (suggestion: string | any) => {
      // Save to recent searches
      const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]")
      const searchTerm = typeof suggestion === "string" ? suggestion : suggestion.name
      const updated = [searchTerm, ...recent.filter((s: string) => s !== searchTerm)].slice(0, 10)
      localStorage.setItem("recentSearches", JSON.stringify(updated))

      // Navigate to product page if it's a product, otherwise search
      if (typeof suggestion === "object" && suggestion.id) {
        router.push(`/product/${suggestion.id}`)
      } else {
        onSelect(searchTerm)
      }
    }

    if (query.length === 0) {
      const recentSearches = searchHook.getRecentSearches()
      const trendingProducts = searchHook.getTrendingProducts()
      const categories = searchHook.getCategories()

      return (
        <div className="p-4 space-y-4">
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Recent Searches</span>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search: any, index: number) => {
                  const searchTerm = typeof search === "string" ? search : search.search_term || search.name
                  const isProduct = typeof search === "object" && search.type === "product"

                  return (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      {isProduct ? (
                        <div className="flex items-center gap-2">
                          {search.image && (
                            <img
                              src={
                                search.image?.startsWith("http")
                                  ? search.image
                                  : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/uploads/product_images/${search.image.split("/").pop()}`
                              }
                              alt={search.name}
                              className="w-6 h-6 object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/diverse-products-still-life.png"
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{search.name}</div>
                            {search.price && (
                              <div className="text-xs text-gray-500">KSh {search.price.toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        searchTerm
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {categories.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Popular Categories</span>
              </div>
              <div className="space-y-1">
                {categories.map((category: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(category.name)}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {trendingProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Trending Products</span>
              </div>
              <div className="space-y-1">
                {trendingProducts.map((product: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(product)}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {product.image && (
                        <img
                          src={
                            product.image?.startsWith("http")
                              ? product.image
                              : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/uploads/product_images/${product.image.split("/").pop()}`
                          }
                          alt={product.name}
                          className="w-6 h-6 object-cover rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/diverse-products-still-life.png"
                          }}
                        />
                      )}
                      <span className="truncate">{product.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="p-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(suggestion)}
            className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <span className="font-medium">{query}</span>
            {suggestion.replace(query, "").trim() && (
              <span className="text-gray-500 ml-1">{suggestion.replace(query, "").trim()}</span>
            )}
          </button>
        ))}
      </div>
    )
  },
)

SearchSuggestions.displayName = "SearchSuggestions"

export function Header() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const { state } = useStateContext()
  const { user, isAuthenticated } = useAuth() // Declare useAuth hook

  const searchHook = useSearch({
    initialQuery: query,
    delay: 300,
    onSearch: (searchQuery) => {
      console.log("[v0] Search performed for:", searchQuery)
    },
  })

  const {
    results,
    isLoading,
    error,
    searchTime,
    suggestions,
    handleSearch: updateSearchQuery,
    clearSearch: clearSearchQuery,
  } = searchHook

  const shouldReduceMotion = useReducedMotion()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)")
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false)
  const cartCount = Array.isArray(state?.cart)
    ? state.cart.reduce((total, item) => total + (item?.quantity || 0), 0)
    : 0

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Global search shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchOpen(true)
        return
      }

      if (isSearchFocused && results.length > 0) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault()
            setSelectedResultIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
            break
          case "ArrowUp":
            e.preventDefault()
            setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : -1))
            break
          case "Enter":
            e.preventDefault()
            if (selectedResultIndex >= 0 && results[selectedResultIndex]) {
              router.push(`/product/${results[selectedResultIndex].id}`)
            } else if (query.trim()) {
              handleSearch()
            }
            break
          case "Escape":
            e.preventDefault()
            searchInputRef.current?.blur()
            setQuery("")
            setIsSearchOpen(false)
            break
        }
      }
    },
    [isSearchFocused, results, selectedResultIndex, query, router],
  )

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        if (selectedResultIndex >= 0 && results[selectedResultIndex]) {
          router.push(`/product/${results[selectedResultIndex].id}`)
        } else if (query.trim()) {
          handleSearch()
        }
      }
    },
    [selectedResultIndex, results, query, router],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Handle offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }
  }, [])

  // Clear selection when results change
  useEffect(() => {
    setSelectedResultIndex(-1)
  }, [results])

  // Scroll selected result into view
  useEffect(() => {
    if (selectedResultIndex >= 0 && searchResultsRef.current) {
      const selectedElement = searchResultsRef.current.children[selectedResultIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: "nearest",
          behavior: shouldReduceMotion ? "auto" : "smooth",
        })
      }
    }
  }, [selectedResultIndex, shouldReduceMotion])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev)
  }, [])

  const handleSearch = useCallback(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery && trimmedQuery.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
      setIsSearchOpen(false)
      setIsSearchFocused(false)
    }
  }, [query, router])

  const handleClearSearch = useCallback(() => {
    setQuery("")
    setSelectedResultIndex(-1)
    clearSearchQuery()
  }, [clearSearchQuery])

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)
      updateSearchQuery(value)
    },
    [updateSearchQuery],
  )

  const mobileSearchTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative w-10 h-10 rounded-full hover:bg-gray-100 transition-all duration-200"
      onClick={() => setIsSearchOpen(!isSearchOpen)}
      aria-label="Open search"
    >
      <Search className="h-5 w-5" />
    </Button>
  )

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-100/50 transition-all duration-300">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between py-2 sm:py-3 gap-2 sm:gap-4">
            {/* Left Section - Menu & Logo */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden w-10 h-10 rounded-full hover:bg-gray-100 transition-all duration-200"
                    aria-label="Open navigation menu"
                    onClick={toggleMobileMenu}
                  >
                    <motion.div
                      animate={isMobileMenuOpen ? "open" : "closed"}
                      variants={{
                        open: { rotate: 90 },
                        closed: { rotate: 0 },
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </motion.div>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="p-0 w-[280px] sm:w-[320px]"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <MobileNav />
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2 sm:gap-3">
                <Logo />
                <BrandName />
              </div>
            </div>

            {/* Center Section - Desktop Search */}
            <div className="hidden lg:flex flex-1 max-w-xl xl:max-w-2xl mx-4">
              <div className="relative flex items-center w-full">
                <SearchInput
                  inputRef={searchInputRef}
                  value={query}
                  onChange={handleSearchInputChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={isTablet ? "Search products..." : "Search products, brands and categories..."}
                  className="w-full pl-4 pr-10 h-10 rounded-lg shadow-none border-gray-300 focus:ring-2 focus:ring-cherry-200 focus:border-cherry-400 transition-all"
                  onClear={handleClearSearch}
                />
                <Button
                  className="h-10 px-4 rounded-lg bg-cherry-800 hover:bg-cherry-700 text-white font-medium border-0 transition-colors ml-2"
                  onClick={handleSearch}
                  disabled={!query.trim() || query.trim().length < 2}
                  aria-label="Search products"
                >
                  <span className="hidden lg:inline">Search</span>
                  <Search className="h-4 w-4 lg:hidden" />
                </Button>
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Mobile Actions */}
              <div className="flex lg:hidden items-center gap-1 sm:gap-2">
                {isSearchOpen ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative w-10 h-10 rounded-full bg-gray-100 transition-all duration-200"
                    onClick={() => setIsSearchOpen(false)}
                    aria-label="Close search"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                ) : (
                  mobileSearchTrigger
                )}
                <HelpDropdown />
                <CartIndicator />
                <AccountDropdown
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative w-10 h-10 rounded-full hover:bg-gray-100 transition-all duration-200"
                      aria-label={`Account ${isAuthenticated ? `(${user?.name?.split(" ")[0] || "User"})` : ""}`}
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-cherry-50 text-cherry-700">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    </Button>
                  }
                />
              </div>

              {/* Desktop Actions */}
              <div className="hidden lg:flex items-center gap-3">
                <AccountDropdown />
                <HelpDropdown />
                <CartIndicator />
              </div>
            </div>
          </div>

          {/* Mobile Search Bar (Expandable) */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  duration: shouldReduceMotion ? 0.1 : 0.3,
                }}
                className="lg:hidden pb-3"
              >
                <div className="relative flex items-center gap-2">
                  <SearchInput
                    inputRef={searchInputRef}
                    value={query}
                    onChange={handleSearchInputChange}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Search products..."
                    className="w-full pl-4 pr-10 h-10 rounded-lg shadow-none border-gray-300 focus:ring-2 focus:ring-cherry-200 focus:border-cherry-400 transition-all"
                    onClear={handleClearSearch}
                  />
                  <Button
                    className="h-10 px-4 rounded-lg bg-cherry-800 hover:bg-cherry-700 text-white font-medium border-0 text-sm transition-colors flex-shrink-0"
                    onClick={handleSearch}
                    disabled={!query.trim() || query.trim().length < 2}
                    aria-label="Search products"
                  >
                    Search
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isSearchFocused && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
              className="absolute left-0 right-0 top-full z-50 mt-1"
            >
              <div className="container mx-auto px-3 sm:px-4 lg:px-6">
                <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden max-h-96 overflow-y-auto">
                  {query.length === 0 || (query.length > 0 && results.length === 0 && !isLoading) ? (
                    <SearchSuggestions query={query} onSelect={handleSearch} searchHook={searchHook} />
                  ) : (
                    <ProductSearchResults
                      ref={searchResultsRef}
                      results={results}
                      isLoading={isLoading}
                      selectedIndex={selectedResultIndex}
                      onClose={handleClearSearch}
                      searchTime={searchTime}
                      suggestions={suggestions}
                      error={error}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline Banner */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.3 }}
              className="bg-yellow-50 border-t border-yellow-200"
              role="alert"
            >
              <div className="container mx-auto px-4 py-2 text-sm text-yellow-800 font-medium">
                ⚠️ You are currently offline. Some features may be limited.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </ErrorBoundary>
  )
}
