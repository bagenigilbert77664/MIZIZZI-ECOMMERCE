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
    if (!isAuthenticated) {
      // If not authenticated, try to load from localStorage
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
        } else {
          setCart({
            items: [],
            count: 0,
            total: 0,
            isLoading: false,
          })
        }
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
        setCart({
          items: [],
          count: 0,
          total: 0,
          isLoading: false,
        })
      }
      return
    }

    try {
      setCart((prev) => ({ ...prev, isLoading: true }))
      const response = await api.get("/cart")
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
    } catch (error) {
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
    }
  }, [isAuthenticated, calculateTotals])

  // Load cart on mount and when auth state changes
  useEffect(() => {
    loadCart()
  }, [loadCart])

  // Add item to cart
  const addItem = async (productId: number, quantity = 1) => {
    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      if (!isAuthenticated) {
        // Handle guest cart
        const storedCart = localStorage.getItem("cart")
        const parsedCart = storedCart ? JSON.parse(storedCart) : { items: [] }
        const existingItem = parsedCart.items.find((item: CartItem) => item.product_id === productId)

        if (existingItem) {
          existingItem.quantity += quantity
        } else {
          // For guest cart, we need to fetch the product details
          const productResponse = await api.get(`/products/${productId}`)
          const product = productResponse.data

          parsedCart.items.push({
            id: Date.now(), // Temporary ID
            product_id: productId,
            quantity,
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              discount_price: product.discount_price,
              image_url: product.image_url,
              slug: product.slug,
            },
          })
        }

        localStorage.setItem("cart", JSON.stringify(parsedCart))
        const { count, total } = calculateTotals(parsedCart.items)

        setCart({
          items: parsedCart.items,
          count,
          total,
          isLoading: false,
        })

        toast({
          title: "Added to cart",
          description: "Item has been added to your cart",
        })

        return
      }

      // Handle authenticated cart
      const response = await api.post("/cart/add", {
        product_id: productId,
        quantity,
      })

      await loadCart()

      toast({
        title: "Added to cart",
        description: "Item has been added to your cart",
      })
    } catch (error: any) {
      console.error("Error adding item to cart:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add item to cart",
        variant: "destructive",
      })
    }
  }

  // Update item quantity
  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) {
      return removeItem(itemId)
    }

    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      if (!isAuthenticated) {
        // Handle guest cart
        const storedCart = localStorage.getItem("cart")
        const parsedCart = storedCart ? JSON.parse(storedCart) : { items: [] }
        const existingItem = parsedCart.items.find((item: CartItem) => item.id === itemId)

        if (existingItem) {
          existingItem.quantity = quantity
          localStorage.setItem("cart", JSON.stringify(parsedCart))
          const { count, total } = calculateTotals(parsedCart.items)

          setCart({
            items: parsedCart.items,
            count,
            total,
            isLoading: false,
          })
        }

        return
      }

      // Handle authenticated cart
      await api.put(`/cart/update/${itemId}`, {
        quantity,
      })

      await loadCart()
    } catch (error: any) {
      console.error("Error updating cart item:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update cart item",
        variant: "destructive",
      })
    }
  }

  // Remove item from cart
  const removeItem = async (itemId: number) => {
    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      if (!isAuthenticated) {
        // Handle guest cart
        const storedCart = localStorage.getItem("cart")
        const parsedCart = storedCart ? JSON.parse(storedCart) : { items: [] }
        parsedCart.items = parsedCart.items.filter((item: CartItem) => item.id !== itemId)

        localStorage.setItem("cart", JSON.stringify(parsedCart))
        const { count, total } = calculateTotals(parsedCart.items)

        setCart({
          items: parsedCart.items,
          count,
          total,
          isLoading: false,
        })

        toast({
          title: "Removed from cart",
          description: "Item has been removed from your cart",
        })

        return
      }

      // Handle authenticated cart
      await api.delete(`/cart/remove/${itemId}`)

      await loadCart()

      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart",
      })
    } catch (error: any) {
      console.error("Error removing item from cart:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to remove item from cart",
        variant: "destructive",
      })
    }
  }

  // Clear cart
  const clearCart = async () => {
    try {
      setCart((prev) => ({ ...prev, isLoading: true }))

      if (!isAuthenticated) {
        // Handle guest cart
        localStorage.removeItem("cart")

        setCart({
          items: [],
          count: 0,
          total: 0,
          isLoading: false,
        })

        toast({
          title: "Cart cleared",
          description: "All items have been removed from your cart",
        })

        return
      }

      // Handle authenticated cart
      await api.delete("/cart/clear")

      await loadCart()

      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      })
    } catch (error: any) {
      console.error("Error clearing cart:", error)
      setCart((prev) => ({ ...prev, isLoading: false }))

      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to clear cart",
        variant: "destructive",
      })
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

