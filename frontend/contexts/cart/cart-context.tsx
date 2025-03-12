"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import api from "@/lib/api"
import { useAuth } from "@/contexts/auth/auth-context"

// Types
export interface CartItem {
  id: number
  product_id: number
  variant_id?: number | null
  quantity: number
  price: number
  total: number
  product: {
    id: number
    name: string
    slug: string
    thumbnail_url: string
    image_urls: string[]
    category?: string
  }
}

interface CartState {
  items: CartItem[]
  itemCount: number
  subtotal: number
  shipping: number
  total: number
}

interface CartContextType extends CartState {
  isLoading: boolean
  isUpdating: boolean
  error: string | null
  lastUpdated: Date | null
  addToCart: (productId: number, quantity: number, variantId?: number) => Promise<boolean>
  updateQuantity: (itemId: number, quantity: number) => Promise<boolean>
  removeItem: (itemId: number) => Promise<boolean>
  clearCart: () => Promise<boolean>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Initial cart state
const initialCartState: CartState = {
  items: [],
  itemCount: 0,
  subtotal: 0,
  shipping: 0,
  total: 0,
}

// Calculate shipping cost based on subtotal
const calculateShipping = (subtotal: number): number => {
  return subtotal > 10000 ? 0 : 500 // Free shipping over KSh 10,000
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartState, setCartState] = useState<CartState>(initialCartState)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { toast } = useToast()
  const { isAuthenticated, user } = useAuth()

  // Use a ref to track if we're mounted to prevent state updates after unmount
  const isMounted = useRef(true)

  // Use a ref to track pending requests to avoid race conditions
  const pendingRequest = useRef<AbortController | null>(null)

  // Debounce timer for cart updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update cart state with new data and recalculate totals
  const updateCartState = useCallback((items: CartItem[]) => {
    const itemCount = items.length
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const shipping = calculateShipping(subtotal)
    const total = subtotal + shipping

    setCartState({
      items,
      itemCount,
      subtotal,
      shipping,
      total,
    })

    setLastUpdated(new Date())
  }, [])

