"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { toast } from "@/components/ui/use-toast"
import { cartService, type Cart as CartType, type CartValidation, type CartItem } from "@/services/cart-service"
import { websocketService } from "@/services/websocket"
import { productService } from "@/services/product"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { useRouter } from "next/navigation"
import { inventoryService } from "@/services/inventory-service"

// Re-export the CartItem type so it can be imported from this file
export type { CartItem } from "@/services/cart-service"

// Flag to prevent infinite recursion with localStorage events
const isUpdatingStorage = { current: false }

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
        localStorage.removeItem("cartItems")
        return []
      }

      // Filter out invalid items and ensure proper structure
      return parsedItems.filter((item) => {
        if (!item || typeof item !== "object" || !item.product_id) {
          return false
        }

        // Ensure required numeric fields
        if (typeof item.quantity !== "number" || item.quantity <= 0) {
          item.quantity = 1
        }

        if (typeof item.price !== "number" || item.price < 0) {
          item.price = 0
        }

        // Calculate total if missing
        if (typeof item.total !== "number") {
          item.total = item.price * item.quantity
        }

        return true
      })
    } catch (error) {
      console.error("Error parsing cart items from localStorage:", error)
      // If there's an error, clear the corrupted data
      localStorage.removeItem("cartItems")
      return []
    }
  }
  return []
}

