"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import api from "@/lib/api"
import { useAuth } from "@/contexts/auth/auth-context"
import { useRouter } from "next/navigation"

// Types
export interface WishlistItem {
  id: number
  product_id: number
  product: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    image_urls: string[]
    price: number
    sale_price?: number
    category?: string
  }
}

interface WishlistState {
  items: WishlistItem[]
  itemCount: number
}

interface WishlistContextType extends WishlistState {
  isLoading: boolean
  isUpdating: boolean
  error: string | null
  lastUpdated: Date | null
  addToWishlist: (productId: number) => Promise<boolean>
  removeFromWishlist: (itemId: number) => Promise<boolean>
  removeProductFromWishlist: (productId: number) => Promise<boolean>
  clearWishlist: () => Promise<boolean>
  refreshWishlist: () => Promise<void>
  isInWishlist: (productId: number) => boolean
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

// Initial wishlist state
const initialWishlistState: WishlistState = {
  items: [],
  itemCount: 0,
}

// Add a function to get wishlist items from localStorage
const getLocalWishlistItems = (): WishlistItem[] => {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem("wishlistItems") || "[]")
  } catch (error) {
    console.error("Error parsing wishlist items from localStorage:", error)
    return []
  }
}

// Save wishlist items to localStorage
const saveLocalWishlistItems = (items: WishlistItem[]) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("wishlistItems", JSON.stringify(items))
    localStorage.setItem("wishlistLastUpdated", new Date().toISOString())
  } catch (error) {
    console.error("Error saving wishlist items to localStorage:", error)
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistState, setWishlistState] = useState<WishlistState>(initialWishlistState)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  // Use a ref to track if we're mounted to prevent state updates after unmount
  const isMounted = useRef(true)

  // Use a ref to track pending requests to avoid race conditions
  const pendingRequest = useRef<AbortController | null>(null)

  // Debounce timer for wishlist updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update wishlist state with new data
  const updateWishlistState = useCallback((items: WishlistItem[]) => {
    const itemCount = items.length

    setWishlistState({
      items,
      itemCount,
    })

    setLastUpdated(new Date())

    // Also update localStorage for faster access
    saveLocalWishlistItems(items)
  }, [])

  // Fetch wishlist data from API
  const fetchWishlist = useCallback(
    async (showLoadingState = true) => {
      // If there's a pending request, don't start a new one
      if (pendingRequest.current) {
        return
      }

      // For guest users, load from localStorage
      if (!isAuthenticated) {
        try {
          const storedItems = localStorage.getItem("wishlistItems")
          if (storedItems) {
            const items = JSON.parse(storedItems)
            updateWishlistState(items)
          } else {
            updateWishlistState([])
          }
        } catch (error) {
          console.error("Error loading wishlist from localStorage:", error)
          updateWishlistState([])
        }
        setIsLoading(false)
        setError(null)
        return
      }

      // For authenticated users, fetch from API
      try {
        if (showLoadingState) {
          setIsLoading(true)
        }
        setError(null)

        const controller = new AbortController()
        pendingRequest.current = controller

        const response = await api.get("/api/wishlist", {
          signal: controller.signal,
        })

        if (!isMounted.current) return

        const wishlistData = response.data
        const items = wishlistData.items || []
        updateWishlistState(items)
      } catch (error: any) {
        if (!isMounted.current || error.name === "AbortError") return

        console.error("Error fetching wishlist:", error)

        // Handle authentication errors silently for better UX
        if (error.response?.status === 401) {
          // For auth errors, just use an empty wishlist
          updateWishlistState([])
          setError(null)
        } else {
          setError("Failed to load your wishlist. Please try again.")

          // Only show toast for non-auth errors
          toast({
            title: "Error Loading Wishlist",
            description: "We couldn't load your wishlist. Please refresh the page.",
            variant: "destructive",
          })
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false)
          pendingRequest.current = null
        }
      }
    },
    [isAuthenticated, toast, updateWishlistState],
  )

  // Refresh wishlist with debounce to prevent too many requests
  const refreshWishlist = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchWishlist(false)
      debounceTimerRef.current = null
    }, 300)
  }, [fetchWishlist])

  // Check if a product is in the wishlist
  const isInWishlist = useCallback(
    (productId: number): boolean => {
      return wishlistState.items.some((item) => item.product_id === productId)
    },
    [wishlistState.items],
  )

  // Add item to wishlist
  const addToWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      // If already in wishlist, don't add again
      if (isInWishlist(productId)) {
        toast({
          title: "Already in Wishlist",
          description: "This item is already in your wishlist.",
        })
        return true
      }

      if (!isAuthenticated) {
        // For guest users, store in localStorage
        try {
          const storedItems = getLocalWishlistItems()

          // Try to get product details
          let productDetails = null
          try {
            const productResponse = await api.get(`/api/products/${productId}`)
            productDetails = productResponse.data
          } catch (productError) {
            console.error("Error fetching product details:", productError)
          }

          // Create a new wishlist item
          const newItem: WishlistItem = {
            id: Date.now(), // Temporary ID
            product_id: productId,
            product: productDetails
              ? {
                  id: productDetails.id,
                  name: productDetails.name,
                  slug: productDetails.slug || "",
                  thumbnail_url: productDetails.image_urls?.[0] || "",
                  image_urls: productDetails.image_urls || [],
                  price: productDetails.price || 0,
                  sale_price: productDetails.sale_price,
                  category: productDetails.category_id,
                }
              : {
                  id: productId,
                  name: "Product",
                  slug: "",
                  thumbnail_url: "",
                  image_urls: [],
                  price: 0,
                },
          }

          const updatedItems = [...storedItems, newItem]
          updateWishlistState(updatedItems)

          toast({
            title: "Added to Wishlist",
            description: "Item has been added to your wishlist.",
          })

          return true
        } catch (error) {
          console.error("Error adding to wishlist:", error)
          toast({
            title: "Error",
            description: "Failed to add item to wishlist. Please try again.",
            variant: "destructive",
          })
          return false
        }
      }

      try {
        setIsUpdating(true)
        setError(null)

        // Make API call to Flask backend to add item to wishlist
        const response = await api.post("/api/wishlist", {
          product_id: productId,
        })

        toast({
          title: "Added to Wishlist",
          description: "Item has been added to your wishlist.",
        })

        // Refresh wishlist data
        await refreshWishlist()
        return true
      } catch (error: any) {
        console.error("Error adding to wishlist:", error)

        // Handle specific error cases
        if (error.response?.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to add items to your wishlist.",
            variant: "destructive",
          })
        } else if (error.response?.data?.error) {
          setError(error.response.data.error)
          toast({
            title: "Error",
            description: error.response.data.error,
            variant: "destructive",
          })
        } else {
          setError("Failed to add item to wishlist")
          toast({
            title: "Error",
            description: "Failed to add item to wishlist. Please try again.",
            variant: "destructive",
          })
        }
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [isAuthenticated, isInWishlist, refreshWishlist, toast, updateWishlistState],
  )

  // Remove item from wishlist by item ID
  const removeFromWishlist = useCallback(
    async (itemId: number): Promise<boolean> => {
      if (!isAuthenticated) {
        // For guest users, remove from localStorage
        try {
          const storedItems = getLocalWishlistItems()
          const updatedItems = storedItems.filter((item) => item.id !== itemId)
          updateWishlistState(updatedItems)

          toast({
            title: "Removed from Wishlist",
            description: "Item has been removed from your wishlist.",
          })

          return true
        } catch (error) {
          console.error("Error removing from wishlist:", error)
          toast({
            title: "Error",
            description: "Failed to remove item from wishlist. Please try again.",
            variant: "destructive",
          })
          return false
        }
      }

      try {
        setIsUpdating(true)
        setError(null)

        // Optimistic update
        const updatedItems = wishlistState.items.filter((item) => item.id !== itemId)
        updateWishlistState(updatedItems)

        // Make API call to Flask backend to remove wishlist item
        await api.delete(`/api/wishlist/${itemId}`)
        router.refresh()

        toast({
          title: "Removed from Wishlist",
          description: "Item has been removed from your wishlist.",
        })

        // Refresh wishlist data to ensure consistency
        await refreshWishlist()
        return true
      } catch (error: any) {
        console.error("Error removing from wishlist:", error)

        // Handle specific error cases
        if (error.response?.data?.error) {
          setError(error.response.data.error)
        } else {
          setError("Failed to remove item from wishlist")
        }

        // Revert optimistic update
        await fetchWishlist(false)

        toast({
          title: "Error",
          description: "Failed to remove item from wishlist. Please try again.",
          variant: "destructive",
        })
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [wishlistState.items, fetchWishlist, refreshWishlist, toast, updateWishlistState, isAuthenticated, router],
  )

  // Remove product from wishlist by product ID
  const removeProductFromWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      // Find the wishlist item with the given product ID
      const item = wishlistState.items.find((item) => item.product_id === productId)
      if (!item) return false

      // Use the existing removeFromWishlist function
      return removeFromWishlist(item.id)
    },
    [wishlistState.items, removeFromWishlist],
  )

  // Clear wishlist
  const clearWishlist = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      // For guest users, clear localStorage
      try {
        localStorage.removeItem("wishlistItems")
        localStorage.removeItem("wishlistLastUpdated")
        updateWishlistState([])

        toast({
          title: "Wishlist Cleared",
          description: "All items have been removed from your wishlist.",
        })

        return true
      } catch (error) {
        console.error("Error clearing wishlist:", error)
        toast({
          title: "Error",
          description: "Failed to clear wishlist. Please try again.",
          variant: "destructive",
        })
        return false
      }
    }

    try {
      setIsUpdating(true)
      setError(null)

      // Optimistic update
      setWishlistState(initialWishlistState)
      localStorage.removeItem("wishlistItems")

      // Make API call to Flask backend to clear wishlist
      await api.delete("/api/wishlist/clear")

      toast({
        title: "Wishlist Cleared",
        description: "All items have been removed from your wishlist.",
      })

      return true
    } catch (error: any) {
      console.error("Error clearing wishlist:", error)

      // Handle specific error cases
      if (error.response?.data?.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to clear wishlist")
      }

      // Revert optimistic update
      await fetchWishlist(false)

      toast({
        title: "Error",
        description: "Failed to clear wishlist. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [fetchWishlist, toast, updateWishlistState, isAuthenticated])

  // Fetch wishlist on mount and when auth state changes
  useEffect(() => {
    isMounted.current = true

    // Initial wishlist fetch - don't show loading state on initial load for better UX
    fetchWishlist(false)

    // Set up periodic refresh only if authenticated
    let intervalId: NodeJS.Timeout | undefined
    if (isAuthenticated) {
      intervalId = setInterval(() => {
        if (!isUpdating) {
          fetchWishlist(false)
        }
      }, 60000) // Refresh every minute
    }

    return () => {
      isMounted.current = false
      if (intervalId) {
        clearInterval(intervalId)
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (pendingRequest.current) {
        pendingRequest.current.abort()
      }
    }
  }, [isAuthenticated, fetchWishlist, isUpdating])

  // Add an event listener for auth errors
  useEffect(() => {
    const handleAuthError = () => {
      // When auth error occurs, switch to localStorage wishlist
      const localWishlistItems = getLocalWishlistItems()
      updateWishlistState(localWishlistItems)
    }

    document.addEventListener("auth-error", handleAuthError)

    return () => {
      document.removeEventListener("auth-error", handleAuthError)
    }
  }, [updateWishlistState])

  const value: WishlistContextType = {
    ...wishlistState,
    isLoading,
    isUpdating,
    error,
    lastUpdated,
    addToWishlist,
    removeFromWishlist,
    removeProductFromWishlist,
    clearWishlist,
    refreshWishlist,
    isInWishlist,
  }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

// Hook to use the wishlist context
export function useWishlist() {
  const context = useContext(WishlistContext)

  if (context === undefined) {
    // Instead of throwing an error, return a default state
    console.error("useWishlist must be used within a WishlistProvider")
    return {
      items: [],
      itemCount: 0,
      isLoading: false,
      isUpdating: false,
      error: "Wishlist context not available",
      lastUpdated: null,
      addToWishlist: async () => false,
      removeFromWishlist: async () => false,
      removeProductFromWishlist: async () => false,
      clearWishlist: async () => false,
      refreshWishlist: async () => {},
      isInWishlist: () => false,
    } as WishlistContextType
  }

  return context
}

