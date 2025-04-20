import api from "@/lib/api"
import type { Product, ProductImage } from "@/types"
import { prefetchData } from "@/lib/api"
import { websocketService } from "@/services/websocket"

// Add a cache map to store product details with timestamps
const productCache = new Map<string, { data: Product; timestamp: number }>()
const productImagesCache = new Map<string, { data: ProductImage[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Add a default seller
const defaultSeller = {
  id: 1,
  name: "Mizizzi Store",
  rating: 4.8,
  verified: true,
  store_name: "Mizizzi Official Store",
  logo_url: "/logo.png",
}

export const productService = {
  // Update the getProducts method to ensure proper filtering and handling of API responses
  async getProducts(params = {}): Promise<Product[]> {
    try {
      console.log("API call: getProducts with params:", params)

      // If we're excluding flash sale and luxury deal products, make sure the params are properly formatted
      // This ensures the API receives the correct boolean values
      const queryParams: Record<string, any> = { ...params }

      // Convert string "false" to boolean false if needed
      if (queryParams.is_flash_sale === "false" || queryParams.is_flash_sale === false) {
        queryParams.is_flash_sale = false
      }

      if (queryParams.is_luxury_deal === "false" || queryParams.is_luxury_deal === false) {
        queryParams.is_luxury_deal = false
      }

      const response = await api.get("/api/products", { params: queryParams })
      console.log("API response:", response.data)

      // Handle different API response formats
      let products: Product[] = []

      if (Array.isArray(response.data)) {
        products = response.data
      } else if (response.data.items && Array.isArray(response.data.items)) {
        products = response.data.items
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products
      } else {
        console.warn("Unexpected API response format:", response.data)
        products = []
      }

      // If the API doesn't support filtering by these parameters, we can filter the results here
      if (queryParams.is_flash_sale === false) {
        products = products.filter((product) => !product.is_flash_sale)
      }

      if (queryParams.is_luxury_deal === false) {
        products = products.filter((product) => !product.is_luxury_deal)
      }

      // Ensure all products have valid numeric prices and proper category information
      const enhancedProducts = await Promise.all(
        products.map(async (product) => {
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
          product.product_type = product.is_flash_sale
            ? "flash_sale"
            : product.is_luxury_deal
              ? "luxury"
              : ("regular" as "flash_sale" | "luxury" | "regular")

          // Fetch product images if they're not already included
          if ((!product.image_urls || product.image_urls.length === 0) && product.id) {
            try {
              const images = await this.getProductImages(product.id.toString())
              if (images && images.length > 0) {
                product.image_urls = images.map((img) => img.url)

                // Set thumbnail_url to the primary image if it exists
                const primaryImage = images.find((img) => img.is_primary)
                if (primaryImage) {
                  product.thumbnail_url = primaryImage.url
                } else if (images[0]) {
                  product.thumbnail_url = images[0].url
                }
              }
            } catch (error) {
              console.error(`Error fetching images for product ${product.id}:`, error)
            }
          }

          return {
            ...product,
            seller: product.seller || defaultSeller,
          }
        }),
      )

      return enhancedProducts
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  },

  // Update the getProductsByCategory method to handle different API response formats
  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByCategory for slug: ${categorySlug}`)
      const response = await api.get("/api/products", {
        params: { category_slug: categorySlug },
      })
      console.log("API response for category products:", response.data)

      // Handle different API response formats
      let products: Product[] = []

      if (Array.isArray(response.data)) {
        products = response.data
      } else if (response.data.items && Array.isArray(response.data.items)) {
        products = response.data.items
      } else if (response.data.products && Array.isArray(response.data.products)) {
        products = response.data.products
      } else {
        console.warn("Unexpected API response format:", response.data)
        products = []
      }

      // Enhance products with images
      const enhancedProducts = await Promise.all(
        products.map(async (product) => {
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

          // Fetch product images if they're not already included
          if ((!product.image_urls || product.image_urls.length === 0) && product.id) {
            try {
              const images = await this.getProductImages(product.id.toString())
              if (images && images.length > 0) {
                product.image_urls = images.map((img) => img.url)

                // Set thumbnail_url to the primary image if it exists
                const primaryImage = images.find((img) => img.is_primary)
                if (primaryImage) {
                  product.thumbnail_url = primaryImage.url
                } else if (images[0]) {
                  product.thumbnail_url = images[0].url
                }
              }
            } catch (error) {
              console.error(`Error fetching images for product ${product.id}:`, error)
            }
          }

          return {
            ...product,
            seller: product.seller || defaultSeller,
          }
        }),
      )

      return enhancedProducts
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
      let product = response.data

      // Ensure the product has valid price information
      if (product) {
        // Validate and fix price data
        if (typeof product.price === "string") {
          console.log(`Converting string price to number for product ${id}`)
          product.price = Number.parseFloat(product.price) || 0
        }

        if (typeof product.price !== "number" || isNaN(product.price) || product.price < 0) {
          console.warn(`Invalid price for product ${id}, setting default price`)
          product.price = 0
        }

        if (product.sale_price !== undefined && typeof product.sale_price === "string") {
          console.log(`Converting string sale_price to number for product ${id}`)
          product.sale_price = Number.parseFloat(product.sale_price) || null
        }

        if (
          product.sale_price !== undefined &&
          product.sale_price !== null &&
          (typeof product.sale_price !== "number" || isNaN(product.sale_price) || product.sale_price < 0)
        ) {
          console.warn(`Invalid sale_price for product ${id}, setting to null`)
          product.sale_price = null
        }

        // Ensure variants have valid prices
        if (product.variants && Array.isArray(product.variants)) {
          product.variants = product.variants.map((variant: { price: any }) => {
            if (typeof variant.price === "string") {
              variant.price = Number.parseFloat(variant.price) || 0
            }

            if (typeof variant.price !== "number" || isNaN(variant.price) || variant.price < 0) {
              console.warn(`Invalid price for variant in product ${id}, using product price`)
              variant.price = product.price
            }
            return variant
          })
        }

        // Fetch product images if they're not already included
        if (!product.image_urls || product.image_urls.length === 0) {
          try {
            const images = await this.getProductImages(id)
            if (images && images.length > 0) {
              product.image_urls = images.map((img) => img.url)

              // Set thumbnail_url to the primary image if it exists
              const primaryImage = images.find((img) => img.is_primary)
              if (primaryImage) {
                product.thumbnail_url = primaryImage.url
              } else if (images[0]) {
                product.thumbnail_url = images[0].url
              }
            }
          } catch (error) {
            console.error(`Error fetching images for product ${id}:`, error)
          }
        }

        product = {
          ...product,
          seller: product.seller || defaultSeller,
        }

        // Cache the result with timestamp
        productCache.set(cacheKey, {
          data: product,
          timestamp: now,
        })

        // Prefetch related products in the background
        if (product.category_id) {
          prefetchData(`${API_BASE_URL}/api/products`, {
            category_id: product.category_id,
            limit: 8,
          })
        }
      }

      return product
    } catch (error) {
      console.error(`Error fetching product with id ${id}:`, error)
      return null
    }
  },

  // Get product images using the dedicated product images endpoint
  async getProductImages(productId: string): Promise<ProductImage[]> {
    try {
      // Check cache first
      const cacheKey = `product-images-${productId}`
      const now = Date.now()
      const cachedItem = productImagesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached product images for product ${productId}`)
        return cachedItem.data
      }

      console.log(`Fetching images for product ${productId} from API`)
      const response = await api.get(`/api/products/${productId}/images`)

      let images: ProductImage[] = []

      // Handle different API response formats
      if (Array.isArray(response.data)) {
        images = response.data
      } else if (response.data.items && Array.isArray(response.data.items)) {
        images = response.data.items
      } else if (response.data.images && Array.isArray(response.data.images)) {
        images = response.data.images
      } else {
        console.warn("Unexpected API response format for product images:", response.data)
        images = []
      }

      // Cache the images
      productImagesCache.set(cacheKey, {
        data: images,
        timestamp: now,
      })

      return images
    } catch (error) {
      console.error(`Error fetching images for product ${productId}:`, error)
      return []
    }
  },

  // Get a specific product image by ID
  async getProductImage(imageId: string): Promise<ProductImage | null> {
    try {
      console.log(`Fetching product image with ID ${imageId}`)
      const response = await api.get(`/api/product-images/${imageId}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product image with ID ${imageId}:`, error)
      return null
    }
  },

  // Invalidate cache for a specific product
  invalidateProductCache(id: string): void {
    const productCacheKey = `product-${id}`
    const imagesCacheKey = `product-images-${id}`
    productCache.delete(productCacheKey)
    productImagesCache.delete(imagesCacheKey)
    console.log(`Cache invalidated for product ${id} and its images`)
  },

  // Invalidate all product cache
  invalidateAllProductCache(): void {
    productCache.clear()
    productImagesCache.clear()
    console.log("All product cache invalidated")
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const response = await api.get(`/api/products/${slug}`)
      let product = response.data

      // Validate and fix price data
      if (product) {
        if (typeof product.price === "string") {
          product.price = Number.parseFloat(product.price) || 0
        }

        if (typeof product.price !== "number" || isNaN(product.price) || product.price < 0) {
          console.warn(`Invalid price for product ${slug}, setting default price`)
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
          console.warn(`Invalid sale_price for product ${slug}, setting to null`)
          product.sale_price = null
        }

        // Fetch product images if they're not already included
        if (!product.image_urls || product.image_urls.length === 0) {
          try {
            const images = await this.getProductImages(product.id.toString())
            if (images && images.length > 0) {
              product.image_urls = images.map((img) => img.url)

              // Set thumbnail_url to the primary image if it exists
              const primaryImage = images.find((img) => img.is_primary)
              if (primaryImage) {
                product.thumbnail_url = primaryImage.url
              } else if (images[0]) {
                product.thumbnail_url = images[0].url
              }
            }
          } catch (error) {
            console.error(`Error fetching images for product ${product.id}:`, error)
          }
        }

        product = {
          ...product,
          seller: product.seller || defaultSeller,
        }
      }

      return product
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
      const enhancedApiProducts = await Promise.all(
        apiProducts.map(async (product: Product) => {
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

          // Fetch product images if they're not already included
          if (!product.image_urls || product.image_urls.length === 0) {
            try {
              const images = await this.getProductImages(productId)
              if (images && images.length > 0) {
                product.image_urls = images.map((img) => img.url)

                // Set thumbnail_url to the primary image if it exists
                const primaryImage = images.find((img) => img.is_primary)
                if (primaryImage) {
                  product.thumbnail_url = primaryImage.url
                } else if (images[0]) {
                  product.thumbnail_url = images[0].url
                }
              }
            } catch (error) {
              console.error(`Error fetching images for product ${productId}:`, error)
            }
          }

          return {
            ...product,
            seller: product.seller || defaultSeller,
          }
        }),
      )

      // Add enhanced products to map and cache
      enhancedApiProducts.forEach((product) => {
        const productId = product.id.toString()
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
  async getProductForCartItem(productId: number): Promise<any> {
    try {
      const response = await api.get(`/api/products/${productId}?include=details,variants,images,stock`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product ${productId} for cart:`, error)
      return null
    }
  },

  // Add or modify the getProductsForCartItems function in productService
  // This function should fetch multiple products at once for cart items

  async getProductsForCartItems(productIds: number[]): Promise<Record<number, any>> {
    if (!productIds || productIds.length === 0) return {}

    try {
      console.log(`Batch fetching products for cart items: ${productIds.join(", ")}`)

      // Deduplicate product IDs
      const uniqueIds = [...new Set(productIds)]
      const productMap: Record<number, any> = {}

      // Instead of using the batch endpoint which is failing, fetch products individually
      // but use Promise.all to fetch them in parallel
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            // First check if we have this product in cache
            const cacheKey = `product-${id}`
            const cachedItem = productCache.get(cacheKey)

            if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
              console.log(`Using cached product data for id ${id}`)
              productMap[id] = cachedItem.data
              return
            }

            // If not in cache, fetch it
            const product = await this.getProduct(id.toString())
            if (product) {
              productMap[id] = product

              // Update cache
              productCache.set(cacheKey, {
                data: product,
                timestamp: Date.now(),
              })
            } else {
              // Create a fallback product if fetch fails
              productMap[id] = this.createFallbackProduct(id)
            }
          } catch (err) {
            console.error(`Failed to fetch product ${id}:`, err)
            // Create a fallback product for failed fetches
            productMap[id] = this.createFallbackProduct(id)
          }
        }),
      )

      return productMap
    } catch (error) {
      console.error("Error fetching products for cart items:", error)

      // Fallback: create default products for all IDs
      const productMap: Record<number, any> = {}
      productIds.forEach((id) => {
        productMap[id] = this.createFallbackProduct(id)
      })

      return productMap
    }
  },

  // Add a helper method to create fallback products
  createFallbackProduct(productId: number | string): any {
    return {
      id: productId,
      name: `Product ${productId}`,
      slug: `product-${productId}`,
      price: 999,
      sale_price: null,
      stock: 10,
      is_sale: false,
      is_luxury_deal: false,
      description: "Product information is currently being loaded. Please refresh the cart to see complete details.",
      thumbnail_url: "/placeholder.svg",
      image_urls: ["/placeholder.svg"],
      category_id: "unavailable",
      product_type: "regular",
      seller: {
        id: 1,
        name: "Mizizzi Store",
        rating: 4.8,
        verified: true,
        store_name: "Mizizzi Official Store",
        logo_url: "/logo.png",
      },
      sku: `SKU-${productId}`,
    }
  },

  // Add a method to fetch multiple products for cart items in a single batch
  async getProductsForCartItems_old(productIds: (number | string)[]): Promise<Record<string, any>> {
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
        const individualResults = await Promise.allSettled(
          missingIds.map((id) => this.getProductForCartItem(Number(id))),
        )

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
