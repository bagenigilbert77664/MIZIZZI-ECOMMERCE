import api from "@/lib/api"
import type { Product, ProductImage, Category, Brand } from "@/types"
import { prefetchData } from "@/lib/api"
import { websocketService } from "@/services/websocket"
// Add import for imageCache
import { imageCache } from "@/services/image-cache"
// Only showing the changes needed to integrate with the new batch service
import { imageBatchService } from "@/services/image-batch-service"

// Cache maps with timestamps for expiration
const productCache = new Map<string, { data: Product; timestamp: number }>()
const productImagesCache = new Map<string, { data: ProductImage[]; timestamp: number }>()
const categoriesCache = new Map<string, { data: Category[]; timestamp: number }>()
const brandsCache = new Map<string, { data: Brand[]; timestamp: number }>()
const productReviewsCache = new Map<string, { data: any[]; timestamp: number }>() // Separate cache for reviews

// Cache durations
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for products
const CATEGORIES_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes for categories
const BRANDS_CACHE_DURATION = 30 * 60 * 1000 // 30 minutes for brands

// Default seller information
const defaultSeller = {
  id: 1,
  name: "Mizizzi Store",
  rating: 4.8,
  verified: true,
  store_name: "Mizizzi Official Store",
  logo_url: "/logo.png",
}

