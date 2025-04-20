"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import { cartService, type Cart as CartType, type CartValidation, type CartItem } from "@/services/cart-service"
import { websocketService } from "@/services/websocket"
import { productService } from "@/services/product"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { useRouter } from "next/navigation"

// Re-export the CartItem type so it can be imported from this file
export type { CartItem } from "@/services/cart-service"

// Improve the getLocalCartItems function to better handle cart data persistence
const getLocalCartItems = (): CartItem[] => {
  if (typeof window !== "undefined") {
    try {
      const items = localStorage.getItem("cartItems")
      if (!items) return []

      const parsedItems = JSON.parse(items)

      // Validate the parsed items to ensure they have the required structure
      if (!Array.isArray(parsedItems)) {
        console.warn("Invalid cart items format in localStorage, resetting")
        return []
      }

      // Filter out invalid items
      return parsedItems.filter((item) => {
        if (!item || typeof item !== "object" || !item.product_id) {
          return false
        }
        return true
      })
    } catch (error) {
      console.error("Error parsing cart items from localStorage:", error)
      // If there's an error, clear the corrupted data
      if (typeof window !== "undefined") {
        localStorage.removeItem("cartItems")
      }
      return []
    }
  }
  return []
}

// Improve the saveLocalCartItems function to ensure better persistence
const saveLocalCartItems = (items: CartItem[]): void => {
  if (typeof window !== "undefined") {
    try {
      // Ensure items is an array
      if (!Array.isArray(items)) {
        console.error("Attempted to save non-array items to localStorage")
        return
      }

      // Filter out any items with missing product_id
      const validItems = items.filter((item) => item && typeof item === "object" && item.product_id)

      localStorage.setItem("cartItems", JSON.stringify(validItems))

      // Dispatch a storage event to notify other tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "cartItems",
          newValue: JSON.stringify(validItems),
        }),
      )
    } catch (error) {
      console.error("Error saving cart items to localStorage:", error)
    }
  }
  return
}

interface CartContextType {
  // Cart state
  cart: CartType | null
  items: CartItem[]
  itemCount: number
  subtotal: number
  shipping: number
  total: number
  cartTotal: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void

  // Loading states
  isLoading: boolean
  isUpdating: boolean
  pendingOperations: Map<string, boolean>

  // Error and validation
  error: string | null
  validation: CartValidation | null

  // Cart operations
  addToCart: (
    productId: number,
    quantity: number,
    variantId?: number,
  ) => Promise<{ success: boolean; message: string; isUpdate?: boolean }>
  updateQuantity: (productId: number, quantity: number, variantId?: number) => Promise<boolean>
  removeItem: (productId: number, variantId?: number) => Promise<boolean>
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

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Cart state
  const [cart, setCart] = useState<CartType | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [itemCount, setItemCount] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [shipping, setShipping] = useState(0)
  const [total, setTotal] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [pendingOperations, setPendingOperations] = useState<Map<string, boolean>>(new Map())

  // Error and validation
  const [error, setError] = useState<string | null>(null)
  const [validation, setValidation] = useState<CartValidation | null>(null)

  // Add this after the other state declarations in CartProvider
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Cache for product data to avoid repeated fetches
  const productCache = useRef<Map<number, any>>(new Map())

