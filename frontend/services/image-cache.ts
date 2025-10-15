/**
 * Enhanced Image Cache Service
 *
 * This service provides robust image caching with persistent storage
 * to prevent loss of images during page refreshes or navigation.
 */

interface CachedImage {
  url: string
  productId: string | number
  timestamp: number
}

class ImageCacheService {
  private static instance: ImageCacheService
  private memoryCache: Map<string, string> = new Map()
  private STORAGE_KEY = "mizizzi_product_images_cache"

  constructor() {
    this.loadFromStorage()
    // Set up event listeners for storage events from other tabs
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === this.STORAGE_KEY) {
          this.loadFromStorage()
        }
      })
    }
  }

  static getInstance(): ImageCacheService {
    if (!ImageCacheService.instance) {
      ImageCacheService.instance = new ImageCacheService()
    }
    return ImageCacheService.instance
  }

  /**
   * Load cached images from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === "undefined") return

      const storedCache = localStorage.getItem(this.STORAGE_KEY)
      if (storedCache) {
        const cachedImages: Record<string, CachedImage> = JSON.parse(storedCache)
        Object.entries(cachedImages).forEach(([key, value]) => {
          this.memoryCache.set(key, value.url)
        })
        console.log(`Loaded ${this.memoryCache.size} cached images from storage`)
      }
    } catch (error) {
      console.error("Failed to load image cache from storage:", error)
    }
  }

  /**
   * Save the current cache to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window === "undefined") return

      const cachedImages: Record<string, CachedImage> = {}
      this.memoryCache.forEach((url, key) => {
        // Extract product ID from the key (format: "product-image-{productId}-{index}")
        const match = key.match(/product-image-(\d+)/)
        const productId = match ? match[1] : "unknown"

        cachedImages[key] = {
          url,
          productId,
          timestamp: Date.now(),
        }
      })

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cachedImages))
    } catch (error) {
      console.error("Failed to save image cache to storage:", error)
    }
  }

  /**
   * Set an image URL in the cache
   */
  set(key: string, url: string): void {
    this.memoryCache.set(key, url)
    this.saveToStorage()
  }

  /**
   * Get an image URL from the cache
   */
  get(key: string): string | undefined {
    return this.memoryCache.get(key)
  }

  /**
   * Check if key exists in the cache
   */
  has(key: string): boolean {
    return this.memoryCache.has(key)
  }

  /**
   * Delete an image from the cache
   */
  delete(key: string): boolean {
    const result = this.memoryCache.delete(key)
    if (result) {
      this.saveToStorage()
    }
    return result
  }

  /**
   * Save product images to the cache
   */
  cacheProductImages(productId: string | number, imageUrls: string[]): void {
    imageUrls.forEach((url, index) => {
      const key = `product-image-${productId}-${index}`
      this.set(key, url)
    })

    // Also store the count for easier retrieval
    this.set(`product-image-count-${productId}`, String(imageUrls.length))
  }

  /**
   * Get all cached images for a product
   */
  getProductImages(productId: string | number): string[] {
    const images: string[] = []
    let index = 0

    // Get all images for this product
    while (true) {
      const key = `product-image-${productId}-${index}`
      const url = this.get(key)

      if (!url) break
      images.push(url)
      index++
    }

    return images
  }

  /**
   * Clear all cached images for a specific product
   */
  clearProductImages(productId: string | number): void {
    let index = 0
    while (true) {
      const key = `product-image-${productId}-${index}`
      if (!this.has(key)) break
      this.delete(key)
      index++
    }
    this.delete(`product-image-count-${productId}`)
    this.saveToStorage()
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    this.memoryCache.clear()
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.memoryCache.size
  }
}

// Export a singleton instance
export const imageCache = ImageCacheService.getInstance()
