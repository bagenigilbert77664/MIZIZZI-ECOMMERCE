import useSWR, { type SWRConfiguration, mutate as globalMutate } from "swr"
import type { Product, ProductImage, Category, Brand } from "@/types"
import api from "@/lib/api"
import { adminService } from "@/services/admin"
import { imageBatchService } from "@/services/image-batch-service"

// Create a cache for admin data to avoid CORS issues
const adminDataCache = new Map<string, any>()

// Create a cache for product images to avoid duplicate requests
const imageCache = new Map<string, ProductImage[]>()

// Create a request deduplication set to track in-flight requests
const inFlightRequests = new Set<string>()

// Create a cache for product data
const productCache = new Map<string, { data: Product; timestamp: number }>()

// Default empty product to return when no data is available
const DEFAULT_PRODUCT: Product = {
  id: 0,
  name: "",
  slug: "",
  description: "",
  price: 0,
  sale_price: null,
  stock: 0,
  category_id: 0,
  brand_id: undefined,
  image_urls: [],
  is_featured: false,
  thumbnail_url: undefined,
  is_new: false,
  is_sale: false,
  is_flash_sale: false,
  is_luxury_deal: false,
  rating: 0,
  reviews: [],
  sku: "",
  weight: undefined,
  dimensions: undefined,
  variants: [],
  meta_title: "",
  meta_description: "",
  material: "",
  tags: [],
  created_at: "",
  updated_at: "",
  brand: undefined,
}

// Generic fetcher function for direct API calls\
const fetcher = async <T>(url: string)
: Promise<T> =>
{
  // Check if this is an admin endpoint
  if (url.includes("/api/admin/")) {
    // Check cache first for admin endpoints
    if (adminDataCache.has(url)) {
      console.log(`Using cached admin data for ${url}`)
      return adminDataCache.get(url)
    }

    // For admin endpoints, use adminService instead of direct fetch
    try {
      let data: any = []

      if (url.includes("/categories")) {
        console.log("Fetching categories using adminService")
        const response = await adminService.getCategories()
        data = response?.items || []
      } else if (url.includes("/brands")) {
        console.log("Fetching brands using adminService")
        const response = await adminService.getBrands()
        data = response?.items || []
      } else if (url.includes("/products/")) {
        // Extract product ID from URL
        const matches = url.match(/\/products\/(\d+)/)
        if (matches && matches[1]) {
          const productId = matches[1]
          console.log(`Fetching product ${productId} using adminService`)
          const product = await adminService.getProduct(productId)
          data = product || { ...DEFAULT_PRODUCT, id: Number.parseInt(productId) }
        }
      }

      // Cache the result
      adminDataCache.set(url, data)
      return data as T
    } catch (error) {
      console.error(`Error fetching admin data from ${url}:`, error)
      if (url.includes("/products/")) {
        // For product endpoints, return a default product
        const matches = url.match(/\/products\/(\d+)/)
        if (matches && matches[1]) {
          const productId = matches[1]
          return { ...DEFAULT_PRODUCT, id: Number.parseInt(productId) } as unknown as T
        }
      }
      return [] as unknown as T
    }
  }

  // For non-admin endpoints, use regular API
  try {
    const response = await api.get(url)
    return response.data as T
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error)
    if (url.includes("/products/")) {
      // For product endpoints, return a default product
      const matches = url.match(/\/products\/(\d+)/)
      if (matches && matches[1]) {
        const productId = matches[1]
        return { ...DEFAULT_PRODUCT, id: Number.parseInt(productId) } as unknown as T
      }
    }
    return [] as unknown as T
  }
}

// Fix the product fetcher function to properly handle the API response
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
    if (!id) {
      console.error("Invalid product ID in URL:", url)
      return { ...DEFAULT_PRODUCT }
    }

    // Use adminService instead of direct fetch
    console.log(`Fetching product with id ${id} using adminService`)
    const product = await adminService.getProduct(id)

    if (!product) {
      console.warn(`Product ${id} not found, returning default product`)
      return { ...DEFAULT_PRODUCT, id: Number.parseInt(id) }
    }

    console.log("Product data fetched successfully:", product)

    // Cache the result
    productCache.set(url, {
      data: product,
      timestamp: Date.now(),
    })

    return product
  } catch (error) {
    console.error(`Error fetching product:`, error)
    // Return a default product instead of throwing
    const id = url.split("/").pop()
    return { ...DEFAULT_PRODUCT, id: id ? Number.parseInt(id) : 0 }
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
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1 minute
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

// Hook for fetching a single product
export function useProduct(productId: string | undefined) {
  return useSWR<Product>(productId ? `/api/admin/products/${productId}` : null, productFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    suspense: false,
    fallbackData: productId ? { ...DEFAULT_PRODUCT, id: Number.parseInt(productId) } : undefined,
  })
}

