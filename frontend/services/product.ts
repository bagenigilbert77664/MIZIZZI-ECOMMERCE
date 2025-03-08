import api from "@/lib/api"
import { Product } from "@/types"

export const productService = {
  async getProducts(params = {}): Promise<Product[]> {
    try {
      console.log("API call: getProducts with params:", params)
      const response = await api.get("/api/products", { params })
      console.log("API response:", response.data)
      return response.data.items || []
    } catch (error) {
      console.error("Error fetching products:", error)
      return []
    }
  },

  async getProductsByCategory(categorySlug: string): Promise<Product[]> {
    try {
      console.log(`API call: getProductsByCategory for slug: ${categorySlug}`)
      const response = await api.get("/api/products", {
        params: { category_slug: categorySlug },
      })
      console.log("API response for category products:", response.data)
      return response.data.items || []
    } catch (error) {
      console.error(`Error fetching products for category ${categorySlug}:`, error)
      return []
    }
  },

  async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await api.get(`/api/products/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product with id ${id}:`, error)
      return null
    }
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const response = await api.get(`/api/products/${slug}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching product with slug ${slug}:`, error)
      return null
    }
  },

  async getFeaturedProducts(): Promise<Product[]> {
    return this.getProducts({ featured: true })
  },

  async getNewProducts(): Promise<Product[]> {
    return this.getProducts({ new: true })
  },

  async getSaleProducts(): Promise<Product[]> {
    return this.getProducts({ sale: true })
  },

  async getFlashSaleProducts(): Promise<Product[]> {
    return this.getProducts({ flash_sale: true })
  },

  async getLuxuryDealProducts(): Promise<Product[]> {
    return this.getProducts({ luxury_deal: true })
  },
}