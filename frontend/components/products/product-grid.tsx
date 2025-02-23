"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

const products = [
  {
    id: 1,
    name: "Premium Leather Messenger Bag",
    price: 29999,
    originalPrice: 39999,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 2,
    name: "Minimalist Analog Watch",
    price: 49999,
    originalPrice: 59999,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 3,
    name: "Wireless Noise-Canceling Earbuds",
    price: 19999,
    originalPrice: 24999,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80",
    category: "Electronics",
  },
  {
    id: 4,
    name: "Smart Home Speaker System",
    price: 14999,
    originalPrice: 17999,
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&q=80",
    category: "Electronics",
  },
  {
    id: 5,
    name: "Advanced Fitness Smartwatch",
    price: 9999,
    originalPrice: 12999,
    image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&q=80",
    category: "Electronics",
  },
  {
    id: 6,
    name: "Designer Aviator Sunglasses",
    price: 15999,
    originalPrice: 19999,
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 7,
    name: "Handcrafted Leather Wallet",
    price: 7999,
    originalPrice: 9999,
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 8,
    name: "Wireless Gaming Headphones",
    price: 24999,
    originalPrice: 29999,
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&q=80",
    category: "Electronics",
  },
  {
    id: 9,
    name: "Premium Camera Backpack",
    price: 18999,
    originalPrice: 22999,
    image: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 10,
    name: "Mechanical Keyboard",
    price: 15999,
    originalPrice: 19999,
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&q=80",
    category: "Electronics",
  },
  {
    id: 11,
    name: "Vintage Style Backpack",
    price: 8999,
    originalPrice: 11999,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 12,
    name: "Premium Wireless Mouse",
    price: 7999,
    originalPrice: 9999,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80",
    category: "Electronics",
  },
  // New products
  {
    id: 13,
    name: "Luxury Diamond Necklace",
    price: 199999,
    originalPrice: 299999,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80",
    category: "Jewelry",
  },
  {
    id: 14,
    name: "Designer Leather Handbag",
    price: 89999,
    originalPrice: 129999,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80",
    category: "Accessories",
  },
  {
    id: 15,
    name: "Sapphire Stud Earrings",
    price: 149999,
    originalPrice: 199999,
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80",
    category: "Jewelry",
  },
  {
    id: 16,
    name: "Smart Fitness Ring",
    price: 29999,
    originalPrice: 39999,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80",
    category: "Electronics",
  },
  {
    id: 17,
    name: "Premium Silk Scarf",
    price: 12999,
    originalPrice: 19999,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&q=80",
    category: "Fashion",
  },
  {
    id: 18,
    name: "Gold Plated Watch",
    price: 59999,
    originalPrice: 79999,
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500&q=80",
    category: "Accessories",
  },
]

export function ProductGrid() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-x-[1px] gap-y-6 bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product) => (
          <motion.div key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Link href={`/product/${product.id}`}>
              <Card className="group h-full overflow-hidden rounded-none border-0 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </div>
                </div>
                <CardContent className="space-y-1.5 p-2">
                  <div className="mb-1">
                    <span className="inline-block rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                      {product.category}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-xs font-medium leading-tight text-gray-600 group-hover:text-gray-900">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">KSh {product.price.toLocaleString()}</span>
                    <span className="text-[11px] text-gray-500 line-through">
                      KSh {product.originalPrice.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

