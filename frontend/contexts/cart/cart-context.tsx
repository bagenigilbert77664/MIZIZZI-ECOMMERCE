"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cartService, type CartItem, type Cart, type CartValidation } from "@/services/cart-service"
import { websocketService } from "@/services/websocket"

// Helper function to calculate shipping based on subtotal
const calculateShipping = (subtotal: number): number => {
  // Simple shipping calculation logic
  if (subtotal === 0) return 0
  if (subtotal > 10000) return 0 // Free shipping for orders over $100
  return 1000 // $10 flat rate shipping
}

// Helper functions for local storage
const saveLocalCartItems = (items: CartItem[]): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("cartItems", JSON.stringify(items))
  }
}

const getLocalCartItems = (): CartItem[] => {
  if (typeof window !== "undefined") {
    const items = localStorage.getItem("cartItems")
    return items ? JSON.parse(items) : []
  }
  return []
}

interface CartContextType {
  // Cart state
  cart: Cart | null
  items: CartItem[]
  itemCount: number
  subtotal: number
  shipping: number
  total: number

  // Loading states
  isLoading: boolean
  isUpdating: boolean

  // Error and validation
  error: string | null
  validation: CartValidation | null

  // Cart operations
  addToCart: (
    productId: number,
    quantity: number,
    variantId?: number,
  ) => Promise<{ success: boolean; message: string; isUpdate?: boolean }>
  updateQuantity: (itemId: number, quantity: number) => Promise<boolean>
  removeItem: (itemId: number) => Promise<boolean>
  clearCart: () => Promise<boolean>
  refreshCart: () => Promise<void>

  // Coupon operations
  applyCoupon: (couponCode: string) => Promise<boolean>
  removeCoupon: () => Promise<boolean>

  // Address operations
  setShippingAddress: (addressId: number) => Promise<boolean>
  setBillingAddress: (addressId: number, sameAsShipping?: boolean) => Promise<boolean>

  // Shipping and payment operations
  setShippingMethod: (shippingMethodId: number) => Promise<boolean>
  setPaymentMethod: (paymentMethodId: number) => Promise<boolean>

  // Other cart operations
  setCartNotes: (notes: string) => Promise<boolean>
  setRequiresShipping: (requiresShipping: boolean) => Promise<boolean>

  // Validation operations
  validateCart: () => Promise<CartValidation>
  validateCheckout: () => Promise<CartValidation>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  // Cart state
  const [cart, setCart] = useState<Cart | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [itemCount, setItemCount] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [shipping, setShipping] = useState(0)
  const [total, setTotal] = useState(0)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  // Error and validation
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<CartValidation | null>(null)

  // Add this after the other state declarations in CartProvider
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()

  // Use a ref to track if we're mounted to prevent state updates after unmount
  const isMounted = useRef(true)

  // Use a ref to track pending requests to avoid race conditions
  const pendingRequest = useRef<AbortController | null>(null)

  // Debounce timer for cart updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Add a ref to track the last fetch time to prevent excessive API calls
  const lastFetchTimeRef = useRef<number>(0)
  const MIN_FETCH_INTERVAL = 2000 // 2 seconds minimum between fetches

