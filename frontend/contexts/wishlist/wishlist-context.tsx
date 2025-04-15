"use client"

import type React from "react"

import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useAuth } from "@/contexts/auth/auth-context"
import api from "@/lib/api"

// Define types
export interface WishlistItem {
  id: number
  product_id: number
  created_at?: string
  product: {
    id: number
    name: string
    slug: string
    price: number
    sale_price?: number
    thumbnail_url: string
    image_urls: string[]
  }
}

interface WishlistState {
  items: WishlistItem[]
  isUpdating: boolean
  isLoaded: boolean
  itemCount: number
  lastUpdated: number
}

type WishlistAction =
  | { type: "SET_ITEMS"; payload: { items: WishlistItem[]; itemCount: number } }
  | { type: "ADD_ITEM"; payload: WishlistItem }
  | { type: "REMOVE_ITEM"; payload: { id: number } }
  | { type: "REMOVE_PRODUCT"; payload: { productId: number } }
  | { type: "CLEAR_ITEMS" }
  | { type: "SET_UPDATING"; payload: boolean }
  | { type: "SET_LOADED"; payload: boolean }
  | { type: "UPDATE_TIMESTAMP" }

// Create context
interface WishlistContextType {
  state: WishlistState
  dispatch: React.Dispatch<WishlistAction>
  isInWishlist: (productId: number) => boolean
  addToWishlist: (productId: number, productDetails?: Partial<WishlistItem["product"]>) => Promise<void>
  removeProductFromWishlist: (productId: number) => Promise<void>
  clearWishlist: () => Promise<void>
  isUpdating: boolean
  refreshWishlist: () => Promise<void>
  debug: {
    lastAction: string
    actionCount: number
    errors: string[]
  }
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

// Initial state
const initialState: WishlistState = {
  items: [],
  isUpdating: false,
  isLoaded: false,
  itemCount: 0,
  lastUpdated: Date.now(),
}

// Reducer function
function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case "SET_ITEMS":
      return {
        ...state,
        items: action.payload.items,
        itemCount: action.payload.itemCount,
        lastUpdated: Date.now(),
      }
    case "ADD_ITEM":
      // Check if item already exists
      if (state.items.some((item) => item.product_id === action.payload.product_id)) {
        return state
      }
      return {
        ...state,
        items: [...state.items, action.payload],
        itemCount: state.itemCount + 1,
        lastUpdated: Date.now(),
      }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
        itemCount: Math.max(0, state.itemCount - 1),
        lastUpdated: Date.now(),
      }
    case "REMOVE_PRODUCT":
      const hadItem = state.items.some((item) => item.product_id === action.payload.productId)
      return {
        ...state,
        items: state.items.filter((item) => item.product_id !== action.payload.productId),
        itemCount: hadItem ? Math.max(0, state.itemCount - 1) : state.itemCount,
        lastUpdated: Date.now(),
      }
    case "CLEAR_ITEMS":
      return {
        ...state,
        items: [],
        itemCount: 0,
        lastUpdated: Date.now(),
      }
    case "SET_UPDATING":
      return {
        ...state,
        isUpdating: action.payload,
      }
    case "SET_LOADED":
      return {
        ...state,
        isLoaded: action.payload,
      }
    case "UPDATE_TIMESTAMP":
      return {
        ...state,
        lastUpdated: Date.now(),
      }
    default:
      return state
  }
}

