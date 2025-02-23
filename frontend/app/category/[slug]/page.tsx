import { notFound } from "next/navigation"
import { ProductCard } from "@/components/ui/product-card"

// This would come from your database
const getProducts = async (category: string) => {
  // Simulate database fetch
  const products = [
    {
      id: 1,
      name: "Diamond Tennis Bracelet",
      price: 299999,
      image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300&h=300&fit=crop",
      category: "Jewelry",
      rating: 4.8,
      reviews: 156,
    },
    {
      id: 2,
      name: "Sapphire and Diamond Ring",
      price: 199999,
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
      category: "Jewelry",
      rating: 4.9,
      reviews: 203,
    },
    // Add more products as needed
  ]

  return products.filter((product) => product.category.toLowerCase() === category.toLowerCase())
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string }
}) {
  const products = await getProducts(params.slug)

  if (!products.length) {
    notFound()
  }

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold capitalize">{params.slug} Collection</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

