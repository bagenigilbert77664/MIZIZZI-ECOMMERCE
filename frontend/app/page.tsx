"use client"

import { CategoryGrid } from "@/components/features/category-grid"
import { Carousel } from "@/components/features/carousel"
import { FlashSales } from "@/components/features/flash-sales"
import { BrandShowcase } from "@/components/features/brand-showcase"
import { LuxuryDeals } from "@/components/features/luxury-deals"
import { ProductGrid } from "@/components/products/product-grid"
import Link from "next/link"
import { motion } from "framer-motion"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-cherry-900 pb-8">
      <div className="mb-2 bg-cherry-900 py-2">
        <Carousel />
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-4">
        <div className="mb-2 rounded bg-white p-2">
          <CategoryGrid />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-2 sm:px-4">
        <div className="grid gap-4 sm:gap-8 py-2 sm:py-4">
          <section className="rounded bg-white">
            <FlashSales />
          </section>

          <section className="rounded bg-white">
            <LuxuryDeals />
          </section>

          <section className="rounded bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">All Products</h2>
              <Link
                href="/products"
                className="group flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-cherry-900"
              >
                View All
                <motion.span
                  className="inline-block"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  →
                </motion.span>
              </Link>
            </div>
            <ProductGrid />
          </section>

          <section className="rounded bg-white">
            <BrandShowcase />
          </section>
        </div>
      </div>
    </div>
  )
}