// Hook for fetching product images with enhanced persistence
export function useProductImages(productId: string | undefined) {
  const { data, error, mutate } = useSWR<{
    success: boolean
    images: ProductImage[]
    total_count: number
    thumbnail_url: string | null
  }>(
    productId ? `/api/admin/products/${productId}/images` : null,
    async (
      url: string,
    ): Promise<{
      success: boolean
      images: ProductImage[]
      total_count: number
      thumbnail_url: string | null
    }> => {
      try {
        const id = url.split("/")[4] // Extract product ID from URL

        // Try to get images from cache first
        const cachedImages = imageBatchService.getCachedImages(id)
        if (cachedImages && cachedImages.length > 0) {
          console.log(`Using ${cachedImages.length} cached images for product ${id}`)

          // Convert cached image URLs (string[]) or ProductImage[] to proper ProductImage objects
          const imageObjects: ProductImage[] = cachedImages.map((img: any, index: number) => {
            if (typeof img === "string") {
              // If img is a string (URL), convert to ProductImage
              return {
                id: `cached-${id}-${index}`,
                product_id: id,
                filename: `image-${index}`,
                original_name: `image-${index}`,
                url: img,
                is_primary: index === 0,
                sort_order: index,
                alt_text: `Product ${id} image ${index + 1}`,
              }
            } else {
              // If img is already a ProductImage, ensure required fields
              return {
                ...img,
                id: img.id ?? `cached-${id}-${index}`,
                product_id: img.product_id ?? id,
                filename: img.filename ?? `image-${index}`,
                original_name: img.original_name ?? `image-${index}`,
                url: img.url,
                is_primary: typeof img.is_primary === "boolean" ? img.is_primary : index === 0,
                sort_order: typeof img.sort_order === "number" ? img.sort_order : index,
                alt_text: img.alt_text ?? `Product ${id} image ${index + 1}`,
              }
            }
          })

          return {
            success: true,
            images: imageObjects,
            total_count: imageObjects.length,
            thumbnail_url: imageObjects[0]?.url ?? null, // use the url property of the first image
          }
        }

        const result = await adminService.getProductImage(id) as ProductImage | string | null
        let images: ProductImage[] = []
        let thumbnail_url: string | null = null

        if (result) {
          if (typeof result === "string") {
            // If result is a string (URL), wrap it in a ProductImage object
            images = [{
              id: `admin-${id}-0`,
              product_id: id,
              filename: `image-0`,
              original_name: `image-0`,
              url: result,
              is_primary: true,
              sort_order: 0,
              alt_text: `Product ${id} image 1`,
            }]
            thumbnail_url = result
          } else {
            // If result is already a ProductImage
            images = [result as ProductImage]
            thumbnail_url = (result as ProductImage).url ?? null
          }
        }

        return {
          success: true,
          images,
          total_count: images.length,
          thumbnail_url,
        }
      } catch (error) {
        console.error(`Error in useProductImages for product ${productId}:`, error)
        // Return empty result instead of throwing
        return {
          success: true,
          images: [],
          total_count: 0,
          thumbnail_url: null,
        }
      }
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 0, // Disable automatic refresh, rely on manual mutation
      errorRetryCount: 2, // Reduce retry count
      errorRetryInterval: 2000,
      shouldRetryOnError: (err: any) => {
        // Don't retry on 500 errors to avoid flooding the server
        if (err?.response?.status === 500) return false
        return true
      },
    },
  )

  return {
    images: data?.images?.map((img) => img.url) || [],
    imageDetails: data?.images || [],
    thumbnailUrl: data?.thumbnail_url,
    isLoading: !error && !data,
    isError: !!error,
    mutate,
  }
}

// Hook for fetching categories
export function useCategories() {
  const { data, error, isLoading } = useSWR<Category[]>("/api/admin/categories", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    fallbackData: [], // Provide fallback data
  })

  return {
    data: Array.isArray(data) ? data : [],
    error,
    isLoading,
  }
}

// Hook for fetching brands
export function useBrands() {
  const { data, error, isLoading } = useSWR<Brand[]>("/api/admin/brands", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    fallbackData: [], // Provide fallback data
  })

  return {
    data: Array.isArray(data) ? data : [],
    error,
    isLoading,
  }
}

// Hook for fetching products with pagination
export function useProducts(page = 1, limit = 10, search = "") {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  }).toString()

  return useSWR<{
    items: Product[]
    pagination: {
      page: number
      per_page: number
      total_pages: number
      total_items: number
    }
  }>(`/api/admin/products?${queryParams}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  })
}

// Add a function to clear the cache when needed
export function clearSWRCache() {
  imageCache.clear()
  adminDataCache.clear()
  inFlightRequests.clear()
  productCache.clear()
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