export const productService = {
  /**
   * Get products with optional filtering parameters
   * @param params Optional query parameters for filtering
   * @returns Promise resolving to an array of products
   */
  async getProducts(params = {}): Promise<Product[]> {
    try {
      console.log("API call: getProducts with params:", params)

      // Normalize query parameters
      const queryParams: Record<string, any> = { ...params }

      // Convert string "false" to boolean false if needed
      if (queryParams.is_flash_sale === "false" || queryParams.is_flash_sale === false) {
        queryParams.is_flash_sale = false
      }

      if (queryParams.is_luxury_deal === "false" || queryParams.is_luxury_deal === false) {
        queryParams.is_luxury_deal = false
      }

      // Generate cache key based on params
      const cacheKey = `products-${JSON.stringify(queryParams)}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      // Return cached data if available and not expired
      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached products data for params: ${JSON.stringify(queryParams)}`)
        return Array.isArray(cachedItem.data) ? cachedItem.data : [cachedItem.data]
      }

      // Fetch from API if not cached or cache expired
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

      // Client-side filtering if needed
      if (queryParams.is_flash_sale === false) {
        products = products.filter((product) => !product.is_flash_sale)
      }

      if (queryParams.is_luxury_deal === false) {
        products = products.filter((product) => !product.is_luxury_deal)
      }

      // Normalize and enhance products
      const enhancedProducts = products.map((product) => {
        // Normalize price data
        product = this.normalizeProductPrices(product)

        // Add product type for easier filtering and display
        product.product_type = product.is_flash_sale
          ? "flash_sale"
          : product.is_luxury_deal
            ? "luxury"
            : ("regular" as "flash_sale" | "luxury" | "regular")

        // Ensure image_urls is properly set
        if (product.images && Array.isArray(product.images)) {
          product.image_urls = product.images.map((img: any) => img.url || img)
        } else if (!product.image_urls) {
          product.image_urls = []
        }

        // Ensure thumbnail_url is set
        if (!product.thumbnail_url && product.image_urls && product.image_urls.length > 0) {
          product.thumbnail_url = product.image_urls[0]
        }

        return {
          ...product,
          seller: product.seller || defaultSeller,
        }
      })

      // Cache the results
      productCache.set(cacheKey, {
        data: enhancedProducts as any,
        timestamp: now,
      })

      // Prefetch images for all products in the background
      this.prefetchProductImages(enhancedProducts.map((p) => p.id.toString()))

      return enhancedProducts
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  },

  /**
   * Get products by category slug
   * @param categorySlug The category slug
   * @returns Promise resolving to an array of products
   */
  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByCategory for slug: ${categorySlug}`)

      // Check cache first
      const cacheKey = `products-category-${categorySlug}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached products for category ${categorySlug}`)
        // Fix: Return an array of products, not a single product
        return [cachedItem.data]
      }

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

      // Enhance products with images and normalize data
      const enhancedProducts = await Promise.all(
        products.map(async (product) => {
          // Normalize price data
          product = this.normalizeProductPrices(product)

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

      // Fix: Cache the array of products, not a single product
      // productCache.set(cacheKey, {
      //   data: enhancedProducts,
      //   timestamp: now,
      // })

      // Prefetch images for all products in the background
      this.prefetchProductImages(enhancedProducts.map((p) => p.id.toString()))

      return enhancedProducts
    } catch (error) {
      console.error(`Error fetching products for category ${categorySlug}:`, error)
      return []
    }
  },

  /**
   * Get a single product by ID
   * @param id The product ID
   * @returns Promise resolving to a product or null
   */
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

      // Ensure the product has valid data
      if (product) {
        // Normalize price data
        product = this.normalizeProductPrices(product)

        // Ensure variants have valid prices
        if (product.variants && Array.isArray(product.variants)) {
          product.variants = product.variants.map((variant: any) => {
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

        // Ensure image_urls is properly set from images array
        if (product.images && Array.isArray(product.images)) {
          product.image_urls = product.images.map((img: any) => img.url || img)
        } else if (!product.image_urls) {
          product.image_urls = []
        }

        // Ensure thumbnail_url is set
        if (!product.thumbnail_url && product.image_urls && product.image_urls.length > 0) {
          product.thumbnail_url = product.image_urls[0]
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

  /**
   * Get product images using the batch service
   * @param productId The product ID
   * @returns Promise resolving to an array of product images
   */
  async getProductImages(productId: string): Promise<ProductImage[]> {
    try {
      // First check if the images are in our cache
      const cacheKey = `product-images-${productId}`
      const now = Date.now()
      const cachedItem = productImagesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        // Only log in development and reduce verbosity
        if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
          console.log(`Using cached product images for product ${productId}`)
        }
        return cachedItem.data
      }

      // Only log in development
      if (process.env.NODE_ENV === "development") {
        console.log(`Fetching images for product ${productId} from API`)
      }

      // Use the batch service instead of direct API call
      const images = await imageBatchService.fetchProductImages(productId)

      // Cache the results
      productImagesCache.set(cacheKey, {
        data: images,
        timestamp: now,
      })

      // Also cache individual image URLs for quick access
      images.forEach((img) => {
        if (img.id && img.url) {
          imageCache.set(`image-${img.id}`, img.url)
        }
      })

      return images
    } catch (error) {
      console.error(`Error fetching images for product ${productId}:`, error)
      return []
    }
  },

  /**
   * Get a specific product image by ID
   * @param imageId The image ID
   * @returns Promise resolving to a product image or null
   */
  async getProductImage(imageId: string): Promise<ProductImage | null> {
    try {
      // Check if the image URL is already in our cache
      const cachedUrl = imageCache.get(`image-${imageId}`)
      if (cachedUrl) {
        console.log(`Using cached image URL for image ${imageId}`)
        return {
          id: imageId,
          url: cachedUrl,
          is_primary: false, // We don't know from cache, default value
          product_id: "", // We don't know from cache
          filename: "", // Default or unknown filename
          sort_order: 0, // Default sort order
        }
      }

      console.log(`Fetching product image with ID ${imageId}`)
      const response = await api.get(`/api/product-images/${imageId}`)

      // Cache the image URL for future use
      if (response.data && response.data.url) {
        imageCache.set(`image-${imageId}`, response.data.url)
      }

      return response.data
    } catch (error) {
      console.error(`Error fetching product image with ID ${imageId}:`, error)
      return null
    }
  },

  /**
   * Invalidate cache for a specific product
   * @param id The product ID
   */
  invalidateProductCache(id: string): void {
    const productCacheKey = `product-${id}`
    const imagesCacheKey = `product-images-${id}`
    productCache.delete(productCacheKey)
    productImagesCache.delete(imagesCacheKey)
    imageBatchService.invalidateCache(id)
    console.log(`Cache invalidated for product ${id} and its images`)
  },

  /**
   * Invalidate all product cache
   */
  invalidateAllProductCache(): void {
    productCache.clear()
    productImagesCache.clear()
    imageBatchService.clearCache()
    console.log("All product cache invalidated")
  },

  /**
   * Get a product by slug
   * @param slug The product slug
   * @returns Promise resolving to a product or null
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      // Check cache first
      const cacheKey = `product-slug-${slug}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached product data for slug ${slug}`)
        return cachedItem.data
      }

      const response = await api.get(`/api/products/${slug}`)
      let product = response.data

      // Ensure the product has valid data
      if (product) {
        // Normalize price data
        product = this.normalizeProductPrices(product)

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

        // Cache the result with timestamp
        productCache.set(cacheKey, {
          data: product,
          timestamp: now,
        })

        // Also cache by ID for future reference
        if (product.id) {
          productCache.set(`product-${product.id}`, {
            data: product,
            timestamp: now,
          })
        }
      }

      return product
    } catch (error) {
      console.error(`Error fetching product with slug ${slug}:`, error)
      return null
    }
  },

  /**
   * Get featured products
   * @returns Promise resolving to an array of products
   */
  async getFeaturedProducts(): Promise<Product[]> {
    return this.getProducts({ featured: true })
  },

  /**
   * Get new products
   * @returns Promise resolving to an array of products
   */
  async getNewProducts(): Promise<Product[]> {
    return this.getProducts({ new: true })
  },

  /**
   * Get sale products
   * @returns Promise resolving to an array of products
   */
  async getSaleProducts(): Promise<Product[]> {
    return this.getProducts({ sale: true })
  },

  /**
   * Get flash sale products
   * @returns Promise resolving to an array of products
   */
  async getFlashSaleProducts(): Promise<Product[]> {
    return this.getProducts({ flash_sale: true })
  },

  /**
   * Get luxury deal products
   * @returns Promise resolving to an array of products
   */
  async getLuxuryDealProducts(): Promise<Product[]> {
    return this.getProducts({ luxury_deal: true })
  },

  /**
   * Get products by IDs
   * @param productIds Array of product IDs
   * @returns Promise resolving to an array of products
   */
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
      const apiProducts = Array.isArray(response.data) ? response.data : response.data.items || []

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

          // Normalize price data
          product = this.normalizeProductPrices(product)

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

  /**
   * Get product for cart item
   * @param productId The product ID
   * @returns Promise resolving to a product or null
   */
  async getProductForCartItem(productId: number): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `product-${productId}`
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached product data for cart item ${productId}`)
        return cachedItem.data
      }

      const response = await api.get(`/api/products/${productId}?include=details,variants,images,stock`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product ${productId} for cart:`, error)
      return null
    }
  },

  /**
   * Get products for cart items
   * @param productIds Array of product IDs
   * @returns Promise resolving to a record of products
   */
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
              productMap[id] = {
                id: product.id,
                name: product.name,
                slug: product.slug,
                thumbnail_url: product.thumbnail_url || "/placeholder.svg",
                image_urls: product.image_urls || [],
                category: product.category?.name || product.category_id,
                stock: product.stock,
                sku: product.sku,
                price: product.price,
                sale_price: product.sale_price,
              }

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

  /**
   * Create a fallback product
   * @param productId The product ID
   * @returns A fallback product object
   */
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

  /**
   * Prefetch products by category
   * @param categoryId The category ID
   * @returns Promise resolving to a boolean
   */
  async prefetchProductsByCategory(categoryId: string): Promise<boolean> {
    return prefetchData("/api/products", { category_id: categoryId, limit: 12 })
  },

  /**
   * Prefetch homepage products
   */
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

  /**
   * Get product reviews
   * @param productId The product ID
   * @returns Promise resolving to an array of reviews
   */
  async getProductReviews(productId: number): Promise<any[]> {
    try {
      // Check cache first
      const cacheKey = `product-reviews-${productId}`
      const cachedItem = productReviewsCache.get(cacheKey)

      if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached reviews for product ${productId}`)
        return Array.isArray(cachedItem.data) ? cachedItem.data : [cachedItem.data]
      }

      // Try to fetch reviews from dedicated endpoint
      try {
        const response = await api.get(`/api/products/${productId}/reviews`)
        const reviews = response.data.items || response.data

        // Cache the reviews
        const reviewsArray = Array.isArray(reviews) ? reviews : [reviews]
        productReviewsCache.set(cacheKey, {
          data: reviewsArray,
          timestamp: Date.now(),
        })

        return reviewsArray
      } catch (error) {
        // Fallback: get the product and return its reviews
        const product = await this.getProduct(productId.toString())
        const reviews = product?.reviews || []
        return Array.isArray(reviews) ? reviews : [reviews]
      }
    } catch (error) {
      console.error(`Error fetching reviews for product ${productId}:`, error)
      return []
    }
  },

  /**
   * Notify about product update
   * @param productId The product ID
   */
  notifyProductUpdate(productId: string): void {
    console.log(`Notifying about product update for ID: ${productId}`)

    // Invalidate cache
    this.invalidateProductCache(productId)

    // Send WebSocket notification if available
    if (typeof window !== "undefined") {
      console.log("Sending WebSocket notification for product update")
      websocketService.send("product_updated", { id: productId, timestamp: Date.now() })

      // Also dispatch a custom event that components can listen for
      const event = new CustomEvent("product-updated", { detail: { id: productId } })
      window.dispatchEvent(event)
    }
  },

  /**
   * Prefetch images for multiple products
   * @param productIds Array of product IDs
   */
  async prefetchProductImages(productIds: string[]): Promise<void> {
    if (!productIds || productIds.length === 0) return

    // Use the batch service to prefetch images
    imageBatchService.prefetchProductImages(productIds)
  },

  /**
   * Get all categories
   * @returns Promise resolving to an array of categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      // Check cache first
      const cacheKey = "all-categories"
      const now = Date.now()
      const cachedItem = categoriesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CATEGORIES_CACHE_DURATION) {
        console.log("Using cached categories data")
        return cachedItem.data
      }

      const response = await api.get("/api/categories")
      const categories = response.data.items || response.data || []

      // Cache the categories
      categoriesCache.set(cacheKey, {
        data: categories,
        timestamp: now,
      })

      return categories
    } catch (error) {
      console.error("Error fetching categories:", error)
      return []
    }
  },

  /**
   * Get all brands
   * @returns Promise resolving to an array of brands
   */
  async getBrands(): Promise<Brand[]> {
    try {
      // Check cache first
      const cacheKey = "all-brands"
      const now = Date.now()
      const cachedItem = brandsCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < BRANDS_CACHE_DURATION) {
        console.log("Using cached brands data")
        return cachedItem.data
      }

      const response = await api.get("/api/brands")
      const brands = response.data.items || response.data || []

      // Cache the brands
      brandsCache.set(cacheKey, {
        data: brands,
        timestamp: now,
      })

      return brands
    } catch (error) {
      console.error("Error fetching brands:", error)
      return []
    }
  },

  /**
   * Normalize product prices
   * @param product The product to normalize
   * @returns The normalized product
   */
  normalizeProductPrices(product: Product): Product {
    // Convert price to number if it's a string
    if (typeof product.price === "string") {
      product.price = Number.parseFloat(product.price) || 0
    }

    // Ensure price is a valid number
    if (typeof product.price !== "number" || isNaN(product.price) || product.price < 0) {
      console.warn(`Invalid price for product ${product.id}, setting default price`)
      product.price = 0
    }

    // Convert sale_price to number if it's a string
    if (product.sale_price !== undefined && typeof product.sale_price === "string") {
      product.sale_price = Number.parseFloat(product.sale_price) || null
    }

    // Ensure sale_price is a valid number or null
    if (
      product.sale_price !== undefined &&
      product.sale_price !== null &&
      (typeof product.sale_price !== "number" || isNaN(product.sale_price) || product.sale_price < 0)
    ) {
      console.warn(`Invalid sale_price for product ${product.id}, setting to null`)
      product.sale_price = null
    }

    return product
  },

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): {
    products: number
    images: number
    categories: number
    brands: number
    batchServiceStats: any
  } {
    return {
      products: productCache.size,
      images: productImagesCache.size,
      categories: categoriesCache.size,
      brands: brandsCache.size,
      batchServiceStats: imageBatchService.getCacheStats(),
    }
  },

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    productCache.clear()
    productImagesCache.clear()
    categoriesCache.clear()
    brandsCache.clear()
    imageBatchService.clearCache()
    console.log("All caches cleared")
  },
}
