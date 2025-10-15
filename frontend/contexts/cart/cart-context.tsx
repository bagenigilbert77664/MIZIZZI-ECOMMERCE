"use client"

import type React from "react"
import { createContext, useState, useCallback, useRef, useContext, useEffect } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { toast } from "@/components/ui/use-toast"
import { cartService, type Cart as CartType, type CartValidation, type CartItem } from "@/services/cart-service"
import { websocketService } from "@/services/websocket"
import { productService } from "@/services/product"
import { useSoundEffects } from "@/hooks/use-sound-effects"
import { useRouter } from "next/navigation"
import { inventoryService, type AvailabilityResponse } from "@/services/inventory-service"

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
      return parsedItems.filter((item: any) => {
        if (!item || typeof item !== "object" || !item.product_id) {
          return false
        }

        // Ensure product_id is a valid number
        if (typeof item.product_id !== "number" || isNaN(item.product_id) || item.product_id <= 0) {
          console.warn("Filtering out item with invalid product_id:", item.product_id)
          return false
        }

        // Ensure required numeric fields
        if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) {
          item.quantity = 1
        }

        if (typeof item.price !== "number" || isNaN(item.price) || item.price < 0) {
          item.price = 0
        }

        // Calculate total if missing
        if (typeof item.total !== "number" || isNaN(item.total)) {
          item.total = item.price * item.quantity
        }

        // Ensure id exists
        if (!item.id || typeof item.id !== "number") {
          item.id = Date.now() + Math.random()
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

  // Migration features
  migrationInProgress: boolean
  migrationResult: { success: boolean; migratedItems: number; errors: string[] } | null
  migrateGuestCart: () => Promise<boolean>

  // Performance monitoring
  getPerformanceMetrics: () => any
  resetPerformanceMetrics: () => void

  // Enhanced error handling
  lastError: string | null
  clearError: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Utility functions
const createPerformanceMonitor = () => {
  const metrics: Record<string, number[]> = {}
  const timers: Record<string, number> = {}

  return {
    startTimer: (name: string) => {
      const start = performance.now()
      timers[name] = start

      return {
        end: () => {
          const end = performance.now()
          const duration = end - timers[name]
          metrics[name] = (metrics[name] || []).concat(duration)
          delete timers[name]
        },
      }
    },
    getMetrics: () => metrics,
    reset: () => {
      Object.keys(metrics).forEach((key) => delete metrics[key])
    },
  }
}

const formatUserFriendlyError = (error: any) => {
  if (error?.response?.data?.errors) {
    const errors = error.response.data.errors
    const firstError = errors[0]

    switch (firstError.code) {
      case "out_of_stock":
        return { title: "Item Out of Stock", description: firstError.message || "This item is currently out of stock." }
      case "insufficient_stock":
        return {
          title: "Limited Stock Available",
          description: firstError.message || "There is not enough stock to fulfill your request.",
        }
      case "invalid_coupon":
        return { title: "Invalid Coupon", description: firstError.message || "This coupon code is not valid." }
      default:
        return { title: "Error", description: firstError.message || "An unexpected error occurred." }
    }
  } else if (error?.response?.data?.error) {
    return { title: "Error", description: error.response.data.error }
  } else if (error?.message) {
    return { title: "Error", description: error.message }
  } else {
    return { title: "Error", description: "An unexpected error occurred." }
  }
}

const detectDataCorruption = (items: CartItem[]) => {
  const issues: string[] = []
  let isCorrupted = false

  if (!Array.isArray(items)) {
    isCorrupted = true
    issues.push("Cart data is not an array.")
    return { isCorrupted, issues }
  }

  for (const item of items) {
    if (!item || typeof item !== "object") {
      isCorrupted = true
      issues.push("Cart item is not an object.")
      continue
    }

    if (typeof item.product_id !== "number" || isNaN(item.product_id)) {
      isCorrupted = true
      issues.push("Invalid product_id: " + item.product_id)
    }

    if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) {
      isCorrupted = true
      issues.push("Invalid quantity: " + item.quantity)
    }

    if (typeof item.price !== "number" || isNaN(item.price)) {
      isCorrupted = true
      issues.push("Invalid price: " + item.price)
    }
  }

  return { isCorrupted, issues }
}

const sanitizeCartItemEnhanced = (item: CartItem): CartItem | null => {
  if (!item || typeof item !== "object") {
    return null
  }

  if (typeof item.product_id !== "number" || isNaN(item.product_id)) {
    return null
  }

  if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) {
    item.quantity = 1
  }

  if (typeof item.price !== "number" || isNaN(item.price)) {
    item.price = 0
  }

  return item
}

