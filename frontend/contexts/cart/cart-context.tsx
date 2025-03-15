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

// Add a function to get cart items from localStorage
const getLocalCartItems = (): CartItem[] => {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem("cartItems") || "[]")
  } catch (error) {
    console.error("Error parsing cart items from localStorage:", error)
    return []
  }
}

// Save cart items to localStorage
const saveLocalCartItems = (items: CartItem[]) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("cartItems", JSON.stringify(items))
    localStorage.setItem("cartLastUpdated", new Date().toISOString())
  } catch (error) {
    console.error("Error saving cart items to localStorage:", error)
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartState, setCartState] = useState<CartState>(initialCartState)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()

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
    saveLocalCartItems(items)
  }, [])

  // Fetch cart data from API
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      // If not authenticated, use localStorage
      const localCartItems = getLocalCartItems()
      updateCartState(localCartItems)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await api.get("/api/cart")
      const cartData = response.data
      const items = cartData.items || []

      // Update cart state with items from API
      updateCartState(items)
      setError(null)
    } catch (error: any) {
      console.error("Error fetching cart:", error)

      // If it's an authentication error, use localStorage as fallback
      if (error.response?.status === 401) {
        const localCartItems = getLocalCartItems()
        updateCartState(localCartItems)
      } else {
        setError("Failed to load cart. Please try again.")
        toast({
          title: "Error Loading Cart",
          description: "We couldn't load your cart. Please refresh the page.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, toast, updateCartState])

  // Refresh cart with debounce to prevent too many requests
  const refreshCart = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchCart()
      debounceTimerRef.current = null
    }, 300)
  }, [fetchCart])

  // Add item to cart
  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number): Promise<boolean> => {
      setIsUpdating(true)

      try {
        if (!isAuthenticated) {
          // For guest users, use localStorage directly
          const localCartItems = getLocalCartItems()

          // Check if product already exists in cart
          const existingItemIndex = localCartItems.findIndex(
            (item) => item.product_id === productId && item.variant_id === (variantId || null),
          )

          if (existingItemIndex >= 0) {
            // Update quantity if product already exists
            localCartItems[existingItemIndex].quantity += quantity
            localCartItems[existingItemIndex].total =
              localCartItems[existingItemIndex].price * localCartItems[existingItemIndex].quantity
          } else {
            // Try to get product details
            let productDetails = null
            try {
              const productResponse = await api.get(`/api/products/${productId}`)
              productDetails = productResponse.data
            } catch (productError) {
              console.error("Error fetching product details:", productError)
            }

            // Add new item if product doesn't exist
            localCartItems.push({
              id: Date.now(),
              product_id: productId,
              variant_id: variantId || null,
              quantity,
              price: productDetails?.sale_price || productDetails?.price || 0,
              total: (productDetails?.sale_price || productDetails?.price || 0) * quantity,
              product: productDetails
                ? {
                    id: productDetails.id,
                    name: productDetails.name,
                    slug: productDetails.slug || "",
                    thumbnail_url: productDetails.image_urls?.[0] || "",
                    image_urls: productDetails.image_urls || [],
                    category: productDetails.category_id,
                  }
                : {
                    id: productId,
                    name: "Product",
                    slug: "",
                    thumbnail_url: "",
                    image_urls: [],
                  },
            })
          }

          // Update cart state
          updateCartState(localCartItems)

          // Trigger cart update event
          document.dispatchEvent(new CustomEvent("cart-updated"))

          return true
        }

        // For authenticated users, use the API
        const response = await api.post("/api/cart", {
          product_id: productId,
          quantity,
          variant_id: variantId,
        })

        await refreshCart() // Refresh cart after adding
        return true
      } catch (error: any) {
        console.error("Error adding to cart:", error)

        // If it's an authentication error, use localStorage as fallback
        if (error.response?.status === 401) {
          // For guest users, use localStorage directly
          const localCartItems = getLocalCartItems()

          // Check if product already exists in cart
          const existingItemIndex = localCartItems.findIndex(
            (item) => item.product_id === productId && item.variant_id === (variantId || null),
          )

          if (existingItemIndex >= 0) {
            // Update quantity if product already exists
            localCartItems[existingItemIndex].quantity += quantity
            localCartItems[existingItemIndex].total =
              localCartItems[existingItemIndex].price * localCartItems[existingItemIndex].quantity
          } else {
            // Try to get product details
            let productDetails = null
            try {
              const productResponse = await api.get(`/api/products/${productId}`)
              productDetails = productResponse.data
            } catch (productError) {
              console.error("Error fetching product details:", productError)
            }

            // Add new item if product doesn't exist
            localCartItems.push({
              id: Date.now(),
              product_id: productId,
              variant_id: variantId || null,
              quantity,
              price: productDetails?.sale_price || productDetails?.price || 0,
              total: (productDetails?.sale_price || productDetails?.price || 0) * quantity,
              product: productDetails
                ? {
                    id: productDetails.id,
                    name: productDetails.name,
                    slug: productDetails.slug || "",
                    thumbnail_url: productDetails.image_urls?.[0] || "",
                    image_urls: productDetails.image_urls || [],
                    category: productDetails.category_id,
                  }
                : {
                    id: productId,
                    name: "Product",
                    slug: "",
                    thumbnail_url: "",
                    image_urls: [],
                  },
            })
          }

          // Update cart state
          updateCartState(localCartItems)

          // Trigger cart update event
          document.dispatchEvent(new CustomEvent("cart-updated"))

          return true
        }

        setError("Failed to add item to cart. Please try again.")
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [isAuthenticated, refreshCart, updateCartState],
  )

  // Remove item from cart
  const removeItem = useCallback(
    async (itemId: number): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        if (!isAuthenticated) {
          // For guest users, use localStorage directly
          const localCartItems = getLocalCartItems()
          const updatedItems = localCartItems.filter((item) => item.id !== itemId)
          updateCartState(updatedItems)
          return true
        }

        // Optimistic update
        const updatedItems = cartState.items.filter((item) => item.id !== itemId)
        updateCartState(updatedItems)

        // Make API call to remove cart item
        await api.delete(`/api/cart/${itemId}`)

        // Refresh cart data to ensure consistency
        await refreshCart()
        return true
      } catch (error: any) {
        console.error("Error removing from cart:", error)

        // If it's an authentication error, use localStorage as fallback
        if (error.response?.status === 401) {
          const localCartItems = getLocalCartItems()
          const updatedItems = localCartItems.filter((item) => item.id !== itemId)
          updateCartState(updatedItems)
          return true
        }

        // Handle specific error cases
        if (error.response && error.response.data && error.response.data.error) {
          setError(error.response.data.error)
        } else {
          setError("Failed to remove item from cart")
        }

        // Revert optimistic update
        await fetchCart()

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
    [cartState.items, fetchCart, isAuthenticated, refreshCart, toast, updateCartState],
  )

  // Update item quantity
  const updateQuantity = useCallback(
    async (itemId: number, quantity: number): Promise<boolean> => {
      // If quantity is 0, remove the item
      if (quantity === 0) {
        return removeItem(itemId)
      }

      if (quantity < 0) return false

      try {
        setIsUpdating(true)
        setError(null)

        if (!isAuthenticated) {
          // For guest users, use localStorage directly
          const localCartItems = getLocalCartItems()
          const updatedItems = localCartItems.map((item) =>
            item.id === itemId ? { ...item, quantity, total: item.price * quantity } : item,
          )
          updateCartState(updatedItems)
          return true
        }

        // Optimistic update
        const updatedItems = cartState.items.map((item) =>
          item.id === itemId ? { ...item, quantity, total: item.price * quantity } : item,
        )

        updateCartState(updatedItems)

        // Make API call to update cart item
        await api.put(`/api/cart/${itemId}`, { quantity })

        // Refresh cart data to ensure consistency
        await refreshCart()
        return true
      } catch (error: any) {
        console.error("Error updating cart:", error)

        // If it's an authentication error, use localStorage as fallback
        if (error.response?.status === 401) {
          const localCartItems = getLocalCartItems()
          const updatedItems = localCartItems.map((item) =>
            item.id === itemId ? { ...item, quantity, total: item.price * quantity } : item,
          )
          updateCartState(updatedItems)
          return true
        }

        // Handle specific error cases
        if (error.response && error.response.data && error.response.data.error) {
          setError(error.response.data.error)
        } else {
          setError("Failed to update cart")
        }

        // Revert optimistic update
        await fetchCart()

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
    [cartState.items, fetchCart, isAuthenticated, refreshCart, removeItem, toast, updateCartState],
  )

  // Clear cart
  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      if (!isAuthenticated) {
        // For guest users, use localStorage directly
        localStorage.removeItem("cartItems")
        setCartState(initialCartState)
        return true
      }

      // Optimistic update
      setCartState(initialCartState)

      // Make API call to clear cart
      await api.delete("/api/cart/clear")

      return true
    } catch (error: any) {
      console.error("Error clearing cart:", error)

      // If it's an authentication error, use localStorage as fallback
      if (error.response?.status === 401) {
        localStorage.removeItem("cartItems")
        setCartState(initialCartState)
        return true
      }

      // Handle specific error cases
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error)
      } else {
        setError("Failed to clear cart")
      }

      // Revert optimistic update
      await fetchCart()

      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [fetchCart, isAuthenticated, toast])

  // Fetch cart on mount and when auth state changes
  useEffect(() => {
    fetchCart()

    // Set up periodic refresh for real-time updates
    const intervalId = setInterval(() => {
      if (!isUpdating) {
        fetchCart()
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

  // Add an event listener for auth errors
  useEffect(() => {
    const handleAuthError = () => {
      // When auth error occurs, switch to localStorage cart
      const localCartItems = getLocalCartItems()
      updateCartState(localCartItems)
    }

    document.addEventListener("auth-error", handleAuthError)

    return () => {
      document.removeEventListener("auth-error", handleAuthError)
    }
  }, [updateCartState])

  // Add an event listener for cart updates from other components
  useEffect(() => {
    const handleCartUpdated = () => {
      // When cart is updated from another component, refresh the cart
      refreshCart()
    }

    document.addEventListener("cart-updated", handleCartUpdated)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdated)
    }
  }, [refreshCart])

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
