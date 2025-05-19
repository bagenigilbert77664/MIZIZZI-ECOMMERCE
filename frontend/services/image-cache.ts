/**
 * A utility for caching and managing product images
 */

// Create and export the image cache
export const imageCache = new Map<string, string>()

// Cache for storing preloaded images
const preloadedImages = new Map<string, HTMLImageElement>()

/**
 * Cache an image URL
 * @param key The cache key (usually product ID + image index)
 * @param url The image URL to cache
 */
export function cacheImageUrl(key: string, url: string): void {
  imageCache.set(key, url)
}

/**
 * Get a cached image URL
 * @param key The cache key
 * @returns The cached URL or undefined if not found
 */
export function getCachedImageUrl(key: string): string | undefined {
  return imageCache.get(key)
}

/**
 * Preload an image and store it in cache
 * @param url The image URL to preload
 * @returns A promise that resolves when the image is loaded
 */
export function preloadImage(url: string): Promise<HTMLImageElement> {
  // Check if already preloaded
  if (preloadedImages.has(url)) {
    return Promise.resolve(preloadedImages.get(url)!)
  }

  // Create a new promise for image loading
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous" // Prevent CORS issues

    img.onload = () => {
      preloadedImages.set(url, img)
      resolve(img)
    }

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`))
    }

    img.src = url
  })
}

/**
 * Preload multiple images in batches
 * @param urls Array of image URLs to preload
 * @param batchSize Number of images to load simultaneously
 * @param onProgress Optional callback for progress updates
 * @returns A promise that resolves when all images are loaded
 */
export async function preloadImages(
  urls: string[],
  batchSize = 5,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  const uniqueUrls = [...new Set(urls)].filter((url) => !preloadedImages.has(url))
  let loadedCount = 0

  // Process in batches to avoid overwhelming the browser
  for (let i = 0; i < uniqueUrls.length; i += batchSize) {
    const batch = uniqueUrls.slice(i, i + batchSize)

    // Load batch in parallel
    await Promise.allSettled(
      batch.map((url) =>
        preloadImage(url)
          .then(() => {
            loadedCount++
            if (onProgress) {
              onProgress(loadedCount, uniqueUrls.length)
            }
          })
          .catch((err) => {
            console.warn(`Failed to preload image: ${url}`, err)
            // Still increment counter even for failed images
            loadedCount++
            if (onProgress) {
              onProgress(loadedCount, uniqueUrls.length)
            }
          }),
      ),
    )
  }
}

/**
 * Clear all cached images
 */
export function clearImageCache(): void {
  imageCache.clear()
  preloadedImages.clear()
}
