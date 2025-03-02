"use client"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

// Mock category data
const categoryData = {
  necklaces: {
    title: "Necklaces",
    products: [
      {
        id: 1,
        name: "Diamond Pendant Necklace",
        price: 199999,
        originalPrice: 249999,
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 2,
        name: "Gold Chain Necklace",
        price: 149999,
        originalPrice: 179999,
        image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 3,
        name: "Pearl Strand Necklace",
        price: 89999,
        originalPrice: 99999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 4,
        name: "Silver Choker Necklace",
        price: 59999,
        originalPrice: 79999,
        image: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 5,
        name: "Rose Gold Pendant",
        price: 129999,
        originalPrice: 159999,
        image: "https://images.unsplash.com/photo-1603974372039-adc49044b6bd?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 6,
        name: "Crystal Drop Necklace",
        price: 79999,
        originalPrice: 99999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 25,
        name: "Emerald Pendant Necklace",
        price: 169999,
        originalPrice: 199999,
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 26,
        name: "Vintage Pearl Choker",
        price: 89999,
        originalPrice: 109999,
        image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&q=80",
        category: "Necklaces",
      },
      {
        id: 27,
        name: "Diamond Solitaire Pendant",
        price: 249999,
        originalPrice: 299999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80",
        category: "Necklaces",
      },
    ],
  },
  earrings: {
    title: "Earrings",
    products: [
      {
        id: 7,
        name: "Diamond Stud Earrings",
        price: 89999,
        originalPrice: 99999,
        image: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=500&q=80",
        category: "Earrings",
      },
      {
        id: 8,
        name: "Pearl Drop Earrings",
        price: 69999,
        originalPrice: 79999,
        image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&q=80",
        category: "Earrings",
      },
      {
        id: 9,
        name: "Gold Hoop Earrings",
        price: 49999,
        originalPrice: 59999,
        image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=500&q=80",
        category: "Earrings",
      },
      {
        id: 10,
        name: "Crystal Chandelier Earrings",
        price: 79999,
        originalPrice: 99999,
        image: "https://images.unsplash.com/photo-1635767798638-3665a25be4bb?w=500&q=80",
        category: "Earrings",
      },
      {
        id: 11,
        name: "Silver Stud Earrings",
        price: 39999,
        originalPrice: 49999,
        image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=500&q=80",
        category: "Earrings",
      },
      {
        id: 12,
        name: "Rose Gold Drop Earrings",
        price: 59999,
        originalPrice: 69999,
        image: "https://images.unsplash.com/photo-1635767798638-3665a25be4bb?w=500&q=80",
        category: "Earrings",
      },
    ],
  },
  rings: {
    title: "Rings",
    products: [
      {
        id: 13,
        name: "Diamond Engagement Ring",
        price: 299999,
        originalPrice: 349999,
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80",
        category: "Rings",
      },
      {
        id: 14,
        name: "Gold Wedding Band",
        price: 129999,
        originalPrice: 149999,
        image: "https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=500&q=80",
        category: "Rings",
      },
      {
        id: 15,
        name: "Sapphire Statement Ring",
        price: 179999,
        originalPrice: 199999,
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80",
        category: "Rings",
      },
      {
        id: 16,
        name: "Pearl Cocktail Ring",
        price: 89999,
        originalPrice: 99999,
        image: "https://images.unsplash.com/photo-1603974372039-adc49044b6bd?w=500&q=80",
        category: "Rings",
      },
      {
        id: 17,
        name: "Rose Gold Band",
        price: 69999,
        originalPrice: 79999,
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&q=80",
        category: "Rings",
      },
      {
        id: 18,
        name: "Emerald Cut Diamond Ring",
        price: 249999,
        originalPrice: 299999,
        image: "https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=500&q=80",
        category: "Rings",
      },
    ],
  },
  bracelets: {
    title: "Bracelets",
    products: [
      {
        id: 19,
        name: "Diamond Tennis Bracelet",
        price: 399999,
        originalPrice: 449999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80",
        category: "Bracelets",
      },
      {
        id: 20,
        name: "Gold Chain Bracelet",
        price: 89999,
        originalPrice: 99999,
        image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500&q=80",
        category: "Bracelets",
      },
      {
        id: 21,
        name: "Pearl Strand Bracelet",
        price: 69999,
        originalPrice: 79999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80",
        category: "Bracelets",
      },
      {
        id: 22,
        name: "Silver Charm Bracelet",
        price: 49999,
        originalPrice: 59999,
        image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500&q=80",
        category: "Bracelets",
      },
      {
        id: 23,
        name: "Rose Gold Bangle",
        price: 79999,
        originalPrice: 89999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&q=80",
        category: "Bracelets",
      },
      {
        id: 24,
        name: "Crystal Tennis Bracelet",
        price: 149999,
        originalPrice: 179999,
        image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500&q=80",
        category: "Bracelets",
      },
    ],
  },
  dresses: {
    title: "Dresses",
    products: [
      {
        id: 50,
        name: "Evening Gown",
        price: 299999,
        originalPrice: 399999,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
        category: "Dresses",
      },
      {
        id: 51,
        name: "Cocktail Dress",
        price: 149999,
        originalPrice: 199999,
        image: "https://images.unsplash.com/photo-1490981692337-8d8b8da2c467?w=500&q=80",
        category: "Dresses",
      },
      {
        id: 52,
        name: "Summer Maxi Dress",
        price: 89999,
        originalPrice: 119999,
        image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
        category: "Dresses",
      },
      {
        id: 53,
        name: "Party Dress",
        price: 179999,
        originalPrice: 229999,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
        category: "Dresses",
      },
      {
        id: 54,
        name: "Floral Sundress",
        price: 69999,
        originalPrice: 89999,
        image: "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=500&q=80",
        category: "Dresses",
      },
      {
        id: 55,
        name: "Little Black Dress",
        price: 129999,
        originalPrice: 159999,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
        category: "Dresses",
      },
      // Second row
      {
        id: 56,
        name: "Sequin Evening Dress",
        price: 249999,
        originalPrice: 299999,
        image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
        category: "Dresses",
      },
      {
        id: 57,
        name: "Silk Wrap Dress",
        price: 159999,
        originalPrice: 199999,
        image: "https://images.unsplash.com/photo-1490981692337-8d8b8da2c467?w=500&q=80",
        category: "Dresses",
      },
      {
        id: 58,
        name: "Bohemian Maxi Dress",
        price: 119999,
        originalPrice: 149999,
        image: "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=500&q=80",
        category: "Dresses",
      },
    ],
  },
  tops: {
    title: "Tops",
    products: [
      {
        id: 70,
        name: "Silk Blouse",
        price: 89999,
        originalPrice: 119999,
        image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=500&q=80",
        category: "Tops",
      },
      {
        id: 71,
        name: "Cashmere Sweater",
        price: 149999,
        originalPrice: 189999,
        image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80",
        category: "Tops",
      },
      {
        id: 72,
        name: "Designer T-Shirt",
        price: 49999,
        originalPrice: 69999,
        image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80",
        category: "Tops",
      },
      {
        id: 73,
        name: "Lace Top",
        price: 79999,
        originalPrice: 99999,
        image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=500&q=80",
        category: "Tops",
      },
      {
        id: 74,
        name: "Crop Top",
        price: 59999,
        originalPrice: 79999,
        image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80",
        category: "Tops",
      },
      {
        id: 75,
        name: "Embellished Top",
        price: 99999,
        originalPrice: 129999,
        image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80",
        category: "Tops",
      },
      // Second row
      {
        id: 76,
        name: "Ruffled Blouse",
        price: 89999,
        originalPrice: 109999,
        image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=500&q=80",
        category: "Tops",
      },
      {
        id: 77,
        name: "Knit Cardigan",
        price: 129999,
        originalPrice: 159999,
        image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80",
        category: "Tops",
      },
      {
        id: 78,
        name: "Sequin Top",
        price: 119999,
        originalPrice: 149999,
        image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80",
        category: "Tops",
      },
    ],
  },
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const category = categoryData[params.slug as keyof typeof categoryData]

  if (!category) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold">Category not found</h1>
      </div>
    )
  }

  return (
    <section className="w-full mb-8">
      <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-4">
        <div className="mb-2 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold">{category.title} Collection</h2>
        </div>

        <div className="grid grid-cols-2 gap-[1px] bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {category.products.map((product, index) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
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
                      <motion.div
                        className="absolute left-0 top-2 bg-cherry-900 px-2 py-1 text-[10px] font-semibold text-white"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                      </motion.div>
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
                        <motion.span
                          className="text-sm font-semibold text-cherry-900"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                          KSh {product.price.toLocaleString()}
                        </motion.span>
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

