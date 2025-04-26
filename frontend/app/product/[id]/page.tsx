import { notFound } from "next/navigation"
import { ProductDetailsV2 } from "@/components/products/product-details-v2"
import { productService } from "@/services/product"
import { generateProductMetadata, defaultViewport } from "@/lib/metadata-utils"

// Helper function to determine product type
const determineProductType = (product: any) => {
  // Check if it's a luxury product
  if (
    product.category_id === "luxury" ||
    product.category_id === "premium" ||
    (typeof product.category === "object" &&
      (product.category?.name?.toLowerCase().includes("luxury") ||
        product.category?.name?.toLowerCase().includes("premium"))) ||
    (Array.isArray(product.tags) &&
      product.tags.some((tag: string) => tag.toLowerCase().includes("luxury") || tag.toLowerCase().includes("premium")))
  ) {
    return "luxury"
  }

  // Check if it's a flash sale product
  if (
    product.sale_price &&
    product.sale_price < product.price &&
    ((Array.isArray(product.tags) && product.tags.some((tag: string) => tag.toLowerCase().includes("flash"))) ||
      product.is_flash_sale)
  ) {
    return "flash_sale"
  }

  // Default to regular product
  return "regular"
}

// Update the revalidate setting to ensure fresh data
export const revalidate = 0 // Set to 0 to revalidate on every request

// Export metadata and viewport
export const viewport = defaultViewport

// Generate metadata for this page
export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    // Check if the ID is numeric or a slug
    const isNumericId = /^\d+$/.test(params.id)

    let product
    if (isNumericId) {
      product = await productService.getProduct(params.id)
    } else {
      product = await productService.getProductBySlug(params.id)
    }

    return generateProductMetadata(product)
  } catch (error) {
    return generateProductMetadata(null)
  }
}

// Add a function to bypass cache when needed
export default async function ProductPage({ params }: { params: { id: string } }) {
  console.log(`[DEBUG] Page component started for ID/slug: ${params.id}`)

  try {
    // Check if the ID is numeric or a slug
    const isNumericId = /^\d+$/.test(params.id)

    let product
    if (isNumericId) {
      console.log(`[DEBUG] Fetching product by ID using productService.getProduct`)
      product = await productService.getProduct(params.id, true) // Add true to bypass cache
    } else {
      console.log(`[DEBUG] Fetching product by slug using productService.getProductBySlug`)
      product = await productService.getProductBySlug(params.id)
    }

    console.log(`[DEBUG] Product fetch result:`, product ? "Success" : "Not found")

    if (!product) {
      console.log(`[DEBUG] Product not found, returning 404`)
      return notFound()
    }

    // Rest of the function remains the same...
    // Determine product type and add it to the product object
    product.product_type = determineProductType(product)
    console.log(`[DEBUG] Product type determined: ${product.product_type}`)

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
    // Add a key parameter to the ProductDetailsV2 component to force re-rendering
    return (
      <div className="container px-4 py-8 sm:px-6 lg:px-8">
        <ProductDetailsV2 product={product} key={params.id} />
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