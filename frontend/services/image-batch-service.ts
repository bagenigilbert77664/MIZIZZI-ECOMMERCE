import type { ProductImage } from "@/types/index"

// Configuration
const BATCH_SIZE = 10 // Maximum number of product IDs to batch in a single request
const BATCH_DELAY = 50 // Milliseconds to wait before processing the next batch
const REQUEST_TIMEOUT = 5000 // Milliseconds to wait before timing out a request
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache duration
const MAX_RETRIES = 2 // Maximum number of retries for failed requests

// Cache for product images
interface CacheEntry {
  data: ProductImage[]
  timestamp: number
}

// State management
interface BatchServiceState {
  isBatchModeEnabled: boolean
  hasTestedBatchEndpoint: boolean
  workingEndpoint: string | null
  inProgressBatches: Set<string>
  cache: Map<string, CacheEntry>
  queue: string[]
  isProcessingQueue: boolean
  failedEndpoints: Set<string>
}

// Initialize state
const state: BatchServiceState = {
  isBatchModeEnabled: false, // Start with batch mode disabled to use individual requests first
  hasTestedBatchEndpoint: false,
  workingEndpoint: null,
  inProgressBatches: new Set(),
  cache: new Map(),
  queue: [],
  isProcessingQueue: false,
  failedEndpoints: new Set(),
}

// Possible API endpoints to try
const possibleEndpoints = [
  "/api/product-images/batch",
  "/api/products/images/batch",
  "/api/batch/product-images",
  "/api/images/batch",
]

// Helper function to validate product ID
function isValidProductId(productId: string): boolean {
  // Check if it's a valid number or numeric string
  return /^\d+$/.test(productId) && !isNaN(Number(productId)) && Number(productId) > 0
}

/**
 * Image Batch Service
 *
 * This service optimizes image loading by batching requests for product images.
 * It automatically detects if the batch endpoint is available and falls back to
 * individual requests if needed.
 */
