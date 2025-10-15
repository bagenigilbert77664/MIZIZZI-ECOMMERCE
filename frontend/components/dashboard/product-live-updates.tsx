"use client"

import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader } from "@/components/ui/loader"
import { AlertTriangle, ShoppingCart, Eye, RefreshCw } from "lucide-react"

interface ProductActivity {
  product_id: string | number
  timestamp: string
  user_id?: string | number
}

interface InventoryUpdate {
  product_id: string | number
  stock_level: number
  timestamp: string
}

export function ProductLiveUpdates() {
  const { isConnected, subscribe } = useSocket()
  const [productViews, setProductViews] = useState<ProductActivity[]>([])
  const [cartActivities, setCartActivities] = useState<ProductActivity[]>([])
  const [productUpdates, setProductUpdates] = useState<ProductActivity[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<InventoryUpdate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Set loading to false after a short delay to show the loading state
    const timer = setTimeout(() => setIsLoading(false), 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isConnected) return

    // Handle product views
    const handleProductView = (data: ProductActivity) => {
      setProductViews((prev) => [data, ...prev].slice(0, 10))
    }

    // Handle cart activities
    const handleCartActivity = (data: ProductActivity) => {
      setCartActivities((prev) => [data, ...prev].slice(0, 10))
    }

    // Handle product updates
    const handleProductUpdate = (data: ProductActivity) => {
      setProductUpdates((prev) => [data, ...prev].slice(0, 10))
    }

    // Handle inventory updates
    const handleInventoryUpdate = (data: InventoryUpdate) => {
      // Only add to low stock alerts if stock level is 5 or less
      if (data.stock_level <= 5) {
        setLowStockAlerts((prev) => [data, ...prev].slice(0, 10))
      }
    }

    // Register event listeners
    const unsubProductView = subscribe<ProductActivity>("product_view_activity", handleProductView)
    const unsubCartActivity = subscribe<ProductActivity>("cart_activity", handleCartActivity)
    const unsubProductUpdate = subscribe<ProductActivity>("product_updated", handleProductUpdate)
    const unsubInventoryUpdate = subscribe<InventoryUpdate>("inventory_updated", handleInventoryUpdate)

    // Clean up on unmount
    return () => {
      unsubProductView()
      unsubCartActivity()
      unsubProductUpdate()
      unsubInventoryUpdate()
    }
  }, [isConnected, subscribe])

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString()
    } catch (error) {
      return timestamp
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Live Product Activity
          {isConnected ? (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800">
              Disconnected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Real-time product views and cart additions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <Eye className="h-4 w-4 mr-2 text-blue-500" />
                Product Views
              </h3>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {productViews.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No recent product views</p>
                ) : (
                  <ul className="space-y-2">
                    {productViews.map((view, index) => (
                      <li key={index} className="text-sm border-b pb-1">
                        <span className="font-medium">Product #{view.product_id}</span> viewed at{" "}
                        {formatTime(view.timestamp)}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2 text-purple-500" />
                Cart Activities
              </h3>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {cartActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No recent cart activities</p>
                ) : (
                  <ul className="space-y-2">
                    {cartActivities.map((activity, index) => (
                      <li key={index} className="text-sm border-b pb-1">
                        <span className="font-medium">Product #{activity.product_id}</span> added to cart
                        {activity.user_id && <span> by User #{activity.user_id}</span>} at{" "}
                        {formatTime(activity.timestamp)}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 text-green-500" />
                Product Updates
              </h3>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {productUpdates.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No recent product updates</p>
                ) : (
                  <ul className="space-y-2">
                    {productUpdates.map((update, index) => (
                      <li key={index} className="text-sm border-b pb-1">
                        <span className="font-medium">Product #{update.product_id}</span> was updated at{" "}
                        {formatTime(update.timestamp)}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                Low Stock Alerts
              </h3>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {lowStockAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No low stock alerts</p>
                ) : (
                  <ul className="space-y-2">
                    {lowStockAlerts.map((alert, index) => (
                      <li key={index} className="text-sm border-b pb-1 text-red-600">
                        <span className="font-medium">Product #{alert.product_id}</span> has only{" "}
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {alert.stock_level}
                        </Badge>{" "}
                        items left at {formatTime(alert.timestamp)}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
