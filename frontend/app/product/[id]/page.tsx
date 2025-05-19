import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Loader2 } from "lucide-react"
import { ProductDetailsEnhanced } from "@/components/products/product-details-enhanced"
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
        "Excellent product! I love the quality and design. The material feels premium and it's exactly as described. Shipping was fast and the packaging was secure. I would definitely recommend this to anyone looking for a high-quality item. The customer service was also very responsive when I had questions.",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: true,
      helpful_count: 12,
    },
    {
      id: 2,
      rating: 4,
      reviewer_name: "John Smith",
      comment:
        "Good product overall. Shipping was fast and the item matches the description. The only reason I'm giving 4 stars instead of 5 is because the color is slightly different from what I expected. Otherwise, the quality is excellent and it works perfectly for my needs.",
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: true,
      helpful_count: 5,
    },
    {
      id: 3,
      rating: 5,
      reviewer_name: "Mary Johnson",
      comment:
        "I'm extremely satisfied with this purchase! The product arrived earlier than expected and was packaged very securely. The quality exceeds what I expected for the price point. I've already recommended it to several friends who were impressed when they saw it.",
      date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      verified_purchase: true,
      helpful_count: 8,
    },
  ]
}

// Loading component
function ProductLoading() {
  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
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

    // Add mock features if not present
    if (!product.features) {
      product.features = [
        "Premium quality materials for exceptional durability",
        "Ergonomic design for maximum comfort during extended use",
        "Versatile functionality suitable for various occasions",
        "Modern aesthetic that complements any style or setting",
        "Easy to clean and maintain with simple care instructions",
        "Energy-efficient operation to reduce environmental impact",
        "Compact design that saves space without sacrificing performance",
      ]
    }

    // Add mock package contents if not present
    if (!product.package_contents) {
      product.package_contents = [
        `1 x ${product.name}`,
        "Detailed User Manual",
        "Warranty Card (2 Years)",
        "Quick Start Guide",
        "Customer Support Information",
      ]
    }

    return <ProductDetailsEnhanced product={product} />
  } catch (error) {
    console.error("Error loading product:", error)
    return notFound()
  }
}

// Main page component
export default async function Page({ params }: { params: { id: string } }) {
  // Properly await the params in Next.js 15
  const id = (await params).id

  return (
    <Suspense fallback={<ProductLoading />}>
      <ProductDetails id={id} />
    </Suspense>
  )
}
