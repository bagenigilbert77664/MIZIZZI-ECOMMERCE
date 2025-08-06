import api, { prefetchData } from "@/lib/api"
import type { Product, ProductImage, Category, Brand, ProductCreatePayload, ProductVariant } from "@/types"
import { imageCache } from "@/services/image-cache"
import { logger } from "@/lib/logger"
import { getAuthToken } from "@/lib/utils"

// Add a request deduplication cache
const pendingProductRequests = new Map<string, Promise<Product[] | Product>>()

// Cache maps with timestamps for expiration
const productCache = new Map<string, { data: Product | Product[]; timestamp: number }>()
const productImagesCache = new Map<string, { data: ProductImage[]; timestamp: number }>()
const categoriesCache = new Map<string, { data: Category[]; timestamp: number }>()
const brandsCache = new Map<string, { data: Brand[]; timestamp: number }>()
const productReviewsCache = new Map<string, { data: any[]; timestamp: number }>()

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

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

/**
 * Helper function to safely parse and validate image URLs.
 */
function parseImageUrls(imageUrls: unknown): string[] {
  if (!imageUrls) return []

  try {
    // If it's already an array, filter and return valid URLs
    if (Array.isArray(imageUrls)) {
      return imageUrls
        .filter((url): url is string => typeof url === "string" && url.trim() !== "")
        .map((url: string) => url.trim())
        .filter((url: string) => {
          return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
        })
    }

    // If it's a string, try to parse as JSON first
    if (typeof imageUrls === "string") {
      if (imageUrls === "[" || imageUrls === "]" || imageUrls === "[]") {
        return []
      }

      // Check if it looks like JSON
      if (imageUrls.startsWith("[") && imageUrls.endsWith("]")) {
        try {
          const parsed = JSON.parse(imageUrls)
          if (Array.isArray(parsed)) {
            return parsed
              .filter((url): url is string => typeof url === "string" && url.trim() !== "")
              .map((url: string) => url.trim())
              .filter((url: string) => {
                return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
              })
          }
        } catch (error) {
          logger.warn("Failed to parse image URLs JSON from string:", { error: (error as Error).message })
          return []
        }
      }

      // If not JSON, treat as single URL
      const cleanUrl = imageUrls.trim()
      if (cleanUrl && (cleanUrl.startsWith("http") || cleanUrl.startsWith("/") || cleanUrl.startsWith("data:"))) {
        return [cleanUrl]
      }
    }

    return []
  } catch (error) {
    logger.error("Error parsing image URLs:", { error: (error as Error).message, imageUrls })
    return []
  }
}

/**
 * Helper function to validate and clean a single image URL.
 */
function validateImageUrl(url: unknown): string | null {
  if (!url || typeof url !== "string") return null

  const cleanUrl = url.trim()

  // Check for invalid patterns
  if (cleanUrl === "" || cleanUrl === "undefined" || cleanUrl === "null" || cleanUrl === "[" || cleanUrl === "]") {
    return null
  }

  // Must be a valid URL format
  if (!cleanUrl.startsWith("http") && !cleanUrl.startsWith("/") && !cleanUrl.startsWith("data:")) {
    return null
  }

  return cleanUrl
}

