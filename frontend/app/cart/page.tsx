"use client"

import { useState } from "react"
import { Cart } from "@/components/cart/cart"

// Example initial cart items
const initialItems = [
  {
    id: 1,
    name: "Diamond Tennis Bracelet",
    price: 299999,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 2,
    name: "Sapphire and Diamond Ring",
    price: 199999,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 3,
    name: "Pearl Drop Necklace",
    price: 149999,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
]

export default function CartPage() {
  const [items, setItems] = useState(initialItems)

  const handleUpdateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return
    setItems((prevItems) => prevItems.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (id: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  return <Cart items={items} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem} />
}

