import { ProductCard } from "@/components/ui/product-card"

const products = [
  {
    id: 1,
    name: "Premium Leather Messenger Bag",
    price: 29999,
    originalPrice: 39999,
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 2,
    name: "Minimalist Analog Watch",
    price: 49999,
    originalPrice: 59999,
    image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=500&q=80",
    category: "Accessories",
  },
  // Add more products as needed
]

export default function FlashSalesPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Flash Sales</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}

