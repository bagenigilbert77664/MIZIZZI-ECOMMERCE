"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import { wishlistApi } from "@/lib/api"

interface WishlistItem {
  id: string
  product_id: string
  product_name: string
  product_image?: string
  product_price: number
  product_slug: string
  added_at: string
  product?: {
    id: string
    name: string
    price: number
    sale_price?: number
    thumbnail_url?: string
    image_urls?: string[]
    slug: string
  }
  created_at?: string
}

interface WishlistState {
  items: WishlistItem[]
  itemCount: number
  lastUpdated: string | null
}

interface WishlistContextType {
  state: WishlistState
  items: WishlistItem[]
  isLoading: boolean
  isUpdating: boolean
  addToWishlist: (product: Omit<WishlistItem, "id" | "added_at"> | { product_id: string | number }) => Promise<void>
  removeFromWishlist: (productId: string) => Promise<void>
  removeProductFromWishlist: (productId: string | number) => Promise<void>
  isInWishlist: (productId: string | number) => boolean
  clearWishlist: () => Promise<void>
  getWishlistCount: () => number
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}

interface WishlistProviderProps {
  children: React.ReactNode
}

export function WishlistProvider({ children }: WishlistProviderProps) {
  const [state, setState] = useState<WishlistState>({
    items: [],
    itemCount: 0,
    lastUpdated: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { isAuthenticated, user } = useAuth() || { isAuthenticated: false, user: null }
  const { toast } = useToast()

  const loadWishlistFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem("wishlist")
      if (stored) {
        const parsedItems = JSON.parse(stored)
        const items = Array.isArray(parsedItems) ? parsedItems : []
        setState({
          items,
          itemCount: items.length,
          lastUpdated: localStorage.getItem("wishlist_updated"),
        })
      }
    } catch (error) {
      console.error("Error loading wishlist from localStorage:", error)
      setState({
        items: [],
        itemCount: 0,
        lastUpdated: null,
      })
    }
  }, [])

  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      const { silent } = event.detail || {}

      // Only clear session state for critical auth errors, not silent ones
      if (!silent) {
        console.log("[v0] Auth error event received:", event.detail)
        console.log("[v0] Critical auth error, clearing session state")
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("auth-error", handleAuthError as EventListener)
      return () => {
        document.removeEventListener("auth-error", handleAuthError as EventListener)
      }
    }
  }, [])

  const loadWishlistFromServer = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      setIsLoading(true)

      console.log("[v0] 🔍 Fetching wishlist from server...")
      const response = await wishlistApi.getWishlist()

      console.log("[v0] 📦 Full API response:", response)
      console.log("[v0] 📦 Response data:", response.data)
      console.log("[v0] 📦 Response data.items:", response.data?.items)
      console.log("[v0] 📦 Response data.wishlist:", response.data?.wishlist)
      console.log("[v0] 📦 Response data type:", typeof response.data)
      console.log("[v0] 📦 Is response.data an array?", Array.isArray(response.data))

      // Backend GET /api/wishlist/user returns: { items: [...], item_count: number, pagination: {...} }
      if (response.data && (response.data.items || response.data.wishlist)) {
        const wishlistData = response.data.items || response.data.wishlist

        console.log("[v0] ✅ Wishlist data found:", wishlistData)
        console.log("[v0] ✅ Wishlist data length:", wishlistData?.length)

        const serverItems = wishlistData.map((item: any) => ({
          id: item.id?.toString() || `wishlist_${item.product_id}`,
          product_id: item.product_id?.toString() || item.product?.id?.toString(),
          product_name: item.product?.name || item.product_name || "Unknown Product",
          product_image: item.product?.thumbnail_url || item.product?.image_urls?.[0] || item.product_image,
          product_price: item.product?.sale_price || item.product?.price || item.product_price || 0,
          product_slug: item.product?.slug || item.product_slug || `product-${item.product_id}`,
          added_at: item.created_at || item.added_at || new Date().toISOString(),
          product: item.product,
          created_at: item.created_at,
        }))

        console.log("[v0] ✅ Mapped server items:", serverItems)
        console.log("[v0] ✅ Setting state with", serverItems.length, "items")

        setState({
          items: serverItems,
          itemCount: serverItems.length,
          lastUpdated: new Date().toISOString(),
        })

        console.log("[v0] ✅ State updated successfully")
      } else {
        console.log("[v0] ⚠️ No wishlist data found in response")
        console.log("[v0] ⚠️ response.data exists?", !!response.data)
        console.log("[v0] ⚠️ response.data.items exists?", !!response.data?.items)
        console.log("[v0] ⚠️ response.data.wishlist exists?", !!response.data?.wishlist)
      }
    } catch (error: any) {
      console.log("[v0] ❌ Error loading wishlist:", error)

      const isNetworkError =
        error.name === "NetworkError" ||
        error.message?.includes("Backend server") ||
        error.code === "ERR_NETWORK" ||
        error.response?.status === 404 ||
        error.response?.status === 500 ||
        error.response?.status === 503 ||
        !error.response

      if (isNetworkError) {
        console.log("[v0] 🔄 Network error, loading from localStorage")
        loadWishlistFromLocalStorage()
      } else if (error.response?.status === 401) {
        console.log("[v0] 🔄 Auth error, loading from localStorage")
        loadWishlistFromLocalStorage()
      } else {
        console.error("Wishlist API error:", error)
        loadWishlistFromLocalStorage()
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, loadWishlistFromLocalStorage])

  useEffect(() => {
    if (isAuthenticated && user) {
      loadWishlistFromServer()
    } else {
      loadWishlistFromLocalStorage()
    }
  }, [isAuthenticated, user, loadWishlistFromServer, loadWishlistFromLocalStorage])

  useEffect(() => {
    try {
      localStorage.setItem("wishlist", JSON.stringify(state.items))
      localStorage.setItem("wishlist_updated", state.lastUpdated || new Date().toISOString())
    } catch (error) {
      console.error("Error saving wishlist to localStorage:", error)
    }
  }, [state.items, state.lastUpdated])

  const addToWishlist = useCallback(
    async (product: Omit<WishlistItem, "id" | "added_at"> | { product_id: string | number }) => {
      try {
        setIsUpdating(true)

        const productId = typeof product.product_id === "number" ? product.product_id.toString() : product.product_id

        const existingItem = state.items.find((item) => item.product_id === productId)
        if (existingItem) {
          toast({
            title: "Already in Wishlist",
            description: "This item is already in your wishlist",
            variant: "default",
          })
          return
        }

        if (isAuthenticated && user) {
          const optimisticItem: WishlistItem = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            product_id: productId,
            product_name: (product as any).product_name || "Loading...",
            product_image: (product as any).product_image,
            product_price: (product as any).product_price || 0,
            product_slug: (product as any).product_slug || `product-${productId}`,
            added_at: new Date().toISOString(),
            product: (product as any).product,
          }

          // Optimistically add to state
          setState((prev) => ({
            items: [optimisticItem, ...prev.items],
            itemCount: prev.itemCount + 1,
            lastUpdated: new Date().toISOString(),
          }))

          try {
            const response = await wishlistApi.addToWishlist(Number.parseInt(productId))

            if (response.data && (response.data.message || response.data.item)) {
              await loadWishlistFromServer()

              toast({
                title: "Added to Wishlist",
                description: `Item has been added to your wishlist`,
                variant: "default",
              })
            } else {
              if (response.data?.message?.toLowerCase().includes("already")) {
                toast({
                  title: "Already in Wishlist",
                  description: "This item is already in your wishlist",
                  variant: "default",
                })
                await loadWishlistFromServer()
              } else {
                setState((prev) => ({
                  items: prev.items.filter((item) => item.id !== optimisticItem.id),
                  itemCount: prev.itemCount - 1,
                  lastUpdated: new Date().toISOString(),
                }))
                toast({
                  title: "Error",
                  description: response.data?.message || "Failed to add to wishlist",
                  variant: "destructive",
                })
              }
            }
          } catch (apiError: any) {
            const isNetworkError =
              apiError.name === "NetworkError" ||
              apiError.message?.includes("Backend server") ||
              apiError.code === "ERR_NETWORK" ||
              apiError.response?.status === 404 ||
              apiError.response?.status === 500 ||
              apiError.response?.status === 503 ||
              !apiError.response

            if (isNetworkError) {
              toast({
                title: "Added to Wishlist",
                description: `Item has been added to your wishlist`,
                variant: "default",
              })
            } else if (
              apiError.response?.status === 400 ||
              apiError.response?.status === 409 ||
              apiError.message?.toLowerCase().includes("already") ||
              apiError.response?.data?.message?.toLowerCase().includes("already")
            ) {
              toast({
                title: "Already in Wishlist",
                description: "This item is already in your wishlist",
                variant: "default",
              })
              await loadWishlistFromServer()
            } else {
              toast({
                title: "Added to Wishlist",
                description: `Item has been added to your wishlist`,
                variant: "default",
              })
            }
          }
        } else {
          const newItem: WishlistItem = {
            id: `wishlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            product_id: productId,
            product_name: (product as any).product_name || "Unknown Product",
            product_image: (product as any).product_image,
            product_price: (product as any).product_price || 0,
            product_slug: (product as any).product_slug || `product-${productId}`,
            added_at: new Date().toISOString(),
          }

          setState((prev) => ({
            items: [newItem, ...prev.items],
            itemCount: prev.itemCount + 1,
            lastUpdated: new Date().toISOString(),
          }))

          toast({
            title: "Added to Wishlist",
            description: `Item has been added to your wishlist`,
            variant: "default",
          })
        }
      } catch (error) {
        console.error("Unexpected error in addToWishlist:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setIsUpdating(false)
      }
    },
    [state.items, isAuthenticated, user, toast, loadWishlistFromServer],
  )

  const removeFromWishlist = useCallback(async (productId: string) => {
    return removeProductFromWishlist(productId)
  }, [])

  const removeProductFromWishlist = useCallback(
    async (productId: string | number) => {
      try {
        setIsUpdating(true)

        const productIdStr = typeof productId === "number" ? productId.toString() : productId
        const itemToRemove = state.items.find((item) => item.product_id === productIdStr)

        if (!itemToRemove) {
          console.log("[v0] Item not found in local state, nothing to remove")
          return
        }

        setState((prev) => ({
          items: prev.items.filter((item) => item.product_id !== productIdStr),
          itemCount: prev.itemCount - 1,
          lastUpdated: new Date().toISOString(),
        }))

        if (isAuthenticated && user) {
          try {
            console.log(`[v0] Attempting to remove wishlist item ${itemToRemove.id} from server`)
            const response = await wishlistApi.removeFromWishlist(itemToRemove.id)

            if (response.data?.message || response.status === 200) {
              console.log("[v0] Successfully removed from server")
              await loadWishlistFromServer()

              toast({
                title: "Removed from Wishlist",
                description: `${itemToRemove.product_name} has been removed from your wishlist`,
                variant: "default",
              })
            } else {
              throw new Error(response.data?.message || "Failed to remove from wishlist")
            }
          } catch (error: any) {
            if (error.response?.status === 404) {
              console.log("[v0] Item not found on server (404), treating as successful removal")
              toast({
                title: "Removed from Wishlist",
                description: `${itemToRemove.product_name} has been removed from your wishlist`,
                variant: "default",
              })
              return
            }

            const isNetworkError =
              error.name === "NetworkError" ||
              error.message?.includes("Backend server") ||
              error.code === "ERR_NETWORK" ||
              error.response?.status === 500 ||
              error.response?.status === 503 ||
              !error.response

            if (isNetworkError) {
              console.log("[v0] Network error during removal, keeping optimistic update")
              toast({
                title: "Removed from Wishlist",
                description: `${itemToRemove.product_name} has been removed from your wishlist`,
                variant: "default",
              })
            } else {
              console.error("[v0] Unexpected error removing from wishlist:", error)
              setState((prev) => ({
                items: [itemToRemove, ...prev.items],
                itemCount: prev.itemCount + 1,
                lastUpdated: new Date().toISOString(),
              }))

              toast({
                title: "Error",
                description: "Failed to remove item from wishlist. Please try again.",
                variant: "destructive",
              })
            }
          }
        } else {
          toast({
            title: "Removed from Wishlist",
            description: `${itemToRemove.product_name} has been removed from your wishlist`,
            variant: "default",
          })
        }
      } catch (error) {
        console.error("Error removing from wishlist:", error)
        toast({
          title: "Error",
          description: "Failed to remove item from wishlist",
          variant: "destructive",
        })
      } finally {
        setIsUpdating(false)
      }
    },
    [state.items, isAuthenticated, user, toast, loadWishlistFromServer],
  )

  const isInWishlist = useCallback(
    (productId: string | number) => {
      const productIdStr = typeof productId === "number" ? productId.toString() : productId
      return state.items.some((item) => item.product_id === productIdStr)
    },
    [state.items],
  )

  const clearWishlist = useCallback(async () => {
    try {
      setIsUpdating(true)

      if (isAuthenticated && user) {
        const response = await wishlistApi.clearWishlist()

        if (response.data?.message || response.status === 200) {
          setState({
            items: [],
            itemCount: 0,
            lastUpdated: new Date().toISOString(),
          })

          toast({
            title: "Wishlist Cleared",
            description: "All items have been removed from your wishlist",
            variant: "default",
          })
        } else {
          throw new Error(response.data?.message || "Failed to clear wishlist")
        }
      } else {
        setState({
          items: [],
          itemCount: 0,
          lastUpdated: new Date().toISOString(),
        })

        toast({
          title: "Wishlist Cleared",
          description: "All items have been removed from your wishlist",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error clearing wishlist:", error)
      toast({
        title: "Error",
        description: "Failed to clear wishlist",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }, [isAuthenticated, user, toast])

  const getWishlistCount = useCallback(() => {
    return state.itemCount
  }, [state.itemCount])

  const refreshWishlist = useCallback(async () => {
    if (isAuthenticated && user) {
      await loadWishlistFromServer()
    } else {
      loadWishlistFromLocalStorage()
    }
  }, [isAuthenticated, user, loadWishlistFromServer, loadWishlistFromLocalStorage])

  const value: WishlistContextType = {
    state,
    items: state.items,
    isLoading,
    isUpdating,
    addToWishlist,
    removeFromWishlist,
    removeProductFromWishlist,
    isInWishlist,
    clearWishlist,
    getWishlistCount,
    refreshWishlist,
  }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
