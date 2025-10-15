"use client"
import { useEffect, useState } from "react"
import { Star, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { orderService } from "@/services/orders"
import { reviewService } from "@/services/review-service"
import type { Order } from "@/types/index"
import { format } from "date-fns"

interface ProductToReview {
  productId: number
  productName: string
  productImage: string
  orderNumber: string
  deliveryDate: string
  hasReview: boolean
  reviewId?: number
  rating?: number
}

interface ReviewsSectionProps {
  onRateProduct?: (product: ProductToReview) => void
}

export function ReviewsSection({ onRateProduct }: ReviewsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productsToReview, setProductsToReview] = useState<ProductToReview[]>([])

  useEffect(() => {
    fetchProductsToReview()
  }, [])

  const fetchProductsToReview = async () => {
    try {
      setLoading(true)
      setError(null)

      const orders = await orderService.getOrders()

      const deliveredOrders = orders.filter(
        (order: Order) =>
          order.status === "DELIVERED" ||
          order.status === "SHIPPED" ||
          order.status === "delivered" ||
          order.status === "shipped",
      )

      const myReviews = await reviewService.getMyReviews({ per_page: 100 })
      const reviewedProductIds = new Set(myReviews.items.map((review) => review.product_id))

      const products: ProductToReview[] = []
      for (const order of deliveredOrders) {
        for (const item of order.items) {
          const productId = typeof item.product_id === "string" ? Number.parseInt(item.product_id) : item.product_id
          const hasReview = reviewedProductIds.has(productId)
          const existingReview = myReviews.items.find((r) => r.product_id === productId)

          products.push({
            productId,
            productName: item.name || item.product_name || item.product?.name || "Unknown Product",
            productImage:
              item.image_url ||
              item.thumbnail_url ||
              item.product?.thumbnail_url ||
              item.product?.image_urls?.[0] ||
              "/placeholder.svg?height=80&width=80",
            orderNumber: order.order_number,
            deliveryDate: order.updated_at || order.created_at,
            hasReview,
            reviewId: existingReview?.id,
            rating: existingReview?.rating,
          })
        }
      }

      setProductsToReview(products)
    } catch (err) {
      console.error("[v0] Error fetching products to review:", err)
      setError("Failed to load products. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  const formatDeliveryDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd-MM-yy")
    } catch {
      return dateString
    }
  }

  const pendingReviews = productsToReview.filter((p) => !p.hasReview)
  const completedReviews = productsToReview.filter((p) => p.hasReview)

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pending Reviews</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Pending Reviews ({pendingReviews.length})</h2>

        {pendingReviews.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No products to review</h3>
            <p className="text-sm text-gray-500">
              Products from your delivered orders will appear here for you to review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((product, index) => (
              <div
                key={`${product.productId}-${index}`}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={product.productImage || "/placeholder.svg"}
                    alt={product.productName}
                    className="h-20 w-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 mb-1">{product.productName}</h3>
                    <p className="text-sm text-gray-600 mb-1">Order nº: {product.orderNumber}</p>
                    <p className="text-sm text-green-600">Delivered on {formatDeliveryDate(product.deliveryDate)}</p>
                  </div>
                  <Button
                    onClick={() => onRateProduct?.(product)}
                    className="bg-[#8B1538] hover:bg-[#6d1029] text-white"
                  >
                    Rate this product
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {completedReviews.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Reviews ({completedReviews.length})</h2>
          <div className="space-y-4">
            {completedReviews.map((product, index) => (
              <div key={`${product.productId}-${index}`} className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={product.productImage || "/placeholder.svg"}
                    alt={product.productName}
                    className="h-20 w-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 mb-1">{product.productName}</h3>
                    <p className="text-sm text-gray-600 mb-1">Order nº: {product.orderNumber}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={
                            star <= (product.rating || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-gray-200 text-gray-200"
                          }
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-2">Reviewed</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
