"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { categoryService, type Category } from "@/services/category"
import { ProductGrid } from "@/components/products/product-grid"
import { ProductFilters } from "@/components/products/product-filters"
import { ProductSort } from "@/components/products/product-sort"
import { Loader } from "@/components/ui/loader"
import { motion } from "framer-motion"

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [subcategories, setSubcategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedPriceRange, setSelectedPriceRange] = useState<[number, number]>([0, 100000])
  const [sortValue, setSortValue] = useState("price-asc")

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        // Fetch the category
        const categoryData = await categoryService.getCategoryBySlug(params.slug)

        if (!categoryData) {
          setError("Category not found")
          return
        }

        setCategory(categoryData)

        // Fetch subcategories if this is a parent category
        if (!categoryData.parent_id) {
          const subcategoriesData = await categoryService.getSubcategories(categoryData.id)
          setSubcategories(subcategoriesData)
        }
      } catch (err) {
        console.error("Error fetching category data:", err)
        setError("Failed to load category data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.slug])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-semibold text-red-700">Error</h2>
          <p className="text-red-600">{error || "Category not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded bg-cherry-600 px-4 py-2 text-white hover:bg-cherry-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  // Filter options for the sidebar
  const filterCategories =
    subcategories.length > 0 ? ["All", ...subcategories.map((sub) => sub.name)] : ["All", category.name]

  const priceRange: [number, number] = [0, 100000]

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    // If a subcategory is selected, navigate to it
    if (category !== "All") {
      const selectedSubcategory = subcategories.find((sub) => sub.name === category)
      if (selectedSubcategory) {
        router.push(`/category/${selectedSubcategory.slug}`)
      }
    }
  }

  const handlePriceRangeChange = (range: [number, number]) => {
    setSelectedPriceRange(range)
  }

  const handleSortChange = (value: string) => {
    setSortValue(value)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && <p className="mt-2 text-gray-600">{category.description}</p>}
      </div>

      {category.banner_url && (
        <div className="mb-8 overflow-hidden rounded-lg">
          <img
            src={category.banner_url || "/placeholder.svg"}
            alt={`${category.name} banner`}
            className="h-auto w-full object-cover"
            width={1200}
            height={300}
          />
        </div>
      )}

      {/* Display subcategories if this is a parent category */}
      {subcategories.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Browse {category.name} Categories</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {subcategories.map((subcategory) => (
              <Link href={`/category/${subcategory.slug}`} key={subcategory.id}>
                <motion.div
                  className="group relative overflow-hidden rounded-lg"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="aspect-square w-full overflow-hidden bg-gray-100">
                    <Image
                      src={subcategory.image_url || "/placeholder.svg?height=200&width=200"}
                      alt={subcategory.name}
                      width={200}
                      height={200}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full p-2 sm:p-3">
                    <h3 className="text-sm font-medium text-white sm:text-base">{subcategory.name}</h3>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="md:col-span-1">
          <ProductFilters
            categories={filterCategories}
            priceRange={priceRange}
            selectedCategory={selectedCategory}
            selectedPriceRange={selectedPriceRange}
            onCategoryChange={handleCategoryChange}
            onPriceRangeChange={handlePriceRangeChange}
          />
        </div>
        <div className="md:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">Showing products in {category.name}</p>
            <ProductSort value={sortValue} onValueChange={handleSortChange} />
          </div>
          <ProductGrid categorySlug={params.slug} />
        </div>
      </div>
    </div>
  )
}

