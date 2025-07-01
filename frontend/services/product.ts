// services/product.ts

import api from "@/lib/api"
import type { Product, ProductImage, Category, Brand } from "@/types"
import { websocketService } from "@/services/websocket"
// Add import for imageCache
import { imageCache } from "@/services/image-cache"
// Only showing the changes needed to integrate with the new batch service
import { imageBatchService } from "@/services/image-batch-service"
import axios from "axios"

// Add a request deduplication cache at the top of the file
const pendingCartRequests = new Map<string, Promise<Record<string, Product>>>()

// Cache maps with timestamps for expiration - update type definitions
const productCache = new Map<string, { data: Product | Product[]; timestamp: number }>()
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

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Helper function to safely parse and validate image URLs
function parseImageUrls(imageUrls: any): string[] {
  if (!imageUrls) return []

  try {
    // If it's already an array, filter and return valid URLs
    if (Array.isArray(imageUrls)) {
      // Check if it's a malformed array of characters (like the API issue)
      if (imageUrls.length > 0 && typeof imageUrls[0] === "string" && imageUrls[0].length === 1) {
        // This is likely a malformed character array, try to reconstruct
        const reconstructed = imageUrls.join("")
        try {
          const parsed = JSON.parse(reconstructed)
          if (Array.isArray(parsed)) {
            return parsed
              .filter((url): url is string => typeof url === "string" && url.trim() !== "")
              .map((url: string) => url.trim())
              .filter((url: string) => {
                return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
              })
          }
        } catch (e) {
          console.warn("Failed to reconstruct malformed image URLs:", e)
          return []
        }
      }

      // Normal array processing
      return imageUrls
        .filter((url): url is string => typeof url === "string" && url.trim() !== "")
        .map((url: string) => url.trim())
        .filter((url: string) => {
          if (url === "" || url.includes("{") || url.includes("}")) return false
          if (url === "[" || url === "]" || url.startsWith("[") || url.endsWith("]")) return false
          if (url.includes("undefined") || url.includes("null")) return false
          return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
        })
    }

    // If it's a string, try to parse as JSON first
    if (typeof imageUrls === "string") {
      // Check for malformed strings that look like broken arrays
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
                if (url === "" || url.includes("{") || url.includes("}")) return false
                if (url === "[" || url === "]" || url.startsWith("[") || url.endsWith("]")) return false
                if (url.includes("undefined") || url.includes("null")) return false
                return url.startsWith("http") || url.startsWith("/") || url.startsWith("data:")
              })
          }
        } catch (error) {
          console.warn("Failed to parse image URLs JSON:", error)
          return []
        }
      }

      // If not JSON or parsing failed, treat as single URL
      const cleanUrl = imageUrls.trim()
      if (
        cleanUrl &&
        !cleanUrl.includes("{") &&
        !cleanUrl.includes("}") &&
        cleanUrl !== "[" &&
        cleanUrl !== "]" &&
        !cleanUrl.startsWith("[") &&
        !cleanUrl.endsWith("]") &&
        !cleanUrl.includes("undefined") &&
        !cleanUrl.includes("null") &&
        (cleanUrl.startsWith("http") || cleanUrl.startsWith("/") || cleanUrl.startsWith("data:"))
      ) {
        return [cleanUrl]
      }
    }

    return []
  } catch (error) {
    console.error("Error parsing image URLs:", error)
    return []
  }
}

// Helper function to validate and clean image URL
function validateImageUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null

  const cleanUrl = url.trim()

  // Check for invalid characters or patterns
  if (
    cleanUrl === "" ||
    cleanUrl.includes("{") ||
    cleanUrl.includes("}") ||
    cleanUrl === "undefined" ||
    cleanUrl === "null" ||
    cleanUrl === "[" ||
    cleanUrl === "]" ||
    cleanUrl.startsWith("[") ||
    cleanUrl.endsWith("]")
  ) {
    return null
  }

  // Must be a valid URL format
  if (!cleanUrl.startsWith("http") && !cleanUrl.startsWith("/") && !cleanUrl.startsWith("data:")) {
    return null
  }

  // If it's a relative URL, make sure it starts with /
  if (!cleanUrl.startsWith("http") && !cleanUrl.startsWith("data:") && !cleanUrl.startsWith("/")) {
    return `/${cleanUrl}`
  }

  return cleanUrl
}

