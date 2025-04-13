import { notFound } from "next/navigation"
import { ProductDetailsV2 } from "@/components/products/product-details-v2"
import { productService } from "@/services/product"
import { generateProductMetadata, defaultViewport } from "@/lib/metadata-utils"

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