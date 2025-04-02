"use client"

import { useState, useEffect } from "react"
import { websocketService } from "@/services/websocket"
import { productService } from "@/services/product"
import type { Product } from "@/types"

export function useProductUpdates(productId?: string) {
  const [isUpdated, setIsUpdated] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)

  // Subscribe to updates for a specific product or all products
  useEffect(() => {
    const handleProductUpdate = (data: { id: string }) => {
      // If we're tracking a specific product and this update is for that product
      if (productId && data.id === productId) {
        setIsUpdated(true)
        setLastUpdateTime(Date.now())
      }
      // If we're not tracking a specific product, track all updates
      else if (!productId) {
        setIsUpdated(true)
        setLastUpdateTime(Date.now())
      }
    }

    // Subscribe to product updates
    const unsubscribe = websocketService.subscribe("product_updated", handleProductUpdate)

    return () => {
      unsubscribe()
    }
  }, [productId])

  // Function to refresh the product data
  const refreshProduct = async () => {
    if (!productId) return null

    setIsRefreshing(true)
    try {
      const updatedProduct = await productService.getProduct(productId)
      if (updatedProduct) {
        setProduct(updatedProduct)
        setIsUpdated(false) // Reset the updated flag
      }
      return updatedProduct
    } catch (error) {
      console.error(`Error refreshing product ${productId}:`, error)
      return null
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load the product initially if productId is provided
  useEffect(() => {
    if (productId) {
      refreshProduct()
    }
  }, [productId])

  return {
    isUpdated,
    lastUpdateTime,
    isRefreshing,
    product,
    refreshProduct,
  }
}