  // Track pending API requests to prevent duplicates
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())

  const { isAuthenticated, user } = useAuth()
  const { toast, dismiss } = useToast()
  const { soundEnabled, playSound } = useSoundEffects()
  const router = useRouter()

  // Use a ref to track if we're mounted to prevent state updates after unmount
  const isMounted = useRef(false)

  // Debounce timer for cart updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track optimistic updates that are pending server confirmation
  const optimisticUpdates = useRef<Map<string, any>>(new Map())

  // Ref to track if a cart refresh is in progress
  const refreshingRef = useRef(false)

  // Open and close cart functions
  const openCart = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeCart = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Helper to create operation keys for tracking pending operations
  const createOperationKey = (operation: string, productId: number, variantId?: number): string => {
    return `${operation}:${productId}:${variantId || "default"}`
  }

  // Helper to mark an operation as pending
  const markOperationPending = useCallback((key: string, isPending: boolean) => {
    setPendingOperations((prev) => {
      const newMap = new Map(prev)
      if (isPending) {
        newMap.set(key, true)
      } else {
        newMap.delete(key)
      }
      return newMap
    })
  }, [])

  // Helper to check if an operation is pending
  const isOperationPending = useCallback(
    (key: string): boolean => {
      return pendingOperations.has(key)
    },
    [pendingOperations],
  )

  // Replace the updateCartState function with this implementation
  const updateCartState = useCallback(
    async (newItems: CartItem[], newCart?: CartType, skipApiUpdate = false) => {
      // Ensure items is an array
      if (!Array.isArray(newItems)) {
        console.error("updateCartState received non-array items:", newItems)
        newItems = []
      }

      // Validate and enhance each item
      const validItems = newItems.filter((item) => {
        if (!item || typeof item !== "object") {
          console.error("Invalid item in cart:", item)
          return false
        }

        // Ensure required properties exist with valid values
        if (typeof item.quantity !== "number" || item.quantity <= 0) {
          item.quantity = 1
        }

        // Convert string prices to numbers
        if (typeof item.price === "string") {
          item.price = Number.parseFloat(item.price) || 999
        }

        // Ensure price is a valid number greater than zero
        if (typeof item.price !== "number" || isNaN(item.price) || item.price <= 0) {
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
          // Check if we have this product in our cache
          const cachedProduct = productCache.current.get(item.product_id)
          if (cachedProduct) {
            item.product = cachedProduct
          } else {
            item.product = {
              id: item.product_id || 0,
              name: `Product ${item.product_id || "Unknown"}`,
              slug: `product-${item.product_id || "unknown"}`,
              thumbnail_url: "",
              image_urls: [],
            }
          }
        }

        return true
      })

      // Calculate totals
      const newItemCount = validItems.reduce((sum, item) => sum + item.quantity, 0)
      const newSubtotal = validItems.reduce((sum, item) => sum + item.total, 0)
      const newShipping = newCart?.shipping || 0
      const newTotal = newCart?.total || newSubtotal + newShipping

      // If we have a cart object from the backend, use its values
      if (newCart) {
        setCart(newCart)
        setSubtotal(newCart.subtotal)
        setShipping(newCart.shipping || 0)
        setTotal(newTotal)
      } else {
        // Otherwise calculate locally
        setItemCount(newItemCount)
        setSubtotal(newSubtotal)
        setShipping(newShipping)
        setTotal(newTotal)
      }

      // Update items state
      setItems(validItems)
      setLastUpdated(new Date())

      // Also update localStorage for faster access, but only store the valid items
      if (!isAuthenticated) {
        saveLocalCartItems(validItems)
      }

      // Dispatch cart-updated event to notify other components
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: validItems.length,
              total: newCart?.total || newTotal,
              skipApiUpdate,
            },
          }),
        )
      }

      // Fetch product data for items that need it, but don't block the UI update
      if (!skipApiUpdate) {
        enhanceCartItemsWithProductData(validItems).catch((err) =>
          console.error("Failed to enhance cart items with product data:", err),
        )
      }
    },
    [isAuthenticated],
  )

  // Improve the enhanceCartItemsWithProductData function to handle errors better
  // and reduce unnecessary API calls

  // Add this helper function to the CartProvider component
  const enhanceCartItemsWithProductData = async (cartItems: CartItem[]): Promise<CartItem[]> => {
    if (!cartItems || cartItems.length === 0) return cartItems

    // Find items that need product data
    const itemsNeedingData = cartItems.filter(
      (item) => !item.product || !item.product.name || item.product.name.includes("Product "),
    )

    if (itemsNeedingData.length === 0) return cartItems

    try {
      // Log how many items need data
      console.log(`Some cart items need product data, fetching... ${itemsNeedingData.length}`)

      // Extract all product IDs from items needing data
      const productIds = itemsNeedingData.map((item) => item.product_id)

      // Get product data using the improved getProductsForCartItems method
      const productMap = await productService.getProductsForCartItems(productIds)

      // Update cart items with the fetched product data
      const enhancedItems = cartItems.map((item) => {
        const product = productMap[item.product_id]
        if (product && (!item.product || !item.product.name || item.product.name.includes("Product "))) {
          return {
            ...item,
            product: product,
          }
        }
        return item
      })

      // Update the state with enhanced items, but don't trigger another API update
      if (isMounted.current) {
        updateCartState(enhancedItems, cart || undefined, true)
      }

      return enhancedItems
    } catch (error) {
      console.error("Error enhancing cart items with product data:", error)
      return cartItems
    }
  }

  // Modify the fetchCart function to ensure product data is properly loaded
  const fetchCart = useCallback(
    async (force = false) => {
      if (!isMounted.current) return

      // Don't fetch if we're already loading and it's not forced
      if (isLoading && !force) return

      // Create a request key for deduplication
      const requestKey = "fetch-cart"

      // If there's already a pending request, wait for it instead of creating a new one
      if (pendingRequests.current.has(requestKey) && !force) {
        try {
          await pendingRequests.current.get(requestKey)
          return
        } catch (error) {
          console.error("Error waiting for pending cart request:", error)
          // Continue with a new request
        }
      }

      setIsLoading(true)
      setError(null)

      try {
        // For authenticated users, try to get cart from backend
        if (isAuthenticated) {
          console.log("Fetching cart for authenticated user...")

          // Create the promise for this request
          const fetchPromise = cartService
            .getCart()
            .then(async (response) => {
              if (!isMounted.current) return

              if (response?.success === false) {
                console.error("API returned an error:", response.errors)
                setError(response.errors?.[0]?.message || "Failed to load cart.")

                // If API fails, try to use localStorage as fallback
                const localCartItems = getLocalCartItems()
                if (localCartItems.length > 0) {
                  updateCartState(localCartItems)
                }
                return
              }

              // Check if we actually have cart items
              if (response.items && response.items.length > 0) {
                setCart(response.cart)
                const cartItems = response.items || []

                // Update product cache with any products in the cart
                cartItems.forEach((item) => {
                  if (item.product && item.product.id && item.product_id !== null && item.product_id !== undefined) {
                    productCache.current.set(item.product_id, item.product)
                  }
                })

                // Update cart with items from response
                updateCartState(cartItems, response.cart)

                if (response.validation) {
                  setValidation(response.validation)
                }

                // Also save to localStorage for persistence
                saveLocalCartItems(cartItems)
              } else {
                // If cart is empty from backend, check localStorage as fallback
                const localCartItems = getLocalCartItems()
                if (localCartItems.length > 0) {
                  updateCartState(localCartItems)

                  // Try to sync local cart with server
                  for (const item of localCartItems) {
                    if (item.product_id !== null && item.product_id !== undefined) {
                      // Use await to handle each addition sequentially
                      try {
                        await cartService.addToCart(item.product_id, item.quantity, item.variant_id || undefined)
                      } catch (err) {
                        console.warn("Failed to sync local cart item to server:", err)
                      }
                    }
                  }

                  // Refresh after syncing
                  setTimeout(() => {
                    fetchCart(true).catch((err) => {
                      console.warn("Failed to refresh cart after sync:", err)
                    })
                  }, 500)
                } else {
                  // Truly empty cart
                  updateCartState([])
                }
              }

              return response
            })
            .catch((error) => {
              if (!isMounted.current) return

              console.error("Error fetching cart:", error)

              // If it's an authentication error, use localStorage as fallback
              if (error?.response?.status === 401) {
                const localCartItems = getLocalCartItems()
                updateCartState(localCartItems)
              } else {
                // For other errors, also try localStorage
                const localCartItems = getLocalCartItems()
                if (localCartItems.length > 0) {
                  updateCartState(localCartItems)
                } else {
                  setError("Failed to load cart. Please try again.")
                }
              }

              throw error
            })
            .finally(() => {
              if (isMounted.current) {
                setIsLoading(false)
              }
              pendingRequests.current.delete(requestKey)
            })

          // Store the promise
          pendingRequests.current.set(requestKey, fetchPromise)

          // Wait for the request to complete
          await fetchPromise
        } else {
          // If not authenticated, use localStorage
          const localCartItems = getLocalCartItems()
          updateCartState(localCartItems)
          setIsLoading(false)
        }
      } catch (error) {
        // Error already handled in the promise chain
        console.error("Final error handler:", error)
        setIsLoading(false)
      }
    },
    [isAuthenticated, updateCartState, isLoading],
  )

  // Add this effect to ensure product data is always loaded when the cart changes
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && items.length > 0) {
      // Check if any items need product data
      const itemsNeedingData = items.filter(
        (item) =>
          !item.product || !item.product.name || item.product.name.includes("Product ") || !item.product.thumbnail_url,
      )

      if (itemsNeedingData.length > 0) {
        console.log("Some cart items need product data, fetching...", itemsNeedingData.length)
        enhanceCartItemsWithProductData(items).catch((err) =>
          console.error("Failed to enhance cart items with product data:", err),
        )
      }
    }
  }, [items, mounted])

  // Refresh cart on auth state change
  const { isLoading: authLoading } = useAuth()
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchCart()
    }
  }, [isAuthenticated, authLoading, fetchCart])

  // Refresh cart with debounce to prevent too many requests
  const refreshCart = useCallback(async () => {
    // If there's already a refresh in progress, return the existing promise
    if (refreshingRef.current) {
      console.log("Cart refresh already in progress, waiting for it to complete...")
      return new Promise<void>((resolve) => {
        const checkRefresh = () => {
          if (!refreshingRef.current) {
            resolve()
          } else {
            setTimeout(checkRefresh, 100)
          }
        }
        checkRefresh()
      })
    }

    // Set refreshing flag
    refreshingRef.current = true

    return new Promise<void>((resolve, reject) => {
      // Use a debounce to prevent too many requests
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(async () => {
        try {
          await fetchCart(true)
          resolve()
        } catch (error) {
          console.error("Error refreshing cart:", error)
          reject(error)
        } finally {
          refreshingRef.current = false
          debounceTimerRef.current = null
        }
      }, 300)
    })
  }, [fetchCart])

  // Modify the addToCart function to ensure cart persistence
  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number) => {
      // Validate productId is a number and not null
      if (typeof productId !== "number") {
        console.error("Invalid product ID:", productId)
        return { success: false, message: "Invalid product ID" }
      }

      // Create an operation key to track this specific operation
      const operationKey = createOperationKey("add", productId, variantId)

      // If this operation is already pending, don't start another one
      if (isOperationPending(operationKey)) {
        return { success: false, message: "Operation already in progress" }
      }

      try {
        markOperationPending(operationKey, true)
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
            saveLocalCartItems(updatedItems) // Ensure we save to localStorage

            // Play sound effect
            playSound()

            // Try to get product details from cache
            const product = productCache.current.get(productId) || {
              id: productId,
              name: `Product ${productId}`,
              slug: `product-${productId}`,
              thumbnail_url: "",
              image_urls: [],
            }

            // Trigger cart update event
            const productDetails = product || {
              id: productId,
              name: `Product ${productId}`,
              thumbnail_url: "",
              price: 0,
            }
            document.dispatchEvent(
              new CustomEvent("cart-updated", {
                detail: {
                  count: updatedItems.length,
                  total: updatedItems.reduce((sum, item) => sum + item.total, 0),
                  message: "Item quantity has been updated in your cart",
                  product: {
                    id: productId,
                    name: productDetails.name,
                    thumbnail_url: productDetails.thumbnail_url || "",
                    price: productDetails.price || 0,
                    quantity: quantity,
                    variant_id: variantId,
                    total: (productDetails.price || 0) * quantity,
                  },
                  isUpdate: true,
                  timestamp: new Date().toISOString(),
                },
              }),
            )

            return { success: true, message: "Product quantity updated", isUpdate: true }
          } else {
            // Try to get product details from cache
            const product = productCache.current.get(productId) || {
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
              price: product.price || 0,
              total: (product.price || 0) * quantity,
              product: product,
            }

            const updatedItems = [...localCartItems, newItem]
            updateCartState(updatedItems)
            saveLocalCartItems(updatedItems) // Ensure we save to localStorage

            // Play sound effect
            playSound()

            // Trigger cart update event
            document.dispatchEvent(
              new CustomEvent("cart-updated", {
                detail: {
                  count: updatedItems.length,
                  total: updatedItems.reduce((sum, item) => sum + item.total, 0),
                  message: "Product has been added to your cart",
                  product: {
                    id: productId,
                    name: product.name || `Product ${productId}`,
                    thumbnail_url: product.thumbnail_url || "",
                    image_urls: product.image_urls || [],
                    price: product.price || 0,
                    quantity: quantity,
                    variant_id: variantId,
                    total: (product.price || 0) * quantity,
                    // Include additional product details if available
                    description: product.description || "",
                    sku: product.sku || "",
                    brand: product.brand || "",
                    category: product.category || "",
                  },
                  isUpdate: false,
                  timestamp: new Date().toISOString(),
                },
              }),
            )

            return { success: true, message: "Product added to cart", isUpdate: false }
          }
        }

        // For authenticated users, apply optimistic update first
        const currentItems = [...items]
        const existingItemIndex = currentItems.findIndex(
          (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        const isUpdate = existingItemIndex >= 0
        const optimisticItems = [...currentItems]

        if (isUpdate) {
          // Update quantity if item exists
          optimisticItems[existingItemIndex] = {
            ...optimisticItems[existingItemIndex],
            quantity: optimisticItems[existingItemIndex].quantity + quantity,
            total: optimisticItems[existingItemIndex].price * (optimisticItems[existingItemIndex].quantity + quantity),
          }

          // Check stock limits before optimistic update
          if (
            optimisticItems[existingItemIndex].product?.stock !== undefined &&
            optimisticItems[existingItemIndex].quantity > optimisticItems[existingItemIndex].product.stock
          ) {
            return {
              success: false,
              message: `Cannot add more items. Stock limit of ${optimisticItems[existingItemIndex].product.stock} reached.`,
            }
          }
        } else {
          // Try to get product details from cache
          let product = productCache.current.get(productId)

          // If not in cache, try to fetch it quickly
          if (!product) {
            try {
              const products = await productService.getProductsByIds([productId])
              product = products[0] // Assuming the first product matches the productId
              if (product) {
                productCache.current.set(productId, product)
              }
            } catch (err) {
              console.warn("Could not fetch product details for optimistic update:", err)
              product = {
                id: productId,
                name: `Product ${productId}`,
                slug: `product-${productId}`,
                thumbnail_url: "",
                image_urls: [],
              }
            }
          }

          // Check stock limits before optimistic update
          if (product.stock !== undefined && quantity > product.stock) {
            toast({
              title: "Stock Limit Reached",
              description: `Only ${product.stock} items available in stock.`,
              variant: "destructive",
            })
            return {
              success: false,
              message: `Cannot add more items. Stock limit of ${product.stock} reached.`,
            }
          }

          // Add new item
          const newItem = {
            id: Date.now(), // Temporary ID until server responds
            product_id: productId,
            variant_id: variantId,
            quantity: quantity,
            price: product.price || 0,
            total: (product.price || 0) * quantity,
            product: product,
          }

          optimisticItems.push(newItem)
        }

        // Apply optimistic update
        updateCartState(optimisticItems, undefined, true)
        saveLocalCartItems(optimisticItems) // Ensure we save to localStorage

        // Store this optimistic update
        optimisticUpdates.current.set(operationKey, {
          previousItems: currentItems,
          newItems: optimisticItems,
        })

        // Play sound effect
        playSound()

        // Now make the actual API call
        const response = await cartService.addToCart(productId, quantity, variantId)

        if (response.success) {
          // Remove this optimistic update since it's confirmed
          optimisticUpdates.current.delete(operationKey)

          // Track the event with WebSocket
          try {
            await websocketService.trackAddToCart(productId, quantity, user?.id?.toString())
          } catch (wsError) {
            console.warn("WebSocket tracking failed, but cart was updated:", wsError)
          }

          // Find the product that was added to cart
          const addedProduct = response.items.find(
            (item) => item.product_id !== null && item.product_id !== undefined && item.product_id === productId,
          )
          const productName = addedProduct?.product?.name || "Product"
          const productImage = addedProduct?.product?.image_urls?.[0] || null
          const productPrice = addedProduct?.price ? `${addedProduct.price.toFixed(2)}` : null

          // Dispatch event with enhanced product details for the notification component
          document.dispatchEvent(
            new CustomEvent("cart-updated", {
              detail: {
                count: response.items.length,
                total: response.cart?.total || 0,
                message: isUpdate
                  ? "Item quantity has been updated in your cart"
                  : "Product has been added to your cart",
                product: {
                  id: productId,
                  name: productName,
                  thumbnail_url: productImage,
                  image_urls: addedProduct?.product?.image_urls || [],
                  price: productPrice,
                  quantity: quantity,
                  variant_id: variantId,
                  total: addedProduct?.total || (addedProduct?.price || 0) * quantity,
                  // Include additional product details if available
                  description: addedProduct?.product?.description || "",
                  sku: addedProduct?.product?.sku || "",
                  // Removed brand property as it does not exist on the product type
                  category: addedProduct?.product?.category || "",
                },
                isUpdate,
                timestamp: new Date().toISOString(),
              },
            }),
          )

          // Update cart state with the confirmed items from server
          updateCartState(response.items, response.cart)
          saveLocalCartItems(response.items) // Ensure we save to localStorage

          return {
            success: true,
            message: isUpdate ? "Product quantity updated" : "Product added to cart",
            isUpdate,
          }
        }

        // If the API call failed, revert the optimistic update
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          updateCartState(previousState.previousItems, undefined, true)
          saveLocalCartItems(previousState.previousItems) // Ensure we save to localStorage
          optimisticUpdates.current.delete(operationKey)
        }

        return { success: false, message: "Failed to update cart" }
      } catch (error: unknown) {
        console.error("Error adding to cart:", error)

        // Revert optimistic update if there was an error
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          updateCartState(previousState.previousItems, undefined, true)
          saveLocalCartItems(previousState.previousItems) // Ensure we save to localStorage
          optimisticUpdates.current.delete(operationKey)
        }

        // Type guard for error object
        const errorResponse = error as {
          response?: {
            data?: {
              errors?: Array<{ code: string; message: string; available_stock?: number }>
              error?: string
            }
          }
        }

        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors

          // Check for stock-related errors
          const stockError = errors.find((e) => e.code === "out_of_stock" || e.code === "insufficient_stock")

          if (stockError) {
            // Show a more user-friendly message for stock issues
            toast({
              title: stockError.code === "out_of_stock" ? "Out of Stock" : "Insufficient Stock",
              description: stockError.message || "There's an issue with the product stock",
              variant: "destructive",
            })

            // If we have product data, update it with the correct stock information
            if (stockError.available_stock !== undefined && productCache.current.has(productId)) {
              const cachedProduct = productCache.current.get(productId)
              if (cachedProduct) {
                cachedProduct.stock = stockError.available_stock
              }
            }
          } else {
            toast({
              title: "Error",
              description: errors[0]?.message || "Failed to add item to cart. Please try again.",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Error",
            description: errorResponse.response?.data?.error || "Failed to add item to cart. Please try again.",
            variant: "destructive",
          })
        }

        return { success: false, message: "An error occurred while adding to cart" }
      } finally {
        markOperationPending(operationKey, false)
      }
    },
    [updateCartState, user, isAuthenticated, playSound, items, isOperationPending, markOperationPending, toast],
  )

  // Modify the removeItem function to ensure cart persistence
  const removeItem = useCallback(
    async (productId: number, variantId?: number): Promise<boolean> => {
      // Make sure productId is a number and not null
      if (typeof productId !== "number") {
        console.error("Invalid product ID:", productId)
        return false
      }

      // Find the item in the current cart
      const itemToRemove = items.find(
        (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
      )

      if (!itemToRemove) {
        console.warn("Attempted to remove item that doesn't exist in cart:", productId, variantId)
        return false
      }

      const itemId = itemToRemove.id

      // Create an operation key to track this specific operation
      const operationKey = createOperationKey("remove", productId, variantId)

      // If this operation is already pending, don't start another one
      if (isOperationPending(operationKey)) {
        return false
      }

      try {
        markOperationPending(operationKey, true)
        setError(null)

        // Apply optimistic update
        const currentItems = [...items]
        const optimisticItems = currentItems.filter(
          (item) => !(item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id)),
        )

        // Store this optimistic update
        optimisticUpdates.current.set(operationKey, {
          previousItems: currentItems,
          newItems: optimisticItems,
          removedItem: itemToRemove,
        })

        // Apply optimistic update
        updateCartState(optimisticItems, undefined, true)
        saveLocalCartItems(optimisticItems) // Ensure we save to localStorage

        // Play sound effect
        playSound()

        // Make the actual API call
        const response = await cartService.removeItem(itemId)

        if (response.success) {
          // Remove this optimistic update since it's confirmed
          optimisticUpdates.current.delete(operationKey)

          // Update cart state with the confirmed items from server
          updateCartState(response.items, response.cart)
          saveLocalCartItems(response.items) // Ensure we save to localStorage

          toast({
            title: "Item Removed",
            description: "The item has been removed from your cart",
            variant: "default",
          })

          return true
        }

        // If the API call failed, revert the optimistic update
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          updateCartState(previousState.previousItems, undefined, true)
          saveLocalCartItems(previousState.previousItems) // Ensure we save to localStorage
          optimisticUpdates.current.delete(operationKey)
        }

        return false
      } catch (error: any) {
        console.error("Error removing from cart:", error)

        // Revert optimistic update if there was an error
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          updateCartState(previousState.previousItems, undefined, true)
          saveLocalCartItems(previousState.previousItems) // Ensure we save to localStorage
          optimisticUpdates.current.delete(operationKey)
        }

        toast({
          title: "Error",
          description: error.response?.data?.error || "Failed to remove item from cart",
          variant: "destructive",
        })

        return false
      } finally {
        markOperationPending(operationKey, false)
      }
    },
    [updateCartState, playSound, toast, items, isOperationPending, markOperationPending],
  )

  // Modify the updateQuantity function to ensure cart persistence
  const updateQuantity = useCallback(
    async (productId: number, quantity: number, variantId?: number): Promise<boolean> => {
      // Make sure productId is a number and not null
      if (typeof productId !== "number") {
        console.error("Invalid product ID:", productId)
        return false
      }

      // Find the item in the current cart
      const itemToUpdate = items.find(
        (item) => item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id),
      )

      if (!itemToUpdate) {
        console.warn("Attempted to update item that doesn't exist in cart:", productId, variantId)
        return false
      }

      const itemId = itemToUpdate.id

      // Create an operation key to track this specific operation
      const operationKey = createOperationKey("update", productId, variantId)

      // If this operation is already pending, don't start another one
      if (isOperationPending(operationKey)) {
        return false
      }

      try {
        markOperationPending(operationKey, true)
        setError(null)

        // Apply optimistic update
        const currentItems = [...items]
        const optimisticItems = currentItems.map((item) => {
          if (item.product_id === productId && (variantId ? item.variant_id === variantId : !item.variant_id)) {
            return {
              ...item,
              quantity,
              total: item.price * quantity,
            }
          }
          return item
        })

        // Store this optimistic update
        optimisticUpdates.current.set(operationKey, {
          previousItems: currentItems,
          newItems: optimisticItems,
          previousQuantity: itemToUpdate.quantity,
          newQuantity: quantity,
        })

        // Apply optimistic update
        updateCartState(optimisticItems, undefined, true)
        saveLocalCartItems(optimisticItems) // Ensure we save to localStorage

        // Play sound effect
        playSound()

        // Make the actual API call
        const response = await cartService.updateQuantity(itemId, quantity)

        if (response.success) {
          // Remove this optimistic update since it's confirmed
          optimisticUpdates.current.delete(operationKey)

          // Update cart state with the confirmed items from server
          updateCartState(response.items, response.cart)
          saveLocalCartItems(response.items) // Ensure we save to localStorage

          return true
        }

        // If the API call failed, revert the optimistic update
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          updateCartState(previousState.previousItems, undefined, true)
          saveLocalCartItems(previousState.previousItems) // Ensure we save to localStorage
          optimisticUpdates.current.delete(operationKey)
        }

        return false
      } catch (error: unknown) {
        console.error("Error updating cart:", error)

        // Revert optimistic update if there was an error
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          updateCartState(previousState.previousItems, undefined, true)
          saveLocalCartItems(previousState.previousItems) // Ensure we save to localStorage
          optimisticUpdates.current.delete(operationKey)
        }

        // Extract validation errors if available
        const errorResponse = error as {
          response?: {
            data?: { errors?: Array<{ code: string; message: string; available_stock?: number }>; error?: string }
          }
        }

        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors
          const stockError = errors.find((e) => e.code === "out_of_stock" || e.code === "insufficient_stock")

          if (stockError) {
            // Update product stock information in cache if available
            if (stockError.available_stock !== undefined && productCache.current.has(productId)) {
              const cachedProduct = productCache.current.get(productId)
              if (cachedProduct) {
                cachedProduct.stock = stockError.available_stock
              }
            }

            toast({
              title: stockError.code === "out_of_stock" ? "Out of Stock" : "Insufficient Stock",
              description: stockError.message || "There's an issue with the product stock",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Error",
              description: errors[0]?.message || "Failed to update item quantity. Please try again.",
              variant: "destructive",
            })
          }
        } else {
          toast({
            title: "Error",
            description: errorResponse.response?.data?.error || "Failed to update item quantity",
            variant: "destructive",
          })
        }

        return false
      } finally {
        markOperationPending(operationKey, false)
      }
    },
    [updateCartState, playSound, toast, items, isOperationPending, markOperationPending],
  )

  // Modify the clearCart function to ensure cart persistence
  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      setIsUpdating(true)
      setError(null)

      const response = await cartService.clearCart()

      if (response.success) {
        updateCartState([], response.cart)
        saveLocalCartItems([]) // Clear localStorage cart as well
        return true
      }
      return false
    } catch (error: any) {
      console.error("Error clearing cart:", error)

      // Even if API fails, clear local cart
      saveLocalCartItems([])
      updateCartState([])

      return true
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

    // Define a function to initialize the cart
    const initializeCart = async () => {
      try {
        // Always try to load from localStorage first for immediate display
        const localCartItems = getLocalCartItems()

        // If we have local items, show them immediately while we fetch from server
        if (localCartItems.length > 0) {
          updateCartState(localCartItems, undefined, true)
        }

        // Then fetch from server (for authenticated users)
      } finally {
        setIsLoading(false)
      }
    }

    initializeCart()

    return () => {
      isMounted.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [isAuthenticated, authLoading, fetchCart, updateCartState])

  const value = {
    cart,
    items,
    itemCount,
    subtotal,
    shipping,
    total,
    cartTotal: total,
    isOpen,
    openCart,
    closeCart,
    isLoading,
    isUpdating,
    pendingOperations,
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

export const useCart = (): CartContextType => {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }

  return context
}
