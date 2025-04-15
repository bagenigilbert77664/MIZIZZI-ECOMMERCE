"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cartService, type Cart as CartType, type CartValidation, type CartItem } from "@/services/cart-service"
import { websocketService } from "@/services/websocket"
import { productService } from "@/services/product"

// Re-export the CartItem type so it can be imported from this file
export type { CartItem } from "@/services/cart-service"

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
  cart: CartType | null
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
  const [cart, setCart] = useState<CartType | null>(null)
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

  // Debounce timer for cart updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Replace the updateCartState function with this implementation
  const updateCartState = useCallback(
    (newItems: CartItem[], newCart?: CartType) => {
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

      // If we have a cart object from the backend, use its values
      if (newCart) {
        setCart(newCart)
        setSubtotal(newCart.subtotal)
        setShipping(newCart.shipping || 0)
        setTotal(newCart.total)
      } else {
        // Otherwise calculate locally
        const newItemCount = validItems.reduce((sum, item) => sum + item.quantity, 0)
        const newSubtotal = validItems.reduce((sum, item) => sum + item.total, 0)
        const newShipping = 0 // Default to 0 when no cart is available
        const newTotal = newSubtotal + newShipping

        setItemCount(newItemCount)
        setSubtotal(newSubtotal)
        setShipping(newShipping)
        setTotal(newTotal)
      }

      // Update items state
      setItems(validItems)
      setLastUpdated(new Date())

      // Also update localStorage for faster access
      if (!isAuthenticated) {
        saveLocalCartItems(validItems)
      }

      // Dispatch cart-updated event to notify other components
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: { count: validItems.length, total: newCart?.total || total },
          }),
        )
      }
    },
    [isAuthenticated, total],
  )

  // Add this new function to batch fetch product data
  const fetchProductDataForCartItems = async (cartItems: any[]) => {
    if (!cartItems || cartItems.length === 0) return cartItems

    try {
      // Extract all product IDs from cart items
      const productIds = cartItems.map((item) => item.product_id)

      // Batch fetch all products
      const productMap = await productService.getProductsForCartItems(productIds)

      // Update cart items with product data
      return cartItems.map((item) => {
        if (!item.product || !item.product.name) {
          const productData = productMap[item.product_id]
          if (productData) {
            item.product = productData
          } else {
            // Fallback for any products still missing
            item.product = {
              id: item.product_id,
              name: "Product Unavailable",
              slug: `product-${item.product_id}`,
              thumbnail_url: "/empty-shelf-sadness.png",
              image_urls: ["/empty-shelf-sadness.png"],
              stock: 0,
            }
          }
        }
        return item
      })
    } catch (error) {
      console.error("Error batch fetching product data for cart items:", error)
      return cartItems
    }
  }

  // Fetch cart data from API
  const fetchCart = useCallback(async () => {
    if (!isMounted.current) return

    setIsLoading(true)
    setError(null)

    try {
      if (!isAuthenticated) {
        // If not authenticated, use localStorage
        const localCartItems = getLocalCartItems()
        updateCartState(localCartItems)
        setIsLoading(false)
        return
      }

      const response = await cartService.getCart()

      if (!isMounted.current) return

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
      let cartItems = response.items

      cartItems = await fetchProductDataForCartItems(cartItems)

      updateCartState(cartItems, response.cart)

      if (response.validation) {
        setValidation(response.validation)
      }
    } catch (error: any) {
      if (!isMounted.current) return

      console.error("Error fetching cart:", error)

      // If it's an authentication error, use localStorage as fallback
      if ((error as any)?.response?.status === 401) {
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
      if (isMounted.current) {
        setIsLoading(false)
      }
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

  // Enhance the addToCart function to handle duplicates better
  // Find the addToCart function and replace it with this enhanced version

  // Add item to cart
  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number) => {
      try {
        setIsUpdating(true)
        setError(null)

        // Check if user is authenticated
        if (!isAuthenticated) {
          // For unauthenticated users, handle cart locally
          const localCartItems = getLocalCartItems()

          // Check if item already exists in cart
          const existingItemIndex = localCartItems.findIndex(
            (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
          )

          if (existingItemIndex >= 0) {
            // Update quantity if item exists
            const updatedItems = [...localCartItems]
            updatedItems[existingItemIndex].quantity += quantity
            updateCartState(updatedItems)

            // Show success message
            toast({
              title: "Cart updated",
              description: `Item quantity has been updated in your cart.`,
              variant: "default",
            })

            // Trigger cart update event
            // For unauthenticated users
            document.dispatchEvent(
              new CustomEvent("cart-updated", {
                detail: {
                  count: updatedItems.length,
                  message:
                    existingItemIndex >= 0
                      ? "Item quantity has been updated in your cart"
                      : "Product has been added to your cart",
                },
              }),
            )

            return { success: true, message: "Product quantity updated", isUpdate: true }
          } else {
            // Find product details from available products
            // This is a simplified approach - in a real app, you might want to fetch the product details
            const product = {
              id: productId,
              name: `Product ${productId}`,
              slug: `product-${productId}`,
              thumbnail_url: "",
              image_urls: [],
            }

            // Add new item
            const newItem = {
              id: Date.now(), // Generate a temporary ID
              product_id: productId,
              variant_id: variantId,
              quantity: quantity,
              price: 0, // This would be set properly in a real implementation
              total: 0, // This would be set properly in a real implementation
              product: product,
            }

            const updatedItems = [...localCartItems, newItem]
            updateCartState(updatedItems)

            // Show success message
            toast({
              title: "Added to cart",
              description: `Product has been added to your cart.`,
              variant: "default",
            })

            // Trigger cart update event
            // For unauthenticated users
            document.dispatchEvent(
              new CustomEvent("cart-updated", {
                detail: {
                  count: updatedItems.length,
                  message:
                    existingItemIndex >= 0
                      ? "Item quantity has been updated in your cart"
                      : "Product has been added to your cart",
                },
              }),
            )

            return { success: true, message: "Product added to cart", isUpdate: false }
          }
        }

        // For authenticated users, proceed with API call
        const response = await cartService.addToCart(productId, quantity, variantId)

        if (response.success) {
          // Update local state
          updateCartState(response.items, response.cart)

          // Track the event with WebSocket
          try {
            await websocketService.trackAddToCart(productId, quantity, user?.id?.toString())
          } catch (wsError) {
            console.warn("WebSocket tracking failed, but cart was updated:", wsError)
          }

          // Trigger a cart update event
          // For authenticated users (in the API call success section)
          document.dispatchEvent(
            new CustomEvent("cart-updated", {
              detail: {
                count: response.items.length,
                total: response.cart?.total || 0,
                message: "Product added to cart successfully",
              },
            }),
          )

          return { success: true, message: "Product added to cart", isUpdate: false }
        }

        return { success: false, message: "Failed to update cart" }
      } catch (error) {
        console.error("Error adding to cart:", error)

        // If error is due to authentication, fall back to local cart
        if ((error as any)?.response?.status === 401) {
          return addToCart(productId, quantity, variantId)
        }

        return { success: false, message: "An error occurred while adding to cart" }
      } finally {
        setIsUpdating(false)
      }
    },
    [updateCartState, user, isAuthenticated, toast],
  )

  // Replace the removeItem function with this implementation
  const removeItem = useCallback(
    async (itemId: number): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        const response = await cartService.removeItem(itemId)

        if (response.success) {
          updateCartState(response.items, response.cart)
          return true
        }
        return false
      } catch (error: any) {
        console.error("Error removing from cart:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [updateCartState],
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

        if (response.success) {
          updateCartState(response.items, response.cart)
          return true
        }
        return false
      } catch (error: any) {
        console.error("Error updating cart:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [removeItem, updateCartState],
  )

  // Clear cart
  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.clearCart()

      if (response.success) {
        updateCartState([], response.cart)
        return true
      }
      return false
    } catch (error: any) {
      console.error("Error clearing cart:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [updateCartState])

  // Apply coupon
  const applyCoupon = useCallback(
    async (couponCode: string): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        const response = await cartService.applyCoupon(couponCode)

        if (response.success) {
          updateCartState(response.items, response.cart)

          toast({
            title: "Coupon Applied",
            description: "Your coupon has been applied successfully",
          })

          return true
        }
        return false
      } catch (error: any) {
        console.error("Error applying coupon:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [toast, updateCartState],
  )

  // Remove coupon
  const removeCoupon = useCallback(async (): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.removeCoupon()

      if (response.success) {
        updateCartState(response.items, response.cart)

        toast({
          title: "Coupon Removed",
          description: "Your coupon has been removed",
        })

        return true
      }
      return false
    } catch (error: any) {
      console.error("Error removing coupon:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [toast, updateCartState])

  // Set shipping address
  const setShippingAddress = useCallback(async (addressId: number): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setShippingAddress(addressId)

      if (response.success) {
        setCart(response.cart)
        return true
      }
      return false
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

      if (response.success) {
        setCart(response.cart)
        return true
      }
      return false
    } catch (error: any) {
      console.error("Error setting billing address:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Set shipping method
  const setShippingMethod = useCallback(
    async (shippingMethodId: number): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        const response = await cartService.setShippingMethod(shippingMethodId)

        if (response.success) {
          updateCartState(response.items, response.cart)
          return true
        }
        return false
      } catch (error: any) {
        console.error("Error setting shipping method:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [updateCartState],
  )

  // Set payment method
  const setPaymentMethod = useCallback(async (paymentMethodId: number): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.setPaymentMethod(paymentMethodId)

      if (response.success) {
        setCart(response.cart)
        return true
      }
      return false
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

      if (response.success) {
        setCart(response.cart)
        return true
      }
      return false
    } catch (error: any) {
      console.error("Error setting cart notes:", error)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Set requires shipping
  const setRequiresShipping = useCallback(
    async (requiresShipping: boolean): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        const response = await cartService.setRequiresShipping(requiresShipping)

        if (response.success) {
          updateCartState(response.items, response.cart)
          return true
        }
        return false
      } catch (error: any) {
        console.error("Error setting requires shipping flag:", error)
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [updateCartState],
  )

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

  // Initialize cart on mount and when auth state changes
  useEffect(() => {
    isMounted.current = true
    fetchCart()

    return () => {
      isMounted.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [fetchCart, isAuthenticated])

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
