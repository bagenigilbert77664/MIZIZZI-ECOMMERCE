"use client"

import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader } from "@/components/ui/loader"

interface ProductActivity {
  product_id: string
  timestamp: string
  user_id?: string
}

export const ProductLiveUpdates = () => {
  const { socket, isConnected } = useSocket()
  const [productViews, setProductViews] = useState<ProductActivity[]>([])
  const [cartActivities, setCartActivities] = useState<ProductActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!socket) return

    setIsLoading(false)

    // Handle product views
    const handleProductView = (data: ProductActivity) => {
      setProductViews((prev) => [data, ...prev].slice(0, 10))
    }

    // Handle cart activities
    const handleCartActivity = (data: ProductActivity) => {
      setCartActivities((prev) => [data, ...prev].slice(0, 10))
    }

    // Register event listeners
    socket.on("product_view_activity", handleProductView)
    socket.on("cart_activity", handleCartActivity)

    // Clean up on unmount
    return () => {
      socket.off("product_view_activity", handleProductView)
      socket.off("cart_activity", handleCartActivity)
    }
  }, [socket])

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
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
              <h3 className="font-medium mb-2">Product Views</h3>
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
              <h3 className="font-medium mb-2">Cart Activities</h3>
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

