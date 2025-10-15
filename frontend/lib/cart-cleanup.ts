import { sanitizeCartItem, validateCartItem } from "@/lib/utils"

interface CleanupResult {
  success: boolean
  message: string
  itemsRemoved: number
  itemsFixed: number
  errors?: string[]
}

// Check if cart data is corrupted
export function isCartDataCorrupted(): boolean {
  if (typeof window === "undefined") return false

  try {
    const cartItems = localStorage.getItem("cartItems")
    if (!cartItems) return false

    const items = JSON.parse(cartItems)
    if (!Array.isArray(items)) return true

    // Check for corruption in each item
    return items.some((item) => {
      if (!item || typeof item !== "object") return true

      // Check for invalid product_id
      if (!item.product_id || typeof item.product_id !== "number" || item.product_id <= 0) {
        return true
      }

      // Check for scientific notation or invalid numbers
      const priceStr = item.price?.toString() || ""
      const quantityStr = item.quantity?.toString() || ""
      const totalStr = item.total?.toString() || ""

      if (
        priceStr.includes("e") ||
        quantityStr.includes("e") ||
        totalStr.includes("e") ||
        isNaN(item.price) ||
        isNaN(item.quantity) ||
        isNaN(item.total) ||
        item.quantity <= 0 ||
        item.quantity > 999 ||
        item.price < 0 ||
        item.price > 999999999
      ) {
        return true
      }

      return false
    })
  } catch (error) {
    console.error("Error checking cart corruption:", error)
    return true
  }
}

// Clean up corrupted cart data
export function cleanupCartData(): CleanupResult {
  if (typeof window === "undefined") {
    return { success: false, message: "Not in browser environment", itemsRemoved: 0, itemsFixed: 0 }
  }

  try {
    const cartItems = localStorage.getItem("cartItems")
    if (!cartItems) {
      return { success: true, message: "No cart data to clean", itemsRemoved: 0, itemsFixed: 0 }
    }

    const items = JSON.parse(cartItems)
    if (!Array.isArray(items)) {
      localStorage.removeItem("cartItems")
      return { success: true, message: "Invalid cart data removed", itemsRemoved: items.length || 0, itemsFixed: 0 }
    }

    let itemsRemoved = 0
    let itemsFixed = 0
    const cleanedItems: any[] = []

    items.forEach((item) => {
      try {
        // Validate the item first
        const validation = validateCartItem(item)

        if (!validation.isValid) {
          console.log("Attempting to fix invalid item:", item, "Errors:", validation.errors)

          // Try to sanitize the item
          const sanitizedItem = sanitizeCartItem(item)

          if (sanitizedItem) {
            // Re-validate the sanitized item
            const revalidation = validateCartItem(sanitizedItem)

            if (revalidation.isValid) {
              cleanedItems.push(sanitizedItem)
              itemsFixed++
              console.log("Successfully fixed item:", sanitizedItem)
            } else {
              console.log("Could not fix item, removing:", item)
              itemsRemoved++
            }
          } else {
            console.log("Could not sanitize item, removing:", item)
            itemsRemoved++
          }
        } else {
          // Item is valid, keep it
          cleanedItems.push(item)
        }
      } catch (error) {
        console.error("Error processing cart item:", item, error)
        itemsRemoved++
      }
    })

    // Remove duplicates based on product_id and variant_id
    const uniqueItems = cleanedItems.filter((item, index, arr) => {
      return (
        arr.findIndex((other) => other.product_id === item.product_id && other.variant_id === item.variant_id) === index
      )
    })

    if (uniqueItems.length < cleanedItems.length) {
      itemsRemoved += cleanedItems.length - uniqueItems.length
    }

    // Save cleaned data
    localStorage.setItem("cartItems", JSON.stringify(uniqueItems))

    // Dispatch cleanup notification
    if (itemsRemoved > 0 || itemsFixed > 0) {
      window.dispatchEvent(
        new CustomEvent("cart:cleanup-notification", {
          detail: {
            message: `Cart cleaned: ${itemsFixed} items fixed, ${itemsRemoved} items removed`,
            itemsFixed,
            itemsRemoved,
          },
        }),
      )
    }

    return {
      success: true,
      message: `Cleanup completed: ${itemsFixed} items fixed, ${itemsRemoved} items removed`,
      itemsRemoved,
      itemsFixed,
    }
  } catch (error) {
    console.error("Error during cart cleanup:", error)
    // If cleanup fails, remove all cart data as a last resort
    localStorage.removeItem("cartItems")
    return {
      success: false,
      message: "Cleanup failed, cart data removed",
      itemsRemoved: 0,
      itemsFixed: 0,
    }
  }
}

