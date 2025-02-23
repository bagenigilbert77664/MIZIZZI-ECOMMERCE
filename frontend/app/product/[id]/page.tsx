import { notFound } from "next/navigation"
import { ProductDetails } from "@/components/products/product-details"

// This would come from your database
const getProduct = async (id: string) => {
  // Simulate database fetch
  const product = {
    id: Number.parseInt(id),
    name: "Gold Chain Necklace",
    price: 299.99,
    description:
      "Elegant 18k gold chain necklace featuring a delicate design perfect for any occasion. This timeless piece adds sophistication to both casual and formal outfits.",
    images: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?w=800&h=800&fit=crop",
    ],
    category: "jewelry",
    rating: 4.5,
    reviews: 128,
    sizes: ['16"', '18"', '20"', '24"'],
    colors: ["Yellow Gold", "White Gold", "Rose Gold"],
    specifications: [
      { name: "Material", value: "18k Gold" },
      { name: "Chain Type", value: "Cable Chain" },
      { name: "Clasp Type", value: "Lobster Clasp" },
      { name: "Weight", value: "3.5g" },
    ],
  }

  if (!product) {
    return null
  }

  return product
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id)

  if (!product) {
    notFound()
  }

  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <ProductDetails product={product} />
    </div>
  )
}

