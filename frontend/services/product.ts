import api from "@/lib/api"
import type { Product } from "@/types"
import { prefetchData } from "@/lib/api"
import { websocketService } from "@/services/websocket"

// Add a cache map to store product details with timestamps
const productCache = new Map<string, { data: Product; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const productService = {
  // Update the getProducts method to ensure proper filtering of Flash Sale and Luxury Deal products
  async getProducts(params = {}): Promise<Product[]> {
    try {
      console.log("API call: getProducts with params:", params)

      // If we're excluding flash sale and luxury deal products, make sure the params are properly formatted
      // This ensures the API receives the correct boolean values
      const queryParams: { is_flash_sale?: string | boolean; is_luxury_deal?: string | boolean } = { ...params }

      // Convert string "false" to boolean false if needed
      if (queryParams.is_flash_sale === "false" || queryParams.is_flash_sale === false) {
        queryParams.is_flash_sale = false
      }

      if (queryParams.is_luxury_deal === "false" || queryParams.is_luxury_deal === false) {
        queryParams.is_luxury_deal = false
      }

      const response = await api.get("/api/products", { params: queryParams })
      console.log("API response:", response.data)

      // If the API doesn't support filtering by these parameters, we can filter the results here
      let products = (response.data.items || []) as Product[]

      // Explicitly filter out Flash Sale and Luxury Deal products if requested
      if (queryParams.is_flash_sale === false) {
        products = products.filter((product) => !product.is_flash_sale)
      }

      if (queryParams.is_luxury_deal === false) {
        products = products.filter((product) => !product.is_luxury_deal)
      }

      // Ensure all products have valid numeric prices and proper category information
      return products.map((product) => {
        // Convert price to number if it's a string
        if (typeof product.price === "string") {
          product.price = Number.parseFloat(product.price) || 0
        }

        // Ensure price is a valid number
        if (typeof product.price !== "number" || isNaN(product.price)) {
          product.price = 0
        }

        // Convert sale_price to number if it's a string
        if (typeof product.sale_price === "string") {
          product.sale_price = Number.parseFloat(product.sale_price) || null
        }

        // Ensure sale_price is a valid number or null
        if (product.sale_price !== null && (typeof product.sale_price !== "number" || isNaN(product.sale_price))) {
          product.sale_price = null
        }

        // Add product type for easier filtering and display
        product.product_type = product.is_flash_sale ? "flash_sale" : product.is_luxury_deal ? "luxury" : "regular"

        return product
      })
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

      // Ensure all products have valid numeric prices
      const products = (response.data.items || []) as Product[]
      return products.map((product) => {
        // Convert price to number if it's a string
        if (typeof product.price === "string") {
          product.price = Number.parseFloat(product.price) || 0
        }

        // Ensure price is a valid number
        if (typeof product.price !== "number" || isNaN(product.price)) {
          product.price = 0
        }

        // Convert sale_price to number if it's a string
        if (typeof product.sale_price === "string") {
          product.sale_price = Number.parseFloat(product.sale_price) || null
        }

        // Ensure sale_price is a valid number or null
        if (product.sale_price !== null && (typeof product.sale_price !== "number" || isNaN(product.sale_price))) {
          product.sale_price = null
        }

        return product
      })
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

      // Ensure the product has valid price information
      if (response.data) {
        // Validate and fix price data
        if (typeof response.data.price === "string") {
          console.log(`Converting string price to number for product ${id}`)
          response.data.price = Number.parseFloat(response.data.price) || 0
        }

        if (typeof response.data.price !== "number" || isNaN(response.data.price) || response.data.price < 0) {
          console.warn(`Invalid price for product ${id}, setting default price`)
          response.data.price = 0
        }

        if (response.data.sale_price !== undefined && typeof response.data.sale_price === "string") {
          console.log(`Converting string sale_price to number for product ${id}`)
          response.data.sale_price = Number.parseFloat(response.data.sale_price) || null
        }

        if (
          response.data.sale_price !== undefined &&
          response.data.sale_price !== null &&
          (typeof response.data.sale_price !== "number" ||
            isNaN(response.data.sale_price) ||
            response.data.sale_price < 0)
        ) {
          console.warn(`Invalid sale_price for product ${id}, setting to null`)
          response.data.sale_price = null
        }

        // Ensure variants have valid prices
        if (response.data.variants && Array.isArray(response.data.variants)) {
          response.data.variants = response.data.variants.map((variant: { price: any }) => {
            if (typeof variant.price === "string") {
              variant.price = Number.parseFloat(variant.price) || 0
            }

            if (typeof variant.price !== "number" || isNaN(variant.price) || variant.price < 0) {
              console.warn(`Invalid price for variant in product ${id}, using product price`)
              variant.price = response.data.price
            }
            return variant
          })
        }

        // Cache the result with timestamp
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
      // Validate and fix price data
      if (response.data) {
        if (typeof response.data.price === "string") {
          response.data.price = Number.parseFloat(response.data.price) || 0
        }

        if (typeof response.data.price !== "number" || isNaN(response.data.price) || response.data.price < 0) {
          console.warn(`Invalid price for product ${slug}, setting default price`)
          response.data.price = 0
        }

        if (response.data.sale_price !== undefined && typeof response.data.sale_price === "string") {
          response.data.sale_price = Number.parseFloat(response.data.sale_price) || null
        }

        if (
          response.data.sale_price !== undefined &&
          response.data.sale_price !== null &&
          (typeof response.data.sale_price !== "number" ||
            isNaN(response.data.sale_price) ||
            response.data.sale_price < 0)
        ) {
          console.warn(`Invalid sale_price for product ${slug}, setting to null`)
          response.data.sale_price = null
        }
      }
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

  // Updated getProductsByIds method to better handle product identification
  async getProductsByIds(productIds: number[]): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByIds for ids: ${productIds.join(", ")}`)

      // If no product IDs are provided, return an empty array
      if (!productIds.length) {
        return []
      }

      // Convert all IDs to strings for consistent comparison
      const requestedIds = productIds.map((id) => id.toString())

      // First check if any products are in the cache
      const cachedProducts: Product[] = []
      const missingIds: string[] = []

      requestedIds.forEach((id) => {
        const cacheKey = `product-${id}`
        const cachedItem = productCache.get(cacheKey)

        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
          cachedProducts.push(cachedItem.data)
        } else {
          missingIds.push(id)
        }
      })

      // If all products were in cache, return them
      if (missingIds.length === 0) {
        console.log(`All ${requestedIds.length} products found in cache`)
        return cachedProducts
      }

      // Make the API request for missing products
      console.log(`Fetching ${missingIds.length} products from API: ${missingIds.join(", ")}`)
      const response = await api.get("/api/products", {
        params: { ids: missingIds.join(",") },
      })

      console.log("API response for products by IDs:", response.data)

      // Get the items from the response
      const apiProducts = response.data.items || []

      // Create a map of product IDs to products for easier lookup
      const productMap = new Map<string, Product>()

      // Add cached products to the map
      cachedProducts.forEach((product) => {
        productMap.set(product.id.toString(), product)
      })

      // Process API products and add to map
      apiProducts.forEach((product: Product) => {
        const productId = product.id.toString()

        // Validate and normalize price data
        if (typeof product.price === "string") {
          product.price = Number.parseFloat(product.price) || 0
        }

        if (typeof product.price !== "number" || isNaN(product.price) || product.price < 0) {
          console.warn(`Invalid price for product ${productId}, setting default price`)
          product.price = 0
        }

        if (product.sale_price !== undefined && typeof product.sale_price === "string") {
          product.sale_price = Number.parseFloat(product.sale_price) || null
        }

        if (
          product.sale_price !== undefined &&
          product.sale_price !== null &&
          (typeof product.sale_price !== "number" || isNaN(product.sale_price) || product.sale_price < 0)
        ) {
          product.sale_price = null
        }

        // Add to map and cache
        productMap.set(productId, product)

        // Update cache
        const cacheKey = `product-${productId}`
        productCache.set(cacheKey, {
          data: product,
          timestamp: Date.now(),
        })
      })

      // Check which IDs are still missing
      const stillMissingIds = requestedIds.filter((id) => !productMap.has(id))

      if (stillMissingIds.length > 0) {
        console.log(`Still missing ${stillMissingIds.length} products: ${stillMissingIds.join(", ")}`)

        // Fetch missing products individually
        const individualResults = await Promise.allSettled(stillMissingIds.map((id) => this.getProduct(id)))

        // Add successful results to the map
        individualResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            const product = result.value
            productMap.set(stillMissingIds[index], product)
          }
        })
      }

      // Create the final result array in the same order as the requested IDs
      const result = requestedIds.map((id) => productMap.get(id)).filter((product): product is Product => !!product)

      console.log(`Found ${result.length} of ${requestedIds.length} requested products`)
      return result
    } catch (error) {
      console.error(`Error fetching products by ids:`, error)
      // Return an empty array instead of throwing, so the code can fall back to individual requests
      return []
    }
  },

  // Add a new method to handle missing product data in cart items
  async getProductForCartItem(productId: number | string): Promise<any> {
    try {
      console.log(`Fetching missing product data for cart item with product ID: ${productId}`)
      const product = await this.getProduct(productId.toString())

      if (product) {
        return product
      } else {
        // Create a fallback product with minimal data to prevent UI errors
        console.warn(`Could not fetch product ${productId}, creating fallback product`)
        return {
          id: productId,
          name: "Product Unavailable",
          price: 0,
          description: "This product is currently unavailable",
          thumbnail_url: "/empty-shelf-sadness.png",
          image_urls: ["/empty-shelf-sadness.png"],
          stock: 0,
          is_active: false,
        }
      }
    } catch (error) {
      console.error(`Error fetching product for cart item (ID: ${productId}):`, error)
      // Return a fallback product to prevent UI errors
      return {
        id: productId,
        name: "Product Unavailable",
        price: 0,
        description: "This product is currently unavailable",
        thumbnail_url: "/empty-shelf-sadness.png",
        image_urls: ["/empty-shelf-sadness.png"],
        stock: 0,
        is_active: false,
      }
    }
  },

  // Add a method to fetch multiple products for cart items in a single batch
  async getProductsForCartItems(productIds: (number | string)[]): Promise<Record<string, any>> {
    try {
      console.log(`Batch fetching products for cart items: ${productIds.join(", ")}`)

      // Remove duplicates
      const uniqueIds = [...new Set(productIds)].map((id) => id.toString())
      const productMap: Record<string, any> = {}

      // Try to fetch products in batch first
      const products = await this.getProductsByIds(uniqueIds.map((id) => Number(id)))

      // Add products to the map
      products.forEach((product) => {
        if (product && product.id) {
          productMap[product.id.toString()] = product
        }
      })

      // Check which IDs are still missing after the batch request
      const missingIds = uniqueIds.filter((id) => !productMap[id])

      if (missingIds.length > 0) {
        console.log(`Fetching ${missingIds.length} missing products individually: ${missingIds.join(", ")}`)

        // Use Promise.allSettled to handle individual failures gracefully
        const individualResults = await Promise.allSettled(missingIds.map((id) => this.getProductForCartItem(id)))

        // Process results, including only successful ones
        individualResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value) {
            productMap[missingIds[index]] = result.value
          }
        })
      }

      return productMap
    } catch (error) {
      console.error("Error fetching products for cart items:", error)
      return {}
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
