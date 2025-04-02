"use client"

import { useEffect, useState } from "react"
import { websocketService } from "@/services/websocket"
import { productService } from "@/services/product"
import type { Product } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export function ProductLiveUpdates() {
  const [recentUpdates, setRecentUpdates] = useState<{ id: string; timestamp: number }[]>([])
  const [updatedProducts, setUpdatedProducts] = useState<Map<string, Product>>(new Map())
  const [isLoading, setIsLoading] = useState<Map<string, boolean>>(new Map())

  // Handle product updates
  useEffect(() => {
    const handleProductUpdate = async (data: { id: string }) => {
      // Add to recent updates
      setRecentUpdates((prev) => {
        const newUpdates = [
          { id: data.id, timestamp: Date.now() },
          ...prev.filter((update) => update.id !== data.id),
        ].slice(0, 5) // Keep only the 5 most recent updates

        return newUpdates
      })

      // Set loading state for this product
      setIsLoading((prev) => new Map(prev).set(data.id, true))

      try {
        // Fetch the updated product
        const product = await productService.getProduct(data.id)
        if (product) {
          setUpdatedProducts((prev) => {
            const newMap = new Map(prev)
            newMap.set(data.id, product)
            return newMap
          })
        }
      } catch (error) {
        console.error(`Error fetching updated product ${data.id}:`, error)
      } finally {
        // Clear loading state
        setIsLoading((prev) => {
          const newMap = new Map(prev)
          newMap.delete(data.id)
          return newMap
        })
      }
    }

    // Subscribe to product updates
    const unsubscribe = websocketService.subscribe("product_updated", handleProductUpdate)

    return () => {
      unsubscribe()
    }
  }, [])

  // Remove updates older than 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000

      setRecentUpdates((prev) => {
        const filtered = prev.filter((update) => update.timestamp > tenMinutesAgo)

        // Also remove products that are no longer in recent updates
        const activeIds = new Set(filtered.map((update) => update.id))
        setUpdatedProducts((prev) => {
          const newMap = new Map()
          for (const [id, product] of prev.entries()) {
            if (activeIds.has(id)) {
              newMap.set(id, product)
            }
          }
          return newMap
        })

        return filtered
      })
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  if (recentUpdates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Product Updates</CardTitle>
          <CardDescription>Real-time updates will appear here when products are modified</CardDescription>
        </CardHeader>
        <CardContent className="h-40 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No recent updates</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Live Product Updates</CardTitle>
            <CardDescription>Recently updated products in real-time</CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 px-2 py-1">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentUpdates.map((update) => {
          const product = updatedProducts.get(update.id)
          const isProductLoading = isLoading.get(update.id)

          return (
            <div key={update.id} className="border rounded-lg p-3 bg-slate-50">
              {isProductLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : product ? (
                <div className="flex gap-3">
                  <div className="h-20 w-20 relative rounded-md overflow-hidden border bg-white flex-shrink-0">
                    {product.thumbnail_url || (product.image_urls && product.image_urls.length > 0) ? (
                      <Image
                        src={product.thumbnail_url || (product.image_urls && product.image_urls[0]) || ""}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-100">
                        <span className="text-slate-400 text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">KSh {product.sale_price || product.price}</span>
                      {product.sale_price && product.sale_price < product.price && (
                        <span className="text-xs line-through text-muted-foreground/70">KSh {product.price}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {typeof product.category === "string"
                          ? product.category
                          : product.category?.name || "Uncategorized"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {Math.floor((Date.now() - update.timestamp) / 1000)}s ago
                      </span>
                    </div>
                  </div>
                  <div>
                    <Link href={`/product/${product.id}`} passHref>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Product #{update.id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      setIsLoading((prev) => new Map(prev).set(update.id, true))
                      try {
                        const product = await productService.getProduct(update.id)
                        if (product) {
                          setUpdatedProducts((prev) => {
                            const newMap = new Map(prev)
                            newMap.set(update.id, product)
                            return newMap
                          })
                        }
                      } catch (error) {
                        console.error(`Error fetching product ${update.id}:`, error)
                      } finally {
                        setIsLoading((prev) => {
                          const newMap = new Map(prev)
                          newMap.delete(update.id)
                          return newMap
                        })
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" /> Load
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

