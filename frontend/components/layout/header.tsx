"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState, memo } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Menu, X, Heart, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "@/components/layout/mobile-nav"
import { AccountDropdown } from "@/components/auth/account-dropdown"
import { WishlistIndicator } from "@/components/wishlist/wishlist-indicator"
import { useStateContext } from "@/components/providers"
import { Input } from "@/components/ui/input"
import { ProductSearchResults } from "@/components/products/product-search-results"
import { useSearch } from "@/hooks/use-search"
import { useDebounce } from "@/hooks/use-debounce"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ErrorBoundary, type FallbackProps } from "react-error-boundary"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth/auth-context"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { CartIndicator } from "@/components/cart/cart-indicator"

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
    placeholder,
    className,
    onClear,
  }: {
    inputRef: React.RefObject<HTMLInputElement>
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onFocus: () => void
    onBlur: () => void
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
  const debouncedQuery = useDebounce(query, 300)
  const { results: rawResults, isLoading } = useSearch(debouncedQuery)

  const results = (rawResults || []).map((result) => ({
    ...result,
    thumbnail_url: result.image,
    slug: `/product/${result.id}`,
  }))

  const shouldReduceMotion = useReducedMotion()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)")
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(3)

  const cartCount = Array.isArray(state?.cart)
    ? state.cart.reduce((total, item) => total + (item?.quantity || 0), 0)
    : 0

  // Get user data from auth context
  const { user, isAuthenticated } = useAuth()

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Global search shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchOpen(true)
        return
      }

      // Search navigation
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

  // Listen for wishlist updates
  useEffect(() => {
    const handleWishlistUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.count === "number") {
        setWishlistCount(event.detail.count)
      }
    }

    document.addEventListener("wishlist-updated", handleWishlistUpdate as EventListener)

    if (state?.wishlist && Array.isArray(state.wishlist)) {
      setWishlistCount(state.wishlist.length)
    }

    return () => {
      document.removeEventListener("wishlist-updated", handleWishlistUpdate as EventListener)
    }
  }, [state?.wishlist])

  // Listen for notification updates
  useEffect(() => {
    const handleNotificationUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.count !== undefined) {
        setNotificationCount(event.detail.count)
      }
    }

    document.addEventListener("notification-updated", handleNotificationUpdate as EventListener)
    return () => {
      document.removeEventListener("notification-updated", handleNotificationUpdate as EventListener)
    }
  }, [])

  // Search handler with validation
  const handleSearch = useCallback(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery && trimmedQuery.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`)
      setIsSearchOpen(false)
      setIsSearchFocused(false)
    }
  }, [query, router])

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setQuery("")
    setSelectedResultIndex(-1)
  }, [])

  // Close search handler
  const handleCloseSearch = useCallback(() => {
    setQuery("")
    setIsSearchOpen(false)
    setIsSearchFocused(false)
    searchInputRef.current?.blur()
  }, [])

  // Toggle mobile menu
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev)
  }, [])

  // Memoized trigger components
  const mobileSearchTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-gray-100 touch-target transition-all duration-200"
      onClick={() => setIsSearchOpen(!isSearchOpen)}
      aria-label="Open search"
    >
      <Search className="h-4 w-4 sm:h-5 sm:w-5" />
    </Button>
  )

  const mobileWishlistTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-gray-100 touch-target transition-all duration-200"
      aria-label={`Wishlist ${wishlistCount > 0 ? `(${wishlistCount} items)` : ""}`}
    >
      <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
      {wishlistCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-cherry-800 text-white text-[9px] sm:text-[10px] font-medium">
          {wishlistCount > 99 ? "99+" : wishlistCount}
        </Badge>
      )}
    </Button>
  )

  const desktopWishlistTrigger = (
    <Button
      variant="ghost"
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors relative"
      aria-label={`Saved items ${wishlistCount > 0 ? `(${wishlistCount} items)` : ""}`}
    >
      <Heart className="h-5 w-5" />
      <span className="text-sm font-medium hidden lg:inline">Saved</span>
      {wishlistCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center bg-cherry-800 text-white text-[10px] font-medium">
          {wishlistCount > 99 ? "99+" : wishlistCount}
        </Badge>
      )}
    </Button>
  )

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-100/50 transition-all duration-300">
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex items-center justify-between py-2 sm:py-3 md:py-4 gap-2 sm:gap-4">
            {/* Left Section - Menu & Logo */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-gray-100 touch-target transition-all duration-200"
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
                      {isMobileMenuOpen ? (
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
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
            <div className="hidden md:flex flex-1 max-w-xl lg:max-w-2xl mx-4 lg:mx-6">
              <div className="relative flex items-center w-full">
                <SearchInput
                  inputRef={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder={isTablet ? "Search products..." : "Search products, brands and categories... (⌘K)"}
                  className="w-full pl-4 pr-4 h-10 lg:h-11 rounded-lg shadow-none border-gray-300 focus:ring-2 focus:ring-cherry-200 focus:border-cherry-400 transition-all"
                  onClear={handleClearSearch}
                />
                <Button
                  className="h-10 lg:h-11 px-4 lg:px-6 rounded-lg bg-cherry-800 hover:bg-cherry-700 text-white font-medium border-0 transition-colors ml-2"
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
              <div className="flex md:hidden items-center gap-1">
                {isSearchOpen ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 touch-target transition-all duration-200"
                    onClick={() => setIsSearchOpen(false)}
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                ) : (
                  mobileSearchTrigger
                )}
                <WishlistIndicator trigger={mobileWishlistTrigger} />
                <NotificationBell />
                <CartIndicator />
                <AccountDropdown
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-gray-100 touch-target transition-all duration-200"
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
              <div className="hidden md:flex items-center gap-1 lg:gap-2 flex-wrap">
                <AccountDropdown />
                <CartIndicator />
                <div className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <NotificationBell />
                  <span className="text-sm font-medium hidden lg:inline">Alerts</span>
                </div>
                <WishlistIndicator trigger={desktopWishlistTrigger} />
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
                className="md:hidden pb-3 sm:pb-4"
              >
                <div className="relative flex items-center gap-2">
                  <SearchInput
                    inputRef={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder="Search products..."
                    className="w-full pl-4 pr-4 h-10 rounded-lg shadow-none border-gray-300 focus:ring-2 focus:ring-cherry-200 focus:border-cherry-400 transition-all"
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

        {/* Search Results */}
        <AnimatePresence>
          {isSearchFocused && query.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.2 }}
              className="absolute left-0 right-0 top-full z-50 mt-1"
            >
              <div className="container mx-auto px-3 sm:px-4 md:px-6">
                <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
                  <ProductSearchResults
                    ref={searchResultsRef}
                    results={results}
                    isLoading={isLoading}
                    selectedIndex={selectedResultIndex}
                    onClose={handleCloseSearch}
                  />
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
