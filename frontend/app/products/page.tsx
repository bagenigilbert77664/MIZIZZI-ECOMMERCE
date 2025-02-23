import { ProductCard } from "@/components/ui/product-card"

// Mock products data
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

const categories = ["All", "Jewelry", "Fashion", "Accessories", "Electronics"]

const priceRange: [number, number] = [0, 1000000] // 0 to 1M KSh

export default function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined }
}) {
  const category = searchParams.category || "All"
  const sortBy = searchParams.sort || "price-asc"

  const filteredProducts = products
    .filter((product) => category === "All" || product.category === category)
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price
      if (sortBy === "price-desc") return b.price - a.price
      return 0
    })

  return (
    <div className="container space-y-8 py-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

