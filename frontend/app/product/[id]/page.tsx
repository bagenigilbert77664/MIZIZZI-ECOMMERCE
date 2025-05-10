import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ProductDetailsV2 } from "@/components/products/product-details-v2"
import { productService } from "@/services/product"

// Define static metadata
export const metadata = {
  title: "Product Details | Mizizzi",
  description: "View detailed information about this product",
}

// Helper function to determine product type
function determineProductType(product: any) {
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

// Generate mock reviews for products without reviews
function generateMockReviews() {
  return [
    {
      id: 1,
      rating: 5,
      reviewer_name: "Jane Doe",
      comment:
        "Excellent product! I love the quality and design. The material feels premium and it's exactly as described. Shipping was fast and the packaging was secure.",
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

// Loading component
function ProductLoading() {
  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  )
}

// Product details component
async function ProductDetails({ id }: { id: string }) {
  try {
    // Check if the ID is numeric or a slug
    const isNumericId = /^\d+$/.test(id)

    let product
    if (isNumericId) {
      product = await productService.getProduct(id)
    } else {
      product = await productService.getProductBySlug(id)
    }

    if (!product) {
      return notFound()
    }

    // Determine product type
    const productType = determineProductType(product)
    product.product_type = productType

    // Ensure product.reviews is an array
    if (!product.reviews || !Array.isArray(product.reviews)) {
      product.reviews = generateMockReviews()
    }

    return (
      <div className="container px-4 py-8 sm:px-6 lg:px-8">
        <ProductDetailsV2 product={product} />
      </div>
    )
  } catch (error) {
    console.error("Error loading product:", error)
    return notFound()
  }
}

// Main page component
export default async function Page({ params }: { params: { id: string } }) {
  // Await the params to comply with Next.js 15 requirements
  const { id } = await params

  return (
    <Suspense fallback={<ProductLoading />}>
      <ProductDetails id={id} />
    </Suspense>
  )
}
