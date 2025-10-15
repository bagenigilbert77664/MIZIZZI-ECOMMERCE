"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Grid, List, Package, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { categoryService, type Category } from "@/services/category"
import { OptimizedImage } from "@/components/shared/optimized-image"

interface CategoriesPageClientProps {
  allCategories: Category[]
}

export default function CategoriesPageClient({ allCategories: initialCategories }: CategoriesPageClientProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    const fetchCategories = async () => {
      if (categories.length === 0) {
        setIsLoading(true)
        try {
          const allCats = await categoryService.getCategories()
          setCategories(allCats)
        } catch (error) {
          console.error("Failed to fetch categories:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchCategories()
  }, [categories.length])

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleCategoryClick = (category: Category) => {
    router.push(`/category/${category.slug}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">All Categories</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover our complete range of products across all categories. From fashion and electronics to home essentials
          and more.
        </p>
      </div>

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search categories..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <Grid className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* All Categories Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">
            All Categories {searchQuery && `(${filteredCategories.length} results)`}
          </h2>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try adjusting your search terms" : "No categories available at the moment"}
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"
            }
          >
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer hover:shadow-lg transition-shadow group ${
                  viewMode === "list" ? "flex items-center" : ""
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                <CardContent className={viewMode === "list" ? "flex items-center w-full p-4" : "p-6"}>
                  <div className={viewMode === "list" ? "flex items-center flex-1" : ""}>
                    <div
                      className={`${viewMode === "list" ? "w-16 h-16 mr-4" : "w-12 h-12 mb-4"} bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      {category.image_url ? (
                        <OptimizedImage
                          src={category.image_url}
                          alt={category.name}
                          width={viewMode === "list" ? 64 : 48}
                          height={viewMode === "list" ? 64 : 48}
                          className="rounded-lg object-cover"
                        />
                      ) : (
                        <Package className={`${viewMode === "list" ? "w-8 h-8" : "w-6 h-6"} text-primary`} />
                      )}
                    </div>

                    <div className={viewMode === "list" ? "flex-1" : ""}>
                      <div className={viewMode === "list" ? "flex items-center justify-between" : ""}>
                        <h3
                          className={`font-semibold group-hover:text-primary transition-colors ${
                            viewMode === "list" ? "text-lg" : "text-lg mb-2"
                          }`}
                        >
                          {category.name}
                        </h3>
                        {viewMode === "list" && (
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors ml-4" />
                        )}
                      </div>

                      {category.description && (
                        <p
                          className={`text-sm text-muted-foreground line-clamp-2 ${
                            viewMode === "list" ? "mb-1" : "mb-3"
                          }`}
                        >
                          {category.description}
                        </p>
                      )}

                      <div
                        className={
                          viewMode === "list"
                            ? "flex items-center justify-between"
                            : "flex items-center justify-between"
                        }
                      >
                        <span className="text-sm text-muted-foreground">{category.products_count || 0} products</span>
                        {viewMode === "grid" && (
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
