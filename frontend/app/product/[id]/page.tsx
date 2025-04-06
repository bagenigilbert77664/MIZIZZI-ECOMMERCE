import { notFound } from "next/navigation"
import { ProductDetailsV2 } from "@/components/products/product-details-v2"
import { productService } from "@/services/product"
import { generateProductMetadata, defaultViewport } from "@/lib/metadata-utils"
import { ProductUpdateIndicator } from "@/components/products/product-update-indicator"

// Set revalidation time
export const revalidate = 60 // Revalidate this page every 60 seconds

// Export metadata and viewport
export const viewport = defaultViewport

// Generate metadata for this page
export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const product = await productService.getProduct(params.id)
    return generateProductMetadata(product)
  } catch (error) {
    return generateProductMetadata(null)
  }
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  console.log(`[DEBUG] Page component started for ID: ${params.id}`)

  try {
    // Use the productService instead of direct fetch
    console.log(`[DEBUG] Fetching product using productService.getProduct`)
    const product = await productService.getProduct(params.id)

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
          id: 1,
          rating: 5,
          reviewer_name: "Jane Doe",
          comment:
            "Excellent product! I love the quality and design. The material feels premium and it's exactly as described. Shipping was fast and the packaging was secure. I would definitely recommend this to anyone looking for a high-quality item.",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          verified_purchase: true,
          helpful_count: 12,
        },
        {
          id: 2,
          rating: 4,
          reviewer_name: "John Smith",
          comment:
            "Good product overall. Shipping was fast and the item matches the description. The only reason I'm giving 4 stars instead of 5 is because the color is slightly different from what I expected.",
          date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          verified_purchase: true,
          helpful_count: 5,
        },
        {
          id: 3,
          rating: 3,
          reviewer_name: "Alex Johnson",
          comment: "Average product for the price. It works as expected but nothing exceptional.",
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          verified_purchase: false,
          helpful_count: 2,
        },
      ]
    }

    console.log(`[DEBUG] Rendering product page`)
    return (
      <div className="container px-4 py-8 sm:px-6 lg:px-8">
        <ProductUpdateIndicator productId={params.id} />
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

