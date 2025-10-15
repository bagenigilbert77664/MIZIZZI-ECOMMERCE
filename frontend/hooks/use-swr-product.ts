import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import type { Product, ProductImage } from "@/types"
import { productService } from "@/services/product"
import api from "@/lib/api"
import { adminService } from "@/services/admin"
import { imageBatchService } from "@/services/image-batch-service"

// Create a cache for admin data to avoid CORS issues
const adminDataCache = new Map<string, any>()

// Create a cache for product images to avoid duplicate requests
const imageCache = new Map<string, ProductImage[]>()

// Create a request deduplication set to track in-flight requests
const inFlightRequests = new Set<string>()

// Generic fetcher function for direct API calls
const fetcher = async (url: string): Promise<any> => {
  // Check if this is an admin endpoint
  if (url.includes("/api/admin/")) {
    // Check cache first for admin endpoints
    if (adminDataCache.has(url)) {
      console.log(`Using cached admin data for ${url}`)
      return Promise.resolve(adminDataCache.get(url))
    }

    // For admin endpoints, use adminService instead of direct fetch
    let data: any = []

    if (url.includes("/categories")) {
      console.log("Fetching categories using adminService")
      const response = await adminService.getCategories()
      data = response?.items || []
    } else if (url.includes("/brands")) {
      console.log("Fetching brands using adminService")
      const response = await adminService.getBrands()
      data = response?.items || []
    }

    // Cache the result
    adminDataCache.set(url, data)
    return Promise.resolve(data)
  }

  // For non-admin endpoints, use regular API
  return api.get(url).then((response) => response.data)
}

// Product fetcher that handles the productService call
const productFetcher = async (url: string): Promise<Product> => {
  // Check if this request is already in flight
  if (inFlightRequests.has(url)) {
    console.log(`Request already in flight: ${url}, waiting for completion`)

    // Wait for the in-flight request to complete
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!inFlightRequests.has(url)) {
          clearInterval(checkInterval)
          resolve(true)
        }
      }, 100)
    })

    // Get the result from cache if available
    const cachedData = await globalMutate<Product>(url)
    if (cachedData) return cachedData
  }

  try {
    // Mark this request as in flight
    inFlightRequests.add(url)

    const id = url.split("/").pop() // Extract ID from URL
    if (!id) throw new Error("Invalid product ID")

    const product = await productService.getProduct(id)
    if (!product) throw new Error("Product not found")

    return product
  } finally {
    // Remove from in-flight requests when done
    inFlightRequests.delete(url)
  }
}

// Extract product ID from URL like /api/products/123/images
const extractProductId = (url: string): string | null => {
  // Use regex to extract the ID from URLs like /api/products/123/images
  const match = url.match(/\/products\/([^/]+)\//)
  return match ? match[1] : null
}

// Product images fetcher with batching and caching
const productImagesFetcher = async (url: string): Promise<ProductImage[]> => {
  // Check if this request is already in flight
  if (inFlightRequests.has(url)) {
    console.log(`Image request already in flight: ${url}, waiting for completion`)

    // Wait for the in-flight request to complete
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!inFlightRequests.has(url)) {
          clearInterval(checkInterval)
          resolve(true)
        }
      }, 100)
    })

    // Get the result from cache if available
    const cachedData = await globalMutate<ProductImage[]>(url)
    if (cachedData) return cachedData
  }

  try {
    // Mark this request as in flight
    inFlightRequests.add(url)

    // Check cache first
    if (imageCache.has(url)) {
      console.log(`Using cached images for ${url}`)
      return imageCache.get(url) || []
    }

    const id = extractProductId(url)
    if (!id) return []

    try {
      console.log(`Fetching images for product ${id} (not cached)`)

      // Use the batch service instead of direct API call
      const images = await imageBatchService.fetchProductImages(id)

      // Cache the result
      imageCache.set(url, images)
      return images
    } catch (error) {
      console.error(`Error fetching images for product ${id}:`, error)
      return []
    }
  } finally {
    // Remove from in-flight requests when done
    inFlightRequests.delete(url)
  }
}