// Provider component
export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, initialState)
  const { isAuthenticated, user } = useAuth()
  const [storedWishlist, setStoredWishlist] = useLocalStorage<WishlistItem[]>("wishlist", [])
  const initialLoadComplete = useRef(false)
  const [lastAction, setLastAction] = useState<string>("none")
  const [actionCount, setActionCount] = useState<number>(0)
  const [errors, setErrors] = useState<string[]>([])

  // Function to log actions for debugging
  const logAction = useCallback((action: string, error?: Error) => {
    setLastAction(action)
    setActionCount((prev) => prev + 1)
    if (error) {
      console.error(`Wishlist Error (${action}):`, error)
      setErrors((prev) => [...prev, `${action}: ${error.message}`])
    }
  }, [])

  // Function to refresh wishlist data from API
  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      dispatch({ type: "SET_UPDATING", payload: true })
      logAction("refreshWishlist:start")

      const response = await api.get("/api/wishlist")
      if (response.status === 200 && response.data) {
        dispatch({
          type: "SET_ITEMS",
          payload: {
            items: response.data.items || [],
            itemCount: response.data.item_count || 0,
          },
        })
        logAction("refreshWishlist:success")
      }
    } catch (error) {
      logAction("refreshWishlist:error", error instanceof Error ? error : new Error(String(error)))
    } finally {
      dispatch({ type: "SET_UPDATING", payload: false })
    }
  }, [isAuthenticated, logAction])

  // Load wishlist from localStorage or API on mount or auth change
  useEffect(() => {
    // Skip if we've already loaded the data
    if (initialLoadComplete.current) {
      return
    }

    const loadWishlist = async () => {
      try {
        dispatch({ type: "SET_UPDATING", payload: true })
        logAction("loadWishlist:start")

        if (isAuthenticated && user?.id) {
          // Try to load from API first
          try {
            const response = await api.get("/api/wishlist")
            if (response.status === 200 && response.data) {
              dispatch({
                type: "SET_ITEMS",
                payload: {
                  items: response.data.items || [],
                  itemCount: response.data.item_count || 0,
                },
              })
              logAction("loadWishlist:api:success")
              initialLoadComplete.current = true
              dispatch({ type: "SET_LOADED", payload: true })
              return
            }
          } catch (error) {
            logAction("loadWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
            // Fall back to localStorage if API fails
          }
        }

        // Use the stored wishlist from localStorage
        if (storedWishlist && Array.isArray(storedWishlist)) {
          dispatch({
            type: "SET_ITEMS",
            payload: {
              items: storedWishlist,
              itemCount: storedWishlist.length,
            },
          })
          logAction("loadWishlist:localStorage:success")
        }

        initialLoadComplete.current = true
        dispatch({ type: "SET_LOADED", payload: true })
      } catch (error) {
        logAction("loadWishlist:error", error instanceof Error ? error : new Error(String(error)))
        initialLoadComplete.current = true
        dispatch({ type: "SET_LOADED", payload: true })
      } finally {
        dispatch({ type: "SET_UPDATING", payload: false })
      }
    }

    loadWishlist()
  }, [isAuthenticated, user?.id, storedWishlist, logAction])

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    // Only save to localStorage if we've completed the initial load
    if (initialLoadComplete.current) {
      setStoredWishlist(state.items)
    }
  }, [state.items, setStoredWishlist])

  // Force refresh when authentication state changes
  useEffect(() => {
    if (isAuthenticated && initialLoadComplete.current) {
      refreshWishlist()
    }
  }, [isAuthenticated, refreshWishlist])

  // Check if a product is in the wishlist
  const isInWishlist = useCallback(
    (productId: number) => {
      return state.items.some((item) => item.product_id === productId || item.product?.id === productId)
    },
    [state.items],
  )

  // Add a product to the wishlist
  const addToWishlist = useCallback(
    async (productId: number, productDetails?: Partial<WishlistItem["product"]>) => {
      try {
        dispatch({ type: "SET_UPDATING", payload: true })
        logAction("addToWishlist:start")

        if (isAuthenticated) {
          // Try to add via API
          try {
            const response = await api.post("/api/wishlist", { product_id: productId })
            if (response.status === 201 && response.data.item) {
              dispatch({ type: "ADD_ITEM", payload: response.data.item })
              logAction("addToWishlist:api:success")
              return
            }
          } catch (error) {
            logAction("addToWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
            // Fall back to local state if API fails
          }
        }

        // If not authenticated or API failed, update local state with minimal data
        // This is a simplified version for localStorage only
        const newItem: WishlistItem = {
          id: Date.now(), // Use timestamp as temporary ID
          product_id: productId,
          created_at: new Date().toISOString(),
          product: {
            id: productId,
            name: productDetails?.name || `Product ${productId}`,
            slug: productDetails?.slug || `product-${productId}`,
            price: productDetails?.price || 0,
            sale_price: productDetails?.sale_price,
            thumbnail_url: productDetails?.thumbnail_url || "/placeholder.svg",
            image_urls: productDetails?.image_urls || ["/placeholder.svg"],
          },
        }

        dispatch({ type: "ADD_ITEM", payload: newItem })
        logAction("addToWishlist:localStorage:success")
      } catch (error) {
        logAction("addToWishlist:error", error instanceof Error ? error : new Error(String(error)))
      } finally {
        dispatch({ type: "SET_UPDATING", payload: false })
      }
    },
    [isAuthenticated, logAction],
  )

  // Remove a product from the wishlist
  const removeProductFromWishlist = useCallback(
    async (productId: number) => {
      try {
        dispatch({ type: "SET_UPDATING", payload: true })
        logAction("removeFromWishlist:start")

        if (isAuthenticated) {
          // Try to remove via API
          try {
            await api.delete(`/api/wishlist/product/${productId}`)
            dispatch({ type: "REMOVE_PRODUCT", payload: { productId } })
            logAction("removeFromWishlist:api:success")
            return
          } catch (error) {
            logAction("removeFromWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
            // Fall back to local state if API fails
          }
        }

        // Update local state
        dispatch({ type: "REMOVE_PRODUCT", payload: { productId } })
        logAction("removeFromWishlist:localStorage:success")
      } catch (error) {
        logAction("removeFromWishlist:error", error instanceof Error ? error : new Error(String(error)))
      } finally {
        dispatch({ type: "SET_UPDATING", payload: false })
      }
    },
    [isAuthenticated, logAction],
  )

  // Clear the wishlist
  const clearWishlist = useCallback(async () => {
    try {
      dispatch({ type: "SET_UPDATING", payload: true })
      logAction("clearWishlist:start")

      if (isAuthenticated) {
        // Try to clear via API
        try {
          await api.delete("/api/wishlist/clear")
          logAction("clearWishlist:api:success")
        } catch (error) {
          logAction("clearWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
          // Fall back to local state if API fails
        }
      }

      // Update local state
      dispatch({ type: "CLEAR_ITEMS" })
      logAction("clearWishlist:localStorage:success")
    } catch (error) {
      logAction("clearWishlist:error", error instanceof Error ? error : new Error(String(error)))
    } finally {
      dispatch({ type: "SET_UPDATING", payload: false })
    }
  }, [isAuthenticated, logAction])

  // Create context value with memoization to prevent unnecessary re-renders
  const contextValue = {
    state,
    dispatch,
    isInWishlist,
    addToWishlist,
    removeProductFromWishlist,
    clearWishlist,
    isUpdating: state.isUpdating,
    refreshWishlist,
    debug: {
      lastAction,
      actionCount,
      errors,
    },
  }

  return <WishlistContext.Provider value={contextValue}>{children}</WishlistContext.Provider>
}

// Hook to use the wishlist context
export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}