export const imageBatchService = {
  /**
   * Fetch images for a single product
   * @param productId The product ID
   * @returns Promise resolving to an array of product images
   */
  async fetchProductImages(productId: string): Promise<ProductImage[]> {
    // Validate product ID first
    if (!isValidProductId(productId)) {
      console.warn(`Invalid product ID: ${productId}`)
      return []
    }

    // Check cache first
    const cachedImages = this.getCachedImages(productId)
    if (cachedImages.length > 0) {
      // Convert cached URLs back to ProductImage format
      return cachedImages.map((url, index) => ({
        id: `${productId}-${index}`,
        product_id: productId,
        url: url,
        filename: "",
        is_primary: index === 0,
        sort_order: index,
        alt_text: "",
      }))
    }

    // Always try individual request first since batch mode seems to have issues
    console.log(`Fetching individual images for product ${productId}`)
    return this.fetchIndividualProductImages(productId)
  },

  /**
   * Queue a product ID for batch processing
   * @param productId The product ID to queue
   */
  queueProductId(productId: string): void {
    // Validate product ID before queuing
    if (!isValidProductId(productId)) {
      console.warn(`Skipping invalid product ID: ${productId}`)
      return
    }

    if (!state.queue.includes(productId)) {
      state.queue.push(productId)
      console.log(`Added product ${productId} to batch queue. Queue size: ${state.queue.length}`)
    }
  },

  /**
   * Process the queue of product IDs
   */
  async processQueue(): Promise<void> {
    // If already processing, return
    if (state.isProcessingQueue) {
      return
    }

    state.isProcessingQueue = true
    console.log(`Processing batch queue with ${state.queue.length} items`)

    try {
      // Process in batches
      while (state.queue.length > 0) {
        // Take a batch from the queue
        const batch = state.queue.splice(0, BATCH_SIZE)

        // Filter out invalid product IDs
        const validBatch = batch.filter(isValidProductId)
        if (validBatch.length === 0) {
          console.warn("No valid product IDs in batch, skipping")
          continue
        }

        // Mark these products as in progress
        validBatch.forEach((id) => state.inProgressBatches.add(id))

        try {
          // Try to fetch the batch
          await this.fetchBatchProductImages(validBatch)
        } catch (error) {
          console.error(`Batch request failed for products ${validBatch.join(", ")}:`, error)

          // If batch mode failed, fall back to individual requests
          console.log("Falling back to individual requests")
          await Promise.allSettled(validBatch.map((id) => this.fetchIndividualProductImages(id)))
        } finally {
          // Remove from in-progress set regardless of success/failure
          validBatch.forEach((id) => state.inProgressBatches.delete(id))
        }

        // Small delay between batches to avoid overwhelming the server
        if (state.queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
        }
      }
    } finally {
      state.isProcessingQueue = false
    }
  },

  /**
   * Fetch images for a batch of products
   * @param productIds Array of product IDs
   */
  async fetchBatchProductImages(productIds: string[]): Promise<void> {
    if (!state.isBatchModeEnabled || productIds.length === 0) {
      return
    }

    // Filter valid product IDs
    const validProductIds = productIds.filter(isValidProductId)
    if (validProductIds.length === 0) {
      console.warn("No valid product IDs for batch request")
      return
    }

    console.log(`Fetching batch of ${validProductIds.length} products: ${validProductIds.join(", ")}`)

    // If we haven't tested the batch endpoint yet, or don't have a working endpoint
    if (!state.hasTestedBatchEndpoint || !state.workingEndpoint) {
      await this.testBatchEndpoint(validProductIds[0])

      // If testing failed, disable batch mode and return
      if (!state.isBatchModeEnabled) {
        console.log("Batch mode disabled after testing, falling back to individual requests")
        return
      }
    }

    if (!state.workingEndpoint) {
      console.error("No working batch endpoint found")
      state.isBatchModeEnabled = false
      return
    }

    try {
      // Use the working endpoint
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const url = `${API_BASE_URL}${state.workingEndpoint}`

      // Create a controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      // Get auth token if available
      const token =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
          : null

      // Make the batch request
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add auth headers if available
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ product_ids: validProductIds }),
        signal: controller.signal,
        credentials: "include", // Include cookies
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Batch request failed with status ${response.status}`)
      }

      const data = await response.json()

      // Process the response data
      // The expected format is { images: { [productId]: ProductImage[] } }
      if (data && data.images) {
        Object.entries(data.images).forEach(([productId, images]) => {
          // Cache the images
          this.cacheImages(productId, images as ProductImage[])
        })
      } else {
        console.warn("Unexpected response format from batch endpoint:", data)
      }
    } catch (error: any) {
      console.error(`Batch request failed:`, error)

      // Check if this is a CORS error or network error
      if (
        error.name === "TypeError" ||
        error.name === "AbortError" ||
        (error.message &&
          (error.message.includes("NetworkError") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("Network request failed")))
      ) {
        console.log("Detected network/CORS error, disabling batch mode")
        state.isBatchModeEnabled = false
        state.failedEndpoints.add(state.workingEndpoint || "")
        state.workingEndpoint = null
      }

      throw error
    }
  },

  /**
   * Test if the batch endpoint is available
   * @param testProductId A product ID to use for testing
   */
  async testBatchEndpoint(testProductId: string): Promise<void> {
    if (state.hasTestedBatchEndpoint && state.workingEndpoint) {
      return
    }

    // Validate test product ID
    if (!isValidProductId(testProductId)) {
      console.warn(`Invalid test product ID: ${testProductId}`)
      state.isBatchModeEnabled = false
      return
    }

    console.log("Testing batch endpoint availability...")
    state.hasTestedBatchEndpoint = true

    // Try each possible endpoint
    for (const endpoint of possibleEndpoints) {
      // Skip endpoints we've already tried and failed with
      if (state.failedEndpoints.has(endpoint)) {
        continue
      }

      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const url = `${API_BASE_URL}${endpoint}`
        console.log(`Testing endpoint: ${url}`)

        // Get auth token if available
        const token =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
            : null

        // Create a controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // Shorter timeout for testing

        // Make a test request with a single product ID
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ product_ids: [testProductId] }),
          signal: controller.signal,
          credentials: "include", // Include cookies
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()

          // Check if the response has the expected format
          if (data && data.images && data.images[testProductId]) {
            console.log(`Found working batch endpoint: ${endpoint}`)
            state.workingEndpoint = endpoint
            state.isBatchModeEnabled = true
            return
          }
        }

        // If we get here, the endpoint didn't work as expected
        console.log(`Endpoint ${endpoint} returned unexpected response`)
        state.failedEndpoints.add(endpoint)
      } catch (error) {
        console.error(`Error testing endpoint ${endpoint}:`, error)
        state.failedEndpoints.add(endpoint)
      }
    }

    // If we've tried all endpoints and none worked, disable batch mode
    console.log("No working batch endpoint found, disabling batch mode")
    state.isBatchModeEnabled = false
    state.workingEndpoint = null
  },

  /**
   * Fetch images for a single product (fallback method)
   * @param productId The product ID
   * @returns Promise resolving to an array of product images
   */
  async fetchIndividualProductImages(productId: string): Promise<ProductImage[]> {
    // Validate product ID
    if (!isValidProductId(productId)) {
      console.warn(`Invalid product ID for individual fetch: ${productId}`)
      return []
    }

    console.log(`Fetching individual product images for product ${productId}`)

    let retries = 0
    while (retries <= MAX_RETRIES) {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

        // Try different possible endpoints - updated order for better success rate
        const endpoints = [
          `/api/products/${productId}/images`, // Public endpoint (no auth required)
          `/uploads/product_images`, // Direct file access
          `/api/product-images/product/${productId}`,
          `/api/product/${productId}/images`,
          `/api/admin/products/${productId}/images`, // Admin endpoint as last resort
        ]

        let images: ProductImage[] = []
        let success = false

        // Get auth token if available
        const token =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("mizizzi_token") || localStorage.getItem("admin_token")
            : null

        // Try each endpoint until one works
        for (const endpoint of endpoints) {
          try {
            const url = `${API_BASE_URL}${endpoint}`
            console.log(`Trying endpoint: ${url}`)

            // Create a controller for timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

            const response = await fetch(url, {
              headers: {
                // Only add auth headers for admin endpoints
                ...(endpoint.includes("/admin/") && token ? { Authorization: `Bearer ${token}` } : {}),
              },
              signal: controller.signal,
              credentials: "include", // Include cookies
            })

            clearTimeout(timeoutId)

            if (response.ok) {
              const data = await response.json()
              console.log(`Response from ${endpoint}:`, data)

              // Handle different response formats
              if (Array.isArray(data)) {
                images = data.map((item, index) => {
                  // Handle case where item might be a string URL or an object
                  if (typeof item === "string") {
                    return {
                      id: `${productId}-${index}`,
                      product_id: productId,
                      url: item,
                      filename: "",
                      is_primary: index === 0,
                      sort_order: index,
                      alt_text: "",
                    }
                  } else {
                    return {
                      id: item.id || `${productId}-${index}`,
                      product_id: productId,
                      url: item.url || "",
                      filename: item.filename || "",
                      is_primary: item.is_primary || index === 0,
                      sort_order: item.sort_order || index,
                      alt_text: item.alt_text || "",
                    }
                  }
                })
              } else if (data.images && Array.isArray(data.images)) {
                images = data.images.map((item: any, index: number) => {
                  if (typeof item === "string") {
                    return {
                      id: `${productId}-${index}`,
                      product_id: productId,
                      url: item,
                      filename: "",
                      is_primary: index === 0,
                      sort_order: index,
                      alt_text: "",
                    }
                  } else {
                    return {
                      id: item.id || `${productId}-${index}`,
                      product_id: productId,
                      url: item.url || "",
                      filename: item.filename || "",
                      is_primary: item.is_primary || index === 0,
                      sort_order: item.sort_order || index,
                      alt_text: item.alt_text || "",
                    }
                  }
                })
              } else if (data.items && Array.isArray(data.items)) {
                images = data.items.map((item: any, index: number) => {
                  if (typeof item === "string") {
                    return {
                      id: `${productId}-${index}`,
                      product_id: productId,
                      url: item,
                      filename: "",
                      is_primary: index === 0,
                      sort_order: index,
                      alt_text: "",
                    }
                  } else {
                    return {
                      id: item.id || `${productId}-${index}`,
                      product_id: productId,
                      url: item.url || "",
                      filename: item.filename || "",
                      is_primary: item.is_primary || index === 0,
                      sort_order: item.sort_order || index,
                      alt_text: item.alt_text || "",
                    }
                  }
                })
              } else if (data.success && data.images && Array.isArray(data.images)) {
                images = data.images.map((item: any, index: number) => {
                  if (typeof item === "string") {
                    return {
                      id: `${productId}-${index}`,
                      product_id: productId,
                      url: item,
                      filename: "",
                      is_primary: index === 0,
                      sort_order: index,
                      alt_text: "",
                    }
                  } else {
                    return {
                      id: item.id || `${productId}-${index}`,
                      product_id: productId,
                      url: item.url || "",
                      filename: item.filename || "",
                      is_primary: item.is_primary || index === 0,
                      sort_order: item.sort_order || index,
                      alt_text: item.alt_text || "",
                    }
                  }
                })
              } else {
                console.warn(`Unexpected response format from ${endpoint}:`, data)
                continue
              }

              // Filter out invalid URLs
              images = images.filter(
                (img) =>
                  img.url &&
                  typeof img.url === "string" &&
                  img.url.trim() !== "" &&
                  img.url !== "/placeholder.svg" &&
                  !img.url.includes("undefined") &&
                  !img.url.includes("null"),
              )

              if (images.length > 0) {
                success = true
                console.log(`Successfully fetched ${images.length} images from ${endpoint}`)
                break
              }
            } else {
              console.warn(`Endpoint ${endpoint} returned status ${response.status}`)
            }
          } catch (error) {
            console.error(`Error with endpoint ${endpoint}:`, error)
            // Continue to the next endpoint
          }
        }

        if (success && images.length > 0) {
          // Cache the images
          this.cacheImages(productId, images)
          return images
        }

        // If all endpoints failed, throw an error to trigger retry
        throw new Error("All endpoints failed")
      } catch (error) {
        console.error(`Attempt ${retries + 1} failed for product ${productId}:`, error)
        retries++

        if (retries <= MAX_RETRIES) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)))
        }
      }
    }

    console.error(`All attempts failed for product ${productId}, returning empty array`)
    return []
  },

  // Add this method to get cached images
  getCachedImages(productId: string): string[] {
    // Validate product ID
    if (!isValidProductId(productId)) {
      return []
    }

    // Check in-memory cache first
    const cacheKey = productId
    const cachedItem = state.cache.get(cacheKey)

    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
      // Extract URLs from ProductImage objects
      const imageUrls = cachedItem.data
        .map((img) => img.url)
        .filter((url): url is string => typeof url === "string" && url.trim() !== "")

      if (imageUrls.length > 0) {
        console.log(`Found ${imageUrls.length} cached images for product ${productId}`)
        return imageUrls
      }
    }

    // Fallback to localStorage cache
    try {
      const localCacheKey = `product_images_${productId}`
      const cachedData = localStorage.getItem(localCacheKey)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Handle both string URLs and image objects
          const imageUrls = parsed
            .map((item) => (typeof item === "string" ? item : item?.url))
            .filter((url): url is string => typeof url === "string" && url.trim() !== "")

          if (imageUrls.length > 0) {
            console.log(`Found ${imageUrls.length} cached images in localStorage for product ${productId}`)
            return imageUrls
          }
        }
      }
    } catch (error) {
      console.warn(`Error retrieving cached images for product ${productId}:`, error)
    }

    return []
  },

  /**
   * Cache images for a product
   * @param productId The product ID
   * @param images Array of product images
   */
  cacheImages(productId: string, images: ProductImage[]): void {
    // Validate product ID
    if (!isValidProductId(productId)) {
      console.warn(`Invalid product ID for caching: ${productId}`)
      return
    }

    // Cache in memory
    state.cache.set(productId, {
      data: images,
      timestamp: Date.now(),
    })

    // Also cache in localStorage for persistence
    try {
      const imageUrls = images
        .map((img) => img.url)
        .filter((url): url is string => typeof url === "string" && url.trim() !== "")

      if (imageUrls.length > 0) {
        localStorage.setItem(`product_images_${productId}`, JSON.stringify(imageUrls))
        console.log(`Cached ${images.length} images for product ${productId}`)
      }
    } catch (error) {
      console.warn(`Error caching images to localStorage for product ${productId}:`, error)
    }
  },

  /**
   * Prefetch images for multiple products
   * @param productIds Array of product IDs
   */
  prefetchProductImages(productIds: string[]): void {
    if (!productIds || productIds.length === 0) return

    // Filter valid product IDs
    const validProductIds = productIds.filter(isValidProductId)

    if (validProductIds.length === 0) {
      console.warn("No valid product IDs for prefetching")
      return
    }

    // Only log in development and reduce verbosity
    if (process.env.NODE_ENV === "development") {
      console.log(`Prefetching images for ${validProductIds.length} valid products`)
    }

    // Filter out products that are already cached
    const uncachedProductIds = validProductIds.filter((id) => !this.getCachedImages(id).length)

    if (uncachedProductIds.length === 0) {
      // Only log in development and reduce verbosity
      if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
        console.log("All products already cached, skipping prefetch")
      }
      return
    }

    // For now, fetch individual images instead of using batch mode
    uncachedProductIds.forEach((id) => {
      setTimeout(() => {
        this.fetchIndividualProductImages(id).catch((error) => {
          console.error(`Error prefetching images for product ${id}:`, error)
        })
      }, Math.random() * 1000) // Stagger requests
    })
  },

  /**
   * Invalidate cache for a specific product
   * @param productId The product ID
   */
  invalidateCache(productId: string): void {
    if (!isValidProductId(productId)) {
      return
    }

    state.cache.delete(productId)

    // Also remove from localStorage
    try {
      localStorage.removeItem(`product_images_${productId}`)
    } catch (error) {
      console.warn(`Error removing cached images from localStorage for product ${productId}:`, error)
    }

    console.log(`Cache invalidated for product ${productId}`)
  },

  /**
   * Clear all cache
   */
  clearCache(): void {
    state.cache.clear()

    // Clear localStorage cache
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("product_images_")) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
    } catch (error) {
      console.warn("Error clearing localStorage cache:", error)
    }

    console.log("Image cache cleared")
  },

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): {
    cacheSize: number
    batchModeEnabled: boolean
    workingEndpoint: string | null
    queueLength: number
    inProgressCount: number
  } {
    return {
      cacheSize: state.cache.size,
      batchModeEnabled: state.isBatchModeEnabled,
      workingEndpoint: state.workingEndpoint,
      queueLength: state.queue.length,
      inProgressCount: state.inProgressBatches.size,
    }
  },

  /**
   * Clear invalid cache entries
   */
  clearInvalidCache(): void {
    const now = Date.now()

    // Clear expired entries from in-memory cache
    for (const [key, value] of state.cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        state.cache.delete(key)
      }
    }

    // Clear invalid localStorage entries
    if (typeof localStorage !== "undefined") {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("product_images_")) {
            try {
              const data = localStorage.getItem(key)
              if (data) {
                const parsed = JSON.parse(data)
                if (!Array.isArray(parsed) || parsed.length === 0) {
                  keysToRemove.push(key)
                }
              }
            } catch {
              keysToRemove.push(key)
            }
          }
        }

        keysToRemove.forEach((key) => localStorage.removeItem(key))
        if (keysToRemove.length > 0) {
          console.log(`Cleared ${keysToRemove.length} invalid cache entries`)
        }
      } catch (error) {
        console.warn("Error clearing invalid cache:", error)
      }
    }
  },

  /**
   * Reset the service state (for testing)
   */
  resetState(): void {
    state.isBatchModeEnabled = false // Start disabled
    state.hasTestedBatchEndpoint = false
    state.workingEndpoint = null
    state.inProgressBatches.clear()
    state.queue = []
    state.isProcessingQueue = false
    state.failedEndpoints.clear()
    this.clearInvalidCache()
    console.log("Image batch service state reset")
  },
}
