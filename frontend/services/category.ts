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
}

// Transform backend category to frontend format
const transformCategory = (category: any): { id: string; name: string; image: string; href: string } => {
  return {
    id: category.id.toString(),
    name: category.name,
    image: category.image_url || `/placeholder.svg?height=300&width=300`,
    href: `/category/${category.slug}`,
  }
}

export const categoryService = {
  async getCategories(params = {}): Promise<{ id: string; name: string; image: string; href: string }[]> {
    try {
      const response = await api.get("/categories", { params })

      // The API returns paginated data with items in the "items" property
      const categories = response.data.items || []
      return categories.map(transformCategory)
    } catch (error) {
      console.error("Error fetching categories:", error)
      return []
    }
  },

  async getFeaturedCategories(): Promise<{ id: string; name: string; image: string; href: string }[]> {
    return this.getCategories({ featured: true })
  },

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      const response = await api.get(`/categories/${slug}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching category with slug ${slug}:`, error)
      return null
    }
  },
}

