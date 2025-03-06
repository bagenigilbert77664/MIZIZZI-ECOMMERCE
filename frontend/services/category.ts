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

export const categoryService = {
  async getCategories(params = {}): Promise<Category[]> {
    try {
      // Update the endpoint to include the /api/ prefix
      const response = await api.get("/api/categories", { params })
      // The API returns paginated data with items in the "items" property
      return response.data.items as Category[] || []
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
      // Update the endpoint to include the /api/ prefix
      const response = await api.get(`/api/categories/${slug}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching category with slug ${slug}:`, error)
      return null
    }
  },

  async getSubcategories(parentId: number): Promise<Category[]> {
    try {
      const response = await api.get("/api/categories", { params: { parent_id: parentId } })
      return response.data.items || []
    } catch (error) {
      console.error(`Error fetching subcategories for parent ${parentId}:`, error)
      return []
    }
  },
}

