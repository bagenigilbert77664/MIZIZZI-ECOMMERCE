import { Suspense } from "react"
import type { Metadata } from "next"
import CategoriesPageClient from "./categories-page-client"
import { Loader } from "@/components/ui/loader"
import { categoryService } from "@/services/category"
import { defaultViewport } from "@/lib/metadata-utils"

export const viewport = defaultViewport

export const metadata: Metadata = {
  title: "All Categories | Mizizzi",
  description:
    "Browse all product categories at Mizizzi. Find everything from accessories and electronics to fashion and home & living.",
  openGraph: {
    title: "All Categories | Mizizzi",
    description:
      "Browse all product categories at Mizizzi. Find everything from accessories and electronics to fashion and home & living.",
  },
}

export default async function CategoriesPage() {
  try {
    const allCategories = await categoryService.getCategories()

    return (
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        }
      >
        <CategoriesPageClient allCategories={allCategories} />
      </Suspense>
    )
  } catch (error) {
    console.error("Error loading categories:", error)

    return (
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader />
          </div>
        }
      >
        <CategoriesPageClient allCategories={[]} />
      </Suspense>
    )
  }
}
