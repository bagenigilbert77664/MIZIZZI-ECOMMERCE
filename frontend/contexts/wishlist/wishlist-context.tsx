"use client"

import type React from "react"
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
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
      const newItems = [...state.items, action.payload]
      return {
        ...state,
        items: newItems,
        itemCount: newItems.length,
        lastUpdated: Date.now(),
      }
    case "REMOVE_ITEM":
      const filteredItems = state.items.filter((item) => item.id !== action.payload.id)
      return {
        ...state,
        items: filteredItems,
        itemCount: filteredItems.length,
        lastUpdated: Date.now(),
      }
    case "REMOVE_PRODUCT":
      const filteredByProduct = state.items.filter((item) => item.product_id !== action.payload.productId)
      return {
        ...state,
        items: filteredByProduct,
        itemCount: filteredByProduct.length,
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

  // Refs to prevent infinite loops
  const initialLoadComplete = useRef(false)
  const isLoadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastAuthStateRef = useRef<{ isAuthenticated: boolean; userId?: number }>({
    isAuthenticated: false,
    userId: undefined,
  })

  // Debug state
  const [lastAction, setLastAction] = useState<string>("none")
  const [actionCount, setActionCount] = useState<number>(0)
  const [errors, setErrors] = useState<string[]>([])

  // Function to log actions for debugging
  const logAction = useCallback((action: string, error?: Error) => {
    setLastAction(action)
    setActionCount((prev) => prev + 1)
    if (error) {
      console.error(`Wishlist Error (${action}):`, error)
      setErrors((prev) => [...prev.slice(-4), `${action}: ${error.message}`]) // Keep only last 5 errors
    }
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    isLoadingRef.current = false
  }, [])

  // Function to refresh wishlist data from API with request deduplication
  const refreshWishlist = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current || !isAuthenticated) {
      return
    }

    try {
      isLoadingRef.current = true
      cleanup() // Clean up any existing request

      abortControllerRef.current = new AbortController()
      dispatch({ type: "SET_UPDATING", payload: true })
      logAction("refreshWishlist:start")

      const response = await api.get("/api/wishlist", {
        signal: abortControllerRef.current.signal,
      })

      if (response.status === 200 && response.data) {
        dispatch({
          type: "SET_ITEMS",
          payload: {
            items: response.data.items || [],
            itemCount: response.data.item_count || 0,
          },
        })
        logAction("refreshWishlist:success")

        // Dispatch global event for UI updates
        document.dispatchEvent(
          new CustomEvent("wishlist-refreshed", {
            detail: { items: response.data.items || [], count: response.data.item_count || 0 },
          }),
        )
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        // Handle network errors gracefully
        if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
          console.warn("Network error when refreshing wishlist, using local state")
          logAction("refreshWishlist:network:fallback")
        } else {
          logAction("refreshWishlist:error", error instanceof Error ? error : new Error(String(error)))
        }
      }
    } finally {
      dispatch({ type: "SET_UPDATING", payload: false })
      isLoadingRef.current = false
      abortControllerRef.current = null
    }
  }, [isAuthenticated, logAction, cleanup])

  // Load wishlist from localStorage or API on mount or auth change
  useEffect(() => {
    // Check if auth state actually changed
    const currentAuthState = {
      isAuthenticated,
      userId: user?.id,
    }

    const authStateChanged =
      lastAuthStateRef.current.isAuthenticated !== currentAuthState.isAuthenticated ||
      lastAuthStateRef.current.userId !== currentAuthState.userId

    // Skip if we've already loaded and auth state hasn't changed
    if (initialLoadComplete.current && !authStateChanged) {
      return
    }

    // Update the ref
    lastAuthStateRef.current = currentAuthState

    const loadWishlist = async () => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) {
        return
      }

      try {
        isLoadingRef.current = true
        cleanup() // Clean up any existing request

        dispatch({ type: "SET_UPDATING", payload: true })
        logAction("loadWishlist:start")

        if (isAuthenticated && user?.id) {
          // Try to load from API first
          try {
            abortControllerRef.current = new AbortController()
            const response = await api.get("/api/wishlist", {
              signal: abortControllerRef.current.signal,
            })

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
          } catch (error: any) {
            if (error.name !== "AbortError") {
              logAction("loadWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
            }
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
        isLoadingRef.current = false
        abortControllerRef.current = null
      }
    }

    loadWishlist()
  }, [isAuthenticated, user?.id, storedWishlist, logAction, cleanup])

  // Save wishlist to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (initialLoadComplete.current && state.isLoaded) {
      setStoredWishlist(state.items)
    }
  }, [state.items, state.isLoaded, setStoredWishlist])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

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
      // Prevent duplicate requests
      if (state.isUpdating) {
        return
      }

      try {
        dispatch({ type: "SET_UPDATING", payload: true })
        logAction("addToWishlist:start")

        // Optimistically update UI first
        const tempItem: WishlistItem = {
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

        // Update UI immediately
        dispatch({ type: "ADD_ITEM", payload: tempItem })

        // Dispatch immediate UI update event
        document.dispatchEvent(
          new CustomEvent("wishlist-item-added", {
            detail: { productId, item: tempItem },
          }),
        )

        if (isAuthenticated) {
          // Try to add via API
          try {
            const response = await api.post("/api/wishlist", { product_id: productId })
            if (response.status === 201 && response.data.item) {
              // Replace temp item with real item from API
              dispatch({ type: "REMOVE_PRODUCT", payload: { productId } })
              dispatch({ type: "ADD_ITEM", payload: response.data.item })
              logAction("addToWishlist:api:success")

              // Dispatch final update event
              document.dispatchEvent(
                new CustomEvent("wishlist-item-synced", {
                  detail: { productId, item: response.data.item },
                }),
              )
              return
            }
          } catch (error: any) {
            // Handle network errors gracefully
            if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
              console.warn("Network error when adding to wishlist, keeping local state")
              logAction("addToWishlist:network:fallback")
              // Keep the optimistic update
            } else {
              logAction("addToWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
              // Keep the optimistic update for other errors too
            }
          }
        }

        logAction("addToWishlist:localStorage:success")
      } catch (error) {
        logAction("addToWishlist:error", error instanceof Error ? error : new Error(String(error)))
      } finally {
        dispatch({ type: "SET_UPDATING", payload: false })
      }
    },
    [isAuthenticated, logAction, state.isUpdating],
  )

  // Remove a product from the wishlist
  const removeProductFromWishlist = useCallback(
    async (productId: number) => {
      // Prevent duplicate requests
      if (state.isUpdating) {
        return
      }

      try {
        dispatch({ type: "SET_UPDATING", payload: true })
        logAction("removeFromWishlist:start")

        // Optimistically update UI first
        dispatch({ type: "REMOVE_PRODUCT", payload: { productId } })

        // Dispatch immediate UI update event
        document.dispatchEvent(
          new CustomEvent("wishlist-item-removed", {
            detail: { productId },
          }),
        )

        if (isAuthenticated) {
          // Try to remove via API
          try {
            await api.delete(`/api/wishlist/product/${productId}`)
            logAction("removeFromWishlist:api:success")

            // Dispatch sync confirmation event
            document.dispatchEvent(
              new CustomEvent("wishlist-item-sync-removed", {
                detail: { productId },
              }),
            )
            return
          } catch (error: any) {
            // Handle network errors gracefully
            if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
              console.warn("Network error when removing from wishlist, keeping local state")
              logAction("removeFromWishlist:network:fallback")
              // Keep the optimistic update
              return
            }

            logAction("removeFromWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
            // Keep the optimistic update for other errors too
          }
        }

        logAction("removeFromWishlist:localStorage:success")
      } catch (error) {
        logAction("removeFromWishlist:error", error instanceof Error ? error : new Error(String(error)))
        // Even if there's an error, keep the optimistic update
      } finally {
        dispatch({ type: "SET_UPDATING", payload: false })
      }
    },
    [isAuthenticated, logAction, state.isUpdating],
  )

  // Clear the wishlist
  const clearWishlist = useCallback(async () => {
    // Prevent duplicate requests
    if (state.isUpdating) {
      return
    }

    try {
      dispatch({ type: "SET_UPDATING", payload: true })
      logAction("clearWishlist:start")

      // Optimistically update UI first
      dispatch({ type: "CLEAR_ITEMS" })

      // Dispatch immediate UI update event
      document.dispatchEvent(
        new CustomEvent("wishlist-cleared", {
          detail: {},
        }),
      )

      if (isAuthenticated) {
        // Try to clear via API
        try {
          await api.delete("/api/wishlist/clear")
          logAction("clearWishlist:api:success")
        } catch (error) {
          logAction("clearWishlist:api:error", error instanceof Error ? error : new Error(String(error)))
          // Keep the optimistic update
        }
      }

      logAction("clearWishlist:localStorage:success")
    } catch (error) {
      logAction("clearWishlist:error", error instanceof Error ? error : new Error(String(error)))
    } finally {
      dispatch({ type: "SET_UPDATING", payload: false })
    }
  }, [isAuthenticated, logAction, state.isUpdating])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
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
    }),
    [
      state,
      isInWishlist,
      addToWishlist,
      removeProductFromWishlist,
      clearWishlist,
      refreshWishlist,
      lastAction,
      actionCount,
      errors,
    ],
  )

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
