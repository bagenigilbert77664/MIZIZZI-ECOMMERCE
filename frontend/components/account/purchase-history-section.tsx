"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import { AlertCircle, ShoppingBag, Loader2, Package } from "lucide-react"
import type { Order } from "@/types"

export function PurchaseHistorySection() {
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [isAuthenticated])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await orderService.getOrders({ limit: 1000 })
      if (Array.isArray(data)) {
        // Filter for completed orders only (delivered, cancelled, returned, refunded)
        const completedOrders = data.filter((order) => {
          const status = order.status?.toLowerCase() || ""
          return ["delivered", "cancelled", "canceled", "returned", "refunded"].includes(status)
        })
        setOrders(completedOrders)
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error("Error fetching purchase history:", error)
      setError("Failed to load your purchase history. Please try again later.")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getProductName = (item: any): string => {
    if (item.product?.name) return item.product.name
    if (item.product_name) return item.product_name
    if (item.name) return item.name
    if (item.product_id) return `Product #${item.product_id}`
    return "Unknown Product"
  }

  const getProductImage = (item: any): string => {
    if (item.product) {
      if (item.product.thumbnail_url) return item.product.thumbnail_url
      if (item.product.images && Array.isArray(item.product.images)) {
        const primaryImage = item.product.images.find((img: any) => img.is_primary)
        if (primaryImage?.url) return primaryImage.url
        if (item.product.images.length > 0 && item.product.images[0].url) return item.product.images[0].url
      }
      if (item.product.image_urls && Array.isArray(item.product.image_urls) && item.product.image_urls.length > 0) {
        return item.product.image_urls[0]
      }
      if (item.product.image_url) return item.product.image_url
    }
    if (item.product_image) return item.product_image
    if (item.thumbnail_url) return item.thumbnail_url
    if (item.image_url) return item.image_url
    const productName = getProductName(item)
    return `/placeholder.svg?height=60&width=60&text=${encodeURIComponent(productName)}`
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    let badgeClass = "px-2 py-0.5 rounded text-xs font-medium inline-block"
    let badgeText = status

    if (statusLower === "delivered") {
      badgeClass += " bg-green-100 text-green-700"
      badgeText = "DELIVERED"
    } else if (statusLower === "cancelled" || statusLower === "canceled") {
      badgeClass += " bg-red-100 text-red-700"
      badgeText = "CANCELLED"
    } else if (statusLower === "returned") {
      badgeClass += " bg-amber-100 text-amber-700"
      badgeText = "RETURNED"
    } else if (statusLower === "refunded") {
      badgeClass += " bg-blue-100 text-blue-700"
      badgeText = "REFUNDED"
    } else {
      badgeClass += " bg-gray-100 text-gray-700"
    }

    return <span className={badgeClass}>{badgeText}</span>
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <p className="mt-4 text-sm text-gray-600">Loading your purchase history...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Sign In Required</h2>
          <p className="text-sm text-gray-600 mb-6">Please sign in to view your purchase history.</p>
          <Button asChild>
            <Link href="/auth/login?redirect=/account?tab=purchase-history">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-1">Purchase History</h2>
        <p className="text-sm text-gray-600">View all your completed orders</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && orders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-semibold mb-2">No Purchase History</h3>
            <p className="text-sm text-gray-600 mb-6">You don't have any completed orders yet.</p>
            <Button asChild>
              <Link href="/">Start Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {orders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            {orders.map((order) => {
              const firstItem = order.items?.[0]
              if (!firstItem) return null

              return (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 relative rounded overflow-hidden border border-gray-200 bg-gray-50">
                      <Image
                        src={getProductImage(firstItem) || "/placeholder.svg"}
                        alt={getProductName(firstItem)}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{getProductName(firstItem)}</h3>
                      <p className="text-xs text-gray-500 mb-1">Order {order.order_number}</p>
                      <div className="flex items-center gap-2 mb-1">{getStatusBadge(order.status || "")}</div>
                      <p className="text-xs text-gray-500">
                        Completed on {formatDate(order.updated_at || order.created_at)}
                      </p>
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end justify-between">
                      <Link
                        href={`/account?tab=order-details&id=${order.id}`}
                        className="text-xs text-[#8B1538] hover:text-[#6B0F2A] font-medium transition-colors"
                      >
                        View details
                      </Link>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        {formatCurrency(order.total_amount || order.total || 0)}
                      </p>
                    </div>
                  </div>

                  {order.items && order.items.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">+{order.items.length - 1} more item(s)</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
