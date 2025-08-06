"use client"

import { useState, useEffect } from "react"

// Mock product data - in a real app, this would come from an API
const products = [
  {
    id: 1,
    name: "Diamond Tennis Bracelet",
    price: 299999,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 2,
    name: "Sapphire and Diamond Ring",
    price: 199999,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 3,
    name: "Pearl Drop Necklace",
    price: 149999,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 4,
    name: "Designer Evening Gown",
    price: 89999,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
    category: "Fashion",
  },
  {
    id: 5,
    name: "Crystal Chandelier Earrings",
    price: 79999,
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
]

export function useSearch(query: string) {
  const [results, setResults] = useState(products)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }

    setIsLoading(true)

    // Simulate API call delay
    const timer = setTimeout(() => {
      const filtered = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
      setResults(filtered)
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [query])

  return { results, isLoading }
}