  // Fetch cart data from API with optimized error handling and caching
  const fetchCart = useCallback(
    async (showLoadingState = true) => {
      if (!isAuthenticated) {
        setCartState(initialCartState)
        setIsLoading(false)
        setError(null)
        return
      }

      try {
        // Cancel any pending requests to avoid race conditions
        if (pendingRequest.current) {
          pendingRequest.current.abort()
        }

        const controller = new AbortController()
        pendingRequest.current = controller

        if (showLoadingState) {
          setIsLoading(true)
        }
        setError(null)

        const response = await api.get("/cart", {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        if (isMounted.current) {
          // Use the cart data structure from the backend
          const cartData = response.data

          // Map backend cart items to our frontend structure
          const items = cartData.items.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            product: {
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              thumbnail_url: item.product.thumbnail_url,
              image_urls: item.product.image_urls,
              category: item.product.category,
            },
          }))

          updateCartState(items)
          setError(null)
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          // Request was aborted, do nothing
          return
        }

        if (isMounted.current) {
          console.error("Error fetching cart:", error)

          // Handle different error types
          if (error.response && error.response.status === 401) {
            setError("Please log in to view your cart")
          } else {
            setError("Failed to load your cart. Please try again.")
          }

          // Only show toast for network errors, not for aborted requests
          if (error.message !== "canceled") {
            toast({
              title: "Error Loading Cart",
              description: "We couldn't load your cart. Please refresh the page.",
              variant: "destructive",
            })
          }
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false)
          pendingRequest.current = null
        }
      }
    },
    [isAuthenticated, toast, updateCartState],
  )

  // Refresh cart with debounce to prevent too many requests
  const refreshCart = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchCart(false)
      debounceTimerRef.current = null
    }, 300)
  }, [fetchCart])

  // Add item to cart with optimistic updates
  const addToCart = async (productId: number, quantity: number, variantId?: number): Promise<boolean> => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add items to your cart.",
        variant: "destructive",
      })
      return false
    }

    try {
      setIsUpdating(true)
      setError(null)

      // Make API call to add item to cart
      await api.post("/cart", {
        product_id: productId,
        quantity,
        variant_id: variantId || null,
      })

      toast({
        title: "Added to Cart",
        description: "Item has been added to your cart.",
      })

      // Refresh cart data
      await refreshCart()
      return true
    } catch (error: any) {
      console.error("Error adding to cart:", error)

      // Handle specific error cases
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error)
        toast({
          title: "Error",
          description: error.response.data.error,
          variant: "destructive",
        })
      } else {
        setError("Failed to add item to cart")
        toast({
          title: "Error",
          description: "Failed to add item to cart. Please try again.",
          variant: "destructive",
        })
      }
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  // Update item quantity with optimistic updates
  const updateQuantity = async (itemId: number, quantity: number): Promise<boolean> => {
    if (quantity < 1) return false

    try {
      setIsUpdating(true)
      setError(null)

      // Optimistic update
      const updatedItems = cartState.items.map((item) =>
        item.id === itemId ? { ...item, quantity, total: item.price * quantity } : item,
      )

      updateCartState(updatedItems)

      // Make API call to update cart item
      await api.put(`/cart/${itemId}`, { quantity })

      // Refresh cart data to ensure consistency
      await refreshCart()
      return true
    } catch (error: any) {
      console.error("Error updating cart:", error)

      // Handle specific error cases
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to update cart")
      }

      // Revert optimistic update
      await fetchCart(false)

      toast({
        title: "Error",
        description: "Failed to update cart. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  // Remove item from cart with optimistic updates
  const removeItem = async (itemId: number): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      // Optimistic update
      const updatedItems = cartState.items.filter((item) => item.id !== itemId)
      updateCartState(updatedItems)

      // Make API call to remove cart item
      await api.delete(`/cart/${itemId}`)

      toast({
        title: "Removed from Cart",
        description: "Item has been removed from your cart.",
      })

      // Refresh cart data to ensure consistency
      await refreshCart()
      return true
    } catch (error: any) {
      console.error("Error removing from cart:", error)

      // Handle specific error cases
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to remove item from cart")
      }

      // Revert optimistic update
      await fetchCart(false)

      toast({
        title: "Error",
        description: "Failed to remove item from cart. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  // Clear cart
  const clearCart = async (): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      // Optimistic update
      setCartState(initialCartState)

      // Make API call to clear cart
      await api.delete("/cart/clear")

      toast({
        title: "Cart Cleared",
        description: "All items have been removed from your cart.",
      })

      return true
    } catch (error: any) {
      console.error("Error clearing cart:", error)

      // Handle specific error cases
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to clear cart")
      }

      // Revert optimistic update
      await fetchCart(false)

      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  // Fetch cart on mount and when auth state changes
  useEffect(() => {
    fetchCart()

    // Set up periodic refresh for real-time updates
    const intervalId = setInterval(() => {
      if (isAuthenticated && !isUpdating) {
        fetchCart(false)
      }
    }, 60000) // Refresh every minute

    return () => {
      isMounted.current = false
      clearInterval(intervalId)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (pendingRequest.current) {
        pendingRequest.current.abort()
      }
    }
  }, [isAuthenticated, fetchCart, isUpdating])

  const value: CartContextType = {
    ...cartState,
    isLoading,
    isUpdating,
    error,
    lastUpdated,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Update the useCart function to provide better error handling
export function useCart() {
  const context = useContext(CartContext)

  if (context === undefined) {
    // Instead of throwing an error, return a default state
    console.error("useCart must be used within a CartProvider")
    return {
      items: [],
      itemCount: 0,
      subtotal: 0,
      shipping: 0,
      total: 0,
      isLoading: false,
      isUpdating: false,
      error: "Cart context not available",
      lastUpdated: null,
      addToCart: async () => false,
      updateQuantity: async () => false,
      removeItem: async () => false,
      clearCart: async () => false,
      refreshCart: async () => {},
    }
  }

  return context
}

