import { notFound } from "next/navigation"
import { ProductDetailsV2 } from "@/components/products/product-details-v2"
import type { Product } from "@/types"

// Fallback API URL if environment variable is not set
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Set revalidation time
export const revalidate = 60 // Revalidate this page every 60 seconds

async function getProductWithErrorHandling(id: string): Promise<Product | null> {
  console.log(`[DEBUG] Starting fetch for product ID: ${id}`)
  console.log(`[DEBUG] Using API URL: ${API_URL}`)

  try {
    // Try direct fetch first to debug the API endpoint
    const response = await fetch(`${API_URL}/api/products/${id}`, {
      next: { revalidate: 60 },
    })

    console.log(`[DEBUG] Fetch response status: ${response.status}`)

    if (!response.ok) {
      console.error(`[ERROR] Failed to fetch product: ${response.status}`)
      console.error(`[ERROR] Response text: ${await response.text()}`)
      return null
    }

    const product = await response.json()
    console.log(`[DEBUG] Product data received:`, JSON.stringify(product).substring(0, 100) + "...")

    return product
  } catch (error) {
    console.error(`[ERROR] Exception during fetch:`, error instanceof Error ? error.message : String(error))
    console.error(`[ERROR] Stack trace:`, error instanceof Error ? error.stack : "No stack trace")
    return null
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  console.log(`[DEBUG] Page component started for ID: ${params.id}`)

  try {
    // Use direct fetch with detailed error logging
    const product = await getProductWithErrorHandling(params.id)

    console.log(`[DEBUG] Product fetch result:`, product ? "Success" : "Not found")

    if (!product) {
      console.log(`[DEBUG] Product not found, returning 404`)
      return notFound()
    }

    // Ensure product.reviews is an array
    if (!product.reviews) {
      console.log(`[DEBUG] No reviews property, initializing empty array`)
      product.reviews = []
    } else if (!Array.isArray(product.reviews)) {
      console.log(`[DEBUG] Reviews is not an array, converting to array`)
      product.reviews = []
    }

    // If no reviews, add mock reviews
    if (product.reviews.length === 0) {
      console.log(`[DEBUG] Adding mock reviews`)
      product.reviews = [
        {
          rating: 5,
          reviewer_name: "Jane Doe",
          comment: "Excellent product! I love the quality and design.",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          rating: 4,
          reviewer_name: "John Smith",
          comment: "Good product overall. Shipping was fast and the item matches the description.",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]
    }

    console.log(`[DEBUG] Rendering product page`)
    return (
      <div className="container px-4 py-8 sm:px-6 lg:px-8">
        <ProductDetailsV2 product={product} />
      </div>
    )
  } catch (error) {
    console.error(
      `[ERROR] Unhandled exception in page component:`,
      error instanceof Error ? error.message : String(error),
    )
    console.error(`[ERROR] Stack trace:`, error instanceof Error ? error.stack : "No stack trace")
    return notFound()
  }
}

