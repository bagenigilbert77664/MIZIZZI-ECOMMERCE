"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Product } from "@/types"
import { productService } from "@/services/product"
import { websocketService } from "@/services/websocket"

interface ProductContextType {
  products: Product[]
  featuredProducts: Product[]
  newProducts: Product[]
  saleProducts: Product[]
  isLoading: boolean
  error: string | null
  refreshProduct: (id: string) => Promise<Product | null>
  refreshProducts: () => Promise<void>
}

const ProductContext = createContext<ProductContextType | undefined>(undefined)

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [saleProducts, setSaleProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Function to refresh a specific product
  const refreshProduct = async (id: string): Promise<Product | null> => {
    try {
      const updatedProduct = await productService.getProduct(id)

      if (updatedProduct) {
        // Update the product in all relevant lists
        setProducts((prevProducts) => prevProducts.map((p) => (p.id.toString() === id ? updatedProduct : p)))

        setFeaturedProducts((prevProducts) => prevProducts.map((p) => (p.id.toString() === id ? updatedProduct : p)))

        setNewProducts((prevProducts) => prevProducts.map((p) => (p.id.toString() === id ? updatedProduct : p)))

        setSaleProducts((prevProducts) => prevProducts.map((p) => (p.id.toString() === id ? updatedProduct : p)))
      }

      return updatedProduct
    } catch (error) {
      console.error(`Error refreshing product ${id}:`, error)
      return null
    }
  }

  // Function to refresh all products
  const refreshProducts = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const [allProducts, featured, newProds, sale] = await Promise.all([
        productService.getProducts(),
        productService.getFeaturedProducts(),
        productService.getNewProducts(),
        productService.getSaleProducts(),
      ])

      setProducts(allProducts)
      setFeaturedProducts(featured)
      setNewProducts(newProds)
      setSaleProducts(sale)
    } catch (error) {
      console.error("Error refreshing products:", error)
      setError("Failed to load products. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Initial data fetch
  useEffect(() => {
    refreshProducts()
  }, [])

  // Subscribe to WebSocket product updates
  useEffect(() => {
    const handleProductUpdate = async (data: { id: string }) => {
      console.log("Received product update for ID:", data.id)
      await refreshProduct(data.id)
    }

    // Subscribe to product updates
    const unsubscribe = websocketService.subscribe("product_updated", handleProductUpdate)

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <ProductContext.Provider
      value={{
        products,
        featuredProducts,
        newProducts,
        saleProducts,
        isLoading,
        error,
        refreshProduct,
        refreshProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  )
}

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext)
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider")
  }
  return context
}

