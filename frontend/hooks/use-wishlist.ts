"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "@/components/ui/use-toast"
import api from "@/lib/api"

export interface WishlistItem {
  id: number
  name: string
  slug: string
  price: number
  sale_price?: number
  thumbnail_url: string
  image_urls: string[]
  created_at: string
}

export interface WishlistContextType {
  wishlist: WishlistItem[]
  isLoading: boolean
  isUpdating: boolean
  addToWishlist: (productId: number, productData?: Partial<WishlistItem>) => Promise<boolean>
  removeFromWishlist: (productId: number) => Promise<boolean>
  isInWishlist: (productId: number) => boolean
  refreshWishlist: () => Promise<void>
  clearWishlist: () => Promise<boolean>
}

export function useWishlistHook(): WishlistContextType {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  // Add refs to prevent infinite loops
  const isMounted = useRef(false)
  const isInitialized = useRef(false)
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())
  const lastFetchTime = useRef<number>(0)
  const FETCH_DEBOUNCE_TIME = 2000 // 2 seconds minimum between fetches

  // Debounced fetch function to prevent excessive API calls
  const fetchWishlist = useCallback(async (force = false) => {
    if (!isMounted.current) return

    // Prevent too frequent fetches
    const now = Date.now()
    if (!force && now - lastFetchTime.current < FETCH_DEBOUNCE_TIME) {
      console.log("Wishlist fetch debounced - too frequent")
      return
    }

    // Check for existing pending request
    const requestKey = "fetch-wishlist"
    if (pendingRequests.current.has(requestKey) && !force) {
      console.log("Wishlist fetch already in progress")
      try {
        await pendingRequests.current.get(requestKey)
        return
      } catch (error) {
        console.error("Error waiting for pending wishlist request:", error)
      }
    }

    lastFetchTime.current = now

    try {
      setIsLoading(true)

      // Create the fetch promise
      const fetchPromise = api
        .get("/api/wishlist")
        .then((response) => {
          if (!isMounted.current) return

          const items = response.data?.items || response.data || []
          setWishlist(Array.isArray(items) ? items : [])
        })
        .catch((error) => {
          if (!isMounted.current) return

          console.error("Error fetching wishlist:", error)

          // Only show error toast for non-auth errors
          if (error.response?.status !== 401) {
            toast({
              title: "Error",
              description: "Failed to load wishlist",
              variant: "destructive",
            })
          }

          // Set empty wishlist on error
          setWishlist([])
        })
        .finally(() => {
          if (isMounted.current) {
            setIsLoading(false)
          }
          pendingRequests.current.delete(requestKey)
        })

      // Store the promise to prevent duplicate requests
      pendingRequests.current.set(requestKey, fetchPromise)

      await fetchPromise
    } catch (error) {
      console.error("Error in fetchWishlist:", error)
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initialize wishlist only once
  useEffect(() => {
    isMounted.current = true

    // Only initialize once
    if (!isInitialized.current) {
      isInitialized.current = true
      fetchWishlist(true) // Force initial fetch
    }

    return () => {
      isMounted.current = false
    }
  }, []) // Remove fetchWishlist from dependencies to prevent loops

  const addToWishlist = useCallback(
    async (productId: number, productData?: Partial<WishlistItem>): Promise<boolean> => {
      if (!isMounted.current || isUpdating) return false

      // Check if already in wishlist
      if (wishlist.some((item) => item.id === productId)) {
        toast({
          title: "Already in Wishlist",
          description: "This item is already in your wishlist",
          variant: "default",
        })
        return true
      }

      const requestKey = `add-${productId}`
      if (pendingRequests.current.has(requestKey)) {
        console.log("Add to wishlist already in progress for product:", productId)
        return false
      }

      try {
        setIsUpdating(true)

        const addPromise = api
          .post("/api/wishlist", {
            product_id: productId,
            ...productData,
          })
          .then((response) => {
            if (!isMounted.current) return false

            const newItem = response.data?.item || response.data
            if (newItem) {
              setWishlist((prev) => {
                // Prevent duplicates
                if (prev.some((item) => item.id === productId)) {
                  return prev
                }
                return [...prev, newItem]
              })

              toast({
                title: "Added to Wishlist",
                description: "Item has been added to your wishlist",
              })
              return true
            }
            return false
          })
          .catch((error) => {
            console.error("Error adding to wishlist:", error)
            toast({
              title: "Error",
              description: "Failed to add item to wishlist",
              variant: "destructive",
            })
            return false
          })
          .finally(() => {
            if (isMounted.current) {
              setIsUpdating(false)
            }
            pendingRequests.current.delete(requestKey)
          })

        pendingRequests.current.set(requestKey, addPromise)
        return await addPromise
      } catch (error) {
        console.error("Error in addToWishlist:", error)
        if (isMounted.current) {
          setIsUpdating(false)
        }
        return false
      }
    },
    [wishlist, isUpdating],
  )

  const removeFromWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      if (!isMounted.current || isUpdating) return false

      const requestKey = `remove-${productId}`
      if (pendingRequests.current.has(requestKey)) {
        console.log("Remove from wishlist already in progress for product:", productId)
        return false
      }

      try {
        setIsUpdating(true)

        const removePromise = api
          .delete(`/api/wishlist/${productId}`)
          .then(() => {
            if (!isMounted.current) return false

            setWishlist((prev) => prev.filter((item) => item.id !== productId))

            toast({
              title: "Removed from Wishlist",
              description: "Item has been removed from your wishlist",
            })
            return true
          })
          .catch((error) => {
            console.error("Error removing from wishlist:", error)
            toast({
              title: "Error",
              description: "Failed to remove item from wishlist",
              variant: "destructive",
            })
            return false
          })
          .finally(() => {
            if (isMounted.current) {
              setIsUpdating(false)
            }
            pendingRequests.current.delete(requestKey)
          })

        pendingRequests.current.set(requestKey, removePromise)
        return await removePromise
      } catch (error) {
        console.error("Error in removeFromWishlist:", error)
        if (isMounted.current) {
          setIsUpdating(false)
        }
        return false
      }
    },
    [isUpdating],
  )

  const isInWishlist = useCallback(
    (productId: number): boolean => {
      return wishlist.some((item) => item.id === productId)
    },
    [wishlist],
  )

  const refreshWishlist = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return
    await fetchWishlist(true)
  }, [fetchWishlist])

  const clearWishlist = useCallback(async (): Promise<boolean> => {
    if (!isMounted.current || isUpdating) return false

    try {
      setIsUpdating(true)

      await api.delete("/api/wishlist")

      if (isMounted.current) {
        setWishlist([])
        toast({
          title: "Wishlist Cleared",
          description: "All items have been removed from your wishlist",
        })
      }

      return true
    } catch (error) {
      console.error("Error clearing wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to clear wishlist",
        variant: "destructive",
      })
      return false
    } finally {
      if (isMounted.current) {
        setIsUpdating(false)
      }
    }
  }, [isUpdating])

  return {
    wishlist,
    isLoading,
    isUpdating,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist,
    clearWishlist,
  }
}
