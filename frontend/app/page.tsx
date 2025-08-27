"use client"
import dynamic from "next/dynamic"
import Link from "next/link"
import { motion } from "framer-motion"
import { NetworkStatus } from "@/components/shared/network-status"

// Import lightweight components directly
import { CategoryGrid } from "@/components/features/category-grid"
import { Carousel } from "@/components/features/carousel"

// Fix dynamic imports - use proper syntax
const FlashSales = dynamic(() => import("@/components/features/flash-sales").then((mod) => mod.FlashSales), {
  loading: () => <FlashSalesSkeleton />,
  ssr: false,
})

const BrandShowcase = dynamic(() => import("@/components/features/brand-showcase").then((mod) => mod.BrandShowcase), {
  loading: () => <SectionSkeleton />,
  ssr: false,
})

const LuxuryDeals = dynamic(() => import("@/components/features/luxury-deals").then((mod) => mod.LuxuryDeals), {
  loading: () => <SectionSkeleton />,
  ssr: false,
})

const ProductGrid = dynamic(() => import("@/components/products/product-grid").then((mod) => mod.ProductGrid), {
  loading: () => <ProductGridSkeleton />,
  ssr: false,
})

// New fixed sections (dynamic as well)
const TrendingNow = dynamic(() => import("@/components/features/trending-now").then((mod) => mod.TrendingNow), {
  loading: () => <SectionSkeleton />,
  ssr: false,
})

const NewArrivals = dynamic(() => import("@/components/features/new-arrivals").then((mod) => mod.NewArrivals), {
  loading: () => <SectionSkeleton />,
  ssr: false,
})

const TopPicks = dynamic(() => import("@/components/features/top-picks").then((mod) => mod.TopPicks), {
  loading: () => <SectionSkeleton />,
  ssr: false,
})

// Create skeleton loaders for each section
const FlashSalesSkeleton = () => (
  <div className="w-full p-4">
    <div className="flex justify-between items-center mb-4">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-[4/3] w-full bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

const SectionSkeleton = () => (
  <div className="w-full p-4">
    <div className="flex justify-between items-center mb-4">
      <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square w-full bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
)

// Update the ProductGridSkeleton component to match the Apple-inspired design
const ProductGridSkeleton = () => (
  <div className="w-full">
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="space-y-2 bg-white p-3">
          <div className="aspect-[4/3] w-full bg-[#f5f5f7] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#f5f5f7] via-[#e0e0e3] to-[#f5f5f7] bg-[length:400%_400%] animate-pulse"></div>
          </div>
          <div className="h-3 w-3/4 bg-[#f5f5f7] rounded-full"></div>
          <div className="h-3 w-1/2 bg-[#f5f5f7] rounded-full"></div>
          <div className="h-4 w-1/3 bg-[#f5f5f7] rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
)

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-cherry-900 pb-8">
      <NetworkStatus className="mx-auto w-full max-w-[1200px] px-2 sm:px-4 pt-2" />

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

          {/* New fixed sections based on split grid */}
          <section className="rounded bg-white">
            <TrendingNow />
          </section>

          <section className="rounded bg-white">
            <NewArrivals />
          </section>

          <section className="rounded bg-white">
            <TopPicks />
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
            <ProductGrid limit={12} />
          </section>

          <section className="rounded bg-white">
            <BrandShowcase />
          </section>
        </div>
      </div>
    </div>
  )
}
