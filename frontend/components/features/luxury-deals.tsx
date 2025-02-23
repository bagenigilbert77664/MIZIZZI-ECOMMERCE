"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

const luxuryDeals = [
  {
    id: 1,
    name: "Diamond Tennis Bracelet",
    price: 99999,
    originalPrice: 299999,
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 2,
    name: "Sapphire and Diamond Ring",
    price: 79999,
    originalPrice: 249999,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 3,
    name: "Pearl Drop Necklace",
    price: 44999,
    originalPrice: 149999,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 4,
    name: "Designer Evening Gown",
    price: 89999,
    originalPrice: 299999,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
    category: "Fashion",
  },
  {
    id: 5,
    name: "Crystal Chandelier Earrings",
    price: 34999,
    originalPrice: 99999,
    image: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=300&h=300&fit=crop",
    category: "Jewelry",
  },
  {
    id: 6,
    name: "Gold Link Watch",
    price: 149999,
    originalPrice: 499999,
    image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=300&h=300&fit=crop",
    category: "Accessories",
  },
]

export function LuxuryDeals() {
  return (
    <section className="w-full mb-8">
      <div className="w-full p-2">
        <div className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1">
            <h2 className="text-lg sm:text-xl font-bold">Luxury For Less</h2>
            <p className="text-xs sm:text-sm text-gray-500">Save up to 70% Today</p>
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-gray-600">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {luxuryDeals.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link href={`/product/${product.id}`}>
                  <Card className="group h-full overflow-hidden border border-gray-100 bg-white shadow-none transition-all duration-200 hover:shadow-md active:scale-[0.99]">
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
                        <span className="text-sm font-semibold text-gray-900">
                          KSh {product.price.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-gray-500 line-through">
                          KSh {product.originalPrice.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

