"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Menu, ArrowUp, X, ShoppingCart, User, ChevronDown, Bell, Phone, Heart, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "@/components/layout/mobile-nav"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { AccountDropdown } from "@/components/auth/account-dropdown"
import { CartSidebar } from "@/components/cart/cart-sidebar"
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
import { Badge } from "@/components/ui/badge"

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
  const [isScrolled, setIsScrolled] = useState(false)
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

  // Add these new state variables after the existing state declarations
  const [wishlistCount, setWishlistCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(3) // Example count, replace with actual data
  const [savedCount, setSavedCount] = useState(0)

  const cartCount = Array.isArray(state.cart) ? state.cart.reduce((total, item) => total + (item?.quantity || 0), 0) : 0
  const itemCount = Array.isArray(state.cart) ? state.cart.reduce((total, item) => total + (item?.quantity || 0), 0) : 0

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  // Add event listener for opening cart
  useEffect(() => {
    const handleOpenCart = () => {
      // Find and click the cart trigger button
      const cartTrigger = document.querySelector('[data-cart-trigger="true"]')
      if (cartTrigger) {
        ;(cartTrigger as HTMLButtonElement).click()
      }
    }

    document.addEventListener("open-cart", handleOpenCart)
    return () => {
      document.removeEventListener("open-cart", handleOpenCart)
    }
  }, [])

  // Add this effect to listen for wishlist updates
  useEffect(() => {
    const handleWishlistUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.count !== undefined) {
        setWishlistCount(event.detail.count)
      }
    }

    document.addEventListener("wishlist-updated", handleWishlistUpdate as EventListener)

    // Initial count from wishlist context if available
    if (state.wishlist && Array.isArray(state.wishlist.items)) {
      setWishlistCount(state.wishlist.items.length)
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
        // Update cart count if needed
      }
    }

    document.addEventListener("cart-updated", handleCartUpdate as EventListener)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdate as EventListener)
    }
  }, [])

  const handleSearch = () => {
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
      setIsSearchOpen(false)
    }
  }

  // Custom trigger elements
  const mobileSearchTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative w-9 h-9 rounded-full hover:bg-gray-100"
      onClick={() => setIsSearchOpen(!isSearchOpen)}
    >
      <Search className="h-5 w-5" />
    </Button>
  )

  const mobileAccountTrigger = (
    <Button variant="ghost" className="flex items-center gap-1 font-normal hover:bg-gray-100 px-2 py-1 rounded-full">
      <User className="h-5 w-5" />
      <span className="text-xs">Hi, Gilbert</span>
    </Button>
  )

  const mobileCartTrigger = (
    <Button
      variant="ghost"
      size="icon"
      className="relative w-9 h-9 rounded-full hover:bg-gray-100"
      data-cart-trigger="true"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center bg-cherry-800 text-white text-[8px]">
          {itemCount}
        </Badge>
      )}
    </Button>
  )

  // Update the mobile wishlist trigger to include the badge
  const mobileWishlistTrigger = (
    <Button variant="ghost" size="icon" className="relative w-9 h-9 rounded-full hover:bg-gray-100">
      <Heart className="h-5 w-5" />
      {wishlistCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center bg-cherry-800 text-white text-[8px]">
          {wishlistCount}
        </Badge>
      )}
    </Button>
  )

  // Update the mobile notification trigger to include the badge
  const mobileNotificationTrigger = (
    <Button variant="ghost" size="icon" className="relative w-9 h-9 rounded-full hover:bg-gray-100">
      <Bell className="h-5 w-5" />
      {notificationCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center bg-cherry-800 text-white text-[8px]">
          {notificationCount}
        </Badge>
      )}
    </Button>
  )

  const mobileHelpTrigger = (
    <Button variant="ghost" size="icon" className="relative w-9 h-9 rounded-full hover:bg-gray-100">
      <Phone className="h-5 w-5" />
    </Button>
  )

  // Desktop triggers
  const desktopAccountTrigger = (
    <Button variant="ghost" className="flex items-center gap-1 font-normal hover:bg-transparent px-3">
      <User className="h-5 w-5" />
      <div className="flex items-center">
        <span className="text-sm">Hi, Gilbert</span>
        <ChevronDown className="h-4 w-4 ml-1" />
      </div>
    </Button>
  )

  const desktopCartTrigger = (
    <Button
      variant="ghost"
      className="flex items-center gap-1 font-normal hover:bg-transparent px-3 relative"
      data-cart-trigger="true"
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="text-sm">Cart</span>
      {itemCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center bg-cherry-800 text-white text-[8px]">
          {itemCount}
        </Badge>
      )}
    </Button>
  )

  // Update the desktop notification trigger to include the badge
  const desktopNotificationTrigger = (
    <Button variant="ghost" className="flex items-center gap-1 font-normal hover:bg-transparent px-3 relative">
      <Bell className="h-5 w-5" />
      <span className="text-sm">Alert</span>
      {notificationCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center bg-cherry-800 text-white text-[8px]">
          {notificationCount}
        </Badge>
      )}
    </Button>
  )

  const desktopHelpTrigger = (
    <Button variant="ghost" className="flex items-center gap-1 font-normal hover:bg-transparent px-3">
      <Phone className="h-5 w-5" />
      <span className="text-sm">Help</span>
    </Button>
  )

  // Update the desktop wishlist trigger to include the badge
  const desktopWishlistTrigger = (
    <Button variant="ghost" className="flex items-center gap-1 font-normal hover:bg-transparent px-3 relative">
      <Heart className="h-5 w-5" />
      <span className="text-sm">Saved</span>
      {wishlistCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center bg-cherry-800 text-white text-[8px]">
          {wishlistCount}
        </Badge>
      )}
    </Button>
  )

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <motion.header
        className={cn("sticky top-0 z-40 w-full bg-white transition-all duration-200", isScrolled && "shadow-sm")}
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
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
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
                  <h2 className="text-base font-bold text-black">Mizizzi Store</h2>
                  <p className="text-xs text-neutral-800">Exclusive Collection</p>
                </div>
              </div>
            </div>

            {/* Desktop Search - Integrated in header */}
            <div className="hidden md:block flex-1 max-w-xl mx-4">
              <div className="relative flex items-center">
                <div className="relative flex-1 mr-2">
                  <Input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    placeholder="Search products, brands and categories"
                    className="w-full pl-4 pr-4 h-10 rounded-md shadow-none border-gray-300 focus:ring-0 focus:border-gray-300"
                    style={{ boxShadow: "none", outline: "none" }}
                  />
                  {query && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
                      onClick={() => setQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  className="h-10 px-6 rounded-md bg-cherry-800 hover:bg-cherry-700 text-white font-medium border-0"
                  onClick={handleSearch}
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Mobile Actions - Rearranged order */}
            <div className="flex md:hidden items-center">
              <div className="flex space-x-3 px-1">
                {/* Search is first */}
                {isSearchOpen ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative w-9 h-9 rounded-full bg-gray-100"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                ) : (
                  mobileSearchTrigger
                )}

                <WishlistIndicator customTrigger={mobileWishlistTrigger} />

                <NotificationDropdown customTrigger={mobileNotificationTrigger} />

                <WhatsAppButton customTrigger={mobileHelpTrigger} />

                {/* Cart is second to last */}
                <CartSidebar customTrigger={mobileCartTrigger} />

                {/* Account is last */}
                <AccountDropdown customTrigger={mobileAccountTrigger} />
              </div>
            </div>

            {/* Desktop Right Section - Actions */}
            <div className="hidden md:flex items-center gap-2">
              <AccountDropdown customTrigger={desktopAccountTrigger} />

              <CartSidebar customTrigger={desktopCartTrigger} />

              <NotificationDropdown customTrigger={desktopNotificationTrigger} />

              <WhatsAppButton customTrigger={desktopHelpTrigger} />

              <WishlistIndicator customTrigger={desktopWishlistTrigger} />
            </div>
          </div>

          {/* Mobile Search Bar (Expandable) */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
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
                      className="w-full pl-3 pr-3 h-9 rounded-md shadow-none border-gray-300 focus:ring-0 focus:border-gray-300"
                      style={{ boxShadow: "none", outline: "none" }}
                    />
                    {query && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-1/2 h-5 w-5 -translate-y-1/2"
                        onClick={() => setQuery("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Button
                    className="h-9 px-4 rounded-md bg-cherry-800 hover:bg-cherry-700 text-white font-medium border-0 text-sm"
                    onClick={handleSearch}
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
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full z-50 mt-2"
            >
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
              className="bg-yellow-50 border-t border-yellow-100"
            >
              <div className="container px-4 py-2 text-sm text-yellow-800">
                You are currently offline. Some features may be limited.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll to Top */}
        <AnimatePresence>
          {isScrolled && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 z-50 rounded-full bg-cherry-800 p-2 text-white shadow-lg hover:bg-cherry-700 focus:outline-none focus:ring-2 focus:ring-cherry-400/20"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.header>
    </ErrorBoundary>
  )
}

