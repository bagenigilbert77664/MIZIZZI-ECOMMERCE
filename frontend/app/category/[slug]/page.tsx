import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import CategoryPageClient from "./category-page-client"
import { Loader } from "@/components/ui/loader"
import { categoryService } from "@/services/category"
import { defaultViewport } from "@/lib/metadata-utils"

export const viewport = defaultViewport

interface CategoryPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params

  try {
    const category = await categoryService.getCategoryBySlug(slug)

    if (!category) {
      return {
        title: "Category | Mizizzi",
        description: "Shop our premium collections at Mizizzi.",
      }
    }

    return {
      title: `${category.name} | Mizizzi`,
      description: category.description || `Shop our collection of premium ${category.name.toLowerCase()} at Mizizzi.`,
      openGraph: {
        title: `${category.name} | Mizizzi`,
        description:
          category.description || `Shop our collection of premium ${category.name.toLowerCase()} at Mizizzi.`,
        images: category.banner_url ? [category.banner_url] : undefined,
      },
    }
  } catch (error) {
    return {
      title: "Category | Mizizzi",
      description: "Shop our premium collections at Mizizzi.",
    }
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params

  try {
    // Fetch category data
    const category = await categoryService.getCategoryBySlug(slug)

    if (!category) {
      notFound()
    }

    // Fetch subcategories
    const subcategories = await categoryService.getSubcategories(category.id)

    // Fetch related categories (for featured collections)
    const relatedCategories = await categoryService.getRelatedCategories(category.id)

    return (
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        }
      >
        <CategoryPageClient
          category={category}
          subcategories={subcategories}
          slug={slug}
          relatedCategories={relatedCategories}
        />
      </Suspense>
    )
  } catch (error) {
    console.error("Error loading category:", error)
    notFound()
  }
}