"use client"

import { forwardRef, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Loader2, Clock, TrendingUp, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { imageBatchService } from "@/services/image-batch-service"

interface Product {
  id: number
  name: string
  price: number
  image: string
  category?: string | { id: number; name: string; slug?: string }
  brand?:
    | string
    | {
        id: number
        name: string
        slug?: string
        created_at?: string
        description?: string
        is_active?: boolean
        is_featured?: boolean
        logo_url?: string
        updated_at?: string
        website?: string
      }
  score?: number
  thumbnail_url?: string
  slug?: string
}

interface ProductSearchResultsProps {
  results: Product[]
  isLoading: boolean
  selectedIndex: number
  onClose: () => void
  searchTime?: number
  suggestions?: string[]
  error?: string | null
}

// Define the ProductImage type to match the expected structure
interface ProductImage {
  image_url: string
  // add other properties if needed
}

const ProductImageWithBatch = ({ product }: { product: Product }) => {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [isLoadingImage, setIsLoadingImage] = useState(true)

  useEffect(() => {
    const loadProductImage = async () => {
      try {
        setIsLoadingImage(true)

        // First try to get cached images from batch service
        const cachedImages: ProductImage[] = imageBatchService.getCachedImages(product.id.toString())

        if (cachedImages && cachedImages.length > 0) {
          // Use the first cached image
          const firstImage = cachedImages[0]
          const imageUrl = firstImage.image_url?.startsWith("http")
            ? firstImage.image_url
            : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/uploads/product_images/${firstImage.image_url?.split("/").pop()}`

          setImageUrl(imageUrl)
          setIsLoadingImage(false)
          return
        }

        // If no cached images, try to fetch them
        const images: ProductImage[] = await imageBatchService.fetchProductImages(product.id.toString())

        if (images && images.length > 0) {
          const firstImage = images[0]
          const imageUrl = firstImage.image_url?.startsWith("http")
            ? firstImage.image_url
            : `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/uploads/product_images/${firstImage.image_url?.split("/").pop()}`

          setImageUrl(imageUrl)
        } else {
          // Fallback to product's own image properties
          const fallbackUrl = product.thumbnail_url?.startsWith("http")
            ? product.thumbnail_url
            : product.image?.startsWith("http")
              ? product.image
              : product.thumbnail_url || product.image
                ? `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/uploads/product_images/${(product.thumbnail_url || product.image)?.split("/").pop()}`
                : "/diverse-products-still-life.png"

          setImageUrl(fallbackUrl)
        }
      } catch (error) {
        console.error(`Error loading image for product ${product.id}:`, error)
        // Fallback to placeholder
        setImageUrl("/diverse-products-still-life.png")
      } finally {
        setIsLoadingImage(false)
      }
    }

    loadProductImage()
  }, [product.id, product.thumbnail_url, product.image])
  // Remove the dependency on image_url property and make ProductImage more flexible
  // If your ProductImage type does not have image_url, adapt to the actual property name
  // For example, if the property is just 'url', use firstImage.url instead of firstImage.image_url
  return (
    <div className="relative h-12 w-12 flex-none overflow-hidden rounded-md bg-gray-100">
      {isLoadingImage ? (
        <div className="flex items-center justify-center h-full w-full">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover"
          sizes="48px"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = "/diverse-products-still-life.png"
          }}
        />
      )}
    </div>
  )
}

export const ProductSearchResults = forwardRef<HTMLDivElement, ProductSearchResultsProps>(
  ({ results, isLoading, selectedIndex, onClose, searchTime, suggestions, error }, ref) => {
    useEffect(() => {
      if (results && results.length > 0) {
        const productIds = results.map((product) => product.id.toString())
        imageBatchService.prefetchProductImages(productIds)
      }
    }, [results])

    if (isLoading) {
      return (
        <div className="w-full">
          <div className="flex items-center justify-center p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-cherry-600" />
              <span className="text-sm text-gray-600">Searching...</span>
            </div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="w-full">
          <div className="flex flex-col items-center justify-center p-6">
            <AlertCircle className="h-6 w-6 text-red-500 mb-2" />
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        </div>
      )
    }

    if (results.length === 0) {
      return (
        <div className="w-full">
          <div className="flex flex-col items-center justify-center p-6">
            <p className="text-sm text-gray-600 mb-4">No results found</p>
            {suggestions && suggestions.length > 0 && (
              <div className="w-full">
                <p className="text-xs text-gray-500 mb-2">Try these suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-200 text-xs"
                      onClick={() => {
                        window.location.href = `/search?q=${encodeURIComponent(suggestion)}`
                      }}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    const formatSearchTime = (time: number) => {
      if (typeof time !== "number" || isNaN(time)) {
        return "0ms"
      }
      return time < 1 ? `${Math.round(time * 1000)}ms` : `${time.toFixed(2)}s`
    }

    const getBrandName = (brand: Product["brand"]): string | null => {
      if (!brand) return null
      if (typeof brand === "string") return brand
      if (typeof brand === "object" && brand.name) return brand.name
      return null
    }

    return (
      <div className="w-full" ref={ref}>
        {searchTime !== undefined && (
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {results.length} results
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatSearchTime(searchTime)}
              </span>
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-auto">
          {results.map((product, index) => {
            const brandName = getBrandName(product.brand)

            return (
              <Link
                key={product.id}
                href={product.slug || `/product/${product.id}`}
                onClick={onClose}
                className={`flex items-center gap-3 p-2 transition-colors hover:bg-gray-50 border-b border-gray-50 last:border-b-0 ${
                  index === selectedIndex ? "bg-gray-50" : ""
                }`}
              >
                <ProductImageWithBatch product={product} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1 mb-1">{product.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-cherry-600">KSh {product.price.toLocaleString()}</span>
                    {product.category && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {typeof product.category === "string" ? product.category : product.category.name}
                      </span>
                    )}
                    {brandName && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                        {brandName}
                      </span>
                    )}
                  </div>
                  {product.score !== undefined && product.score > 0.8 && (
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
                        {Math.round(product.score * 100)}% match
                      </Badge>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  },
)

ProductSearchResults.displayName = "ProductSearchResults"
