export interface Product {
  id: number
  name: string
  price: number
  image: string
  category: string
  rating?: number
  reviews?: number
}


export interface Product {
  id: number
  name: string
  slug: string
  description: string
  price: number
  sale_price?: number
  stock: number
  category_id: number
  brand_id?: number
  image_urls: string[]
  thumbnail_url: string
  sku: string
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  is_featured: boolean
  is_new: boolean
  is_sale: boolean
  is_flash_sale: boolean
  is_luxury_deal: boolean
  meta_title?: string
  meta_description?: string
  created_at: string
  updated_at: string
  variants?: ProductVariant[]
}

export interface ProductVariant {
  id: number
  product_id: number
  sku: string
  color?: string
  size?: string
  stock: number
  price: number
  image_urls: string[]
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  banner_url?: string
  parent_id?: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

