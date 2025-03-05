import { notFound } from "next/navigation"
import { ProductDetailsV2 } from "@/components/products/product-details-v2"
import type { Product } from "@/types"

// Fallback API URL if environment variable is not set
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

async function getProduct(id: string): Promise<Product> {
  try {
    // Use the API_URL constant instead of directly using the environment variable
    const response = await fetch(`${API_URL}/products/${id}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.status}`)
    }

    const product: Product = await response.json()

    // If the API doesn't return reviews, add mock reviews for testing
    if (!product.reviews) {
      product.reviews = [
        {
          rating: 5,
          reviewer_name: "Jane Doe",
          comment: "Excellent product! I love the quality and design.",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        },
        {
          rating: 4,
          reviewer_name: "John Smith",
          comment: "Good product overall. Shipping was fast and the item matches the description.",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        },
      ]
    }

    return product
  } catch (error) {
    console.error("Error fetching product:", error)
    throw new Error("Product not found")
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  try {
    const product = await getProduct(params.id)

    if (!product) {
      notFound()
    }

    return (
      <div className="container px-4 py-8 sm:px-6 lg:px-8">
        <ProductDetailsV2 product={product} />
      </div>
    )
  } catch (error) {
    // Handle the error gracefully
    notFound()
  }
}