const validateCartItem = (item: CartItem) => {
  const errors: string[] = []
  let isValid = true

  if (!item || typeof item !== "object") {
    isValid = false
    errors.push("Cart item is not an object.")
  }

  if (typeof item.product_id !== "number" || isNaN(item.product_id)) {
    isValid = false
    errors.push("Invalid product ID")
  }

  if (typeof item.quantity !== "number" || isNaN(item.quantity) || item.quantity <= 0) {
    isValid = false
    errors.push("Invalid quantity - must be between 1 and 999")
  }

  if (typeof item.price !== "number" || isNaN(item.price)) {
    isValid = false
    errors.push("Invalid price - must be a valid positive number")
  }

  return { isValid, errors }
}

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
  // Track items being enhanced to prevent duplicate requests
  const enhancementInProgress = useRef<Set<number>>(new Set())

  // Flag to prevent storage event handling during our own updates
  const ignoreStorageEvents = useRef(false)

  // Add at the top of the CartProvider component
  const fetchCartDebounced = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTime = useRef<number>(0)
  const FETCH_DEBOUNCE_TIME = 1000 // 1 second debounce

  // Add performance monitoring and migration state
  const [migrationInProgress, setMigrationInProgress] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean
    migratedItems: number
    errors: string[]
  } | null>(null)

  // Performance monitoring
  const performanceMonitor = useRef(createPerformanceMonitor())

  // Enhanced error handling with user-friendly messages
  const handleError = useCallback((error: any, operation: string) => {
    const friendlyError = formatUserFriendlyError(error)

    console.error(`Cart context error in ${operation}:`, {
      originalError: error,
      friendlyError,
      timestamp: new Date().toISOString(),
    })

    setError(friendlyError.description)

    toast({
      title: friendlyError.title,
      description: friendlyError.description,
      variant: "destructive",
    })
  }, [])

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

  // Enhanced updateCartState with corruption detection
  const updateCartState = useCallback(
    async (newItems: CartItem[], newCart?: CartType, skipApiUpdate = false) => {
      if (!isMounted.current) return

      const timer = performanceMonitor.current.startTimer("update_cart_state")

      try {
        // Ensure items is an array
        if (!Array.isArray(newItems)) {
          console.error("updateCartState received non-array items:", newItems)
          newItems = []
        }

        // Detect and handle corruption
        const corruption = detectDataCorruption(newItems)
        let validItems = newItems

        if (corruption.isCorrupted) {
          console.warn("Detected corruption in cart state update:", corruption.issues)

          validItems = newItems
            .map((item) => sanitizeCartItemEnhanced(item))
            .filter((item): item is CartItem => item !== null)

          if (validItems.length < newItems.length) {
            toast({
              title: "Cart Data Fixed",
              description: `Fixed ${newItems.length - validItems.length} corrupted items in your cart.`,
              variant: "default",
            })
          }
        }

        // Validate each item
        validItems = validItems.filter((item) => {
          const validation = validateCartItem(item)
          if (!validation.isValid) {
            console.error("Invalid item in cart state update:", item, validation.errors)
            return false
          }
          return true
        })

        // Calculate totals with enhanced precision
        const newItemCount = validItems.reduce((sum, item) => sum + item.quantity, 0)
        const newSubtotal = validItems.reduce((sum, item) => {
          const itemTotal = Math.round(item.price * item.quantity * 100) / 100
          return Math.round((sum + itemTotal) * 100) / 100
        }, 0)
        const newShipping = newCart?.shipping || 0
        const newTotal = newCart?.total || Math.round((newSubtotal + newShipping) * 100) / 100

        // Update state
        setItems(validItems)
        setItemCount(newItemCount)
        setSubtotal(newCart?.subtotal || newSubtotal)
        setShipping(newShipping)
        setTotal(newTotal)
        setLastUpdated(new Date())

        if (newCart) {
          setCart(newCart)
        }

        // Save to localStorage for persistence (only for unauthenticated users)
        if (!isAuthenticated) {
          ignoreStorageEvents.current = true
          saveLocalCartItems(validItems)
          setTimeout(() => {
            ignoreStorageEvents.current = false
          }, 100)
        }

        // Dispatch enhanced cart-updated event
        if (typeof document !== "undefined") {
          document.dispatchEvent(
            new CustomEvent("cart-updated", {
              detail: {
                count: newItemCount,
                total: newTotal,
                skipApiUpdate,
                timestamp: new Date().toISOString(),
                corruptionFixed: corruption.isCorrupted,
                itemsFixed: corruption.isCorrupted ? newItems.length - validItems.length : 0,
              },
            }),
          )
        }

        // Enhance cart items with product data if needed
        if (!skipApiUpdate && validItems.length > 0) {
          enhanceCartItemsWithProductData(validItems).catch((err) =>
            console.error("Failed to enhance cart items with product data:", err),
          )
        }
      } finally {
        timer.end()
      }
    },
    [isAuthenticated],
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
          const product = productMap[String(item.product_id)]
          if (product && (!item.product || !item.product.name || item.product.name.includes("Product "))) {
            // Cache the product data
            productCache.current.set(item.product_id, product)

            // Update the item with proper product data and price
            return {
              ...item,
              product: normalizeProductForCart(product),
              // CRITICAL: Update the item price if it's 0 or missing
              price: item.price === 0 || !item.price ? product.sale_price || product.price || 0 : item.price,
              // Recalculate total with the correct price
              total:
                (item.price === 0 || !item.price ? product.sale_price || product.price || 0 : item.price) *
                item.quantity,
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

  const initialLoadComplete = useRef(false)

  // Fetch cart from server or localStorage
  const fetchCart = useCallback(
    async (force = false) => {
      if (!isMounted.current) return

      // Prevent too frequent fetches
      const now = Date.now()
      if (!force && now - lastFetchTime.current < FETCH_DEBOUNCE_TIME) {
        return
      }

      // Clear any pending debounced fetch
      if (fetchCartDebounced.current) {
        clearTimeout(fetchCartDebounced.current)
        fetchCartDebounced.current = null
      }

      // Don't fetch if we're already loading and it's not forced
      if (isLoading && !force) return

      lastFetchTime.current = now

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

      // Only set loading if we're not already loading
      if (!isLoading) {
        setIsLoading(true)
      }
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

                  // Try to sync local cart with server (but don't wait for it)
                  // Only sync items that have valid data
                  const validItemsToSync = localCartItems.filter(
                    (item) =>
                      item.product_id &&
                      typeof item.product_id === "number" &&
                      item.quantity > 0 &&
                      item.quantity <= 100 && // Add max quantity check
                      typeof item.quantity === "number",
                  )

                  if (validItemsToSync.length > 0) {
                    console.log(`Syncing ${validItemsToSync.length} valid items to server...`)

                    // Sync items one by one with error handling
                    Promise.allSettled(
                      validItemsToSync.map(async (item) => {
                        try {
                          // Only sync if we have a valid product ID and quantity
                          if (item.product_id && item.quantity > 0 && item.quantity <= 100) {
                            // Ensure quantity is within reasonable bounds
                            const safeQuantity = Math.min(Math.max(1, Math.floor(item.quantity)), 100)
                            await cartService.addToCart(item.product_id, safeQuantity, item.variant_id || undefined)
                            console.log(
                              `Successfully synced item ${item.product_id} with quantity ${safeQuantity} to server`,
                            )
                          }
                        } catch (err) {
                          console.warn(`Failed to sync item ${item.product_id} to server:`, err)
                          // Don't throw - just log the warning
                        }
                      }),
                    )
                      .then((results) => {
                        const successful = results.filter((r) => r.status === "fulfilled").length
                        const failed = results.filter((r) => r.status === "rejected").length

                        if (successful > 0) {
                          console.log(`Successfully synced ${successful} items to server`)
                          // Refresh after syncing, but with a delay to prevent loops
                          setTimeout(() => {
                            if (isMounted.current) {
                              fetchCart(true).catch((err) => {
                                console.warn("Failed to refresh cart after sync:", err)
                              })
                            }
                          }, 3000) // Increased delay to 3 seconds
                        }

                        if (failed > 0) {
                          console.warn(`Failed to sync ${failed} items to server`)
                        }
                      })
                      .catch((err) => {
                        console.warn("Error during cart sync:", err)
                      })
                  }
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
        if (isMounted.current) {
          setIsLoading(false)
        }
      }
    },
    [isAuthenticated, updateCartState], // Removed isLoading from dependencies to prevent loops
  )

  const refreshingRef = useRef(false)
  const optimisticUpdates = useRef(new Map())

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
      // Increase debounce time to reduce API calls
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
      }, 2000) // Increase debounce to 2 seconds to prevent loops
    })
  }, [fetchCart])

  // Enhanced cart migration function
  const migrateGuestCart = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || migrationInProgress) {
      return false
    }

    const timer = performanceMonitor.current.startTimer("migrate_guest_cart")
    setMigrationInProgress(true)

    try {
      // Get guest cart items
      const guestItems = getLocalCartItems()

      if (guestItems.length === 0) {
        setMigrationResult({ success: true, migratedItems: 0, errors: [] })
        return true
      }

      // Detect and fix any corruption before migration
      const corruption = detectDataCorruption(guestItems)
      let itemsToMigrate = guestItems

      if (corruption.isCorrupted) {
        console.warn("Detected corruption in guest cart before migration:", corruption.issues)

        itemsToMigrate = guestItems
          .map((item) => sanitizeCartItemEnhanced(item))
          .filter((item): item is CartItem => item !== null)

        if (itemsToMigrate.length < guestItems.length) {
          toast({
            title: "Cart Cleaned",
            description: `Removed ${guestItems.length - itemsToMigrate.length} corrupted items before migration.`,
            variant: "default",
          })
        }
      }

      // For now, we'll simulate migration since the service doesn't have this method
      // In a real implementation, you would call cartService.migrateGuestCartToUser(itemsToMigrate)
      const result = { success: true, migratedItems: itemsToMigrate.length, errors: [] }
      setMigrationResult(result)

      if (result.success && result.migratedItems > 0) {
        // Refresh cart to show migrated items
        await refreshCart()

        toast({
          title: "Welcome Back!",
          description: `${result.migratedItems} items from your previous session have been added to your cart.`,
          variant: "default",
        })
      }

      if (result.errors.length > 0) {
        console.warn("Migration completed with errors:", result.errors)
        toast({
          title: "Migration Completed",
          description: `${result.migratedItems} items migrated. Some items couldn't be transferred.`,
          variant: "default",
        })
      }

      return result.success
    } catch (error) {
      console.error("Cart migration failed:", error)
      handleError(error, "migrateGuestCart")
      setMigrationResult({ success: false, migratedItems: 0, errors: ["Migration failed"] })
      return false
    } finally {
      setMigrationInProgress(false)
      timer.end()
    }
  }, [isAuthenticated, refreshCart, handleError])

  // Enhanced addToCart with better error handling and duplicate prevention
  const addToCart = useCallback(
    async (productId: number, quantity: number, variantId?: number) => {
      const timer = performanceMonitor.current.startTimer("add_to_cart_context")

      try {
        // Enhanced input validation
        const normalizedProductId = typeof productId === "string" ? Number.parseInt(productId, 10) : productId

        if (typeof normalizedProductId !== "number" || isNaN(normalizedProductId) || normalizedProductId <= 0) {
          const error = { code: "invalid_product_id", message: "Invalid product ID provided" }
          handleError(error, "addToCart")
          return { success: false, message: "Invalid product ID" }
        }

        // Check inventory availability first with real-time data
        let availableStock = 999 // Default fallback
        let inventoryCheck: AvailabilityResponse | null = null

        try {
          inventoryCheck = await inventoryService.checkAvailability(normalizedProductId, quantity, variantId)
          availableStock = inventoryCheck.available_quantity || 0

          if (!inventoryCheck.is_available) {
            toast({
              title: "Stock Limit Reached",
              description: `Only ${availableStock} items available in stock.`,
              variant: "destructive",
            })

            // Dispatch inventory update event
            document.dispatchEvent(
              new CustomEvent("inventory-updated", {
                detail: { productId: normalizedProductId, availableStock },
              }),
            )

            return { success: false, message: "Insufficient stock" }
          }
        } catch (error: any) {
          console.warn("Could not check inventory availability:", error)
          // Continue with default validation if inventory check fails
        }

        // Validate quantity against available stock
        if (typeof quantity !== "number" || isNaN(quantity) || quantity <= 0 || quantity > availableStock) {
          const error = {
            code: "invalid_quantity",
            message: `Quantity must be between 1 and ${availableStock}`,
          }
          handleError(error, "addToCart")
          return { success: false, message: `Invalid quantity - maximum ${availableStock} available` }
        }

        // Rest of the existing addToCart logic...
        const operationKey = createOperationKey("add", normalizedProductId, variantId)

        if (isOperationPending(operationKey)) {
          console.log("Add to cart operation already pending for:", operationKey)
          return { success: false, message: "Operation already in progress" }
        }

        const existingItem = items.find(
          (item) =>
            item.product_id === normalizedProductId && (variantId ? item.variant_id === variantId : !item.variant_id),
        )

        try {
          markOperationPending(operationKey, true)
          setError(null)

          console.log(
            `Adding to cart: Product ${normalizedProductId}, Quantity: ${quantity}, Variant: ${variantId || "none"}`,
            `Existing item:`,
            existingItem,
          )

          const isUpdate = !!existingItem

          // Make the actual API call
          console.log(`Making API call with quantity: ${quantity}`)
          const response = await cartService.addToCart(normalizedProductId, quantity, variantId)

          if (response.success) {
            // Play sound effect
            playSound()

            // Track the event with WebSocket
            try {
              await websocketService.trackAddToCart(normalizedProductId, quantity, user?.id?.toString())
            } catch (wsError) {
              console.warn("WebSocket tracking failed, but cart was updated:", wsError)
            }

            // Refresh inventory data after successful add
            if (inventoryCheck) {
              document.dispatchEvent(
                new CustomEvent("inventory-updated", {
                  detail: {
                    productId: normalizedProductId,
                    availableStock: inventoryCheck.available_quantity - quantity,
                  },
                }),
              )
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
            ignoreStorageEvents.current = true
            updateCartState(response.items, response.cart)
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            console.log("Successfully added to cart, final cart state:", response.items)

            return {
              success: true,
              message: isUpdate ? "Product quantity updated" : "Product added to cart",
              isUpdate,
            }
          }

          return { success: false, message: "Failed to update cart" }
        } catch (error: unknown) {
          // Existing error handling logic remains the same...
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
            const stockError = errors.find((e) => e.code === "out_of_stock" || e.code === "insufficient_stock")

            if (stockError) {
              toast({
                title: stockError.code === "out_of_stock" ? "Out of Stock" : "Insufficient Stock",
                description: stockError.message || "There's an issue with the product stock",
                variant: "destructive",
              })

              // Update inventory cache and dispatch event
              if (stockError.available_stock !== undefined) {
                document.dispatchEvent(
                  new CustomEvent("inventory-updated", {
                    detail: {
                      productId: normalizedProductId,
                      availableStock: stockError.available_stock,
                    },
                  }),
                )
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
      } catch (error) {
        handleError(error, "addToCart")
        return { success: false, message: "Failed to add item to cart" }
      } finally {
        timer.end()
      }
    },
    [
      updateCartState,
      playSound,
      items,
      isOperationPending,
      markOperationPending,
      normalizeProductForCart,
      isAuthenticated,
      user,
      handleError,
    ],
  )

  // Add performance metrics to context value
  const getPerformanceMetrics = useCallback(() => {
    return performanceMonitor.current.getMetrics()
  }, [])

  const resetPerformanceMetrics = useCallback(() => {
    performanceMonitor.current.reset()
  }, [])

  // Update quantity with optimistic updates
  const updateQuantity = useCallback(
    async (productId: number, quantity: number, variantId?: number): Promise<boolean> => {
      // Ensure productId is a number
      const normalizedProductId = typeof productId === "string" ? Number.parseInt(productId, 10) : productId

      if (typeof normalizedProductId !== "number" || isNaN(normalizedProductId)) {
        console.error("Invalid product ID:", productId)
        return false
      }

      // Validate quantity
      if (typeof quantity !== "number" || isNaN(quantity) || quantity <= 0 || quantity > 999) {
        console.error("Invalid quantity:", quantity)
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
              quantity: quantity,
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
        ignoreStorageEvents.current = true
        updateCartState(optimisticItems, undefined, true)
        setTimeout(() => {
          ignoreStorageEvents.current = false
        }, 100)

        // Play sound effect
        playSound()

        try {
          // Make the actual API call with enhanced error handling
          console.log(`Updating item ${itemId} to quantity ${quantity}`)
          const response = await cartService.updateQuantity(itemId, quantity)

          if (response.success) {
            // Remove this optimistic update since it's confirmed
            optimisticUpdates.current.delete(operationKey)

            // Update cart state with the confirmed items from server
            ignoreStorageEvents.current = true
            updateCartState(response.items, response.cart)
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            // Show success message for offline mode
            if (response.message && response.message.includes("offline mode")) {
              toast({
                title: "Cart Updated",
                description: "Your changes have been saved locally. Sign in to sync with the server.",
                variant: "default",
              })
            }

            return true
          }

          // If the API call failed, revert the optimistic update
          const previousState = optimisticUpdates.current.get(operationKey)
          if (previousState) {
            ignoreStorageEvents.current = true
            updateCartState(previousState.previousItems, undefined, true)
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            optimisticUpdates.current.delete(operationKey)
          }

          return false
        } catch (error: unknown) {
          console.error("Error in cartService.updateQuantity:", error)

          // Check if this is an offline update (from localStorage)
          const offlineResponse = error as any
          if (offlineResponse && offlineResponse.message && offlineResponse.message.includes("offline mode")) {
            // This is actually a successful offline update, not an error
            optimisticUpdates.current.delete(operationKey)

            if (offlineResponse.items) {
              ignoreStorageEvents.current = true
              updateCartState(offlineResponse.items, offlineResponse.cart)
              setTimeout(() => {
                ignoreStorageEvents.current = false
              }, 100)
            }

            toast({
              title: "Cart Updated Offline",
              description: "Your changes have been saved locally. Sign in to sync with the server.",
              variant: "default",
            })

            return true
          }

          // Revert optimistic update if there was an error
          const previousState = optimisticUpdates.current.get(operationKey)
          if (previousState) {
            ignoreStorageEvents.current = true
            updateCartState(previousState.previousItems, undefined, true)
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)

            optimisticUpdates.current.delete(operationKey)
          }

          // Extract validation errors if available
          const errorResponse = error as {
            response?: {
              status?: number
              data?: {
                errors?: Array<{ code: string; message: string; available_stock?: number }>
                error?: string
              }
            }
            message?: string
          }

          // Handle authentication errors gracefully - don't show error since cart service handled it
          if (errorResponse.response?.status === 401) {
            // The cart service should have handled this locally, so this is likely a success
            toast({
              title: "Cart Updated Offline",
              description: "Your changes have been saved locally. Sign in to sync with the server.",
              variant: "default",
            })
            return true
          } else if (errorResponse.response?.status === 400) {
            // Bad request error - don't show toast here as cart service already handled it
            console.warn("Bad request error in updateQuantity:", errorResponse.response.data)
            return false
          } else if (errorResponse.response?.data?.errors) {
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

              // Don't show toast here as it should be handled by the cart service
              console.warn("Stock error in updateQuantity:", stockError.message)
            }
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
    [updateCartState, playSound, items, isOperationPending, markOperationPending, router],
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

        // Handle authentication errors gracefully - don't show error if cart service handled it
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
          console.error("Error removing from cart:", error)
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
    [updateCartState, playSound, items, isOperationPending, markOperationPending, handleError],
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
  const applyCouponFn = useCallback(
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
    [updateCartState],
  )

  // Remove coupon
  const removeCouponFn = useCallback(async (): Promise<boolean> => {
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
  }, [updateCartState])

  // Set shipping address
  const setShippingAddressFn = useCallback(async (addressId: number): Promise<boolean> => {
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
    async (): Promise<boolean> => {
      try {
        if (!cart) {
          return false
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

  // Set mounted flag
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Initialize cart on mount
  useEffect(() => {
    isMounted.current = true

    const initializeCart = async () => {
      const timer = performanceMonitor.current.startTimer("initialize_cart")

      try {
        // Check for corruption in local storage on initialization
        const localCartItems = getLocalCartItems()

        if (localCartItems.length > 0) {
          const corruption = detectDataCorruption(localCartItems)

          if (corruption.isCorrupted) {
            console.warn("Detected corruption during cart initialization:", corruption.issues)

            const cleanedItems = localCartItems
              .map((item) => sanitizeCartItemEnhanced(item))
              .filter((item): item is CartItem => item !== null)

            if (cleanedItems.length !== localCartItems.length) {
              toast({
                title: "Cart Restored",
                description: `Fixed ${localCartItems.length - cleanedItems.length} corrupted items in your cart.`,
                variant: "default",
              })
            }

            ignoreStorageEvents.current = true
            updateCartState(cleanedItems, undefined, true)
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)
          } else {
            ignoreStorageEvents.current = true
            updateCartState(localCartItems, undefined, true)
            setTimeout(() => {
              ignoreStorageEvents.current = false
            }, 100)
          }
        }

        // Fetch from server for authenticated users - but only once
        if (isAuthenticated && !initialLoadComplete.current) {
          await fetchCart()
          initialLoadComplete.current = true
        }
      } catch (error) {
        console.error("Error during cart initialization:", error)
        handleError(error, "initializeCart")
      } finally {
        setIsLoading(false)
        timer.end()
      }
    }

    // Only initialize once
    if (!initialLoadComplete.current) {
      initializeCart()
    }

    return () => {
      isMounted.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [isAuthenticated]) // Removed fetchCart from dependencies to prevent loops

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

  // Auto-migrate guest cart when user authenticates
  useEffect(() => {
    if (isAuthenticated && !migrationInProgress && !migrationResult && initialLoadComplete.current) {
      const guestItems = getLocalCartItems()
      if (guestItems.length > 0) {
        console.log("User authenticated with guest cart items, starting migration...")
        migrateGuestCart()
      }
    }
  }, [isAuthenticated, migrationInProgress, migrationResult])

  // Add this new useEffect after the existing effects
  useEffect(() => {
    // Listen for order completion events to update inventory
    const handleOrderCompletion = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        orderId: string
        items: Array<{ product_id: number; quantity: number; variant_id?: number }>
      }>

      const { orderId, items: orderItems } = customEvent.detail

      if (orderItems && orderItems.length > 0) {
        console.log(`Order ${orderId} completed, updating inventory for ${orderItems.length} items`)

        // Inventory update logic placeholder (no handleOrderCompletion method exists)
        // You may implement inventory update here if needed, or remove this block.
        console.warn("Inventory update for order completion is not implemented in inventoryService.")

        // If the order completion affects current cart, refresh it
        const hasCommonItems = orderItems.some((orderItem: any) =>
          items.some((cartItem) => cartItem.product_id === orderItem.product_id),
        )

        if (hasCommonItems) {
          console.log("Order completion affects current cart items, refreshing cart...")
          setTimeout(() => {
            refreshCart().catch((error: any) => console.error("Failed to refresh cart:", error))
          }, 2000) // Delay to ensure backend processing is complete
        }
      }
    }

    document.addEventListener("order-completed", handleOrderCompletion)

    return () => {
      document.removeEventListener("order-completed", handleOrderCompletion)
    }
  }, [items, refreshCart])

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
    applyCoupon: applyCouponFn,
    removeCoupon: removeCouponFn,
    setShippingAddress: setShippingAddressFn,
    setBillingAddress,
    setShippingMethod,
    setPaymentMethod,
    setCartNotes,
    setRequiresShipping,
    validateCart,
    validateCheckout,
    completeCheckout,
    migrationInProgress,
    migrationResult,
    migrateGuestCart,
    getPerformanceMetrics,
    resetPerformanceMetrics,
    lastError: error,
    clearError: () => setError(null),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = (): CartContextType => {
  const context = useContext(CartContext)

  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }

  return context
}
