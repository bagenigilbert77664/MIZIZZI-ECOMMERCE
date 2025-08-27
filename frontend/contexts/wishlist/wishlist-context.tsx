"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

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

  const loadWishlistFromServer = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      setIsLoading(true)
      console.log("[v0] Loading wishlist from server...")

      const response = await api.get("/api/wishlist/user/").catch((error) => {
        // Immediately handle API errors without throwing
        if (error.response?.status === 404) {
          console.log("[v0] Wishlist API endpoint not found (404), using localStorage fallback")
          return null
        } else if (
          error.code === "ECONNREFUSED" ||
          error.message?.includes("Network Error") ||
          error.name === "NetworkError" ||
          error.message?.includes("Backend server") ||
          error.message?.includes("timeout")
        ) {
          console.log("[v0] Backend server unavailable, using localStorage fallback for wishlist")
          return null
        } else if (error.response?.status === 401) {
          console.log("[v0] Authentication required for wishlist, using localStorage fallback")
          return null
        } else {
          console.error("Wishlist API error:", error)
          return null
        }
      })

      if (response && response.data?.success && response.data?.wishlist) {
        const serverItems = response.data.wishlist.map((item: any) => ({
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

        setState({
          items: serverItems,
          itemCount: serverItems.length,
          lastUpdated: new Date().toISOString(),
        })
        console.log("[v0] Successfully loaded wishlist from server")
      } else {
        console.log("[v0] API response invalid or null, using localStorage fallback")
        loadWishlistFromLocalStorage()
      }
    } catch (error: any) {
      console.error("Unexpected error loading wishlist from server:", error)
      loadWishlistFromLocalStorage()
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

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
          try {
            const response = await api.post("/api/wishlist/user/", {
              product_id: Number.parseInt(productId),
            })

            if (response.data?.success) {
              await loadWishlistFromServer()

              toast({
                title: "Added to Wishlist",
                description: `Item has been added to your wishlist`,
                variant: "default",
              })
            } else {
              throw new Error(response.data?.message || "Failed to add to wishlist")
            }
          } catch (error: any) {
            if (
              error.response?.status === 404 ||
              error.code === "ECONNREFUSED" ||
              error.name === "NetworkError" ||
              error.message?.includes("Backend server")
            ) {
              console.log("[v0] Backend unavailable, adding to localStorage instead")

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
                description: `Item has been added to your wishlist (saved locally)`,
                variant: "default",
              })
            } else {
              throw error
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
        console.error("Error adding to wishlist:", error)
        toast({
          title: "Error",
          description: "Failed to add item to wishlist",
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
          return
        }

        if (isAuthenticated && user) {
          try {
            const response = await api.delete(`/api/wishlist/user/${productIdStr}/`)

            if (response.data?.success) {
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
            if (
              error.response?.status === 404 ||
              error.code === "ECONNREFUSED" ||
              error.name === "NetworkError" ||
              error.message?.includes("Backend server")
            ) {
              console.log("[v0] Backend unavailable, removing from localStorage instead")

              setState((prev) => ({
                items: prev.items.filter((item) => item.product_id !== productIdStr),
                itemCount: prev.itemCount - 1,
                lastUpdated: new Date().toISOString(),
              }))

              toast({
                title: "Removed from Wishlist",
                description: `${itemToRemove.product_name} has been removed from your wishlist (saved locally)`,
                variant: "default",
              })
            } else {
              throw error
            }
          }
        } else {
          setState((prev) => ({
            items: prev.items.filter((item) => item.product_id !== productIdStr),
            itemCount: prev.itemCount - 1,
            lastUpdated: new Date().toISOString(),
          }))

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
        try {
          const response = await api.delete("/api/wishlist/user/")

          if (response.data?.success) {
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
        } catch (error: any) {
          if (
            error.response?.status === 404 ||
            error.code === "ECONNREFUSED" ||
            error.name === "NetworkError" ||
            error.message?.includes("Backend server")
          ) {
            console.log("[v0] Backend unavailable, clearing localStorage instead")

            setState({
              items: [],
              itemCount: 0,
              lastUpdated: new Date().toISOString(),
            })

            toast({
              title: "Wishlist Cleared",
              description: "All items have been removed from your wishlist (saved locally)",
              variant: "default",
            })
          } else {
            throw error
          }
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