// Force clean cart (remove all data)
export function forceCleanCart(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem("cartItems")
    localStorage.removeItem("guest_cart_id")

    // Dispatch events
    window.dispatchEvent(new CustomEvent("cart:cleared"))
    window.dispatchEvent(
      new CustomEvent("cart:cleanup-notification", {
        detail: {
          message: "Cart has been completely reset due to data corruption",
          itemsFixed: 0,
          itemsRemoved: 0,
        },
      }),
    )
  } catch (error) {
    console.error("Error force cleaning cart:", error)
  }
}

// Auto cleanup on page load
export function autoCleanupOnLoad(): void {
  if (typeof window === "undefined") return

  try {
    if (isCartDataCorrupted()) {
      console.log("Detected corrupted cart data on load, cleaning up...")
      const result = cleanupCartData()

      if (result.success && (result.itemsFixed > 0 || result.itemsRemoved > 0)) {
        console.log("Auto cleanup completed:", result)
      }
    }
  } catch (error) {
    console.error("Error during auto cleanup:", error)
    // If auto cleanup fails, force clean as last resort
    forceCleanCart()
  }
}

// Check for extreme corruption (scientific notation, massive numbers)
export function detectExtremeCorruption(data: any): boolean {
  if (!data) return false

  // More conservative check for extremely large numbers
  const checkExtremeValue = (value: any): boolean => {
    if (typeof value === "number") {
      // More conservative thresholds
      return (
        value > 1000000000 || // 1 billion instead of 999 billion
        value < -1000000 || // Large negative numbers
        value.toString().includes("e+") ||
        !isFinite(value) ||
        isNaN(value)
      )
    }
    if (typeof value === "string") {
      const num = Number.parseFloat(value)
      return !isNaN(num) && (num > 1000000000 || num < -1000000 || value.includes("e+") || value.includes("E+"))
    }
    return false
  }

  // Check cart items for extreme corruption
  if (Array.isArray(data)) {
    return data.some((item) => {
      if (!item || typeof item !== "object") return true

      return (
        checkExtremeValue(item.quantity) ||
        checkExtremeValue(item.price) ||
        checkExtremeValue(item.total) ||
        item.quantity > 10000 || // 10k items instead of 1k
        item.price > 100000000 || // 100 million instead of 10 million
        item.quantity <= 0 || // Invalid quantity
        item.price < 0
      ) // Negative price
    })
  }

  // Check cart totals
  if (typeof data === "object") {
    return (
      checkExtremeValue(data.subtotal) ||
      checkExtremeValue(data.total) ||
      checkExtremeValue(data.tax) ||
      checkExtremeValue(data.shipping) ||
      data.subtotal < 0 ||
      data.total < 0
    )
  }

  return false
}

// Emergency cleanup for extreme corruption
export function emergencyCleanupCart(): CleanupResult {
  console.log("🚨 EMERGENCY CART CLEANUP INITIATED")

  try {
    // Clear all cart-related localStorage
    const cartKeys = [
      "cartItems",
      "cart",
      "cartTimestamp",
      "cartVersion",
      "cartChecksum",
      "mizizzi_cart",
      "mizizzi_cart_items",
      "mizizzi_cart_timestamp",
    ]

    cartKeys.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`Failed to remove ${key}:`, error)
      }
    })

    // Clear any cart-related session storage
    try {
      sessionStorage.removeItem("cartBackup")
      sessionStorage.removeItem("cartValidation")
    } catch (error) {
      console.warn("Failed to clear session storage:", error)
    }

    // Dispatch cleanup notification
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cart:emergency-cleanup", {
          detail: {
            message: "Cart has been reset due to extreme data corruption",
            timestamp: new Date().toISOString(),
          },
        }),
      )
    }

    return {
      success: true,
      message: "Emergency cleanup completed - cart has been reset",
      itemsFixed: 0,
      itemsRemoved: 0,
      errors: [],
    }
  } catch (error) {
    console.error("Emergency cleanup failed:", error)
    return {
      success: false,
      message: "Emergency cleanup failed",
      itemsFixed: 0,
      itemsRemoved: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}

// Validate and fix a single cart item
export function validateAndFixCartItem(item: any): any | null {
  try {
    const validation = validateCartItem(item)

    if (validation.isValid) {
      return item
    }

    // Try to fix the item
    const sanitizedItem = sanitizeCartItem(item)

    if (sanitizedItem) {
      const revalidation = validateCartItem(sanitizedItem)

      if (revalidation.isValid) {
        return sanitizedItem
      }
    }

    return null
  } catch (error) {
    console.error("Error validating/fixing cart item:", error)
    return null
  }
}

// Periodic cleanup function (can be called periodically)
export function performPeriodicCleanup(): void {
  if (typeof window === "undefined") return

  try {
    // Only run cleanup if corruption is detected
    if (isCartDataCorrupted()) {
      console.log("Periodic cleanup: corruption detected, cleaning up...")
      cleanupCartData()
    }
  } catch (error) {
    console.error("Error during periodic cleanup:", error)
  }
}

// Export all the functions that are being imported

// Make sure autoCleanupOnLoad function exists and is implemented
