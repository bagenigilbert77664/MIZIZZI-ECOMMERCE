import type { CartItem } from "@/services/cart-service"

export interface CartValidationIssue {
  type: "duplicate" | "invalid_price" | "invalid_quantity" | "missing_product" | "corruption"
  severity: "error" | "warning"
  message: string
  itemId?: number
  productId?: number
  suggestedAction: string
}

export interface CartValidationResult {
  isValid: boolean
  issues: CartValidationIssue[]
  cleanedItems?: CartItem[]
  shouldRefresh: boolean
}

export class EnhancedCartValidator {
  private static readonly VALID_PRICE_RANGE = { min: 1, max: 10000000 }
  private static readonly VALID_QUANTITY_RANGE = { min: 1, max: 999 }

  static validateAndCleanCart(items: CartItem[]): CartValidationResult {
    const issues: CartValidationIssue[] = []
    const validItems: CartItem[] = []
    const seenProducts = new Map<string, CartItem>()

    // Process each item
    for (const item of items) {
      const validation = this.validateCartItem(item)

      if (validation.issues.length > 0) {
        issues.push(...validation.issues)
      }

      // Handle duplicates
      const key = `${item.product_id}-${item.variant_id || "default"}`
      const existingItem = seenProducts.get(key)

      if (existingItem) {
        // Found duplicate - merge quantities if both are valid
        if (validation.cleanedItem && this.validateCartItem(existingItem).cleanedItem) {
          existingItem.quantity += validation.cleanedItem.quantity
          existingItem.total = existingItem.price * existingItem.quantity

          issues.push({
            type: "duplicate",
            severity: "warning",
            message: `Duplicate "${item.product?.name || "Unknown Product"}" items merged`,
            itemId: item.id,
            productId: item.product_id,
            suggestedAction: "Items have been automatically merged",
          })
        }
      } else if (validation.cleanedItem) {
        seenProducts.set(key, validation.cleanedItem)
        validItems.push(validation.cleanedItem)
      }
    }

    return {
      isValid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      cleanedItems: Array.from(seenProducts.values()),
      shouldRefresh: issues.length > 0,
    }
  }

  private static validateCartItem(item: CartItem): {
    issues: CartValidationIssue[]
    cleanedItem?: CartItem
  } {
    const issues: CartValidationIssue[] = []
    let cleanedItem: CartItem | undefined

    try {
      // Validate basic structure
      if (!item || typeof item !== "object") {
        issues.push({
          type: "corruption",
          severity: "error",
          message: "Invalid item structure",
          suggestedAction: "Remove corrupted item",
        })
        return { issues }
      }

      // Validate product ID
      if (!item.product_id || typeof item.product_id !== "number" || item.product_id <= 0) {
        issues.push({
          type: "missing_product",
          severity: "error",
          message: `Invalid product ID: ${item.product_id}`,
          itemId: item.id,
          suggestedAction: "Remove item with invalid product ID",
        })
        return { issues }
      }

      // Validate and clean price
      let cleanPrice = this.sanitizePrice(item.price)
      if (cleanPrice <= 0) {
        issues.push({
          type: "invalid_price",
          severity: "error",
          message: `Invalid price for "${item.product?.name || "Unknown Product"}": ${item.price}`,
          itemId: item.id,
          productId: item.product_id,
          suggestedAction: "Remove item or update price from product catalog",
        })

        // Try to get price from product data
        if (item.product?.price && item.product.price > 0) {
          cleanPrice = this.sanitizePrice(item.product.price)
          issues[issues.length - 1].severity = "warning"
          issues[issues.length - 1].message = `Price restored from product catalog: ${cleanPrice}`
          issues[issues.length - 1].suggestedAction = "Price has been automatically restored"
        } else {
          return { issues }
        }
      }

      // Validate and clean quantity
      let cleanQuantity = this.sanitizeQuantity(item.quantity)
      if (cleanQuantity <= 0 || cleanQuantity > this.VALID_QUANTITY_RANGE.max) {
        issues.push({
          type: "invalid_quantity",
          severity: "error",
          message: `Invalid quantity for "${item.product?.name || "Unknown Product"}": ${item.quantity}`,
          itemId: item.id,
          productId: item.product_id,
          suggestedAction: "Remove item or set valid quantity (1-999)",
        })

        if (cleanQuantity > this.VALID_QUANTITY_RANGE.max) {
          cleanQuantity = 1
          issues[issues.length - 1].severity = "warning"
          issues[issues.length - 1].message = `Quantity reduced to 1 from ${item.quantity}`
          issues[issues.length - 1].suggestedAction = "Quantity has been automatically corrected"
        } else {
          return { issues }
        }
      }

      // Create cleaned item
      cleanedItem = {
        ...item,
        price: cleanPrice,
        quantity: cleanQuantity,
        total: Math.round(cleanPrice * cleanQuantity * 100) / 100,
        product: item.product
          ? {
              ...item.product,
              name: item.product.name || `Product ${item.product_id}`,
              price: cleanPrice,
            }
          : {
              id: item.product_id,
              name: `Product ${item.product_id}`,
              slug: `product-${item.product_id}`,
              thumbnail_url: "/placeholder.svg",
              image_urls: ["/placeholder.svg"],
              price: cleanPrice,
              sale_price: null,
            },
      }

      return { issues, cleanedItem }
    } catch (error) {
      issues.push({
        type: "corruption",
        severity: "error",
        message: `Failed to validate item: ${error}`,
        itemId: item.id,
        suggestedAction: "Remove corrupted item",
      })
      return { issues }
    }
  }

  private static sanitizePrice(price: any): number {
    if (typeof price === "string") {
      // Remove currency symbols and parse
      const cleaned = price.replace(/[^\d.]/g, "")
      const parsed = Number.parseFloat(cleaned)
      return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, this.VALID_PRICE_RANGE.max))
    }

    if (typeof price === "number" && isFinite(price)) {
      return Math.max(0, Math.min(price, this.VALID_PRICE_RANGE.max))
    }

    return 0
  }

  private static sanitizeQuantity(quantity: any): number {
    if (typeof quantity === "string") {
      const parsed = Number.parseInt(quantity.replace(/[^\d]/g, ""), 10)
      return isNaN(parsed) ? 1 : Math.max(1, Math.min(parsed, this.VALID_QUANTITY_RANGE.max))
    }

    if (typeof quantity === "number" && isFinite(quantity)) {
      return Math.max(1, Math.min(Math.round(quantity), this.VALID_QUANTITY_RANGE.max))
    }

    return 1
  }
}

export function validateAndCleanCartItems(items: CartItem[]): CartValidationResult {
  return EnhancedCartValidator.validateAndCleanCart(items)
}
