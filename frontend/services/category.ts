import api from "@/lib/api"

export interface Category {
id: number
name: string
slug: string
description?: string
image_url?: string
banner_url?: string
is_featured?: boolean
parent_id?: number | null
subcategories?: Category[]
parent?: Category | null
products_count?: number
}

// Create a cache for API responses
const cache = new Map<string, any>()

// Helper to strip nullish values from params
function sanitizeParams<T extends Record<string, any>>(params: T): Partial<T> {
const out: Record<string, any> = {}
Object.keys(params || {}).forEach((key) => {
  const val = params[key]
  if (val !== null && val !== undefined) {
    out[key] = val
  }
})
return out as Partial<T>
}

// Ensure trailing slash on collection endpoints to avoid 308 redirects
const CATEGORIES_BASE = "/api/categories/"

export const categoryService = {
async getCategories(params: Record<string, any> = {}): Promise<Category[]> {
  try {
    const cleanParams = sanitizeParams(params)
    const cacheKey = `categories-${JSON.stringify(cleanParams)}`
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    // Use trailing slash
    const response = await api.get(CATEGORIES_BASE, { params: cleanParams })
    const data = response.data?.items ?? response.data ?? []

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
  if (!slug) return null
  try {
    const cacheKey = `category-${slug}`
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    // Use trailing slash for detail endpoint
    const response = await api.get(`${CATEGORIES_BASE}${encodeURIComponent(slug)}/`)
    const data = response.data ?? null

    cache.set(cacheKey, data)
    return data
  } catch (error) {
    console.error(`Error fetching category with slug ${slug}:`, error)
    return null
  }
},

async getSubcategories(parentId: number): Promise<Category[]> {
  try {
    const cacheKey = `subcategories-${parentId}`
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    const response = await api.get(CATEGORIES_BASE, {
      params: { parent_id: parentId },
    })
    const data = response.data?.items ?? response.data ?? []

    cache.set(cacheKey, data)
    return data
  } catch (error) {
    console.error(`Error fetching subcategories for parent ${parentId}:`, error)
    return []
  }
},

// Added to satisfy existing usage in app/category/[slug]/page.tsx.
// Tries a couple of common patterns, falls back gracefully.
async getRelatedCategories(categoryId: number): Promise<Category[]> {
  if (!categoryId && categoryId !== 0) return []
  const tryEndpoints = [
    `${CATEGORIES_BASE}${encodeURIComponent(String(categoryId))}/related/`,
    `${CATEGORIES_BASE}${encodeURIComponent(String(categoryId))}/related`,
    `${CATEGORIES_BASE}related/`,
  ] as const

  // First try ID-scoped endpoints
  for (const url of tryEndpoints.slice(0, 2)) {
    try {
      const res = await api.get(url)
      const items = res.data?.items ?? res.data ?? []
      if (Array.isArray(items)) return items
    } catch {
      // continue to next pattern
    }
  }

  // Then try collection-style related endpoint with query param
  try {
    const res = await api.get(tryEndpoints[2], { params: { category_id: categoryId } })
    const items = res.data?.items ?? res.data ?? []
    return Array.isArray(items) ? items : []
  } catch (error) {
    console.warn("getRelatedCategories fallback failed:", error)
    return []
  }
},

clearCache() {
  cache.clear()
},
}