export const productService = {
  /**
   * Get products with optional filtering parameters
   */
  async getProducts(params: Record<string, any> = {}): Promise<Product[]> {
    try {
      logger.debug("API call: getProducts with params:", params)

      // Generate cache key based on params
      const cacheKey = `products-${JSON.stringify(params)}`
      const requestKey = `products-${JSON.stringify(params)}`

      // Check if there's already a pending request
      if (pendingProductRequests.has(requestKey)) {
        logger.debug(`Reusing pending request for: ${requestKey}`)
        return await (pendingProductRequests.get(requestKey) as Promise<Product[]>)
      }

      // Create the request promise
      const requestPromise = (async () => {
        const now = Date.now()
        const cachedItem = productCache.get(cacheKey)

        // Return cached data if available and not expired
        if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
          logger.debug(`Using cached products data for params: ${JSON.stringify(params)}`)
          return Array.isArray(cachedItem.data) ? (cachedItem.data as Product[]) : [cachedItem.data as Product]
        }

        // Fetch from API - using the correct endpoint from your backend
        const response = await api.get("/api/products", { params })
        logger.debug("API response for products:", { data: response.data })

        // Handle paginated response from your backend
        let products: Product[] = []

        if (response.data && typeof response.data === "object") {
          // Handle paginated response structure
          if (response.data.items && Array.isArray(response.data.items)) {
            products = response.data.items
          }
          // Handle direct array response
          else if (Array.isArray(response.data)) {
            products = response.data
          }
          // Handle products key
          else if (response.data.products && Array.isArray(response.data.products)) {
            products = response.data.products
          }
          // Handle data key
          else if (response.data.data && Array.isArray(response.data.data)) {
            products = response.data.data
          }
        } else if (Array.isArray(response.data)) {
          products = response.data
        }

        logger.debug(`Processed ${products.length} products from API response`)

        // Normalize and enhance products
        const enhancedProducts = await Promise.all(
          products.map(async (product) => {
            // Normalize product data to match frontend expectations
            const normalizedProduct = this.normalizeProduct(product)

            // Add product type for easier filtering
            normalizedProduct.product_type = normalizedProduct.is_flash_sale
              ? "flash_sale"
              : normalizedProduct.is_luxury_deal
                ? "luxury"
                : "regular"

            // Handle image URLs
            normalizedProduct.image_urls = parseImageUrls(normalizedProduct.image_urls)

            // Validate thumbnail URL
            if (normalizedProduct.thumbnail_url) {
              normalizedProduct.thumbnail_url = validateImageUrl(normalizedProduct.thumbnail_url)
            }

            // Set thumbnail from first image if not available
            if (normalizedProduct.image_urls.length > 0 && !normalizedProduct.thumbnail_url) {
              normalizedProduct.thumbnail_url = normalizedProduct.image_urls[0]
            }

            // Ensure we always have at least one image
            if (!normalizedProduct.image_urls || normalizedProduct.image_urls.length === 0) {
              const placeholderUrl = `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(normalizedProduct.name)}`
              normalizedProduct.image_urls = [placeholderUrl]
              normalizedProduct.thumbnail_url = placeholderUrl
            }

            return {
              ...normalizedProduct,
              seller: normalizedProduct.seller || defaultSeller,
            }
          }),
        )

        // Cache the results
        productCache.set(cacheKey, {
          data: enhancedProducts,
          timestamp: now,
        })

        // Prefetch images in background (client-side only)
        if (typeof window !== "undefined") {
          this.prefetchProductImages(enhancedProducts.map((p) => p.id.toString()))
        }

        return enhancedProducts
      })()

      // Store the promise to prevent duplicate requests
      pendingProductRequests.set(requestKey, requestPromise)

      try {
        const result = await requestPromise
        return result as Product[]
      } finally {
        // Clean up the pending request
        pendingProductRequests.delete(requestKey)
      }
    } catch (error) {
      logger.error("Error fetching products:", { error: (error as Error).message, params })
      throw new Error("Failed to load products. Please try again later.")
    }
  },

  /**
   * Get products by category slug
   */
  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    try {
      logger.debug(`API call: getProductsByCategory for slug: ${categorySlug}`)
      return await this.getProducts({ category_slug: categorySlug })
    } catch (error) {
      logger.error(`Error fetching products for category ${categorySlug}:`, {
        error: (error as Error).message,
        categorySlug,
      })
      throw new Error(`Failed to load products for category "${categorySlug}". Please try again later.`)
    }
  },

  /**
   * Get a single product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    // Validate product ID
    if (!id || typeof id !== "string") {
      logger.error("Invalid product ID provided to getProduct:", { id })
      return null
    }

    // Check cache first
    const cacheKey = `product-${id}`
    const now = Date.now()
    const cachedItem = productCache.get(cacheKey)

    if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
      logger.debug(`Using cached product data for id ${id}`)
      if (Array.isArray(cachedItem.data)) {
        const product = cachedItem.data.find((p) => p.id.toString() === id)
        return product || null
      }
      return cachedItem.data as Product
    }

    logger.debug(`Fetching product with id ${id} from API`)

    // Retry logic
    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        // Use the correct endpoint from your backend routes
        const response = await api.get(`/api/products/${id}`)

        if (!response || !response.data) {
          logger.warn(`Invalid API response for product ${id}, retrying...`, { attempt: retries + 1 })
          retries++
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
          continue
        }

        let product: Product = response.data

        if (product) {
          // Normalize the product data
          product = this.normalizeProduct(product)

          // Handle variants
          if (product.variants && Array.isArray(product.variants)) {
            product.variants = product.variants.map((variant: ProductVariant) => {
              if (typeof variant.price === "string") {
                variant.price = Number.parseFloat(variant.price) || 0
              }
              if (typeof variant.price !== "number" || isNaN(variant.price) || variant.price < 0) {
                variant.price = product.price
              }
              return variant
            })
          }

          // Handle images
          product.image_urls = parseImageUrls(product.image_urls)

          if (product.thumbnail_url) {
            product.thumbnail_url = validateImageUrl(product.thumbnail_url)
          }

          // Fetch additional images if needed (client-side only)
          if (product.image_urls.length === 0 && typeof window !== "undefined") {
            try {
              const images = await this.getProductImages(id)
              if (images && images.length > 0) {
                product.image_urls = images
                  .map((img: ProductImage) => validateImageUrl(img.url))
                  .filter((url): url is string => url !== null) as string[]

                const primaryImage = images.find((img: ProductImage) => img.is_primary)
                if (primaryImage && validateImageUrl(primaryImage.url)) {
                  product.thumbnail_url = validateImageUrl(primaryImage.url)
                } else if (images[0] && validateImageUrl(images[0].url)) {
                  product.thumbnail_url = validateImageUrl(images[0].url)
                }
              }
            } catch (error) {
              logger.error(`Error fetching images for product ${product.id}:`, { error: (error as Error).message })
            }
          }

          // Ensure we have images
          if (product.image_urls.length > 0 && !product.thumbnail_url) {
            product.thumbnail_url = product.image_urls[0]
          }

          if (!product.image_urls || product.image_urls.length === 0) {
            const fallbackImage = product.thumbnail_url || "/placeholder.svg?height=400&width=400"
            product.image_urls = [fallbackImage]
          }
          if (!product.thumbnail_url) {
            product.thumbnail_url = product.image_urls[0] || "/placeholder.svg?height=400&width=400"
          }

          product = {
            ...product,
            seller: product.seller || defaultSeller,
          }

          // Cache the result
          if (product.id) {
            productCache.set(cacheKey, {
              data: product,
              timestamp: now,
            })
          }
        }

        return product
      } catch (error: any) {
        logger.error(`Error fetching product with id ${id} (attempt ${retries + 1}):`, {
          error: error.message,
          status: error.response?.status,
        })

        if (error.response?.status === 404) {
          logger.warn(`Product with id ${id} not found`)
          return null
        }

        retries++
        if (retries < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
        }
      }
    }

    logger.warn(`Failed to fetch product with id ${id} after ${MAX_RETRIES} attempts.`)
    return null
  },

  /**
   * Get a product by its slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      logger.debug(`API call: getProductBySlug for slug: ${slug}`)
      const response = await api.get(`/api/products/${slug}`)

      if (response.data) {
        const product = this.normalizeProduct(response.data)
        return {
          ...product,
          seller: product.seller || defaultSeller,
        }
      }

      return null
    } catch (error) {
      logger.error(`Error fetching product with slug ${slug}:`, { error: (error as Error).message })
      return null
    }
  },

  /**
   * Get product images
   */
  async getProductImages(productId: string | number): Promise<ProductImage[]> {
    const productIdStr = typeof productId === "number" ? productId.toString() : productId

    try {
      const cacheKey = `product-images-${productIdStr}`
      const now = Date.now()
      const cachedItem = productImagesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        logger.debug(`Using cached product images for product ${productIdStr}`)
        return cachedItem.data
      }

      logger.debug(`Fetching images for product ${productIdStr}`)

      // Use the correct endpoint from your backend
      const response = await api.get(`/api/products/${productIdStr}/images`)

      let images: ProductImage[] = []

      if (response.data) {
        if (Array.isArray(response.data)) {
          images = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          images = response.data.items
        } else if (response.data.images && Array.isArray(response.data.images)) {
          images = response.data.images
        }
      }

      const validImages = images
        .map((img, index): ProductImage | null => {
          if (!img || typeof img !== "object") return null

          const imageUrl = img.url
          const validUrl = validateImageUrl(imageUrl)
          if (!validUrl) return null

          return {
            id: img.id?.toString() || `${productIdStr}-${index}`,
            product_id: productIdStr,
            url: validUrl,
            filename: img.filename || "",
            is_primary: img.is_primary || false,
            sort_order: img.sort_order || index,
            alt_text: img.alt_text || "",
          }
        })
        .filter((img): img is ProductImage => img !== null)

      productImagesCache.set(cacheKey, {
        data: validImages,
        timestamp: now,
      })

      // Cache individual images
      validImages.forEach((img) => {
        if (img.id && img.url) {
          imageCache.set(`image-${img.id}`, img.url)
        }
      })

      logger.info(`Successfully fetched ${validImages.length} images for product ${productIdStr}`)
      return validImages
    } catch (error) {
      logger.error(`Error fetching images for product ${productIdStr}:`, {
        error: (error as Error).message,
      })
      return []
    }
  },

  /**
   * Get a specific product image by ID
   * @param imageId - The ID of the image to fetch.
   * @returns A promise that resolves to the product image or null if not found.
   */
  async getProductImage(imageId: string): Promise<ProductImage | null> {
    try {
      const cachedUrl = imageCache.get(`image-${imageId}`)
      if (cachedUrl) {
        logger.debug(`Using cached image URL for image ${imageId}`)
        return {
          id: imageId,
          url: cachedUrl,
          is_primary: false, // Default to false if not specified by actual image data
          product_id: "", // Default to empty string
          filename: "", // Default to empty string
          sort_order: 0, // Default to 0
        }
      }

      logger.debug(`Fetching product image with ID ${imageId}`)
      const response = await api.get(`/api/product-images/images/${imageId}`)

      if (response.data && response.data.url) {
        const validUrl = validateImageUrl(response.data.url)
        if (validUrl) {
          imageCache.set(`image-${imageId}`, validUrl)
          return {
            ...response.data,
            url: validUrl,
          }
        }
      }
      return response.data
    } catch (error) {
      logger.error(`Error fetching product image with ID ${imageId}:`, { error: (error as Error).message })
      return null
    }
  },

  /**
   * Create a new product
   */
  async createProduct(data: ProductCreatePayload): Promise<Product> {
    try {
      logger.info("Attempting to create product with data:", { productName: data.name })

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      // Validate required fields
      if (!data.name || data.name.trim().length < 3) {
        throw new Error("Product name must be at least 3 characters long.")
      }
      if (typeof data.price !== "number" || data.price <= 0) {
        throw new Error("Product price must be a number greater than 0.")
      }

      // Prepare product data according to your backend schema
      const productData = {
        name: data.name.trim(),
        slug:
          data.slug?.trim() ||
          data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        description: data.description || "",
        price: Number(data.price),
        sale_price: data.sale_price ? Number(data.sale_price) : null,
        stock: Number(data.stock) || 0,
        category_id: Number(data.category_id),
        brand_id: data.brand_id ? Number(data.brand_id) : null,
        sku: data.sku || `SKU-${Date.now()}`,
        weight: data.weight ? Number(data.weight) : null,
        is_featured: Boolean(data.is_featured),
        is_new: Boolean(data.is_new),
        is_sale: Boolean(data.is_sale),
        is_flash_sale: Boolean(data.is_flash_sale),
        is_luxury_deal: Boolean(data.is_luxury_deal),
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        image_urls: data.image_urls || [],
        thumbnail_url:
          data.thumbnail_url || (data.image_urls && data.image_urls.length > 0 ? data.image_urls[0] : null),
        variants: data.variants || [],
      }

      // Use the correct endpoint for creating products
      const response = await api.post("/api/products", productData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      logger.info("Product created successfully:", { productId: response.data?.id || "N/A" })

      let createdProduct: Product
      if (response.data.product) {
        createdProduct = response.data.product
      } else if (response.data.data) {
        createdProduct = response.data.data
      } else {
        createdProduct = response.data
      }

      // Normalize the created product
      createdProduct = this.normalizeProduct(createdProduct)

      // Invalidate cache and notify
      if (createdProduct && createdProduct.id) {
        this.notifyProductUpdate(createdProduct.id.toString())
      }

      return createdProduct
    } catch (error: any) {
      logger.error("Error creating product:", { error: error.message })

      if (error.response?.status === 401) {
        throw new Error("Authentication failed. Your session has expired. Please log in again.")
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || "Invalid product data. Please check all fields.")
      } else if (error.response?.status === 409) {
        throw new Error("A product with this name or SKU already exists.")
      }

      throw error
    }
  },

  /**
   * Update an existing product
   */
  async updateProduct(id: string, data: Partial<ProductCreatePayload>): Promise<Product> {
    try {
      logger.info("Attempting to update product with ID:", { productId: id })

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const response = await api.put(`/api/products/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      logger.info("Product updated successfully:", { productId: id })

      const updatedProduct = this.normalizeProduct(response.data.product || response.data)

      this.notifyProductUpdate(id)

      return updatedProduct
    } catch (error: any) {
      logger.error("Error updating product:", { error: error.message })
      throw error
    }
  },

  /**
   * Delete a product by ID
   */
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info("Attempting to delete product with ID:", { productId: id })

      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.")
      }

      const response = await api.delete(`/api/products/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      logger.info("Product deleted successfully:", { productId: id })

      this.notifyProductUpdate(id)

      return response.data || { success: true, message: "Product deleted successfully" }
    } catch (error: any) {
      logger.error("Error deleting product:", { error: error.message })
      throw error
    }
  },

  /**
   * Get categories
   */
  async getCategories(params?: {
    page?: number
    per_page?: number
    parent_id?: number
    search?: string
    is_featured?: boolean
  }): Promise<Category[]> {
    try {
      const cacheKey = `categories-${JSON.stringify(params || {})}`
      const now = Date.now()
      const cachedItem = categoriesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CATEGORIES_CACHE_DURATION) {
        logger.debug("Using cached categories data")
        return cachedItem.data as Category[]
      }

      const response = await api.get("/api/categories", { params })

      let categories: Category[] = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          categories = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          categories = response.data.items
        } else if (response.data.categories && Array.isArray(response.data.categories)) {
          categories = response.data.categories
        }
      }

      categoriesCache.set(cacheKey, {
        data: categories,
        timestamp: now,
      })

      return categories
    } catch (error) {
      logger.error("Error fetching categories:", { error: (error as Error).message })
      return []
    }
  },

  /**
   * Get brands
   */
  async getBrands(params?: { page?: number; per_page?: number; search?: string }): Promise<Brand[]> {
    try {
      const cacheKey = `brands-${JSON.stringify(params || {})}`
      const now = Date.now()
      const cachedItem = brandsCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < BRANDS_CACHE_DURATION) {
        logger.debug("Using cached brands data")
        return cachedItem.data as Brand[]
      }

      const response = await api.get("/api/brands", { params })

      let brands: Brand[] = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          brands = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          brands = response.data.items
        } else if (response.data.brands && Array.isArray(response.data.brands)) {
          brands = response.data.brands
        }
      }

      brandsCache.set(cacheKey, {
        data: brands,
        timestamp: now,
      })

      return brands
    } catch (error) {
      logger.error("Error fetching brands:", { error: (error as Error).message })
      return []
    }
  },

  /**
   * Normalize product data to ensure consistent format
   */
  normalizeProduct(product: any): Product {
    // Normalize product ID
    if (typeof product.id === "string") {
      product.id = Number.parseInt(product.id, 10)
    }
    if (typeof product.id !== "number" || isNaN(product.id)) {
      logger.warn(`Invalid ID for product, using 0 as fallback`, { originalId: product.id })
      product.id = 0
    }

    // Normalize prices
    if (typeof product.price === "string") {
      product.price = Number.parseFloat(product.price) || 0
    }
    if (typeof product.price !== "number" || isNaN(product.price) || product.price < 0) {
      logger.warn(`Invalid price for product ${product.id}, setting default price`)
      product.price = 0
    }

    if (typeof product.sale_price === "string") {
      product.sale_price = Number.parseFloat(product.sale_price) || null
    }
    if (
      product.sale_price !== undefined &&
      product.sale_price !== null &&
      (typeof product.sale_price !== "number" || isNaN(product.sale_price) || product.sale_price < 0)
    ) {
      logger.warn(`Invalid sale_price for product ${product.id}, setting to null`)
      product.sale_price = null
    }

    // Normalize stock
    if (typeof product.stock === "string") {
      product.stock = Number.parseInt(product.stock, 10) || 0
    }
    if (typeof product.stock !== "number" || isNaN(product.stock)) {
      product.stock = 0
    }

    // Normalize boolean fields
    product.is_featured = Boolean(product.is_featured)
    product.is_new = Boolean(product.is_new)
    product.is_sale = Boolean(product.is_sale)
    product.is_flash_sale = Boolean(product.is_flash_sale)
    product.is_luxury_deal = Boolean(product.is_luxury_deal)

    // Ensure required fields exist
    product.name = product.name || "Unnamed Product"
    product.description = product.description || ""
    product.slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")

    return product
  },

  /**
   * Invalidate cache for a specific product
   */
  invalidateProductCache(id: string): void {
    const productCacheKey = `product-${id}`
    const imagesCacheKey = `product-images-${id}`
    productCache.delete(productCacheKey)
    productImagesCache.delete(imagesCacheKey)
    logger.info(`Cache invalidated for product ${id}`)
  },

  /**
   * Invalidate all product related caches
   */
  invalidateAllProductCache(): void {
    productCache.clear()
    productImagesCache.clear()
    categoriesCache.clear()
    brandsCache.clear()
    logger.info("All product related caches invalidated")
  },

  /**
   * Notify about product updates
   */
  notifyProductUpdate(productId: string): void {
    logger.info(`Notifying about product update for ID: ${productId}`)

    this.invalidateProductCache(productId)

    if (typeof window !== "undefined") {
      const event = new CustomEvent("product-updated", { detail: { id: productId } })
      window.dispatchEvent(event)
    }
  },

  /**
   * Get products for cart items by their IDs
   */
  async getProductsForCartItems(productIds: number[]): Promise<Product[]> {
    try {
      if (!productIds || productIds.length === 0) {
        return []
      }

      // Try to get from cache first
      const productList: Product[] = []
      const uncachedIds: number[] = []

      productIds.forEach((id: number) => {
        const cacheKey = `product-${id}`
        const cachedItem = productCache.get(cacheKey)

        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
          const product = Array.isArray(cachedItem.data)
            ? cachedItem.data.find((p) => Number(p.id) === id)
            : (cachedItem.data as Product)

          if (product) {
            productList.push(product)
          } else {
            uncachedIds.push(id)
          }
        } else {
          uncachedIds.push(id)
        }
      })

      if (uncachedIds.length === 0) {
        return productList
      }

      // Fetch uncached products
      const response = await api.get("/api/products", {
        params: { ids: uncachedIds.join(",") },
      })

      let allProducts: Product[] = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          allProducts = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          allProducts = response.data.items
        }
      }

      const products = allProducts.filter((product) => {
        const productId = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id
        return uncachedIds.includes(productId)
      })

      products.forEach((product) => {
        const normalizedProduct = this.normalizeProduct(product)
        normalizedProduct.image_urls = parseImageUrls(normalizedProduct.image_urls)

        if (normalizedProduct.thumbnail_url) {
          normalizedProduct.thumbnail_url = validateImageUrl(normalizedProduct.thumbnail_url)
        }

        if (
          normalizedProduct.image_urls &&
          normalizedProduct.image_urls.length > 0 &&
          !normalizedProduct.thumbnail_url
        ) {
          normalizedProduct.thumbnail_url = normalizedProduct.image_urls[0]
        }

        if (normalizedProduct.id) {
          productList.push({
            ...normalizedProduct,
            seller: normalizedProduct.seller || defaultSeller,
          })

          productCache.set(`product-${normalizedProduct.id}`, {
            data: normalizedProduct,
            timestamp: Date.now(),
          })
        }
      })

      return productList
    } catch (error) {
      logger.error("Error fetching products for cart items:", { error: (error as Error).message, productIds })
      return []
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    products: number
    images: number
    categories: number
    brands: number
  } {
    return {
      products: productCache.size,
      images: productImagesCache.size,
      categories: categoriesCache.size,
      brands: brandsCache.size,
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
    logger.info("All product related caches cleared")
  },

  /**
   * Prefetch product images
   */
  async prefetchProductImages(productIds: string[]): Promise<void> {
    if (typeof window === "undefined") return

    logger.debug(`Prefetching images for ${productIds.length} products.`)
    await Promise.allSettled(
      productIds.map(async (id) => {
        try {
          await this.getProductImages(id)
        } catch (error) {
          logger.warn(`Failed to prefetch images for product ${id}:`, { error: (error as Error).message })
        }
      }),
    )
    logger.debug("Image prefetching completed.")
  },

  /**
   * Get featured products
   */
  async getFeaturedProducts(): Promise<Product[]> {
    return await this.getProducts({ is_featured: true })
  },

  /**
   * Get new products
   */
  async getNewProducts(): Promise<Product[]> {
    return await this.getProducts({ is_new: true })
  },

  /**
   * Get products on sale
   */
  async getSaleProducts(): Promise<Product[]> {
    return await this.getProducts({ is_sale: true })
  },

  /**
   * Get flash sale products
   */
  async getFlashSaleProducts(): Promise<Product[]> {
    return await this.getProducts({ is_flash_sale: true })
  },

  /**
   * Get luxury deal products
   */
  async getLuxuryDealProducts(): Promise<Product[]> {
    return await this.getProducts({ is_luxury_deal: true })
  },

  /**
   * Check API health
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      logger.debug("Performing API health check.")
      const response = await api.get("/api/health-check")
      logger.debug("API health check successful.")
      return response.status === 200
    } catch (error) {
      logger.warn("API health check failed:", { error: (error as Error).message })
      return false
    }
  },

  /**
   * Prefetch products by category
   */
  async prefetchProductsByCategory(categoryId: string): Promise<boolean> {
    return prefetchData("/api/products", { category_id: categoryId, limit: 12 })
  },

  /**
   * Prefetch homepage products
   */
  async prefetchHomePageProducts(): Promise<void> {
    try {
      logger.info("Prefetching homepage products.")
      await Promise.allSettled([
        this.getFeaturedProducts(),
        this.getFlashSaleProducts(),
        this.getLuxuryDealProducts(),
        this.getProducts({ limit: 12 }),
      ])
      logger.info("Homepage products prefetching completed.")
    } catch (error) {
      logger.error("Error prefetching homepage products:", { error: (error as Error).message })
    }
  },
}
