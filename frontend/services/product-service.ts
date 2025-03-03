import api from "@/lib/api"
import type { Product } from "@/types"

export interface ProductResponse {
  items: Product[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
}

export const productService = {
  // Get all products with optional filters
  async getProducts(params?: {
    page?: number
    per_page?: number
    category_id?: number
    category_slug?: string
    brand_id?: number
    brand_slug?: string
    featured?: boolean
    new?: boolean
    sale?: boolean
    flash_sale?: boolean
    luxury_deal?: boolean
    min_price?: number
    max_price?: number
    q?: string
    sort_by?: string
    sort_order?: "asc" | "desc"
  }): Promise<ProductResponse> {
    const response = await api.get("/api/products", { params })
    return response.data
  },

  // Get a single product by ID
  async getProduct(id: number): Promise<Product> {
    const response = await api.get(`/api/products/${id}`)
    return response.data
  },

  // Get a single product by slug
  async getProductBySlug(slug: string): Promise<Product> {
    const response = await api.get(`/api/products/${slug}`)
    return response.data
  },
}

