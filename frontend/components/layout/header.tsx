"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Menu, X, Phone, Heart, Search } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "@/components/layout/mobile-nav"
import { AccountDropdown } from "@/components/auth/account-dropdown"
import { WishlistIndicator } from "@/components/wishlist/wishlist-indicator"
import { useStateContext } from "@/components/providers"
import { Input } from "@/components/ui/input"
import { ProductSearchResults } from "@/components/products/product-search-results"
import { useSearch } from "@/hooks/use-search"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ErrorBoundary, type FallbackProps } from "react-error-boundary"
import Image from "next/image"
import { WhatsAppButton } from "@/components/shared/whatsapp-button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { CartIndicator } from "@/components/cart/cart-indicator"

function ErrorFallback({ error }: FallbackProps) {
  // Only render error UI for non-extension errors
  if (error.message?.includes("chrome-extension://")) {
    return null
  }

  return (
    <div className="p-4 text-red-500">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
    </div>
  )
}

export function Header() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const { state } = useStateContext()
  const debouncedQuery = useDebounce(query, 300)
  const { results: rawResults, isLoading } = useSearch(debouncedQuery)
  const results = rawResults.map((result) => ({
    ...result,
    thumbnail_url: result.image, // Map 'image' to 'thumbnail_url'
    slug: `/product/${result.id}`, // Generate 'slug' from 'id'
  }))
  const shouldReduceMotion = useReducedMotion()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)")
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(3)
  const [savedCount, setSavedCount] = useState(0)

  const cartCount = Array.isArray(state.cart) ? state.cart.reduce((total, item) => total + (item?.quantity || 0), 0) : 0
  const itemCount = Array.isArray(state.cart) ? state.cart.reduce((total, item) => total + (item?.quantity || 0), 0) : 0

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      if (isSearchFocused) {
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
              window.location.href = `/product/${results[selectedResultIndex].id}`
            }
            break
          case "Escape":
            e.preventDefault()
            searchInputRef.current?.blur()
            setQuery("")
            break
        }
      }
    },
    [isSearchFocused, results, selectedResultIndex],
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
  }, [])

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

  // Add this effect to listen for wishlist updates
  useEffect(() => {
    const handleWishlistUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.count === "number") {
        setWishlistCount(event.detail.count)
      }
    }

    document.addEventListener("wishlist-updated", handleWishlistUpdate as EventListener)

    // Initial count from wishlist context if available
    if (state.wishlist && Array.isArray(state.wishlist)) {
      setWishlistCount(state.wishlist.length)
    }

    return () => {
      document.removeEventListener("wishlist-updated", handleWishlistUpdate as EventListener)
    }
  }, [state.wishlist])

  // Add this effect to listen for notification updates
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

  // Add this effect to listen for cart updates
  useEffect(() => {
    const handleCartUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.count !== undefined) {
        // Update the cart count in state
        const newCount = event.detail.count
        if (typeof document !== "undefined") {
          // Update any UI elements that need to show the cart count
          const cartCountElements = document.querySelectorAll(".cart-count")
          cartCountElements.forEach((element) => {
            element.textContent = String(newCount)
          })
        }
      }
    }

    document.addEventListener("cart-updated", handleCartUpdate as EventListener)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdate as EventListener)
    }
  }, [])

  // Get user data from auth context directly instead of state
  const { user } = useAuth()

  const handleSearch = () => {
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
      setIsSearchOpen(false)
    }
  }

  // Apple-style button variants
  const appleButtonStyle = "transition-all duration-200 ease-out active:scale-95"
  const appleIconButtonStyle =
    "relative flex items-center justify-center rounded-full hover:bg-black/5 active:bg-black/10"

  // Mobile search trigger with Apple-style animation
  const mobileSearchTrigger = (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${appleIconButtonStyle} w-9 h-9`}
      onClick={() => setIsSearchOpen(!isSearchOpen)}
    >
      <Search className="h-5 w-5" />
    </motion.button>
  )

  // Mobile wishlist trigger with Apple-style badge
  const mobileWishlistTrigger = (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${appleIconButtonStyle} w-9 h-9`}
    >
      <Heart className="h-5 w-5" />
      {wishlistCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cherry-800 text-[10px] font-medium text-white">
          {wishlistCount}
        </span>
      )}
    </motion.button>
  )

  // Mobile notification trigger with Apple-style
  const mobileNotificationTrigger = (
    <div className="flex items-center">
      <NotificationBell />
    </div>
  )

  const mobileHelpTrigger = (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${appleIconButtonStyle} w-9 h-9`}
    >
      <Phone className="h-5 w-5" />
    </motion.button>
  )

  // Desktop notification trigger with Apple-style
  const desktopNotificationTrigger = (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:bg-black/5"
    >
      <NotificationBell />
      <span className="text-sm font-medium">Alerts</span>
    </motion.div>
  )

  const desktopHelpTrigger = (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:bg-black/5"
    >
      <Phone className="h-5 w-5" />
      <span className="text-sm font-medium">Help</span>
    </motion.div>
  )

  // Update the desktop wishlist trigger with Apple-style
  const desktopWishlistTrigger = (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ y: 0 }}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors hover:bg-black/5 relative"
    >
      <Heart className="h-5 w-5" />
      <span className="text-sm font-medium">Saved</span>
      {wishlistCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cherry-800 text-[10px] font-medium text-white">
          {wishlistCount}
        </span>
      )}
    </motion.div>
  )

  // Helper function to format user name
  const formatUserName = (name: string | undefined | null): string => {
    if (!name) return "Account"
    const firstName = name.split(" ")[0]
    return firstName.length > 8 ? `${firstName.substring(0, 7)}...` : firstName
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <motion.header
        className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md backdrop-saturate-150 shadow-[0_1px_0_rgba(0,0,0,0.08)] transition-all duration-300"
        initial={false}
        animate={{
          height: isSearchFocused && isMobile ? "auto" : "auto",
        }}
      >
        {/* Main Header */}
        <div className="container mx-auto px-2 md:px-4">
          {/* Logo and Menu Row with integrated search */}
          <div className="flex items-center justify-between py-3 md:py-4">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`${appleIconButtonStyle} md:hidden w-9 h-9`}
                    aria-label="Open menu"
                  >
                    <Menu className="h-5 w-5" />
                  </motion.button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <MobileNav />
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative h-10 w-10 md:h-12 md:w-12 overflow-hidden rounded-lg bg-gradient-to-br from-cherry-800 to-cherry-900 p-0.5"
                >
                  <Link href="/" className="block h-full w-full">
                    <div className="h-full w-full rounded-lg bg-white p-1.5">
                      <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                        alt="mizizzi"
                        width={36}
                        height={36}
                        className="h-full w-full object-contain"
                        priority
                      />
                    </div>
                  </Link>
                </motion.div>
                <div className="hidden sm:block">
                  <h2 className="text-base font-semibold text-black tracking-tight">Mizizzi Store</h2>
                  <p className="text-xs text-neutral-600">Exclusive Collection</p>
                </div>
              </div>
            </div>

            {/* Desktop Search - Apple-style with refined animation */}
            <div className="hidden md:block flex-1 max-w-xl mx-4">
              <motion.div
                className="relative flex items-center"
                initial={false}
                animate={{
                  scale: isSearchFocused ? 1.02 : 1,
                  y: isSearchFocused ? -1 : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative flex-1 mr-2">
                  <Input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder="Search products, brands and categories"
                    className={cn(
                      "w-full pl-4 pr-4 h-10 rounded-full shadow-none border transition-all duration-300",
                      isSearchFocused
                        ? "border-gray-400 bg-white/95 ring-4 ring-gray-100"
                        : "border-gray-300 hover:border-gray-400",
                    )}
                    style={{ boxShadow: "none", outline: "none" }}
                  />
                  {query && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-gray-200 flex items-center justify-center"
                      onClick={() => setQuery("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="h-10 px-6 rounded-full bg-cherry-800 hover:bg-cherry-700 text-white font-medium border-0 transition-all duration-200"
                  onClick={handleSearch}
                >
                  Search
                </motion.button>
              </motion.div>
            </div>

            {/* Mobile Actions - Rearranged order with Apple-style spacing */}
            <div className="flex md:hidden items-center">
              <div className="flex items-center space-x-3 px-1">
                {/* Search is first */}
                {isSearchOpen ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`${appleIconButtonStyle} w-9 h-9 bg-gray-100`}
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                ) : (
                  mobileSearchTrigger
                )}

                <WishlistIndicator trigger={mobileWishlistTrigger} />
                {mobileNotificationTrigger}
                <WhatsAppButton trigger={mobileHelpTrigger} />
                <CartIndicator />
                <AccountDropdown />
              </div>
            </div>

            {/* Desktop Right Section - Actions with Apple-style spacing and animations */}
            <div className="hidden md:flex items-center gap-1">
              <AccountDropdown />
              <CartIndicator />
              {desktopNotificationTrigger}
              <WhatsAppButton trigger={desktopHelpTrigger} />
              <WishlistIndicator trigger={desktopWishlistTrigger} />
            </div>
          </div>

          {/* Mobile Search Bar (Expandable) with Apple-style animation */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="md:hidden pb-3"
              >
                <div className="relative flex items-center">
                  <div className="relative flex-1 mr-2">
                    <Input
                      ref={searchInputRef}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      placeholder="Search products..."
                      className="w-full pl-3 pr-3 h-9 rounded-full shadow-none border-gray-300 focus:ring-0 focus:border-gray-400"
                      style={{ boxShadow: "none", outline: "none" }}
                    />
                    {query && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-gray-200 flex items-center justify-center"
                        onClick={() => setQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </motion.button>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="h-9 px-4 rounded-full bg-cherry-800 hover:bg-cherry-700 text-white font-medium border-0 text-sm transition-all duration-200"
                    onClick={handleSearch}
                  >
                    Search
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search Results with Apple-style animation */}
        <AnimatePresence>
          {isSearchFocused && query.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute left-0 right-0 top-full z-50 mt-1 px-4"
            >
              <div className="mx-auto max-w-3xl rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-white/95 backdrop-blur-lg">
                <ProductSearchResults
                  ref={searchResultsRef}
                  results={results}
                  isLoading={isLoading}
                  selectedIndex={selectedResultIndex}
                  onClose={() => {
                    setQuery("")
                    searchInputRef.current?.blur()
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline Banner with Apple-style animation */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="bg-yellow-50 border-t border-yellow-100"
            >
              <div className="container px-4 py-2 text-sm font-medium text-yellow-800">
                You are currently offline. Some features may be limited.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </ErrorBoundary>
  )
}