export const productService = {
  /**
   * Get products with optional filtering parameters
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

      // At the top of getProducts function, add this check:
      const requestKey = `products-${JSON.stringify(queryParams)}`

      // Check if there's already a pending request for the same parameters
      if (pendingCartRequests.has(requestKey)) {
        console.log(`Reusing pending request for: ${requestKey}`)
        // Convert the Record<string, Product> back to Product[] for this method
        const productMap = await pendingCartRequests.get(requestKey)!
        return Object.values(productMap)
      }

      // Create the request promise that returns Record<string, Product>
      const requestPromise = (async (): Promise<Record<string, Product>> => {
        const now = Date.now()
        const cachedItem = productCache.get(cacheKey)

        // Return cached data if available and not expired
        if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
          console.log(`Using cached products data for params: ${JSON.stringify(queryParams)}`)
          // Ensure we return an array
          const products = Array.isArray(cachedItem.data) ? cachedItem.data : [cachedItem.data]
          // Convert to Record<string, Product>
          const productMap: Record<string, Product> = {}
          products.forEach((product) => {
            if (product.id) {
              productMap[product.id.toString()] = product
            }
          })
          return productMap
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
        const enhancedProducts = await Promise.all(
          products.map(async (product) => {
            // Normalize price data
            product = this.normalizeProductPrices(product)

            // Add product type for easier filtering and display
            product.product_type = product.is_flash_sale
              ? "flash_sale"
              : product.is_luxury_deal
                ? "luxury"
                : ("regular" as "flash_sale" | "luxury" | "regular")

            // Handle image_urls parsing with improved validation
            product.image_urls = parseImageUrls(product.image_urls)

            // Add debugging for image URLs
            if (process.env.NODE_ENV === "development") {
              console.log(`Product ${product.id} image URLs:`, product.image_urls)
              console.log(`Product ${product.id} thumbnail:`, product.thumbnail_url)
            }

            // Validate thumbnail_url
            if (product.thumbnail_url) {
              product.thumbnail_url = validateImageUrl(product.thumbnail_url)
            }

            // If we have image_urls but no thumbnail_url, set the first image as thumbnail
            if (product.image_urls.length > 0 && !product.thumbnail_url) {
              product.thumbnail_url = product.image_urls[0]
            }

            // Ensure we always have at least one valid image URL
            if (!product.image_urls || product.image_urls.length === 0) {
              if (product.thumbnail_url && !product.thumbnail_url.includes("placeholder.svg")) {
                product.image_urls = [product.thumbnail_url]
              } else {
                // Set a proper placeholder
                const placeholderUrl = `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(product.name)}`
                product.image_urls = [placeholderUrl]
                product.thumbnail_url = placeholderUrl
              }
            }

            return {
              ...product,
              seller: product.seller || defaultSeller,
            }
          }),
        )

        // Cache the array of products correctly - store as array
        productCache.set(cacheKey, {
          data: enhancedProducts, // This is already an array
          timestamp: now,
        })

        // Prefetch images for all products in the background (only on client side)
        if (typeof window !== "undefined") {
          this.prefetchProductImages(enhancedProducts.map((p) => p.id.toString()))
        }

        // Convert to Record<string, Product> for the cache
        const productMap: Record<string, Product> = {}
        enhancedProducts.forEach((product) => {
          if (product.id) {
            productMap[product.id.toString()] = product
          }
        })

        return productMap
      })()

      // Store the promise to prevent duplicate requests
      pendingCartRequests.set(requestKey, requestPromise)

      try {
        const productMap = await requestPromise
        return Object.values(productMap)
      } finally {
        // Clean up the pending request
        pendingCartRequests.delete(requestKey)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  },

  /**
   * Get products by category slug
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
        // Ensure we return an array
        return Array.isArray(cachedItem.data) ? cachedItem.data : [cachedItem.data]
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

          // Handle image_urls parsing with improved validation
          product.image_urls = parseImageUrls(product.image_urls)

          // Validate thumbnail_url
          if (product.thumbnail_url) {
            product.thumbnail_url = validateImageUrl(product.thumbnail_url)
          }

          // Fetch product images if they're not already included
          if (product.image_urls.length === 0 && product.id) {
            try {
              const images = await this.getProductImages(product.id.toString())
              if (images && images.length > 0) {
                product.image_urls = images
                  .map((img: ProductImage) => validateImageUrl(img.url))
                  .filter((url): url is string => url !== null)

                // Set thumbnail_url to the primary image if it exists
                const primaryImage = images.find((img: ProductImage) => img.is_primary)
                if (primaryImage && validateImageUrl(primaryImage.url)) {
                  product.thumbnail_url = validateImageUrl(primaryImage.url)
                } else if (images[0] && validateImageUrl(images[0].url)) {
                  product.thumbnail_url = validateImageUrl(images[0].url)
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

      // Cache the array of products correctly - store as array
      productCache.set(cacheKey, {
        data: enhancedProducts, // This is already an array
        timestamp: now,
      })

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
   */
  async getProduct(id: string): Promise<Product | null> {
    // Validate product ID
    if (!id || typeof id !== "string" || isNaN(Number(id))) {
      console.error("Invalid product ID:", id)
      return null
    }

    // Check if API_BASE_URL is defined
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    if (!API_BASE_URL) {
      console.error("API_BASE_URL is not defined in environment variables.")
      return null
    }

    // Check if we're on the server side
    const isServer = typeof window === "undefined"

    // Only check cache on client side
    if (!isServer) {
      // Check cache first
      const cacheKey = `product-${id}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached product data for id ${id}`)
        // Handle the case where the cache might contain an array
        if (Array.isArray(cachedItem.data)) {
          // If it's an array, find the product with matching ID
          const product = cachedItem.data.find((p) => p.id.toString() === id)
          return product || null
        }
        // Otherwise return the single product
        return cachedItem.data as Product
      }
    }

    if (isServer) {
      console.log(` Server  Fetching product with id ${id} from API`)
    } else {
      console.log(`Fetching product with id ${id} from API`)
    }

    // Make sure we have a complete URL
    const url = `${API_BASE_URL}/api/products/${id}`
    if (isServer) {
      console.log(` Server  Making request to: ${url}`)
    } else {
      console.log(`Making request to: ${url}`)
    }

    // Retry logic
    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        // Use a different approach for server-side requests
        let response
        if (isServer) {
          // Direct axios call without using the api instance for server-side
          response = await axios.get(url, {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 5000,
          })
        } else {
          // Use the api instance for client-side
          response = await api.get(url)
        }

        // Check if the response data is valid
        if (!response || !response.data) {
          console.warn(`Invalid API response for product ${id}, retrying...`)
          retries++
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
          continue
        }

        let product = response.data

        // Rest of the function remains the same...
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

          // Handle images with improved validation
          product.image_urls = parseImageUrls(product.image_urls)

          // Validate thumbnail_url
          if (product.thumbnail_url) {
            product.thumbnail_url = validateImageUrl(product.thumbnail_url)
          }

          // If no valid images, try to fetch from API
          if (product.image_urls.length === 0) {
            // Only fetch images on client side to avoid server-side issues
            if (!isServer) {
              try {
                const images = await this.getProductImages(id)
                if (images && images.length > 0) {
                  product.image_urls = images
                    .map((img: ProductImage) => validateImageUrl(img.url))
                    .filter((url): url is string => url !== null)

                  // Set thumbnail_url to the primary image if it exists
                  const primaryImage = images.find((img: ProductImage) => img.is_primary)
                  if (primaryImage && validateImageUrl(primaryImage.url)) {
                    product.thumbnail_url = validateImageUrl(primaryImage.url)
                  } else if (images[0] && validateImageUrl(images[0].url)) {
                    product.thumbnail_url = validateImageUrl(images[0].url)
                  }

                  console.log(`Loaded ${product.image_urls.length} images for product ${id}`)
                }
              } catch (error) {
                console.error(`Error fetching images for product ${id}:`, error)
              }
            } else {
              // On server side, use placeholder images if no images are provided
              if (!product.thumbnail_url) {
                product.thumbnail_url = `/placeholder.svg?height=400&width=400`
              }
              if (!product.image_urls || product.image_urls.length === 0) {
                product.image_urls = [product.thumbnail_url]
              }
            }
          }

          // If we have image_urls but no thumbnail_url, set the first image as thumbnail
          if (product.image_urls.length > 0 && !product.thumbnail_url) {
            product.thumbnail_url = product.image_urls[0]
          }

          // Ensure we always have at least one image
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

          // Only cache on client side
          if (!isServer) {
            // Cache the result with timestamp - ensure we store a single product, not an array
            if (product.id) {
              productCache.set(`product-${id}`, {
                data: product,
                timestamp: Date.now(),
              })
            }

            // Also cache by ID for future reference
            if (product.id) {
              productCache.set(`product-${product.id}`, {
                data: product,
                timestamp: Date.now(),
              })
            }
          }
        }

        return product
      } catch (error: any) {
        if (isServer) {
          console.error(` Server  Error fetching product with id ${id} (attempt ${retries + 1}):`, error)
        } else {
          console.error(`Error fetching product with id ${id} (attempt ${retries + 1}):`, error)
        }

        // If we're in development mode or the error is a server error, provide a fallback product
        if (process.env.NODE_ENV === "development" || error.response?.status === 500) {
          console.warn(`Using fallback product data for id ${id} due to API error`)

          // Return a fallback product object with the requested ID
          return {
            id: Number(id),
            name: `Product ${id} (Fallback)`,
            description: "This is a fallback product description used when the API is unavailable.",
            price: 99.99,
            sale_price: null,
            thumbnail_url: "/placeholder.svg?height=400&width=400",
            image_urls: ["/placeholder.svg?height=400&width=400"],
            stock: 10,
            sku: `FALLBACK-${id}`,
            slug: `product-${id}`,
            seller: defaultSeller,
            is_flash_sale: false,
            is_luxury_deal: false,
            product_type: "regular" as const,
          }
        }

        if (error.response?.status === 500) {
          console.warn(`Failed to fetch product with id ${id} due to a server error.`)
          return null
        }
        retries++
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      }
    }

    if (isServer) {
      console.warn(` Server  Failed to fetch product with id ${id} after ${MAX_RETRIES} attempts.`)
    } else {
      console.warn(`Failed to fetch product with id ${id} after ${MAX_RETRIES} attempts.`)
    }
    return null
  },

  /**
   * Get product images using the batch service
   */
  async getProductImages(productId: string | number): Promise<ProductImage[]> {
    try {
      // Convert productId to string for consistency
      const productIdStr = typeof productId === "number" ? productId.toString() : productId

      // First check if the images are in our cache
      const cacheKey = `product-images-${productIdStr}`
      const now = Date.now()
      const cachedItem = productImagesCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        // Only log in development and reduce verbosity
        if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
          console.log(`Using cached product images for product ${productIdStr}`)
        }
        return cachedItem.data
      }

      // Only log in development
      if (process.env.NODE_ENV === "development") {
        console.log(`Fetching images for product ${productIdStr} from API`)
      }

      // Use the batch service instead of direct API call
      const images = await imageBatchService.fetchProductImages(productIdStr)

      // Ensure we have valid image objects with validated URLs
      const validImages = images
        .map((img, index): ProductImage | null => {
          if (!img || typeof img !== "object") return null

          const validUrl = validateImageUrl(img.url)
          if (!validUrl) return null

          return {
            id: img.id || `${productIdStr}-${index}`,
            product_id: productIdStr, // Always use string version
            url: validUrl,
            filename: img.filename || "",
            is_primary: img.is_primary || false,
            sort_order: img.sort_order || index,
            alt_text: img.alt_text || "",
          }
        })
        .filter((img): img is ProductImage => img !== null)

      // Cache the results
      productImagesCache.set(cacheKey, {
        data: validImages,
        timestamp: now,
      })

      // Also cache individual image URLs for quick access
      validImages.forEach((img) => {
        if (img.id && img.url) {
          imageCache.set(`image-${img.id}`, img.url)
        }
      })

      console.log(`Successfully fetched ${validImages.length} images for product ${productIdStr}`)
      return validImages
    } catch (error) {
      console.error(`Error fetching images for product ${productId}:`, error)

      // Try direct API call as fallback
      try {
        console.log(`Trying direct API call for product ${productId} images`)
        const response = await api.get(`/api/products/${productId}/images`)

        if (response.data) {
          let images: ProductImage[] = []

          if (Array.isArray(response.data)) {
            images = response.data
          } else if (response.data.images && Array.isArray(response.data.images)) {
            images = response.data.images
          } else if (response.data.items && Array.isArray(response.data.items)) {
            images = response.data.items
          }

          // Convert to proper format if needed and validate URLs
          const validImages = images
            .map((img, index): ProductImage | null => {
              // Handle both string URLs and image objects
              let imageUrl: string = ""
              if (typeof img === "string") {
                imageUrl = img
              } else if (typeof img === "object" && img !== null && typeof img.url === "string") {
                imageUrl = img.url
              } else {
                return null
              }
              const validUrl = validateImageUrl(imageUrl)
              if (!validUrl) return null

              return {
                id: typeof img === "object" && img.id ? img.id : `${productId}-${index}`,
                product_id: productId.toString(),
                url: validUrl,
                filename: typeof img === "object" && img.filename ? img.filename : "",
                is_primary: typeof img === "object" && img.is_primary ? img.is_primary : index === 0,
                sort_order: typeof img === "object" && img.sort_order ? img.sort_order : index,
                alt_text: typeof img === "object" && img.alt_text ? img.alt_text : "",
              }
            })
            .filter((img): img is ProductImage => img !== null)

          if (validImages.length > 0) {
            // Cache the results
            productImagesCache.set(`product-images-${productId}`, {
              data: validImages,
              timestamp: Date.now(),
            })

            console.log(`Fallback API call successful: ${validImages.length} images for product ${productId}`)
            return validImages
          }
        }
      } catch (fallbackError) {
        console.error(`Fallback API call also failed for product ${productId}:`, fallbackError)
      }

      return []
    }
  },

  /**
   * Get a specific product image by ID
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
          is_primary: false,
          product_id: "",
          filename: "",
          sort_order: 0,
        }
      }

      console.log(`Fetching product image with ID ${imageId}`)
      const response = await api.get(`/api/product-images/${imageId}`)

      // Cache the image URL for future use
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
      console.error(`Error fetching product image with ID ${imageId}:`, error)
      return null
    }
  },

  /**
   * Invalidate cache for a specific product
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
    categoriesCache.clear()
    brandsCache.clear()
    imageBatchService.clearCache()
    console.log("All product cache invalidated")
  },

  /**
   * Get a product by slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      // Check cache first
      const cacheKey = `product-slug-${slug}`
      const now = Date.now()
      const cachedItem = productCache.get(cacheKey)

      if (cachedItem && now - cachedItem.timestamp < CACHE_DURATION) {
        console.log(`Using cached product data for slug ${slug}`)
        // Handle the case where the cache might contain an array
        if (Array.isArray(cachedItem.data)) {
          // If it's an array, find the product with matching slug
          const product = cachedItem.data.find((p: Product) => p.slug === slug)
          return product || null
        }
        // Otherwise return the single product
        return cachedItem.data as Product
      }

      const response = await api.get(`/api/products/${slug}`)
      let product = response.data

      // Ensure the product has valid data
      if (product) {
        // Normalize price data
        product = this.normalizeProductPrices(product)

        // Handle images with improved validation
        product.image_urls = parseImageUrls(product.image_urls)

        // Validate thumbnail_url
        if (product.thumbnail_url) {
          product.thumbnail_url = validateImageUrl(product.thumbnail_url)
        }

        // Fetch product images if they're not already included
        if (product.image_urls.length === 0) {
          try {
            const images = await this.getProductImages(product.id.toString())
            if (images && images.length > 0) {
              product.image_urls = images
                .map((img: ProductImage) => validateImageUrl(img.url))
                .filter((url): url is string => url !== null)

              // Set thumbnail_url to the primary image if it exists
              const primaryImage = images.find((img: ProductImage) => img.is_primary)
              if (primaryImage && validateImageUrl(primaryImage.url)) {
                product.thumbnail_url = validateImageUrl(primaryImage.url)
              } else if (images[0] && validateImageUrl(images[0].url)) {
                product.thumbnail_url = validateImageUrl(images[0].url)
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

        // Cache the result with timestamp - ensure we store a single product, not an array
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
   */
  async getFeaturedProducts(): Promise<Product[]> {
    return this.getProducts({ featured: true })
  },

  /**
   * Get new products
   */
  async getNewProducts(): Promise<Product[]> {
    return this.getProducts({ new: true })
  },

  /**
   * Get sale products
   */
  async getSaleProducts(): Promise<Product[]> {
    return this.getProducts({ sale: true })
  },

  /**
   * Get flash sale products
   */
  async getFlashSaleProducts(): Promise<Product[]> {
    return this.getProducts({ flash_sale: true })
  },

  /**
   * Get luxury deal products
   */
  async getLuxuryDealProducts(): Promise<Product[]> {
    return this.getProducts({ luxury_deal: true })
  },

  /**
   * Get product reviews
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
      console.error(`Error fetching reviews for product ${productId}:`, error)
      return []
    }
  },

  /**
   * Notify about product update
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
   */
  prefetchTimeout: null as NodeJS.Timeout | null,

  /**
   * Prefetch images for multiple products
   */
  async prefetchProductImages(productIds: string[]): Promise<void> {
    if (!productIds || productIds.length === 0) return

    // Clear existing timeout
    if (this.prefetchTimeout) {
      clearTimeout(this.prefetchTimeout)
    }

    // Throttle prefetch calls
    this.prefetchTimeout = setTimeout(() => {
      imageBatchService.prefetchProductImages(productIds)
    }, 100) // 100ms delay to batch multiple calls
  },

  /**
   * Get all categories
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
   * Normalize product prices and IDs
   */
  normalizeProductPrices(product: Product): Product {
    // Normalize product ID to number
    if (typeof product.id === "string") {
      product.id = Number.parseInt(product.id, 10)
    }

    // Ensure ID is a valid number
    if (typeof product.id !== "number" || isNaN(product.id)) {
      console.warn(`Invalid ID for product, using 0 as fallback`)
      product.id = 0
    }

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
    if (typeof product.sale_price === "string") {
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
   * Get products for cart items by IDs
   * Returns a map of product ID to product data
   */
  async getProductsForCartItems(productIds: number[]): Promise<Record<string, Product>> {
    try {
      if (!productIds || productIds.length === 0) {
        return {}
      }

      // Create a cache key for this request
      const cacheKey = productIds.sort().join(",")

      // If there's already a pending request for these products, return it
      if (pendingCartRequests.has(cacheKey)) {
        console.log("Using pending request for cart products:", cacheKey)
        return await pendingCartRequests.get(cacheKey)!
      }

      // Create a map to store the results with string keys
      const productMap: Record<string, Product> = {}

      // Check cache first for each product
      const uncachedIds: number[] = []

      productIds.forEach((id: number) => {
        const cacheKey = `product-${id}`
        const cachedItem = productCache.get(cacheKey)

        if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
          // Use cached data
          const product = Array.isArray(cachedItem.data)
            ? cachedItem.data.find((p) => Number(p.id) === id)
            : (cachedItem.data as Product)

          if (product) {
            productMap[id.toString()] = product
          } else {
            uncachedIds.push(id)
          }
        } else {
          uncachedIds.push(id)
        }
      })

      // If all products were in cache, return early
      if (uncachedIds.length === 0) {
        return productMap
      }

      // Create the promise for fetching uncached products
      const fetchPromise = (async (): Promise<Record<string, Product>> => {
        // Fetch uncached products by getting all products and filtering
        const response = await api.get("/api/products")

        let allProducts: Product[] = []
        if (Array.isArray(response.data)) {
          allProducts = response.data
        } else if (response.data.items && Array.isArray(response.data.items)) {
          allProducts = response.data.items
        } else if (response.data.products && Array.isArray(response.data.products)) {
          allProducts = response.data.products
        }

        // Filter products to only include the ones we need
        const products = allProducts.filter((product) => {
          const productId = typeof product.id === "string" ? Number.parseInt(product.id, 10) : product.id
          return uncachedIds.includes(productId)
        })

        // Process and cache the fetched products
        products.forEach((product) => {
          // Normalize product ID to number
          if (typeof product.id === "string") {
            product.id = Number.parseInt(product.id, 10)
          }

          // Normalize price data
          product = this.normalizeProductPrices(product)

          // Handle images with improved validation
          product.image_urls = parseImageUrls(product.image_urls)

          // Validate thumbnail_url
          if (product.thumbnail_url) {
            product.thumbnail_url = validateImageUrl(product.thumbnail_url)
          }

          // If we have image_urls but no thumbnail_url, set the first image as thumbnail
          if (product.image_urls && product.image_urls.length > 0 && !product.thumbnail_url) {
            product.thumbnail_url = product.image_urls[0]
          }

          // Add to the result map with string key
          if (product.id) {
            const productIdStr = product.id.toString()
            productMap[productIdStr] = {
              ...product,
              seller: product.seller || defaultSeller,
            }

            // Cache for future use
            productCache.set(`product-${product.id}`, {
              data: product,
              timestamp: Date.now(),
            })
          }
        })

        return productMap
      })()

      // Store the promise to prevent duplicate requests
      pendingCartRequests.set(cacheKey, fetchPromise)

      try {
        const result = await fetchPromise
        return result
      } finally {
        // Clean up the pending request
        pendingCartRequests.delete(cacheKey)
      }
    } catch (error) {
      console.error("Error fetching products for cart items:", error)
      return {}
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

export default productService
