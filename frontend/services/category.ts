import api from "@/lib/api"

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  banner_url?: string
  is_featured?: boolean
  parent_id?: number
  subcategories?: Category[]
}

// Create a cache for API responses
const cache = new Map()

export const categoryService = {
  async getCategories(params = {}): Promise<Category[]> {
    try {
      // Create a cache key based on the params
      const cacheKey = `categories-${JSON.stringify(params)}`

      // Check if we have a cached response
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)
      }

      // Update the endpoint to include the /api/ prefix
      const response = await api.get("/api/categories", { params })
      // The API returns paginated data with items in the "items" property
      const data = response.data.items || []

      // Cache the response
      cache.set(cacheKey, data)

      return data
    } catch (error) {
      console.error("Error fetching categories:", error)
      return []
    }
  },

  async getFeaturedCategories(): Promise<Category[]> {
    return this.getCategories({ featured: true })
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      // Create a cache key
      const cacheKey = `category-${slug}`

      // Check if we have a cached response
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)
      }

      // Update the endpoint to include the /api/ prefix
      const response = await api.get(`/api/categories/${slug}`)
      const data = response.data

      // Cache the response
      cache.set(cacheKey, data)

      return data
    } catch (error) {
      console.error(`Error fetching category with slug ${slug}:`, error)
      return null
    }
  },

  async getSubcategories(parentId: number): Promise<Category[]> {
    try {
      // Create a cache key
      const cacheKey = `subcategories-${parentId}`

      // Check if we have a cached response
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)
      }

      const response = await api.get("/api/categories", { params: { parent_id: parentId } })
      const data = response.data.items || []

      // Cache the response
      cache.set(cacheKey, data)

      return data
    } catch (error) {
      console.error(`Error fetching subcategories for parent ${parentId}:`, error)
      return []
    }
  },

  // Clear cache method for when data needs to be refreshed
  clearCache() {
    cache.clear()
  },
}