// Special handler for the problematic images/images endpoint
const specialImagesFetcher = async (url: string): Promise<ProductImage[]> => {
  // Check for the problematic pattern BEFORE any API call is made
  if (url.includes("/images/images")) {
    console.warn(`Detected problematic endpoint: ${url}, returning empty array instead of making API call`)
    return []
  }

  // Extract the ID from the URL to check if it's valid
  const id = extractProductId(url)

  // If no ID found or it's not a valid product ID, return empty array
  if (!id || id === "images" || isNaN(Number(id))) {
    console.warn(`Invalid product ID in URL: ${url}, returning empty array`)
    return []
  }

  return productImagesFetcher(url)
}

// Default SWR configuration
const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: true, // Enable revalidation when tab regains focus
  revalidateOnReconnect: true, // Enable revalidation when network reconnects
  refreshInterval: 60000, // Poll for updates every 60 seconds
  dedupingInterval: 5000, // Reduced from 60s to 5s for faster updates
  errorRetryCount: 2, // Limit retries to avoid flooding
  shouldRetryOnError: (err) => {
    // Don't retry on 404 errors
    if (err.status === 404) return false
    return true
  },
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    // Custom retry logic with exponential backoff
    if (retryCount >= (config.errorRetryCount || 3)) return

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
    setTimeout(() => revalidate({ retryCount }), delay)
  },
}

export function useProduct(productId: string | undefined, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<Product>(
    productId ? `/api/products/${productId}` : null,
    productFetcher,
    {
      ...defaultSWRConfig,
      ...config,
    },
  )

  return {
    product: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useProductImages(productId: string | undefined, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<ProductImage[]>(
    productId ? `/api/products/${productId}/images` : null,
    specialImagesFetcher,
    {
      ...defaultSWRConfig,
      ...config,
      fallbackData: [], // Provide fallback data to avoid undefined errors
    },
  )

  return {
    images: data || [],
    isLoading,
    isError: error,
    mutate,
  }
}

// For categories, use adminService directly to avoid CORS
export function useCategories(config?: SWRConfiguration) {
  const { data, error, isLoading } = useSWR<any[]>("/api/admin/categories", fetcher, {
    ...defaultSWRConfig,
    dedupingInterval: 300000, // 5 minutes
    errorRetryCount: 1, // Only retry once for admin endpoints
    fallbackData: [], // Provide fallback data to avoid undefined errors
    ...config,
  })

  return {
    categories: data || [],
    isLoading,
    isError: error,
  }
}

// For brands, use adminService directly to avoid CORS
export function useBrands(config?: SWRConfiguration) {
  const { data, error, isLoading } = useSWR<any[]>("/api/admin/brands", fetcher, {
    ...defaultSWRConfig,
    dedupingInterval: 300000, // 5 minutes
    errorRetryCount: 1, // Only retry once for admin endpoints
    fallbackData: [], // Provide fallback data to avoid undefined errors
    ...config,
  })

  return {
    brands: data || [],
    isLoading,
    isError: error,
  }
}

// Add a function to clear the cache when needed
export function clearSWRCache() {
  imageCache.clear()
  adminDataCache.clear()
  inFlightRequests.clear()
  console.log("SWR cache cleared")
}

// Add a function to invalidate a specific product's images
export function invalidateProductImages(productId: string) {
  const cacheKey = `/api/products/${productId}/images`
  imageCache.delete(cacheKey)
  console.log(`Cache invalidated for ${cacheKey}`)
}

// Prefetch product data
export async function prefetchProduct(productId: string): Promise<void> {
  const url = `/api/products/${productId}`
  await globalMutate(url, productFetcher(url))
}

// Prefetch product images
export async function prefetchProductImages(productId: string): Promise<void> {
  const url = `/api/products/${productId}/images`
  const images = await imageBatchService.fetchProductImages(productId)
  await globalMutate(url, images)
}

// Prefetch multiple products and their images
export function prefetchProducts(productIds: string[]): void {
  // Prefetch products
  productIds.forEach((id) => {
    prefetchProduct(id).catch((err) => {
      console.warn(`Failed to prefetch product ${id}:`, err)
    })
  })

  // Prefetch images using batch service
  imageBatchService.prefetchProductImages(productIds)
}
