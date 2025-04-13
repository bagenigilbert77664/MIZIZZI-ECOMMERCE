"use client"

// hooks/use-cart.ts

import { useState, useEffect } from "react"

const useCart = () => {
  const [cart, setCart] = useState<any[]>([]) // Replace 'any' with your cart item type

  useEffect(() => {
    // Load cart from local storage or API on component mount
    const storedCart = localStorage.getItem("cart")
    if (storedCart) {
      setCart(JSON.parse(storedCart))
    }
  }, [])

  useEffect(() => {
    // Save cart to local storage whenever it changes
    localStorage.setItem("cart", JSON.stringify(cart))
  }, [cart])

  const addItem = async (productId: number, quantity = 1, variantId?: number) => {
    try {
      // You might want to check stock here if you have access to product data
      // For now, we'll assume the product details components handle stock checks

      // Add to cart logic
      const existingItemIndex = cart.findIndex((item) => item.productId === productId && item.variantId === variantId)

      if (existingItemIndex > -1) {
        // Item already exists, update quantity
        const updatedCart = [...cart]
        updatedCart[existingItemIndex].quantity += quantity
        setCart(updatedCart)
      } else {
        // Item doesn't exist, add new item
        const newItem = {
          productId,
          quantity,
          variantId,
        }
        setCart([...cart, newItem])
      }

      return true
    } catch (error) {
      console.error("Error adding item to cart:", error)
      return false
    }
  }

  const removeItem = (productId: number, variantId?: number) => {
    const updatedCart = cart.filter((item) => !(item.productId === productId && item.variantId === variantId))
    setCart(updatedCart)
  }

  const updateQuantity = (productId: number, quantity: number, variantId?: number) => {
    const updatedCart = cart.map((item) => {
      if (item.productId === productId && item.variantId === variantId) {
        return { ...item, quantity }
      }
      return item
    })
    setCart(updatedCart)
  }

  const clearCart = () => {
    setCart([])
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    // Replace with your logic to calculate total price based on product data
    return 0
  }

  return {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
  }
}

export default useCart