// Improve the saveLocalCartItems function to ensure better persistence
const saveLocalCartItems = (items: CartItem[]): void => {
  if (typeof window !== "undefined" && !isUpdatingStorage.current) {
    try {
      // Set flag to prevent infinite recursion
      isUpdatingStorage.current = true

      // Ensure items is an array
      if (!Array.isArray(items)) {
        console.error("Attempted to save non-array items to localStorage")
        return
      }

      // Filter out any items with missing product_id and validate structure
      const validItems = items.filter((item) => {
        return (
          item &&
          typeof item === "object" &&
          item.product_id &&
          typeof item.product_id === "number" &&
          typeof item.quantity === "number" &&
          item.quantity > 0
        )
      })

      localStorage.setItem("cartItems", JSON.stringify(validItems))

      // We don't need to dispatch a storage event manually anymore
      // as setting localStorage already triggers one naturally
    } catch (error) {
      console.error("Error saving cart items to localStorage:", error)
    } finally {
      // Reset flag after a short delay to allow event processing
      setTimeout(() => {
        isUpdatingStorage.current = false
      }, 0)
    }
  }
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

  // Checkout operations
  completeCheckout: (orderId: string) => Promise<boolean>
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

  // Track last update time
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Cache for product data to avoid repeated fetches
  const productCache = useRef<Map<number, any>>(new Map())

  // Track pending API requests to prevent duplicates
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map())

  const { isAuthenticated, user } = useAuth()
  const { playSound } = useSoundEffects()
  const router = useRouter()

  // Use a ref to track if we're mounted to prevent state updates after unmount
  const isMounted = useRef(false)

  // Debounce timer for cart updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Track optimistic updates that are pending server confirmation
  const optimisticUpdates = useRef<Map<string, any>>(new Map())

  // Ref to track if a cart refresh is in progress
  const refreshingRef = useRef(false)

  // Track items being enhanced to prevent duplicate requests
  const enhancementInProgress = useRef<Set<number>>(new Set())

  // Flag to prevent storage event handling during our own updates
  const ignoreStorageEvents = useRef(false)

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

  // Helper function to normalize product data for CartItem
  const normalizeProductForCart = useCallback((product: any): CartItem["product"] => {
    if (!product) {
      return {
        id: 0,
        name: "Unknown Product",
        slug: "unknown-product",
        thumbnail_url: "/placeholder.svg",
        image_urls: ["/placeholder.svg"],
        price: 0,
        sale_price: null,
      }
    }

    return {
      id: typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id,
      name: product.name || `Product ${product.id}`,
      slug: product.slug || `product-${product.id}`,
      thumbnail_url: product.thumbnail_url || product.image_urls?.[0] || "/placeholder.svg",
      image_urls: product.image_urls || [product.thumbnail_url || "/placeholder.svg"],
      category: product.category,
      seller: product.seller,
      stock: typeof product.stock === "number" ? product.stock : undefined,
      sku: product.sku,
      price: typeof product.price === "number" ? product.price : 0,
      sale_price: product.sale_price || null,
    }
  }, [])

  // Update cart state with proper validation and error handling
  const updateCartState = useCallback(
    async (newItems: CartItem[], newCart?: CartType, skipApiUpdate = false) => {
      if (!isMounted.current) return

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

        // Ensure product_id is valid
        if (!item.product_id || typeof item.product_id !== "number") {
          console.error("Invalid product_id in cart item:", item)
          return false
        }

        // Ensure required properties exist with valid values
        if (typeof item.quantity !== "number" || item.quantity <= 0) {
          item.quantity = 1
        }

        // Convert string prices to numbers
        if (typeof item.price === "string") {
          item.price = Number.parseFloat(item.price) || 0
        }

        // Ensure price is a valid number
        if (typeof item.price !== "number" || isNaN(item.price) || item.price < 0) {
          item.price = 0
        }

        // Calculate total based on validated price and quantity
        item.total = item.price * item.quantity

        // Ensure product property exists and is properly typed
        if (!item.product) {
          // Check if we have this product in our cache
          const cachedProduct = productCache.current.get(item.product_id)
          if (cachedProduct) {
            item.product = normalizeProductForCart(cachedProduct)
          } else {
            item.product = normalizeProductForCart({
              id: item.product_id,
              name: `Product ${item.product_id}`,
              slug: `product-${item.product_id}`,
              thumbnail_url: "/placeholder.svg",
              image_urls: ["/placeholder.svg"],
              price: item.price,
              sale_price: null,
            })
          }
        } else {
          // Normalize existing product data to ensure proper typing
          item.product = normalizeProductForCart(item.product)
        }

        return true
      })

      // Calculate totals
      const newItemCount = validItems.reduce((sum, item) => sum + item.quantity, 0)
      const newSubtotal = validItems.reduce((sum, item) => sum + item.total, 0)
      const newShipping = newCart?.shipping || 0
      const newTotal = newCart?.total || newSubtotal + newShipping

      // Update state
      setItems(validItems)
      setItemCount(newItemCount)
      setSubtotal(newCart?.subtotal || newSubtotal)
      setShipping(newShipping)
      setTotal(newTotal)
      setLastUpdated(new Date())

      // If we have a cart object from the backend, use it
      if (newCart) {
        setCart(newCart)
      }

      // Save to localStorage for persistence, but only if not authenticated
      // This prevents unnecessary localStorage updates for authenticated users
      if (!isAuthenticated) {
        // Set flag to ignore our own storage events
        ignoreStorageEvents.current = true
        saveLocalCartItems(validItems)
        // Reset flag after a short delay
        setTimeout(() => {
          ignoreStorageEvents.current = false
        }, 100)
      }

      // Dispatch cart-updated event to notify other components
      if (typeof document !== "undefined") {
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: newItemCount,
              total: newTotal,
              skipApiUpdate,
              timestamp: new Date().toISOString(),
            },
          }),
        )
      }

      // Fetch product data for items that need it, but don't block the UI update
      if (!skipApiUpdate && validItems.length > 0) {
        enhanceCartItemsWithProductData(validItems).catch((err) =>
          console.error("Failed to enhance cart items with product data:", err),
        )
      }
    },
    [isAuthenticated, normalizeProductForCart],
  )

  // Enhance cart items with product data
  const enhanceCartItemsWithProductData = useCallback(
    async (cartItems: CartItem[]): Promise<CartItem[]> => {
      if (!cartItems || cartItems.length === 0 || !isMounted.current) return cartItems

      // Find items that need product data and aren't already being enhanced
      const itemsNeedingData = cartItems.filter(
        (item) =>
          (!item.product ||
            !item.product.name ||
            item.product.name.includes("Product ") ||
            !item.product.thumbnail_url ||
            item.product.thumbnail_url === "/placeholder.svg") &&
          !enhancementInProgress.current.has(item.product_id),
      )

      if (itemsNeedingData.length === 0) return cartItems

      try {
        // Mark these items as being enhanced
        itemsNeedingData.forEach((item) => enhancementInProgress.current.add(item.product_id))

        console.log(`Enhancing ${itemsNeedingData.length} cart items with product data`)

        // Extract all product IDs from items needing data
        const productIds = itemsNeedingData.map((item) => item.product_id)

        // Get product data
        const productMap = await productService.getProductsForCartItems(productIds)

        // Update cart items with the fetched product data
        const enhancedItems = cartItems.map((item) => {
          const product = productMap[item.product_id.toString()]
          if (product && (!item.product || !item.product.name || item.product.name.includes("Product "))) {
            // Cache the product data
            productCache.current.set(item.product_id, product)

            return {
              ...item,
              product: normalizeProductForCart(product),
            }
          }
          return item
        })

        // Update the state with enhanced items, but don't trigger another API update
        if (isMounted.current) {
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(enhancedItems, cart || undefined, true)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)
        }

        return enhancedItems
      } catch (error) {
        console.error("Error enhancing cart items with product data:", error)
        return cartItems
      } finally {
        // Clear the enhancement tracking for these items
        itemsNeedingData.forEach((item) => enhancementInProgress.current.delete(item.product_id))
      }
    },
    [cart, updateCartState, normalizeProductForCart],
  )

  // Fetch cart from server or localStorage
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

              if (!response || response.success === false) {
                console.error("API returned an error:", response?.message || "Unknown error")
                setError(response?.message || "Failed to load cart.")

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
                cartItems.forEach((item: CartItem) => {
                  if (item.product && item.product.id && item.product_id) {
                    productCache.current.set(item.product_id, item.product)
                  }
                })

                // Update cart with items from response
                updateCartState(cartItems, response.cart)

                if (response.validation) {
                  setValidation(response.validation)
                }
              } else {
                // If cart is empty from backend, check localStorage as fallback
                const localCartItems = getLocalCartItems()
                if (localCartItems.length > 0) {
                  updateCartState(localCartItems)

                  // Try to sync local cart with server
                  for (const item of localCartItems) {
                    if (item.product_id) {
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

  // Add to cart with optimistic updates and proper error handling
  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number) => {
      // Ensure productId is a number
      const normalizedProductId = typeof productId === "string" ? Number.parseInt(productId, 10) : productId

      // Validate productId is a number and not null
      if (typeof normalizedProductId !== "number" || isNaN(normalizedProductId)) {
        console.error("Invalid product ID:", productId)
        return { success: false, message: "Invalid product ID" }
      }

      // Create an operation key to track this specific operation
      const operationKey = createOperationKey("add", normalizedProductId, variantId)

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
            (item) =>
              item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
          )

          if (existingItemIndex >= 0) {
            // Update quantity if item exists
            const updatedItems = [...localCartItems]
            updatedItems[existingItemIndex].quantity += quantity
            updatedItems[existingItemIndex].total =
              updatedItems[existingItemIndex].price * updatedItems[existingItemIndex].quantity

            // Set flag to ignore our own storage events
            ignoreStorageEvents.current = true
            updateCartState(updatedItems)
            // Reset flag after a short delay
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            playSound()

            // Trigger cart update event
            document.dispatchEvent(
              new CustomEvent("cart-updated", {
                detail: {
                  count: updatedItems.length,
                  total: updatedItems.reduce((sum, item) => sum + item.total, 0),
                  message: "Item quantity has been updated in your cart",
                  isUpdate: true,
                  timestamp: new Date().toISOString(),
                },
              }),
            )

            return { success: true, message: "Product quantity updated", isUpdate: true }
          } else {
            // Try to get product details from cache or use defaults
            let product = productCache.current.get(normalizedProductId)

            if (!product) {
              try {
                // Try to fetch product details
                product = await productService.getProduct(normalizedProductId.toString())
                if (product) {
                  productCache.current.set(normalizedProductId, product)
                }
              } catch (err) {
                console.warn("Could not fetch product details:", err)
                product = {
                  id: normalizedProductId,
                  name: `Product ${normalizedProductId}`,
                  slug: `product-${normalizedProductId}`,
                  thumbnail_url: "/placeholder.svg",
                  image_urls: ["/placeholder.svg"],
                  price: 0,
                }
              }
            }

            // Add new item
            const newItem: CartItem = {
              id: Date.now(), // Generate a temporary ID
              product_id: normalizedProductId,
              variant_id: variantId,
              quantity: quantity,
              price: product.price || 0,
              total: (product.price || 0) * quantity,
              product: normalizeProductForCart(product),
            }

            const updatedItems = [...localCartItems, newItem]

            // Set flag to ignore our own storage events
            ignoreStorageEvents.current = true
            updateCartState(updatedItems)
            // Reset flag after a short delay
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            playSound()

            // Trigger cart update event
            document.dispatchEvent(
              new CustomEvent("cart-updated", {
                detail: {
                  count: updatedItems.length,
                  total: updatedItems.reduce((sum, item) => sum + item.total, 0),
                  message: "Product has been added to your cart",
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
          (item) =>
            item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
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
            toast({
              title: "Stock Limit Reached",
              description: `Only ${optimisticItems[existingItemIndex].product.stock} items available in stock.`,
              variant: "destructive",
            })
            return {
              success: false,
              message: `Cannot add more items. Stock limit of ${optimisticItems[existingItemIndex].product.stock} reached.`,
            }
          }
        } else {
          // Try to get product details from cache
          let product = productCache.current.get(normalizedProductId)

          // If not in cache, try to fetch it quickly
          if (!product) {
            try {
              const fetchedProduct = await productService.getProduct(normalizedProductId.toString())
              if (fetchedProduct) {
                fetchedProduct.id =
                  typeof fetchedProduct.id === "string" ? Number.parseInt(fetchedProduct.id, 10) : fetchedProduct.id
                product = fetchedProduct
                productCache.current.set(normalizedProductId, product)
              }
            } catch (err) {
              console.warn("Could not fetch product details for optimistic update:", err)
              product = {
                id: normalizedProductId,
                name: `Product ${normalizedProductId}`,
                slug: `product-${normalizedProductId}`,
                thumbnail_url: "/placeholder.svg",
                image_urls: ["/placeholder.svg"],
                price: 0,
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
          const newItem: CartItem = {
            id: Date.now(), // Temporary ID until server responds
            product_id: normalizedProductId,
            variant_id: variantId,
            quantity: quantity,
            price: product.price || 0,
            total: (product.price || 0) * quantity,
            product: normalizeProductForCart(product),
          }

          optimisticItems.push(newItem)
        }

        // Apply optimistic update
        // Set flag to ignore our own storage events
        ignoreStorageEvents.current = true
        updateCartState(optimisticItems, undefined, true)
        // Reset flag after a short delay
        setTimeout(() => {
          ignoreStorageEvents.current = false
        }, 100)

        // Store this optimistic update
        optimisticUpdates.current.set(operationKey, {
          previousItems: currentItems,
          newItems: optimisticItems,
        })

        // Play sound effect
        playSound()

        // Check availability before proceeding
        try {
          const availabilityCheck = await inventoryService.checkAvailability(normalizedProductId, quantity, variantId)

          if (!availabilityCheck.is_available) {
            // Revert optimistic update
            const previousState = optimisticUpdates.current.get(operationKey)
            if (previousState) {
              // Set flag to ignore our own storage events
              ignoreStorageEvents.current = true
              updateCartState(previousState.previousItems, undefined, true)
              // Reset flag after a short delay
              setTimeout(() => {
                ignoreStorageEvents.current = false
              }, 100)

              optimisticUpdates.current.delete(operationKey)
            }

            toast({
              title: "Stock Limit Reached",
              description: `Only ${availabilityCheck.available_quantity} items available in stock.`,
              variant: "destructive",
            })

            return {
              success: false,
              message: `Only ${availabilityCheck.available_quantity} items available in stock.`,
            }
          }
        } catch (error) {
          console.error("Failed to check availability:", error)
          // Continue with the API call even if availability check fails
        }

        // Now make the actual API call
        const response = await cartService.addToCart(normalizedProductId, quantity, variantId)

        if (response.success) {
          // Remove this optimistic update since it's confirmed
          optimisticUpdates.current.delete(operationKey)

          // Track the event with WebSocket
          try {
            await websocketService.trackAddToCart(normalizedProductId, quantity, user?.id?.toString())
          } catch (wsError) {
            console.warn("WebSocket tracking failed, but cart was updated:", wsError)
          }

          // Find the product that was added to cart
          const addedProduct = response.items.find((item: CartItem) => item.product_id === normalizedProductId)
          const productName = addedProduct?.product?.name || "Product"

          // Dispatch event with product details for the notification component
          document.dispatchEvent(
            new CustomEvent("cart-updated", {
              detail: {
                count: response.items.length,
                total: response.cart?.total || 0,
                message: isUpdate
                  ? "Item quantity has been updated in your cart"
                  : "Product has been added to your cart",
                product: {
                  id: normalizedProductId,
                  name: productName,
                  thumbnail_url: addedProduct?.product?.thumbnail_url,
                  price: addedProduct?.price?.toFixed(2),
                  quantity: quantity,
                  variant_id: variantId,
                  total: addedProduct?.total || (addedProduct?.price || 0) * quantity,
                },
                isUpdate,
                timestamp: new Date().toISOString(),
              },
            }),
          )

          // Update cart state with the confirmed items from server
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(response.items, response.cart)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

          return {
            success: true,
            message: isUpdate ? "Product quantity updated" : "Product added to cart",
            isUpdate,
          }
        }

        // If the API call failed, revert the optimistic update
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(previousState.previousItems, undefined, true)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

          optimisticUpdates.current.delete(operationKey)
        }

        return { success: false, message: "Failed to update cart" }
      } catch (error: unknown) {
        console.error("Error adding to cart:", error)

        // Revert optimistic update if there was an error
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(previousState.previousItems, undefined, true)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

          optimisticUpdates.current.delete(operationKey)
        }

        // Type guard for error object
        const errorResponse = error as {
          response?: {
            status?: number
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
            if (stockError.available_stock !== undefined && productCache.current.has(normalizedProductId)) {
              const cachedProduct = productCache.current.get(normalizedProductId)
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
    [
      updateCartState,
      user,
      isAuthenticated,
      playSound,
      items,
      isOperationPending,
      markOperationPending,
      toast,
      normalizeProductForCart,
    ],
  )

  // Remove item from cart with optimistic updates
  const removeItem = useCallback(
    async (productId: number, variantId?: number): Promise<boolean> => {
      // Ensure productId is a number
      const normalizedProductId = typeof productId === "string" ? Number.parseInt(productId, 10) : productId

      if (typeof normalizedProductId !== "number" || isNaN(normalizedProductId)) {
        console.error("Invalid product ID:", productId)
        return false
      }

      // Find the item in the current cart
      const itemToRemove = items.find(
        (item) =>
          item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
      )

      if (!itemToRemove) {
        console.warn("Attempted to remove item that doesn't exist in cart:", productId, variantId)
        return false
      }

      const itemId = itemToRemove.id

      // Create an operation key to track this specific operation
      const operationKey = createOperationKey("remove", normalizedProductId, variantId)

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
          (item) =>
            !(
              item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id)
            ),
        )

        // Store this optimistic update
        optimisticUpdates.current.set(operationKey, {
          previousItems: currentItems,
          newItems: optimisticItems,
          removedItem: itemToRemove,
        })

        // Apply optimistic update
        // Set flag to ignore our own storage events
        ignoreStorageEvents.current = true
        updateCartState(optimisticItems, undefined, true)
        // Reset flag after a short delay
        setTimeout(() => {
          ignoreStorageEvents.current = false
        }, 100)

        // Play sound effect
        playSound()

        // Make the actual API call
        const response = await cartService.removeItem(itemId)

        if (response.success) {
          // Remove this optimistic update since it's confirmed
          optimisticUpdates.current.delete(operationKey)

          // Update cart state with the confirmed items from server
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(response.items, response.cart)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

          // Show success message
          const isOfflineMode = response.message && response.message.includes("offline mode")
          toast({
            title: "Item Removed",
            description: isOfflineMode
              ? "The item has been removed from your cart (saved locally)"
              : "The item has been removed from your cart",
          })

          return true
        }

        // If the API call failed, revert the optimistic update
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(previousState.previousItems, undefined, true)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

          optimisticUpdates.current.delete(operationKey)
        }

        return false
      } catch (error: any) {
        console.error("Error removing from cart:", error)

        // Check if this was handled successfully by the cart service (offline mode)
        if (error.message && error.message.includes("offline mode")) {
          // This is actually a successful offline update, not an error
          // Remove this optimistic update since it's confirmed locally
          optimisticUpdates.current.delete(operationKey)

          toast({
            title: "Item Removed",
            description: "The item has been removed from your cart (saved locally)",
          })

          return true
        }

        // Revert optimistic update if there was an error
        const previousState = optimisticUpdates.current.get(operationKey)
        if (previousState) {
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(previousState.previousItems, undefined, true)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

          optimisticUpdates.current.delete(operationKey)
        }

        // Handle authentication errors gracefully
        if (error.response?.status === 401) {
          // Check if the cart service successfully handled the removal locally
          const localItems = getLocalCartItems()
          const itemStillExists = localItems.find(
            (item) =>
              item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
          )

          if (!itemStillExists) {
            // The cart service successfully removed the item locally
            toast({
              title: "Item Removed",
              description: "The item has been removed from your cart (saved locally)",
            })
            return true
          }
        }

        // Only show error toast for actual errors, not authentication issues that were handled
        if (error.response?.status !== 401) {
          toast({
            title: "Error",
            description: error.response?.data?.error || "Failed to remove item from cart",
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

  // Update quantity with optimistic updates
  const updateQuantity = useCallback(
    async (productId: number, quantity: number, variantId?: number): Promise<boolean> => {
      // Ensure productId is a number
      const normalizedProductId = typeof productId === "string" ? Number.parseInt(productId, 10) : productId

      if (typeof normalizedProductId !== "number" || isNaN(normalizedProductId)) {
        console.error("Invalid product ID:", productId)
        return false
      }

      // Find the item in the current cart
      const itemToUpdate = items.find(
        (item) =>
          item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
      )

      if (!itemToUpdate) {
        console.warn("Attempted to update item that doesn't exist in cart:", productId, variantId)
        return false
      }

      const itemId = itemToUpdate.id

      // Create an operation key to track this specific operation
      const operationKey = createOperationKey("update", normalizedProductId, variantId)

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
          if (
            item.product_id === normalizedProductId &&
            (variantId ? item.variant_id === variantId : !item.variant_id)
          ) {
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
        // Set flag to ignore our own storage events
        ignoreStorageEvents.current = true
        updateCartState(optimisticItems, undefined, true)
        // Reset flag after a short delay
        setTimeout(() => {
          ignoreStorageEvents.current = false
        }, 100)

        // Play sound effect
        playSound()

        try {
          // Make the actual API call
          const response = await cartService.updateQuantity(itemId, quantity)

          if (response.success) {
            // Remove this optimistic update since it's confirmed
            optimisticUpdates.current.delete(operationKey)

            // Update cart state with the confirmed items from server
            // Set flag to ignore our own storage events
            ignoreStorageEvents.current = true
            updateCartState(response.items, response.cart)
            // Reset flag after a short delay
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            return true
          }

          // If the API call failed, revert the optimistic update
          const previousState = optimisticUpdates.current.get(operationKey)
          if (previousState) {
            // Set flag to ignore our own storage events
            ignoreStorageEvents.current = true
            updateCartState(previousState.previousItems, undefined, true)
            // Reset flag after a short delay
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            optimisticUpdates.current.delete(operationKey)
          }

          return false
        } catch (error: unknown) {
          console.error("Error updating cart:", error)

          // Check if this is an offline update (from localStorage)
          const offlineResponse = error as any
          if (offlineResponse && offlineResponse.message && offlineResponse.message.includes("offline mode")) {
            // This is actually a successful offline update, not an error
            // Remove this optimistic update since it's confirmed locally
            optimisticUpdates.current.delete(operationKey)

            // If we have items from the offline response, use them
            if (offlineResponse.items) {
              // Set flag to ignore our own storage events
              ignoreStorageEvents.current = true
              updateCartState(offlineResponse.items, offlineResponse.cart)
              // Reset flag after a short delay
              setTimeout(() => {
                ignoreStorageEvents.current = false
              }, 100)
            }

            return true
          }

          // Revert optimistic update if there was an error
          const previousState = optimisticUpdates.current.get(operationKey)
          if (previousState) {
            // Set flag to ignore our own storage events
            ignoreStorageEvents.current = true
            updateCartState(previousState.previousItems, undefined, true)
            // Reset flag after a short delay
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            optimisticUpdates.current.delete(operationKey)
          }

          // Extract validation errors if available
          const errorResponse = error as {
            response?: {
              data?: { errors?: Array<{ code: string; message: string; available_stock?: number }>; error?: string }
            }
          }

          // Handle authentication errors gracefully - don't show error if cart service handled it
          // Check for 401 status if present
          const responseAny = errorResponse.response as { status?: number }
          if (responseAny?.status === 401) {
            // Check if the cart service successfully handled the update locally
            const localItems = getLocalCartItems()
            const updatedItem = localItems.find(
              (item) =>
                item.product_id === normalizedProductId &&
                (variantId ? item.variant_id === variantId : !item.variant_id),
            )

            if (updatedItem && updatedItem.quantity === quantity) {
              // The cart service successfully updated localStorage, so this is actually a success
              toast({
                title: "Cart Updated Offline",
                description: "Your changes have been saved locally. Sign in to sync with the server.",
                variant: "default",
              })
              return true
            }
          }

          if (errorResponse.response?.data?.errors) {
            const errors = errorResponse.response.data.errors
            const stockError = errors.find((e) => e.code === "out_of_stock" || e.code === "insufficient_stock")

            if (stockError) {
              // Update product stock information in cache if available
              if (stockError.available_stock !== undefined && productCache.current.has(normalizedProductId)) {
                const cachedProduct = productCache.current.get(normalizedProductId)
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
      } catch (error) {
        console.error("Unexpected error in updateQuantity:", error)
        return false
      }
    },
    [updateCartState, playSound, toast, items, isOperationPending, markOperationPending],
  )

  // Clear cart
  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)

      // Call the cart service to clear the cart on the server
      await cartService.clearCart()

      // Reset the local cart state
      setItems([])
      setItemCount(0)
      setSubtotal(0)
      setShipping(0)
      setTotal(0)
      setCart(null)

      // Update localStorage
      if (typeof window !== "undefined") {
        // Set flag to ignore our own storage events
        ignoreStorageEvents.current = true
        localStorage.removeItem("cartItems")
        // Reset flag after a short delay
        setTimeout(() => {
          ignoreStorageEvents.current = false
        }, 100)

        // Dispatch events to notify other components
        window.dispatchEvent(new CustomEvent("cart:cleared"))

        // Also dispatch a cart-updated event with empty cart details
        document.dispatchEvent(
          new CustomEvent("cart-updated", {
            detail: {
              count: 0,
              total: 0,
              message: "Cart has been cleared",
              timestamp: new Date().toISOString(),
            },
          }),
        )
      }

      return true
    } catch (error) {
      console.error("Failed to clear cart:", error)
      setError("Failed to clear your cart. Please try again.")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Apply coupon
  const applyCoupon = useCallback(
    async (couponCode: string): Promise<boolean> => {
      try {
        setIsUpdating(true)
        setError(null)

        const response = await cartService.applyCoupon(couponCode)

        if (response.success) {
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(response.items, response.cart)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

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
        // Set flag to ignore our own storage events
        ignoreStorageEvents.current = true
        updateCartState(response.items, response.cart)
        // Reset flag after a short delay
        setTimeout(() => {
          ignoreStorageEvents.current = false
        }, 100)

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
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(response.items, response.cart)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

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
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(response.items, response.cart)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)

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

  // Complete checkout
  const completeCheckout = useCallback(
    async (orderId: string): Promise<boolean> => {
      try {
        if (!cart) {
          return false
        }

        // Convert all cart reservations to actual inventory reductions
        try {
          await inventoryService.convertReservationToOrder(cart.id.toString(), orderId)
        } catch (reservationError) {
          console.warn("Error converting reservations to order:", reservationError)
          // Continue even if this fails
        }

        // Clear the cart - both from server and local state
        try {
          await clearCart()
        } catch (clearError) {
          console.warn("Error clearing cart from server:", clearError)
          // If server clearing fails, at least clear the local state
          setItems([])
          setSubtotal(0)
          setShipping(0)
          setTotal(0)
          setCart(null)

          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          localStorage.removeItem("cartItems")
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)
        }

        return true
      } catch (error) {
        console.error("Error completing checkout:", error)
        return false
      }
    },
    [cart, clearCart],
  )

  // Initialize cart on mount
  useEffect(() => {
    isMounted.current = true

    const initializeCart = async () => {
      try {
        // Always try to load from localStorage first for immediate display
        const localCartItems = getLocalCartItems()

        // If we have local items, show them immediately while we fetch from server
        if (localCartItems.length > 0) {
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(localCartItems, undefined, true)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)
        }

        // Then fetch from server (for authenticated users) and refresh
        if (isAuthenticated) {
          await fetchCart()
        }
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
  }, [isAuthenticated, fetchCart, updateCartState])

  // Listen for cart update events
  useEffect(() => {
    const handleCartUpdate = () => {
      if (isAuthenticated) {
        refreshCart().catch(console.error)
      }
    }

    // Listen for cart update events
    window.addEventListener("cart-needs-refresh", handleCartUpdate)

    return () => {
      window.removeEventListener("cart-needs-refresh", handleCartUpdate)
    }
  }, [isAuthenticated, refreshCart])

  // Listen for storage events to sync cart across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Skip if we're the ones who triggered this event or if we're not mounted
      if (ignoreStorageEvents.current || !isMounted.current) return

      if (e.key === "cartItems") {
        try {
          const newItems = e.newValue ? JSON.parse(e.newValue) : []
          // Set flag to ignore our own storage events
          ignoreStorageEvents.current = true
          updateCartState(newItems, undefined, true)
          // Reset flag after a short delay
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)
        } catch (error) {
          console.error("Error parsing cart items from storage event:", error)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [updateCartState])

  // Context value
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
    completeCheckout,
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
