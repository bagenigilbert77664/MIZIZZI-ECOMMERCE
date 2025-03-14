"use client"

import { useState, useEffect, useCallback } from "react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"

export interface CartItem {
  id: number
  product_id: number
  quantity: number
  product: {
    id: number
    name: string
    price: number
    discount_price?: number
    image_url: string
    slug: string
  }
}

interface CartState {
  items: CartItem[]
  total: number
  count: number
  isLoading: boolean
}

export function useCart() {
  const [cart, setCart] = useState<CartState>({
    items: [],
    total: 0,
    count: 0,
    isLoading: true,
  })
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()

  // Calculate cart totals
  const calculateTotals = useCallback((items: CartItem[]) => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const total = items.reduce((sum, item) => {
      const price = item.product.discount_price || item.product.price
      return sum + price * item.quantity
    }, 0)
    return { count, total }
  }, [])

  // Load cart from API
  const loadCart = useCallback(async () => {
    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      // Make API request to fetch cart items
      const response = await api.get("/api/cart", {
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      // Extract items from response
      const items = response.data.items || []
      const { count, total } = calculateTotals(items)

      setCart({
        items,
        count,
        total,
        isLoading: false,
      })

      // Also store in localStorage as backup
      localStorage.setItem("cart", JSON.stringify({ items }))
    } catch (error: any) {
      console.error("Error loading cart:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      // Try to load from localStorage as fallback
      try {
        const storedCart = localStorage.getItem("cart")
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart)
          const { count, total } = calculateTotals(parsedCart.items)
          setCart({
            items: parsedCart.items,
            count,
            total,
            isLoading: false,
          })
        }
      } catch (e) {
        console.error("Error loading cart from localStorage:", e)
      }

      // Show error toast
      toast({
        title: "Error loading cart",
        description: error.response?.data?.message || "Failed to load cart items",
        variant: "destructive",
      })
    }
  }, [calculateTotals, toast])

  // Load cart on mount and when auth state changes
  useEffect(() => {
    loadCart()

    // Set up interval to refresh cart periodically
    const intervalId = setInterval(() => {
      loadCart()
    }, 60000) // Refresh every minute

    return () => clearInterval(intervalId)
  }, [loadCart])

  // Add item to cart
  const addItem = async (productId: number, quantity = 1) => {
    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      // Make API request to add item to cart
      const response = await api.post("/api/cart", {
        product_id: productId,
        quantity,
      })

      // Refresh cart after adding item
      await loadCart()

      toast({
        title: "Added to cart",
        description: "Item has been added to your cart",
      })

      return true
    } catch (error: any) {
      console.error("Error adding item to cart:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add item to cart",
        variant: "destructive",
      })

      return false
    }
  }

  // Update item quantity
  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) {
      return removeItem(itemId)
    }

    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      // Make API request to update item quantity
      await api.put(`/api/cart/${itemId}`, {
        quantity,
      })

      // Refresh cart after updating quantity
      await loadCart()

      return true
    } catch (error: any) {
      console.error("Error updating cart item:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update cart item",
        variant: "destructive",
      })

      return false
    }
  }

  // Remove item from cart
  const removeItem = async (itemId: number) => {
    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      // Make API request to remove item from cart
      await api.delete(`/api/cart/${itemId}`)

      // Refresh cart after removing item
      await loadCart()

      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart",
      })

      return true
    } catch (error: any) {
      console.error("Error removing item from cart:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to remove item from cart",
        variant: "destructive",
      })

      return false
    }
  }

  // Clear cart
  const clearCart = async () => {
    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      // Make API request to clear cart
      await api.delete("/api/cart/clear")

      // Refresh cart after clearing
      await loadCart()

      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      })

      return true
    } catch (error: any) {
      console.error("Error clearing cart:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to clear cart",
        variant: "destructive",
      })

      return false
    }
  }

  return {
    ...cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart: loadCart,
  }
}

