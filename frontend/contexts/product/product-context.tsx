"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { productService } from "@/services/product"
import type { Product } from "@/types"

interface ProductContextType {
  products: Product[]
  featuredProducts: Product[]
  newProducts: Product[]
  saleProducts: Product[]
  isLoading: boolean
  error: string | null
  refreshProducts: () => Promise<void>
  getProduct: (id: string) => Promise<Product | null>
  searchProducts: (query: string) => Product[]
  getProductsByCategory: (categorySlug: string) => Promise<Product[]>
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

export function useProducts() {
  const context = useContext(ProductContext)
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider")
  }
  return context
}

interface ProductProviderProps {
  children: ReactNode
}

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [saleProducts, setSaleProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshProducts = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all product categories in parallel
      const [allProducts, featured, newItems, sale] = await Promise.all([
        productService.getProducts(),
        productService.getFeaturedProducts(),
        productService.getNewProducts(),
        productService.getSaleProducts(),
      ])

      setProducts(allProducts)
      setFeaturedProducts(featured)
      setNewProducts(newItems)
      setSaleProducts(sale)

      console.log(
        `Loaded ${allProducts.length} products, ${featured.length} featured, ${newItems.length} new, ${sale.length} on sale`,
      )
    } catch (err) {
      console.error("Error refreshing products:", err)
      setError(err instanceof Error ? err.message : "Failed to load products")
    } finally {
      setIsLoading(false)
    }
  }

  const getProduct = async (id: string): Promise<Product | null> => {
    try {
      // First check if product is already in our cache
      const cachedProduct = products.find((p) => p.id.toString() === id)
      if (cachedProduct) {
        return cachedProduct
      }

      // If not in cache, fetch from service
      return await productService.getProduct(id)
    } catch (err) {
      console.error(`Error fetching product ${id}:`, err)
      return null
    }
  }

  const searchProducts = (query: string): Product[] => {
    if (!query.trim()) return []

    const searchTerm = query.toLowerCase()
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm),
    )
  }

  const getProductsByCategory = async (categorySlug: string): Promise<Product[]> => {
    try {
      return await productService.getProductsByCategory(categorySlug)
    } catch (err) {
      console.error(`Error fetching products for category ${categorySlug}:`, err)
      return []
    }
  }

  // Initialize products on mount
  useEffect(() => {
    refreshProducts()
  }, [])

  const value: ProductContextType = {
    products,
    featuredProducts,
    newProducts,
    saleProducts,
    isLoading,
    error,
    refreshProducts,
    getProduct,
    searchProducts,
    getProductsByCategory,
  }

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}
