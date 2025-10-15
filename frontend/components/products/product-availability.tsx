"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Truck, Clock, AlertTriangle, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import inventoryService from "@/services/inventory-service"

interface ProductAvailabilityProps {
  productId: number
  variantId?: number
  quantity?: number
  showDeliveryInfo?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ProductAvailability({
  productId,
  variantId,
  quantity = 1,
  showDeliveryInfo = true,
  className = "",
  size = "md",
}: ProductAvailabilityProps) {
  const [availability, setAvailability] = useState<any>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLowStock, setIsLowStock] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchAvailability = async () => {
      setIsLoading(true)
      try {
        const result = await inventoryService.checkAvailability(productId, quantity, variantId)

        if (!isMounted) return

        setAvailability(result)
        setIsAvailable(result.is_available)

        // Check if the available quantity is low compared to total stock
        const lowStockThreshold = 5; // Define a default threshold
        const isLow = result.available_quantity > 0 && result.available_quantity <= lowStockThreshold
        setIsLowStock(isLow)

        setError(null)
      } catch (err) {
        console.error("Error checking availability:", err)
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to check availability"))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchAvailability()

    return () => {
      isMounted = false
    }
  }, [productId, variantId, quantity])

  if (isLoading) {
    return (
      <div className={`${className} py-2`}>
        <Skeleton className={`h-${size === "lg" ? 8 : size === "md" ? 6 : 4} w-32 rounded-md`} />
        {showDeliveryInfo && <Skeleton className="h-4 w-48 mt-2 rounded-md" />}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className} flex items-center text-red-600 text-sm py-2`}>
        <AlertTriangle className="h-4 w-4 mr-1.5" />
        Unable to check availability
      </div>
    )
  }

  // Determine status
  let status = "unknown"
  if (availability) {
    if (availability.is_available) {
      status = availability.is_low_stock ? "low_stock" : "in_stock"
    } else {
      status = "out_of_stock"
    }
  }

  // Get the appropriate styling based on status
  const getStatusStyles = () => {
    switch (status) {
      case "in_stock":
        return {
          containerClass: "bg-green-50 border-green-200",
          textClass: "text-green-800",
          icon: <CheckCircle className={`h-${size === "lg" ? 5 : 4} w-${size === "lg" ? 5 : 4} text-green-600`} />,
          badgeVariant: "success" as const,
        }
      case "low_stock":
        return {
          containerClass: "bg-amber-50 border-amber-200",
          textClass: "text-amber-800",
          icon: <AlertCircle className={`h-${size === "lg" ? 5 : 4} w-${size === "lg" ? 5 : 4} text-amber-600`} />,
          badgeVariant: "warning" as const,
        }
      case "out_of_stock":
        return {
          containerClass: "bg-red-50 border-red-200",
          textClass: "text-red-800",
          icon: <XCircle className={`h-${size === "lg" ? 5 : 4} w-${size === "lg" ? 5 : 4} text-red-600`} />,
          badgeVariant: "destructive" as const,
        }
      default:
        return {
          containerClass: "bg-gray-50 border-gray-200",
          textClass: "text-gray-800",
          icon: <AlertCircle className={`h-${size === "lg" ? 5 : 4} w-${size === "lg" ? 5 : 4} text-gray-600`} />,
          badgeVariant: "outline" as const,
        }
    }
  }

  const styles = getStatusStyles()
  const fontSize = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-xs"

  return (
    <div className={`${className} mb-3`}>
      <div className={`rounded-md border p-3 ${styles.containerClass}`}>
        <div className="flex items-center gap-2">
          {styles.icon}
          <div>
            <div className={`font-semibold ${fontSize} ${styles.textClass}`}>
              {status === "in_stock" && "In Stock"}
              {status === "low_stock" && "Low Stock"}
              {status === "out_of_stock" && "Out of Stock"}
              {status === "unknown" && "Availability Unknown"}

              {/* Show quantity if available */}
              {availability && availability.available_quantity !== undefined && (
                <span className="ml-1">
                  ({availability.available_quantity} {availability.available_quantity === 1 ? "item" : "items"}{" "}
                  available)
                </span>
              )}
            </div>

            {availability && availability.reserved_quantity > 0 && (
              <div className={`${fontSize === "text-base" ? "text-sm" : "text-xs"} text-amber-600 mt-1`}>
                <div className="flex items-center">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  <span>
                    {availability.reserved_quantity} {availability.reserved_quantity === 1 ? "item" : "items"} in other
                    carts
                  </span>
                </div>
              </div>
            )}

            {showDeliveryInfo && isAvailable && (
              <div className={`${fontSize === "text-base" ? "text-sm" : "text-xs"} ${styles.textClass} mt-1`}>
                {status === "in_stock" ? (
                  <div className="flex items-center">
                    <Truck className="h-3.5 w-3.5 mr-1.5" />
                    <span>Fast delivery available</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    <span>Delivery in 2-3 business days</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductAvailability
