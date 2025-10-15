import type { ProductImage } from "@/types"

// Configuration
const BATCH_SIZE = 10 // Maximum number of product IDs to batch in a single request
const BATCH_DELAY = 50 // Milliseconds to wait before processing the next batch
const REQUEST_TIMEOUT = 5000 // Milliseconds to wait before timing out a request
const CACHE_DURATION = 1 * 60 * 1000 // 1 minute cache duration (was 5 minutes)
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
  isBatchModeEnabled: true, // Start optimistically assuming batch mode works
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

/**
 * Image Batch Service
 *
 * This service optimizes image loading by batching requests for product images.
 * It automatically detects if the batch endpoint is available and falls back to
 * individual requests if needed.
 *
 * IMPORTANT: This service only handles permanent URLs, never blob URLs.
 */
export const imageBatchService = {
  /**
   * Fetch images for a single product
   * @param productId The product ID
   * @returns Promise resolving to an array of product images with permanent URLs only
   */
  async fetchProductImages(productId: string): Promise<ProductImage[]> {
    // Check cache first
    const cachedImages = this.getCachedImages(productId)
    if (cachedImages) {
      return cachedImages
    }

    // If this product is already being fetched in a batch, wait for it
    if (state.inProgressBatches.has(productId)) {
      console.log(`Product ${productId} is already being fetched in a batch, waiting...`)

      // Wait for the batch to complete (max 3 seconds)
      let attempts = 0
      while (state.inProgressBatches.has(productId) && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        attempts++

        // Check cache again after waiting
        const cachedImagesAfterWait = this.getCachedImages(productId)
        if (cachedImagesAfterWait) {
          return cachedImagesAfterWait
        }
      }
    }

    // If batch mode is enabled and we haven't tested the endpoint yet, queue this request
    if (state.isBatchModeEnabled) {
      // Add to queue and process
      this.queueProductId(productId)

      // If we're already processing the queue, just return an empty array for now
      // The actual images will be loaded in the background
      if (state.isProcessingQueue) {
        console.log(`Queue is already being processed, returning empty array for product ${productId}`)
        return []
      }

      // Process the queue
      await this.processQueue()

      // Check cache again after processing queue
      const cachedImagesAfterQueue = this.getCachedImages(productId)
      if (cachedImagesAfterQueue) {
        return cachedImagesAfterQueue
      }
    }

    // If batch mode is disabled or the batch request failed, fall back to individual request
    console.log(`Falling back to individual request for product ${productId}`)
    return this.fetchIndividualProductImages(productId)
  },

  /**
   * Queue a product ID for batch processing
   * @param productId The product ID to queue
   */
  queueProductId(productId: string): void {
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

        // Mark these products as in progress
        batch.forEach((id) => state.inProgressBatches.add(id))

        try {
          // Try to fetch the batch
          await this.fetchBatchProductImages(batch)
        } catch (error) {
          console.error(`Batch request failed for products ${batch.join(", ")}:`, error)

          // If batch mode failed, fall back to individual requests
          if (!state.isBatchModeEnabled) {
            console.log("Batch mode disabled, falling back to individual requests")
            await Promise.allSettled(batch.map((id) => this.fetchIndividualProductImages(id)))
          }
        } finally {
          // Remove from in-progress set regardless of success/failure
          batch.forEach((id) => state.inProgressBatches.delete(id))
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

    console.log(`Fetching batch of ${productIds.length} products: ${productIds.join(", ")}`)

    // If we haven't tested the batch endpoint yet, or don't have a working endpoint
    if (!state.hasTestedBatchEndpoint || !state.workingEndpoint) {
      await this.testBatchEndpoint(productIds[0])

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
        body: JSON.stringify({ product_ids: productIds }),
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

        // First try a simple OPTIONS request to check CORS
        try {
          const optionsResponse = await fetch(url, {
            method: "OPTIONS",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })

          if (!optionsResponse.ok && optionsResponse.status !== 204) {
            console.log(`OPTIONS request to ${endpoint} failed with status ${optionsResponse.status}`)
            continue
          }
        } catch (optionsError) {
          console.log(`OPTIONS request to ${endpoint} failed:`, optionsError)
          continue
        }

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
   * @returns Promise resolving to an array of product images with permanent URLs
   */
  async fetchIndividualProductImages(productId: string): Promise<ProductImage[]> {
    console.log(`Fetching individual product images for product ${productId}`)

    let retries = 0
    while (retries <= MAX_RETRIES) {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

        // Try different possible endpoints
        const endpoints = [
          `/api/products/${productId}/images`,
          `/api/product-images/product/${productId}`,
          `/api/product/${productId}/images`,
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
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              signal: controller.signal,
              credentials: "include", // Include cookies
            })

            clearTimeout(timeoutId)

            if (response.ok) {
              const data = await response.json()

              // Handle different response formats
              if (Array.isArray(data)) {
                images = data
              } else if (data.images && Array.isArray(data.images)) {
                images = data.images
              } else if (data.items && Array.isArray(data.items)) {
                images = data.items
              } else {
                console.warn(`Unexpected response format from ${endpoint}:`, data)
                continue
              }

              success = true
              break
            }
          } catch (error) {
            console.error(`Error with endpoint ${endpoint}:`, error)
            // Continue to the next endpoint
          }
        }

        if (success) {
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

  /**
   * Get cached images for a product (permanent URLs only, no localStorage for blob URLs)
   * @param productId The product ID
   * @returns Array of product images or null if not cached
   */
  getCachedImages(productId: string): ProductImage[] | null {
    // First check in-memory cache
    const cacheEntry = state.cache.get(productId)

    if (cacheEntry && Date.now() - cacheEntry.timestamp < CACHE_DURATION) {
      if (process.env.NODE_ENV === "development") {
        console.log(`Found ${cacheEntry.data.length} cached images in memory for product ${productId}`)
      }
      return cacheEntry.data
    }

    if (typeof localStorage !== "undefined") {
      try {
        const localStorageKey = `product_images_${productId}`
        const cachedData = localStorage.getItem(localStorageKey)

        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
            // Filter out any blob URLs that shouldn't be in cache
            const permanentImages = parsed.data.filter((img: ProductImage) => !img.url.startsWith("blob:"))

            if (permanentImages.length !== parsed.data.length) {
              console.warn(`[v0] Filtered out ${parsed.data.length - permanentImages.length} blob URLs from cache`)
            }

            // Update in-memory cache with filtered data
            this.cacheImages(productId, permanentImages)
            if (process.env.NODE_ENV === "development") {
              console.log(
                `Found ${permanentImages.length} cached permanent images in localStorage for product ${productId}`,
              )
            }
            return permanentImages
          } else {
            // Remove expired localStorage entry
            localStorage.removeItem(localStorageKey)
          }
        }
      } catch (error) {
        console.error(`Error reading from localStorage for product ${productId}:`, error)
      }
    }

    return null
  },

  /**
   * Cache images for a product (permanent URLs only, never blob URLs)
   * @param productId The product ID
   * @param images Array of product images with permanent URLs
   */
  cacheImages(productId: string, images: ProductImage[]): void {
    const permanentImages = images.filter((img) => !img.url.startsWith("blob:"))

    if (permanentImages.length !== images.length) {
      console.warn(`[v0] Filtered out ${images.length - permanentImages.length} blob URLs from cache storage`)
    }

    const cacheEntry = {
      data: permanentImages,
      timestamp: Date.now(),
    }

    // Store in memory cache
    state.cache.set(productId, cacheEntry)

    if (typeof localStorage !== "undefined") {
      try {
        const localStorageKey = `product_images_${productId}`
        localStorage.setItem(localStorageKey, JSON.stringify(cacheEntry))
      } catch (error) {
        console.error(`Error storing to localStorage for product ${productId}:`, error)
      }
    }

    console.log(`Cached ${permanentImages.length} permanent images for product ${productId}`)
  },

  /**
   * Prefetch images for multiple products
   * @param productIds Array of product IDs
   */
  prefetchProductImages(productIds: string[]): void {
    if (!productIds || productIds.length === 0) return

    // Only log in development and reduce verbosity
    if (process.env.NODE_ENV === "development") {
      console.log(`Prefetching images for ${productIds.length} products`)
    }

    // Filter out products that are already cached
    const uncachedProductIds = productIds.filter((id) => !this.getCachedImages(id))

    if (uncachedProductIds.length === 0) {
      // Only log in development and reduce verbosity
      if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
        console.log("All products already cached, skipping prefetch")
      }
      return
    }

    // Queue the products for batch processing
    uncachedProductIds.forEach((id) => this.queueProductId(id))

    // Process the queue in the background
    setTimeout(() => {
      this.processQueue().catch((error) => {
        console.error("Error processing prefetch queue:", error)
      })
    }, 0)
  },

  /**
   * Invalidate cache for a specific product
   * @param productId The product ID
   */
  invalidateCache(productId: string): void {
    state.cache.delete(productId)

    if (typeof localStorage !== "undefined") {
      try {
        const localStorageKey = `product_images_${productId}`
        localStorage.removeItem(localStorageKey)
      } catch (error) {
        console.error(`Error removing from localStorage for product ${productId}:`, error)
      }
    }

    console.log(`[v0] Image cache invalidated for product ${productId}`)
  },

  /**
   * Clear all cache
   */
  clearCache(): void {
    state.cache.clear()
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
   * Reset the service state (for testing)
   */
  resetState(): void {
    state.isBatchModeEnabled = true
    state.hasTestedBatchEndpoint = false
    state.workingEndpoint = null
    state.inProgressBatches.clear()
    state.queue = []
    state.isProcessingQueue = false
    state.failedEndpoints.clear()
    console.log("Image batch service state reset")
  },
}