  // Replace the updateCartState function with this implementation
  const updateCartState = useCallback((newItems: CartItem[]) => {
    // Ensure items is an array
    if (!Array.isArray(newItems)) {
      console.error("updateCartState received non-array items:", newItems)
      newItems = []
    }

    // Validate each item
    const validItems = newItems.filter((item) => {
      if (!item || typeof item !== "object") {
        console.error("Invalid item in cart:", item)
        return false
      }

      // Ensure required properties exist with valid values
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        console.warn("Cart item has invalid quantity, setting to 1:", item)
        item.quantity = 1
      }

      // Convert string prices to numbers
      if (typeof item.price === "string") {
        console.log(`Converting string price to number for cart item:`, item.product_id)
        item.price = Number.parseFloat(item.price) || 999
      }

      // Ensure price is a valid number greater than zero
      if (typeof item.price !== "number" || isNaN(item.price) || item.price <= 0) {
        console.warn("Cart item has invalid price, fixing:", item)
        // Attempt to get a default price if we have product info
        if (item.product && item.product.id) {
          // Use a default price of 999 if we can't determine the actual price
          item.price = 999
        } else {
          item.price = 999 // Default fallback price
        }
      }

      // Calculate total based on validated price and quantity
      item.total = item.price * item.quantity

      // Ensure product property exists
      if (!item.product) {
        console.warn("Cart item missing product data, creating placeholder:", item)
        item.product = {
          id: item.product_id || 0,
          name: `Product ${item.product_id || "Unknown"}`,
          slug: `product-${item.product_id || "unknown"}`,
          thumbnail_url: "",
          image_urls: [],
        }
      }

      return true
    })

    const newItemCount = validItems.reduce((sum, item) => sum + item.quantity, 0)
    const newSubtotal = validItems.reduce((sum, item) => sum + item.total, 0)
    const newShipping = calculateShipping(newSubtotal)
    const newTotal = newSubtotal + newShipping

    // Update all the state variables
    setItems(validItems)
    setItemCount(newItemCount)
    setSubtotal(newSubtotal)
    setShipping(newShipping)
    setTotal(newTotal)
    setLastUpdated(new Date())

    // Also update localStorage for faster access
    saveLocalCartItems(validItems)

    // Dispatch cart-updated event to notify other components
    if (typeof document !== "undefined") {
      document.dispatchEvent(
        new CustomEvent("cart-updated", {
          detail: { count: newItemCount, total: newTotal },
        }),
      )
    }
  }, [])

  // Fetch cart data from API
  const fetchCart = useCallback(async () => {
    // Check if we should throttle the fetch
    const now = Date.now()
    if (now - lastFetchTimeRef.current < MIN_FETCH_INTERVAL) {
      console.log("Throttling cart fetch - too soon since last fetch")
      return
    }

    lastFetchTimeRef.current = now

    if (!isAuthenticated) {
      // If not authenticated, use localStorage
      const localCartItems = getLocalCartItems()
      updateCartState(localCartItems)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Cancel any pending requests
      if (pendingRequest.current) {
        pendingRequest.current.abort()
      }

      const controller = new AbortController()
      pendingRequest.current = controller

      const response = await cartService.getCart()

      if (response?.success === false) {
        console.error("API returned an error:", response.errors)
        setError(response.errors?.[0]?.message || "Failed to load cart.")
        toast({
          title: "Error Loading Cart",
          description: response.errors?.[0]?.message || "We encountered an error loading your cart. Please try again.",
          variant: "destructive",
        })
        return
      }

      setCart(response.cart)
      setItems(response.items)
      setItemCount(response.items.reduce((sum, item) => sum + item.quantity, 0))
      setSubtotal(response.cart.subtotal)
      setShipping(response.cart.shipping)
      setTotal(response.cart.total)

      if (response.validation) {
        setValidation(response.validation)
      }
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
          description: error.message || "We couldn't load your cart. Please refresh the page.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
      pendingRequest.current = null
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

  // Validate stock levels for all items in cart
  const validateStock = useCallback(async (): Promise<CartValidation> => {
    try {
      const validation = await cartService.validateCart()
      setValidation(validation)
      return validation
    } catch (error: any) {
      console.error("Error validating cart:", error)
      return {
        is_valid: false,
        errors: [{ message: "Failed to validate cart", code: "validation_error" }],
        warnings: [],
      }
    }
  }, [])

  // Enhance the addToCart function to handle duplicates better
  // Find the addToCart function and replace it with this enhanced version

  // Add item to cart
  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number) => {
      try {
        setIsUpdating(true)
        setError(null)

        // Check if item already exists in cart
        const existingItem = items.find(
          (item) =>
            item.product_id === productId &&
            (variantId === undefined ? item.variant_id === null : item.variant_id === variantId),
        )

        // If item exists, we'll update the quantity instead of adding a new item
        if (existingItem) {
          console.log(
            `Item already exists in cart (ID: ${existingItem.id}). Updating quantity from ${existingItem.quantity} to ${existingItem.quantity + quantity}`,
          )

          // Call updateQuantity instead of addToCart
          const response = await cartService.updateQuantity(existingItem.id, existingItem.quantity + quantity)

          if (response.success) {
            // Update local state
            setItems(response.items)
            setItemCount(response.items.reduce((sum, item) => sum + item.quantity, 0))
            setSubtotal(response.cart.subtotal)
            setShipping(response.cart.shipping)
            setTotal(response.cart.total)

            // Track the event with WebSocket
            try {
              await websocketService.trackAddToCart(productId, quantity, user?.id?.toString())
            } catch (wsError) {
              console.warn("WebSocket tracking failed, but cart was updated:", wsError)
            }

            // Trigger a cart update event
            document.dispatchEvent(new CustomEvent("cart-updated"))

            return { success: true, message: "Product quantity updated in cart", isUpdate: true }
          }
        } else {
          // Add new item to cart
          const response = await cartService.addToCart(productId, quantity, variantId)

          if (response.success) {
            // Update local state
            setItems(response.items)
            setItemCount(response.items.reduce((sum, item) => sum + item.quantity, 0))
            setSubtotal(response.cart.subtotal)
            setShipping(response.cart.shipping)
            setTotal(response.cart.total)

            // Track the event with WebSocket
            try {
              await websocketService.trackAddToCart(productId, quantity, user?.id?.toString())
            } catch (wsError) {
              console.warn("WebSocket tracking failed, but cart was updated:", wsError)
            }

            // Trigger a cart update event
            document.dispatchEvent(new CustomEvent("cart-updated"))

            return { success: true, message: "Product added to cart", isUpdate: false }
          }
        }

        return { success: false, message: "Failed to update cart" }
      } catch (error) {
        console.error("Error adding to cart:", error)
        return { success: false, message: "An error occurred while adding to cart" }
      } finally {
        setIsUpdating(false)
      }
    },
    [items, user, setItems, setItemCount, setSubtotal, setShipping, setTotal, setIsUpdating, setError],
  )

  // Replace the removeItem function with this implementation
  const removeItem = useCallback(
    async (itemId: number): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        const response = await cartService.removeItem(itemId)

        setCart(response.cart)
        setItems(response.items)
        setItemCount(response.items.reduce((sum, item) => sum + item.quantity, 0))
        setSubtotal(response.cart.subtotal)
        setShipping(response.cart.shipping)
        setTotal(response.cart.total)

        return true
      } catch (error: any) {
        console.error("Error removing from cart:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [fetchCart, isAuthenticated, refreshCart, toast, updateCartState],
  )

  // Replace the updateQuantity function with this implementation
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

        const response = await cartService.updateQuantity(itemId, quantity)

        setCart(response.cart)
        setItems(response.items)
        setItemCount(response.items.reduce((sum, item) => sum + item.quantity, 0))
        setSubtotal(response.cart.subtotal)
        setShipping(response.cart.shipping)
        setTotal(response.cart.total)

        return true
      } catch (error: any) {
        console.error("Error updating cart:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [fetchCart, isAuthenticated, refreshCart, removeItem, toast, updateCartState],
  )

  // Clear cart
  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      await cartService.clearCart()

      // Reset cart state
      if (cart) {
        setCart({
          ...cart,
          subtotal: 0,
          tax: 0,
          shipping: 0,
          discount: 0,
          total: 0,
        })
      }
      setItems([])
      setItemCount(0)
      setSubtotal(0)
      setShipping(0)
      setTotal(0)

      return true
    } catch (error: any) {
      console.error("Error clearing cart:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [cart])

  // Apply coupon
  const applyCoupon = useCallback(
    async (couponCode: string): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        const response = await cartService.applyCoupon(couponCode)

        setCart(response.cart)
        setItems(response.items)
        setSubtotal(response.cart.subtotal)
        setShipping(response.cart.shipping)
        setTotal(response.cart.total)

        toast({
          title: "Coupon Applied",
          description: "Your coupon has been applied successfully",
        })

        return true
      } catch (error: any) {
        console.error("Error applying coupon:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [toast],
  )

  // Remove coupon
  const removeCoupon = useCallback(async (): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.removeCoupon()

      setCart(response.cart)
      setItems(response.items)
      setSubtotal(response.cart.subtotal)
      setShipping(response.cart.shipping)
      setTotal(response.cart.total)

      toast({
        title: "Coupon Removed",
        description: "Your coupon has been removed",
      })

      return true
    } catch (error: any) {
      console.error("Error removing coupon:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [toast])

  // Set shipping address
  const setShippingAddress = useCallback(async (addressId: number): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setShippingAddress(addressId)

      setCart(response.cart)

      return true
    } catch (error: any) {
      console.error("Error setting shipping address:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Set billing address
  const setBillingAddress = useCallback(async (addressId: number, sameAsShipping = false): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setBillingAddress(addressId, sameAsShipping)

      setCart(response.cart)

      return true
    } catch (error: any) {
      console.error("Error setting billing address:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Set shipping method
  const setShippingMethod = useCallback(async (shippingMethodId: number): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setShippingMethod(shippingMethodId)

      setCart(response.cart)
      setSubtotal(response.cart.subtotal)
      setShipping(response.cart.shipping)
      setTotal(response.cart.total)

      return true
    } catch (error: any) {
      console.error("Error setting shipping method:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Set payment method
  const setPaymentMethod = useCallback(async (paymentMethodId: number): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setPaymentMethod(paymentMethodId)

      setCart(response.cart)

      return true
    } catch (error: any) {
      console.error("Error setting payment method:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Set cart notes
  const setCartNotes = useCallback(async (notes: string): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setCartNotes(notes)

      setCart(response.cart)

      return true
    } catch (error: any) {
      console.error("Error setting cart notes:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Set requires shipping
  const setRequiresShipping = useCallback(async (requiresShipping: boolean): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setRequiresShipping(requiresShipping)

      setCart(response.cart)
      setSubtotal(response.cart.subtotal)
      setShipping(response.cart.shipping)
      setTotal(response.cart.total)

      return true
    } catch (error: any) {
      console.error("Error setting requires shipping:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Validate cart
  const validateCart = useCallback(async (): Promise<CartValidation> => {
    try {
      const validation = await cartService.validateCart()
      setValidation(validation)
      return validation
    } catch (error: any) {
      console.error("Error validating cart:", error)
      return {
        is_valid: false,
        errors: [{ message: "Failed to validate cart", code: "validation_error" }],
        warnings: [],
      }
    }
  }, [])

  // Validate checkout
  const validateCheckout = useCallback(async (): Promise<CartValidation> => {
    try {
      const validation = await cartService.validateCheckout()
      setValidation(validation)
      return validation
    } catch (error: any) {
      console.error("Error validating checkout:", error)
      return {
        is_valid: false,
        errors: [{ message: "Failed to validate checkout", code: "validation_error" }],
        warnings: [],
      }
    }
  }, [])

  // Listen for cart updates from WebSocket
  useEffect(() => {
    const handleCartUpdated = (data: any) => {
      console.log("WebSocket cart update received:", data)
      refreshCart()
    }

    websocketService.on("cart_updated", handleCartUpdated)

    return () => {
      websocketService.off("cart_updated", handleCartUpdated)
    }
  }, [refreshCart])

  const value: CartContextType = {
    cart,
    items,
    itemCount,
    subtotal,
    shipping,
    total,
    isLoading,
    isUpdating,
    error,
    validation,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart,
    applyCoupon,
    removeCoupon,
    setShippingAddress,
    setBillingAddress,
    setShippingMethod,
    setPaymentMethod,
    setCartNotes,
    setRequiresShipping,
    validateCart,
    validateCheckout,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Hook to use the cart context
export function useCart() {
  const context = useContext(CartContext)

  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }

  return context
}
