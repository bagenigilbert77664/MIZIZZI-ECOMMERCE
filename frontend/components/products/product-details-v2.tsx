"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Heart, Share2, Truck, ShieldCheck, RotateCcw, Minus, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStateContext } from "@/components/providers"
import type { Product, ProductVariant } from "@/types"
import { useRouter, useSearchParams } from "next/navigation"

interface ProductDetailsV2Props {
  product: Product
}

export function ProductDetailsV2({ product }: ProductDetailsV2Props) {
  const { dispatch } = useStateContext()
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Add these state variables inside the component
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsFilter, setReviewsFilter] = useState("all")
  const [reviewsSort, setReviewsSort] = useState("recent")
  const searchParams = useSearchParams()
  const router = useRouter()

  // Use sale_price if available, otherwise use regular price
  const currentPrice = selectedVariant?.price || product.sale_price || product.price
  const originalPrice = product.price

  const handleAddToCart = () => {
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      // Show error message or handle validation
      return
    }

    dispatch({
      type: "ADD_TO_CART",
      payload: {
        id: product.id,
        name: product.name,
        price: currentPrice,
        image: product.image_urls?.[0] || "/placeholder.svg",
        variant_id: selectedVariant?.id || undefined,
        quantity,
      },
    })
  }

  const handleAddToWishlist = () => {
    dispatch({
      type: "TOGGLE_WISHLIST",
      payload: {
        id: product.id,
        name: product.name,
        price: currentPrice,
        image: product.image_urls[0],
      },
    })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        })
        .catch((error) => console.log("Error sharing", error))
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // Group variants by color and size
  const variantColors = [...new Set(product.variants?.map((v) => v.color) || [])]
  const variantSizes = [...new Set(product.variants?.map((v) => v.size) || [])]

  // Add this useEffect to fetch reviews when the component mounts or when filter/sort/page changes
  useEffect(() => {
    const fetchReviews = async () => {
      setReviewsLoading(true)
      setReviewsError(null)

      try {
        // Construct the API URL with query parameters
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/products/${product.id}/reviews`)

        // Add query parameters for pagination, filtering, and sorting
        url.searchParams.append("page", reviewsPage.toString())
        url.searchParams.append("limit", "10")

        if (reviewsFilter !== "all") {
          url.searchParams.append("rating", reviewsFilter.replace(" Star", ""))
        }

        switch (reviewsSort) {
          case "recent":
            url.searchParams.append("sort", "created_at:desc")
            break
          case "highest":
            url.searchParams.append("sort", "rating:desc")
            break
          case "lowest":
            url.searchParams.append("sort", "rating:asc")
            break
          case "helpful":
            url.searchParams.append("sort", "helpful:desc")
            break
        }

        const response = await fetch(url.toString())

        if (!response.ok) {
          throw new Error("Failed to fetch reviews")
        }

        const data = await response.json()
        setReviews(data.reviews || [])
        setReviewsTotal(data.total || 0)
      } catch (error) {
        console.error("Error fetching reviews:", error)
        setReviewsError("Failed to load reviews. Please try again later.")
      } finally {
        setReviewsLoading(false)
      }
    }

    fetchReviews()
  }, [product.id, reviewsPage, reviewsFilter, reviewsSort])

  // Add this function to handle filter changes
  const handleFilterChange = (filter: string) => {
    setReviewsFilter(filter)
    setReviewsPage(1) // Reset to first page when filter changes
  }

  // Add this function to handle sort changes
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setReviewsSort(e.target.value)
    setReviewsPage(1) // Reset to first page when sort changes
  }

  // Add this function to handle pagination
  const handlePageChange = (page: number) => {
    setReviewsPage(page)
    // Update URL with page parameter
    const params = new URLSearchParams(searchParams.toString())
    params.set("review_page", page.toString())
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-4 sm:gap-8 md:grid-cols-2 lg:grid-cols-[1fr,1.5fr]">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-white">
            <Image
              src={product.image_urls?.[selectedImage] || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-contain p-4"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
            />
            {product.is_sale && (
              <Badge className="absolute left-4 top-4 bg-cherry-600 px-2 py-1 text-white">SALE</Badge>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {product.image_urls?.map((image, index) => (
              <button
                key={index}
                className={`relative aspect-square w-16 sm:w-20 flex-shrink-0 overflow-hidden rounded-md border snap-center ${
                  selectedImage === index ? "border-cherry-600" : "border-gray-200"
                }`}
                onClick={() => setSelectedImage(index)}
              >
                <Image
                  src={image || "/placeholder.svg"}
                  alt={`${product.name} - View ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
            <a href="/" className="hover:text-cherry-600">
              Home
            </a>
            <ChevronRight className="h-4 w-4" />
            <a href={`/category/${product.category_id}`} className="hover:text-cherry-600">
              {product.category_id}
            </a>
            <ChevronRight className="h-4 w-4" />
            <span className="truncate">{product.name}</span>
          </nav>

          {/* Title and SKU */}
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">SKU: {product.sku}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cherry-900">KSh {currentPrice.toLocaleString()}</span>
            {currentPrice < originalPrice && (
              <span className="text-lg text-muted-foreground line-through">KSh {originalPrice.toLocaleString()}</span>
            )}
            {product.is_sale && (
              <Badge className="ml-2 bg-cherry-50 text-cherry-600">
                Save {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-muted-foreground">{product.description}</p>

          {/* Variant Selection */}
          {product.variants && product.variants.length > 0 && (
            <>
              {/* Color Selection */}
              {variantColors.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Color</h3>
                  <div className="flex flex-wrap gap-2">
                    {variantColors.map((color) => (
                      <button
                        key={color}
                        className={`relative h-10 rounded-md border px-3 py-1 text-sm ${
                          selectedVariant?.color === color
                            ? "border-cherry-600 bg-cherry-50 text-cherry-900"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          const variant = product.variants?.find((v) => v.color === color) || null
                          setSelectedVariant(variant || null)
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {variantSizes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {variantSizes.map((size) => (
                      <button
                        key={size}
                        className={`relative h-10 w-10 rounded-md border text-sm ${
                          selectedVariant?.size === size
                            ? "border-cherry-600 bg-cherry-50 text-cherry-900"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          const variant = product.variants?.find((v) => v.size === size) || null
                          setSelectedVariant(variant)
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quantity */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Quantity</h3>
            <div className="flex w-32 items-center">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-r-none"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex h-10 w-12 items-center justify-center border-y border-input bg-transparent text-sm">
                {quantity}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-l-none"
                onClick={() => setQuantity(Math.min(product.stock || 10, quantity + 1))}
                disabled={quantity >= (product.stock || 10)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Availability:</span>
            {product.stock && product.stock > 0 ? (
              <span className="text-green-600">In Stock ({product.stock} available)</span>
            ) : (
              <span className="text-red-600">Out of Stock</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:flex-1 bg-cherry-600 hover:bg-cherry-700"
              size="lg"
              onClick={handleAddToCart}
              disabled={!product.stock || product.stock <= 0}
            >
              Add to Cart
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:flex-1" onClick={handleAddToWishlist}>
              <Heart className="mr-2 h-4 w-4" />
              Add to Wishlist
            </Button>
            <Button variant="outline" size="icon" className="hidden sm:inline-flex h-12 w-12" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Delivery and Returns */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Free Delivery</p>
                  <p className="text-xs text-muted-foreground">Orders over KSh 10,000</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Authentic Products</p>
                  <p className="text-xs text-muted-foreground">100% Genuine Guarantee</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">Easy Returns</p>
                  <p className="text-xs text-muted-foreground">14-Day Return Policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="details">
          <TabsList className="w-full justify-start border-b bg-transparent p-0">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Product Details
            </TabsTrigger>
            <TabsTrigger
              value="specifications"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Specifications
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-cherry-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Reviews
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-6">
            <div className="prose max-w-none">
              <p>{product.description}</p>
            </div>
          </TabsContent>
          <TabsContent value="specifications" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border">
                <div className="bg-muted px-3 sm:px-4 py-2 font-medium text-sm">Product Information</div>
                <div className="divide-y">
                  <div className="grid grid-cols-2 px-4 py-3">
                    <span className="text-sm text-muted-foreground">SKU</span>
                    <span className="text-sm">{product.sku}</span>
                  </div>
                  <div className="grid grid-cols-2 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Weight</span>
                    <span className="text-sm">{product.weight}kg</span>
                  </div>
                  {product.dimensions && (
                    <div className="grid grid-cols-2 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Dimensions</span>
                      <span className="text-sm">
                        {product.dimensions.length}cm x {product.dimensions.width}cm x {product.dimensions.height}cm
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 px-4 py-3">
                    <span className="text-sm text-muted-foreground">Brand</span>
                    <span className="text-sm">{product.brand_id || "Mizizzi"}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              {/* Reviews Summary */}
              <div className="grid gap-6 md:grid-cols-[300px,1fr]">
                <div className="space-y-4 rounded-lg border bg-white p-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-cherry-900">{product.rating || 0}</div>
                    <div className="mt-1 flex items-center justify-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-5 w-5 ${i < Math.floor(product.rating || 0) ? "fill-yellow-400" : "fill-gray-300"}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Based on {product.reviews_count || 0} reviews</p>
                  </div>

                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      // Calculate percentage for each star rating (from product data if available)
                      const percentage = product.rating_distribution?.[star] || 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <div className="flex items-center text-sm">
                            <span>{star}</span>
                            <svg className="ml-1 h-4 w-4 fill-yellow-400" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="h-2 w-full rounded-full bg-gray-200">
                              <div className="h-2 rounded-full bg-yellow-400" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{percentage}%</div>
                        </div>
                      )
                    })}
                  </div>

                  <Button className="w-full bg-cherry-600 hover:bg-cherry-700">Write a Review</Button>
                </div>

                {/* Review Filters */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Filter Reviews:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 rounded-full ${reviewsFilter === "all" ? "bg-cherry-50 text-cherry-900" : ""}`}
                      onClick={() => handleFilterChange("all")}
                    >
                      All
                    </Button>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <Button
                        key={star}
                        variant="outline"
                        size="sm"
                        className={`h-8 rounded-full ${reviewsFilter === `${star} Star` ? "bg-cherry-50 text-cherry-900" : ""}`}
                        onClick={() => handleFilterChange(`${star} Star`)}
                      >
                        {star} Star
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 rounded-full ${reviewsFilter === "with_photos" ? "bg-cherry-50 text-cherry-900" : ""}`}
                      onClick={() => handleFilterChange("with_photos")}
                    >
                      With Photos
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {reviewsLoading ? "Loading reviews..." : `Showing ${reviews.length} of ${reviewsTotal} reviews`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Sort by:</span>
                      <select
                        className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                        value={reviewsSort}
                        onChange={handleSortChange}
                      >
                        <option value="recent">Most Recent</option>
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                        <option value="helpful">Most Helpful</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review List */}
              <div className="space-y-4">
                {reviewsError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{reviewsError}</div>
                )}

                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-cherry-600 border-t-transparent"></div>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-lg border bg-white p-8 text-center">
                    <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-lg border bg-white p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                            <Image
                              src={review.user?.avatar_url || "/placeholder.svg?height=40&width=40"}
                              alt={review.user?.name || "User"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{review.user?.name || "Anonymous"}</h4>
                              {review.verified_purchase && (
                                <Badge
                                  variant="outline"
                                  className="h-5 border-green-200 bg-green-50 px-1 text-[10px] text-green-700"
                                >
                                  Verified Purchase
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400" : "fill-gray-300"}`}
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-medium">{review.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{review.content}</p>
                      </div>

                      {review.images && review.images.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Photos from this review</p>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {review.images.map((image: string, index: number) => (
                              <div
                                key={index}
                                className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border"
                              >
                                <Image
                                  src={image || "/placeholder.svg"}
                                  alt={`Review image ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            Helpful ({review.helpful_count || 0})
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {reviewsTotal > 0 && (
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={reviewsPage === 1}
                    onClick={() => handlePageChange(reviewsPage - 1)}
                  >
                    &lt;
                  </Button>

                  {/* Generate page numbers */}
                  {Array.from({ length: Math.min(5, Math.ceil(reviewsTotal / 10)) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 ${reviewsPage === page ? "bg-cherry-50 text-cherry-900" : ""}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    )
                  })}

                  {Math.ceil(reviewsTotal / 10) > 5 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 ${reviewsPage === Math.ceil(reviewsTotal / 10) ? "bg-cherry-50 text-cherry-900" : ""}`}
                        onClick={() => handlePageChange(Math.ceil(reviewsTotal / 10))}
                      >
                        {Math.ceil(reviewsTotal / 10)}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={reviewsPage === Math.ceil(reviewsTotal / 10)}
                    onClick={() => handlePageChange(reviewsPage + 1)}
                  >
                    &gt;
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
