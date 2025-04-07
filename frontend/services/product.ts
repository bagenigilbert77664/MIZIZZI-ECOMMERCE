import api from "@/lib/api"
import type { Product } from "@/types"
import { prefetchData } from "@/lib/api"
import { websocketService } from "@/services/websocket"

// Add a cache map to store product details with timestamps
const productCache = new Map<string, { data: Product; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const productService = {
  async getProducts(params = {}): Promise<Product[]> {
    try {
      console.log("API call: getProducts with params:", params)
      const response = await api.get("/api/products", { params })
      console.log("API response:", response.data)
      // Ensure we're returning the correct type
      return (response.data.items || []) as Product[]
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  },

  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByCategory for slug: ${categorySlug}`)
      const response = await api.get("/api/products", {
        params: { category_slug: categorySlug },
      })
      console.log("API response for category products:", response.data)
      return (response.data.items || []) as Product[]
    } catch (error) {
      console.error(`Error fetching products for category ${categorySlug}:`, error)
      return []
    }
  },

  async getProduct(id: string): Promise<Product | null> {
    try {
      // Check cache first
      const cacheKey = `product-${id}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached product data for id ${id}`)
        return cachedItem.data
      }

      console.log(`Fetching product with id ${id} from API`)

      // Use the full URL with API_BASE_URL from environment
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

      // Make sure we have a complete URL
      const url = `${API_BASE_URL}/api/products/${id}`
      console.log(`Making request to: ${url}`)

      const response = await api.get(url)

      // Cache the result with timestamp
      if (response.data) {
        productCache.set(cacheKey, {
          data: response.data,
          timestamp: now,
        })

        // Prefetch related products in the background
        if (response.data.category_id) {
          prefetchData(`${API_BASE_URL}/api/products`, {
            category_id: response.data.category_id,
            limit: 8,
          })
        }
      }

      return response.data
    } catch (error) {
      console.error(`Error fetching product with id ${id}:`, error)
      return null
    }
  },

  // Invalidate cache for a specific product
  invalidateProductCache(id: string): void {
    const cacheKey = `product-${id}`
    productCache.delete(cacheKey)
    console.log(`Cache invalidated for product ${id}`)
  },

  // Invalidate all product cache
  invalidateAllProductCache(): void {
    productCache.clear()
    console.log("All product cache invalidated")
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const response = await api.get(`/api/products/${slug}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product with slug ${slug}:`, error)
      return null
    }
  },

  async getFeaturedProducts(): Promise<Product[]> {
    return this.getProducts({ featured: true })
  },

  async getNewProducts(): Promise<Product[]> {
    return this.getProducts({ new: true })
  },

  async getSaleProducts(): Promise<Product[]> {
    return this.getProducts({ sale: true })
  },

  async getFlashSaleProducts(): Promise<Product[]> {
    return this.getProducts({ flash_sale: true })
  },

  async getLuxuryDealProducts(): Promise<Product[]> {
    return this.getProducts({ luxury_deal: true })
  },

  async getProductsByIds(productIds: number[]): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByIds for ids: ${productIds.join(", ")}`)
      const response = await api.get("/api/products/batch", {
        params: { ids: productIds.join(",") },
      })
      console.log("API response for batch products:", response.data)
      return response.data.items || []
    } catch (error) {
      console.error(`Error fetching products by ids:`, error)
      return []
    }
  },

  // Add a method to prefetch products for faster navigation
  async prefetchProductsByCategory(categoryId: string): Promise<boolean> {
    return prefetchData("/api/products", { category_id: categoryId, limit: 12 })
  },

  // Add a method to prefetch featured products for the homepage
  async prefetchHomePageProducts(): Promise<void> {
    try {
      await Promise.allSettled([
        this.prefetchProductsByCategory("featured"),
        prefetchData("/api/products", { flash_sale: true }),
        prefetchData("/api/products", { luxury_deal: true }),
        prefetchData("/api/products", { limit: 12 }),
      ])
    } catch (error) {
      console.error("Error prefetching homepage products:", error)
    }
  },

  // Add this method to the productService object
  async getProductReviews(productId: number): Promise<any[]> {
    try {
      // In a real implementation, you would fetch reviews from an API
      // For now, we'll get the product and return its reviews
      const product = await this.getProduct(productId.toString())
      return product?.reviews || []
    } catch (error) {
      console.error(`Error fetching reviews for product ${productId}:`, error)
      return []
    }
  },

  // Notify about product updates
  notifyProductUpdate(productId: string): void {
    console.log(`Notifying about product update for ID: ${productId}`)

    // Invalidate cache
    this.invalidateProductCache(productId)
    this.invalidateAllProductCache()

    // Send WebSocket notification if available
    if (typeof window !== "undefined") {
      console.log("Sending WebSocket notification for product update")
      websocketService.send("product_updated", { id: productId, timestamp: Date.now() })

      // Also dispatch a custom event that components can listen for
      const event = new CustomEvent("product-updated", { detail: { id: productId } })
      window.dispatchEvent(event)
    }
  },
}

