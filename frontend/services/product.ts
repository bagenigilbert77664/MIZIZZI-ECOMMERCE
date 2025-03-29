import api from "@/lib/api"
import type { Product } from "@/types"
import { prefetchData } from "@/lib/api"

// Add a cache map to store product details with timestamps
const productCache = new Map<string, { data: Product; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const productService = {
  async getProducts(params = {}): Promise<Product[]> {
    try {
      console.log("API call: getProducts with params:", params)
      const response = await api.get("/api/products", { params })
      console.log("API response:", response.data)
      return response.data.items || []
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
      return response.data.items || []
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
      const response = await api.get(`/api/products/${id}`)

      // Cache the result with timestamp
      if (response.data) {
        productCache.set(cacheKey, {
          data: response.data,
          timestamp: now,
        })

        // Prefetch related products in the background
        if (response.data.category_id) {
          prefetchData("/api/products", {
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

  // Modify the getProductsByIds method to add more detailed logging and error handling
  async getProductsByIds(productIds: (number | string)[]): Promise<Product[]> {
    try {
      // Validate and convert all IDs to strings for consistency
      const stringIds = productIds
        .filter((id) => id !== null && id !== undefined) // Filter out null/undefined
        .map((id) => String(id).trim()) // Convert to string and trim
        .filter((id) => id !== "") // Filter out empty strings

      console.log(`API call: getProductsByIds for ids: ${stringIds.join(", ")}`)

      // Make sure we have valid IDs to fetch
      if (stringIds.length === 0) {
        console.warn("No valid product IDs provided to getProductsByIds")
        return []
      }

      // Try to get products from cache first
      const cachedProducts: Product[] = []
      const uncachedIds: string[] = []
      const now = Date.now()

      stringIds.forEach((id) => {
        const cacheKey = `product-${id}`
        const cachedItem = productCache.get(cacheKey)

        if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
          console.log(`Using cached product data for id ${id}: ${cachedItem.data.name}`)
          cachedProducts.push(cachedItem.data)
        } else {
          uncachedIds.push(id)
        }
      })

      // If all products were in cache, return them
      if (uncachedIds.length === 0) {
        console.log(`All ${cachedProducts.length} products found in cache`)
        return cachedProducts
      }

      // Otherwise, fetch the uncached products
      console.log(`Fetching ${uncachedIds.length} uncached products from API`)

      // Try different API endpoints if the batch endpoint fails
      let fetchedProducts: Product[] = []

      try {
        // First try the batch endpoint
        console.log(`Trying batch endpoint with IDs: ${uncachedIds.join(",")}`)
        const response = await api.get("/api/products/batch", {
          params: { ids: uncachedIds.join(",") },
        })

        // Log the raw response for debugging
        console.log(`Raw batch API response structure:`, Object.keys(response.data || {}).join(", "))

        // Handle different response formats
        if (response.data?.items && Array.isArray(response.data.items)) {
          fetchedProducts = response.data.items
          console.log(`Using response.data.items format, found ${fetchedProducts.length} products`)
        } else if (Array.isArray(response.data)) {
          fetchedProducts = response.data
          console.log(`Using array response.data format, found ${fetchedProducts.length} products`)
        } else if (response.data && typeof response.data === "object") {
          // Some APIs might return an object with product IDs as keys
          fetchedProducts = Object.values(response.data)
          console.log(`Using object response.data format, found ${fetchedProducts.length} products`)
        }

        // Log the first product structure if available
        if (fetchedProducts.length > 0) {
          console.log(`First product structure: ${Object.keys(fetchedProducts[0]).join(", ")}`)
          console.log(`First product name: ${fetchedProducts[0].name}`)
        }

        console.log(`Batch API returned ${fetchedProducts.length} products`)
      } catch (batchError) {
        console.error("Batch API failed, falling back to individual requests:", batchError)

        // If batch endpoint fails, try individual requests
        console.log(`Trying individual requests for ${uncachedIds.length} products`)
        const individualRequests = uncachedIds.map((id) =>
          this.getProduct(id).catch((err) => {
            console.error(`Failed to fetch individual product ${id}:`, err)
            return null
          }),
        )

        const individualResults = await Promise.all(individualRequests)
        fetchedProducts = individualResults.filter((product) => product !== null) as Product[]
        console.log(`Individual requests returned ${fetchedProducts.length} products`)
      }

      // Cache the fetched products
      fetchedProducts.forEach((product) => {
        if (product && product.id) {
          const cacheKey = `product-${product.id}`
          productCache.set(cacheKey, {
            data: product,
            timestamp: now,
          })
          console.log(`Cached product ${product.id}: ${product.name}`)
        }
      })

      // Combine cached and fetched products
      const allProducts = [...cachedProducts, ...fetchedProducts]
      console.log(
        `Returning ${allProducts.length} products (${cachedProducts.length} from cache, ${fetchedProducts.length} fetched)`,
      )

      // Log each product for debugging
      allProducts.forEach((product) => {
        console.log(
          `Product ${product.id}: ${product.name}, image: ${
            product.thumbnail_url ||
            (product.image_urls && product.image_urls.length > 0 ? product.image_urls[0] : "none")
          }`,
        )
      })

      return allProducts
    } catch (error) {
      console.error(`Error in getProductsByIds:`, error)
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
}

