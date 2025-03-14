"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Menu, Search, ArrowUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MobileNav } from "@/components/layout/mobile-nav"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { AccountDropdown } from "@/components/auth/account-dropdown"
import { CartSidebar } from "@/components/cart/cart-sidebar"
import { WishlistIndicator } from "@/components/cart/wishlist-indicator"
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const { state } = useStateContext()
  const debouncedQuery = useDebounce(query, 300)
  const { results, isLoading } = useSearch(debouncedQuery)
  const shouldReduceMotion = useReducedMotion()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [isOffline, setIsOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false)

  const cartCount = Array.isArray(state.cart) ? state.cart.reduce((total, item) => total + (item?.quantity || 0), 0) : 0

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

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <motion.header
        className={cn(
          "sticky top-0 z-40 w-full bg-gradient-to-b from-white to-neutral-50 transition-all duration-200",
          isScrolled && "border-b shadow-sm",
        )}
        initial={false}
        animate={{
          height: isSearchFocused && isMobile ? "auto" : "auto",
        }}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Left Section - Logo & Menu */}
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <MobileNav />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative h-12 w-12 overflow-hidden rounded-lg bg-gradient-to-br from-cherry-800 to-cherry-900 p-0.5"
              >
                <Link href="/" className="block h-full w-full">
                  <div className="h-full w-full rounded-lg bg-white p-1.5">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                      alt="MIZIZZI"
                      width={36}
                      height={36}
                      className="h-full w-full object-contain"
                      priority
                    />
                  </div>
                </Link>
              </motion.div>
              <div className="hidden sm:block">
                <h2 className="text-base font-bold text-black">Official Store</h2>
                <p className="text-xs text-neutral-800">Exclusive Collection</p>
              </div>
            </div>
          </div>

          {/* Center Section - Search (Desktop) */}
          <div className="hidden flex-1 max-w-xl px-4 lg:block">
            <div className="relative flex items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cherry-400" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  placeholder="Search products, brands and categories"
                  className={cn(
                    "w-full pl-9 pr-4 h-10 rounded-l-full transition-all duration-200",
                    isSearchFocused
                      ? "border-2 border-r-0 border-cherry-600 bg-white ring-0"
                      : "border-2 border-r-0 border-cherry-200 bg-white/95 hover:border-cherry-300",
                  )}
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
                className="h-10 px-6 rounded-r-full -ml-[1px] bg-cherry-600 hover:bg-cherry-700 text-white font-medium border-2 border-cherry-600 hover:border-cherry-700"
                onClick={() => {
                  if (query) {
                    router.push(`/search?q=${encodeURIComponent(query)}`)
                  }
                }}
              >
                Search
              </Button>
            </div>
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
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <NotificationDropdown />
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <WhatsAppButton />
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <WishlistIndicator />
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <CartSidebar />
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <AccountDropdown />
            </motion.div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <AnimatePresence>
          {!isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-neutral-200 bg-white/80 backdrop-blur-sm lg:hidden"
            >
              <div className="container px-4 py-2">
                <div className="relative flex items-center max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cherry-400" />
                    <Input
                      ref={searchInputRef}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      placeholder="Search products..."
                      className={cn(
                        "w-full pl-9 pr-4 h-9 rounded-full transition-all duration-200",
                        isSearchFocused
                          ? "border-2 border-cherry-600 bg-white ring-0"
                          : "border-2 border-cherry-200 bg-white/95 hover:border-cherry-300",
                      )}
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
              className="fixed bottom-20 right-4 z-50 rounded-full bg-cherry-900 p-2 text-white shadow-lg hover:bg-cherry-950 focus:outline-none focus:ring-2 focus:ring-cherry-400/20 lg:bottom-4"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <ArrowUp className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.header>

      <style jsx global>{`
        .hover\:bg-cherry-900\/10:hover {
          background-color: rgba(157, 23, 57, 0.1);
        }
      `}</style>
      <style jsx global>{`
        .hover\:text-cherry-900:hover {
          color: #9d1739;
        }
      `}</style>
      <style jsx global>{`
        .relative.h-8.w-8.sm\:h-10.sm\:w-10.transition-colors.hover\:bg-cherry-900\/10.hover\:text-cherry-900 {
          className: "relative h-8 w-8 sm:h-10 sm:w-10 transition-colors hover:bg-cherry-50 hover:text-cherry-900"
        }
      `}</style>
    </ErrorBoundary>
  )
}
