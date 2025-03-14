"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useToast } from "@/components/ui/use-toast"
import api from "@/lib/api"
import { useAuth } from "@/contexts/auth/auth-context"
import { useRouter } from "next/navigation"

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
  const [isLoading, setIsLoading] = useState(false) // Start with false to avoid flash
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

  // Debounce timer for cart updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update cart state with new data and recalculate totals
  const updateCartState = useCallback((items: CartItem[]) => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
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

    // Also update localStorage for faster access
    try {
      localStorage.setItem("cartItems", JSON.stringify(items))
      localStorage.setItem("cartLastUpdated", new Date().toISOString())
    } catch (error) {
      console.error("Error saving cart to localStorage:", error)
    }
  }, [])

  // Fetch cart data from API
  const fetchCart = useCallback(
    async (showLoadingState = true) => {
      // If there's a pending request, don't start a new one
      if (pendingRequest.current) {
        return
      }

      // For guest users, load from localStorage
      if (!isAuthenticated) {
        try {
          const storedItems = localStorage.getItem("cartItems")
          if (storedItems) {
            const items = JSON.parse(storedItems)
            updateCartState(items)
          } else {
            updateCartState([])
          }
        } catch (error) {
          console.error("Error loading cart from localStorage:", error)
          updateCartState([])
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

        const response = await api.get("/api/cart", {
          signal: controller.signal,
        })

        if (!isMounted.current) return

        const cartData = response.data
        const items = cartData.items || []
        updateCartState(items)
      } catch (error: any) {
        if (!isMounted.current || error.name === "AbortError") return

        console.error("Error fetching cart:", error)

        // Handle authentication errors silently for better UX
        if (error.response?.status === 401) {
          // For auth errors, just use an empty cart
          updateCartState([])
          setError(null)
        } else {
          setError("Failed to load your cart. Please try again.")

          // Only show toast for non-auth errors
          toast({
            title: "Error Loading Cart",
            description: "We couldn't load your cart. Please refresh the page.",
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

  // Add item to cart
  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number): Promise<boolean> => {
      if (!isAuthenticated) {
        // For guest users, store in localStorage
        try {
          const storedItems = localStorage.getItem("cartItems") || "[]"
          const items = JSON.parse(storedItems) as CartItem[]

          // Create a temporary item (would be replaced with real data from API in a real app)
          const newItem: CartItem = {
            id: Date.now(), // Temporary ID
            product_id: productId,
            variant_id: variantId || null,
            quantity,
            price: 0, // Would come from product data
            total: 0, // Would be calculated
            product: {
              id: productId,
              name: "Product", // Would come from product data
              slug: "", // Would come from product data
              thumbnail_url: "", // Would come from product data
              image_urls: [],
            },
          }

          items.push(newItem)
          updateCartState(items)

          toast({
            title: "Added to Cart",
            description: "Item has been added to your cart.",
          })

          return true
        } catch (error) {
          console.error("Error adding to cart:", error)
          toast({
            title: "Error",
            description: "Failed to add item to cart. Please try again.",
            variant: "destructive",
          })
          return false
        }
      }

      try {
        setIsUpdating(true)
        setError(null)

        // Make API call to Flask backend to add item to cart
        const response = await api.post("/api/cart", {
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
        if (error.response?.status === 401) {
          toast({
            title: "Authentication Required",
            description: "Please log in to add items to your cart.",
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
    },
    [isAuthenticated, toast, refreshCart, updateCartState],
  )

  // Remove item from cart
  const removeItem = useCallback(
    async (itemId: number): Promise<boolean> => {
      if (!isAuthenticated) {
        // For guest users, remove from localStorage
        try {
          const storedItems = localStorage.getItem("cartItems") || "[]"
          const items = JSON.parse(storedItems) as CartItem[]
          const updatedItems = items.filter((item) => item.id !== itemId)
          updateCartState(updatedItems)

          toast({
            title: "Removed from Cart",
            description: "Item has been removed from your cart.",
          })

          return true
        } catch (error) {
          console.error("Error removing from cart:", error)
          toast({
            title: "Error",
            description: "Failed to remove item from cart. Please try again.",
            variant: "destructive",
          })
          return false
        }
      }

      try {
        setIsUpdating(true)
        setError(null)

        // Optimistic update
        const updatedItems = cartState.items.filter((item) => item.id !== itemId)
        updateCartState(updatedItems)

        // Make API call to Flask backend to remove cart item
        await api.delete(`/api/cart/${itemId}`)
        router.refresh()

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
        if (error.response?.data?.error) {
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
    },
    [cartState.items, fetchCart, refreshCart, toast, updateCartState, isAuthenticated, router],
  )

  // Update item quantity
  const updateQuantity = useCallback(
    async (itemId: number, quantity: number): Promise<boolean> => {
      // If quantity is 0, remove the item
      if (quantity === 0) {
        return removeItem(itemId)
      }

      if (quantity < 0) return false

      if (!isAuthenticated) {
        // For guest users, update in localStorage
        try {
          const storedItems = localStorage.getItem("cartItems") || "[]"
          const items = JSON.parse(storedItems) as CartItem[]
          const updatedItems = items.map((item) =>
            item.id === itemId ? { ...item, quantity, total: item.price * quantity } : item,
          )
          updateCartState(updatedItems)

          toast({
            title: "Cart Updated",
            description: "Your cart has been updated.",
          })

          return true
        } catch (error) {
          console.error("Error updating cart:", error)
          toast({
            title: "Error",
            description: "Failed to update cart. Please try again.",
            variant: "destructive",
          })
          return false
        }
      }

      try {
        setIsUpdating(true)
        setError(null)

        // Optimistic update
        const updatedItems = cartState.items.map((item) =>
          item.id === itemId ? { ...item, quantity, total: item.price * quantity } : item,
        )

        updateCartState(updatedItems)

        // Make API call to Flask backend to update cart item
        await api.put(`/api/cart/${itemId}`, { quantity })

        // Refresh cart data to ensure consistency
        await refreshCart()
        return true
      } catch (error: any) {
        console.error("Error updating cart:", error)

        // Handle specific error cases
        if (error.response?.data?.error) {
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
    },
    [cartState.items, fetchCart, refreshCart, toast, updateCartState, removeItem, isAuthenticated],
  )

  // Clear cart
  const clearCart = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      // For guest users, clear localStorage
      try {
        localStorage.removeItem("cartItems")
        localStorage.removeItem("cartLastUpdated")
        updateCartState([])

        toast({
          title: "Cart Cleared",
          description: "All items have been removed from your cart.",
        })

        return true
      } catch (error) {
        console.error("Error clearing cart:", error)
        toast({
          title: "Error",
          description: "Failed to clear cart. Please try again.",
          variant: "destructive",
        })
        return false
      }
    }

    try {
      setIsUpdating(true)
      setError(null)

      // Optimistic update
      setCartState(initialCartState)
      localStorage.removeItem("cartItems")

      // Make API call to Flask backend to clear cart
      await api.delete("/api/cart/clear")

      toast({
        title: "Cart Cleared",
        description: "All items have been removed from your cart.",
      })

      return true
    } catch (error: any) {
      console.error("Error clearing cart:", error)

      // Handle specific error cases
      if (error.response?.data?.error) {
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
  }, [fetchCart, toast, updateCartState, isAuthenticated])

  // Fetch cart on mount and when auth state changes
  useEffect(() => {
    isMounted.current = true

    // Initial cart fetch - don't show loading state on initial load for better UX
    fetchCart(false)

    // Set up periodic refresh only if authenticated
    let intervalId: NodeJS.Timeout | undefined
    if (isAuthenticated) {
      intervalId = setInterval(() => {
        if (!isUpdating) {
          fetchCart(false)
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

// Hook to use the cart context
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
    } as CartContextType
  }

  return context
}

