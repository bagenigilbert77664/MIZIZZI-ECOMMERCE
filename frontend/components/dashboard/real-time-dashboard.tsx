"use client"

import { useState, useEffect, useCallback } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader } from "@/components/ui/loader"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, RefreshCw, Activity, ShoppingCart, Package, Bell } from "lucide-react"

interface ActivityEvent {
  id: string
  type: string
  timestamp: string
  message: string
  data?: any
}

interface ProductActivity {
  product_id: string | number
  timestamp: string
  user_id?: string | number
}

interface OrderUpdate {
  order_id: string | number
  status: string
  timestamp: string
}

interface InventoryUpdate {
  product_id: string | number
  stock_level: number
  timestamp: string
}

export function RealTimeDashboard() {
  const { isConnected, isConnecting, connect, lastError, subscribe } = useSocket()
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [productViews, setProductViews] = useState<ProductActivity[]>([])
  const [cartActivities, setCartActivities] = useState<ProductActivity[]>([])
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdate[]>([])
  const [inventoryUpdates, setInventoryUpdates] = useState<InventoryUpdate[]>([])
  const [activeTab, setActiveTab] = useState("overview")

  // Create a unique ID for each event
  const createId = useCallback(() => Math.random().toString(36).substring(2, 9), [])

  // Handle product views
  const handleProductView = useCallback(
    (data: ProductActivity) => {
      setProductViews((prev) => [data, ...prev].slice(0, 20))
      setActivities((prev) =>
        [
          {
            id: createId(),
            type: "product_view",
            timestamp: data.timestamp,
            message: `Product #${data.product_id} was viewed`,
            data,
          },
          ...prev,
        ].slice(0, 50),
      )
    },
    [createId],
  )

  // Handle cart activities
  const handleCartActivity = useCallback(
    (data: ProductActivity) => {
      setCartActivities((prev) => [data, ...prev].slice(0, 20))
      setActivities((prev) =>
        [
          {
            id: createId(),
            type: "cart_activity",
            timestamp: data.timestamp,
            message: `Product #${data.product_id} was added to cart${data.user_id ? ` by User #${data.user_id}` : ""}`,
            data,
          },
          ...prev,
        ].slice(0, 50),
      )
    },
    [createId],
  )

  // Handle order updates
  const handleOrderUpdate = useCallback(
    (data: OrderUpdate) => {
      setOrderUpdates((prev) => [data, ...prev].slice(0, 20))
      setActivities((prev) =>
        [
          {
            id: createId(),
            type: "order_update",
            timestamp: data.timestamp,
            message: `Order #${data.order_id} status changed to ${data.status}`,
            data,
          },
          ...prev,
        ].slice(0, 50),
      )
    },
    [createId],
  )

  // Handle inventory updates
  const handleInventoryUpdate = useCallback(
    (data: InventoryUpdate) => {
      const message =
        data.stock_level <= 5
          ? `Low stock alert: Product #${data.product_id} has only ${data.stock_level} items left`
          : `Inventory updated: Product #${data.product_id} now has ${data.stock_level} items in stock`

      setActivities((prev) =>
        [
          {
            id: createId(),
            type: "inventory_update",
            timestamp: data.timestamp,
            message,
            data,
          },
          ...prev,
        ].slice(0, 50),
      )
      setInventoryUpdates((prev) => [data, ...prev].slice(0, 20))
    },
    [createId],
  )

  // Handle product updates
  const handleProductUpdate = useCallback(
    (data: any) => {
      setActivities((prev) =>
        [
          {
            id: createId(),
            type: "product_update",
            timestamp: data.timestamp,
            message: `Product #${data.product_id} was updated`,
            data,
          },
          ...prev,
        ].slice(0, 50),
      )
    },
    [createId],
  )

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!isConnected || !subscribe) return

    // Register event listeners
    const unsubscribeProductView = subscribe<ProductActivity>("product_view_activity", handleProductView)
    const unsubscribeCartActivity = subscribe<ProductActivity>("cart_activity", handleCartActivity)
    const unsubscribeOrderUpdate = subscribe<OrderUpdate>("order_updated", handleOrderUpdate)
    const unsubscribeOrderStatusChange = subscribe<OrderUpdate>("order_status_changed", handleOrderUpdate)
    const unsubscribeInventoryUpdate = subscribe<InventoryUpdate>("inventory_updated", handleInventoryUpdate)
    const unsubscribeProductUpdate = subscribe("product_updated", handleProductUpdate)

    // Clean up on unmount
    return () => {
      unsubscribeProductView()
      unsubscribeCartActivity()
      unsubscribeOrderUpdate()
      unsubscribeOrderStatusChange()
      unsubscribeInventoryUpdate()
      unsubscribeProductUpdate()
    }
  }, [
    isConnected,
    subscribe,
    handleProductView,
    handleCartActivity,
    handleOrderUpdate,
    handleInventoryUpdate,
    handleProductUpdate,
  ])

  // Format timestamp
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    } catch (e) {
      return timestamp
    }
  }

  // Get status badge variant
  const getStatusBadge = (type: string) => {
    switch (type) {
      case "product_view":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            View
          </Badge>
        )
      case "cart_activity":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Cart
          </Badge>
        )
      case "order_update":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Order
          </Badge>
        )
      case "inventory_update":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Inventory
          </Badge>
        )
      case "product_update":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Update
          </Badge>
        )
      default:
        return <Badge variant="outline">Event</Badge>
    }
  }

  // Get status icon
  const getStatusIcon = (type: string) => {
    switch (type) {
      case "product_view":
        return <Activity className="h-4 w-4 text-blue-600" />
      case "cart_activity":
        return <ShoppingCart className="h-4 w-4 text-purple-600" />
      case "order_update":
        return <Package className="h-4 w-4 text-amber-600" />
      case "inventory_update":
        return <RefreshCw className="h-4 w-4 text-green-600" />
      case "product_update":
        return <Bell className="h-4 w-4 text-indigo-600" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Real-Time Dashboard</CardTitle>
            <CardDescription>Monitor live activities and updates from your store</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              disabled={isConnected || isConnecting}
              className="ml-2"
            >
              {isConnecting ? (
                <>
                  <div className="mr-2">
                    <Loader size="sm" className="mr-2" />
                  </div>
                  Connecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect
                </>
              )}
            </Button>
          </div>
        </div>
        {lastError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{lastError}</div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Recent Activities</h3>
                <ScrollArea className="h-[400px] rounded-md border">
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2 opacity-50" />
                      <p>No activities yet</p>
                      <p className="text-xs">Real-time events will appear here as they happen</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-2 p-2 border-b border-muted last:border-0"
                        >
                          <div className="mt-0.5">{getStatusIcon(activity.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-sm truncate">{activity.message}</div>
                              {getStatusBadge(activity.type)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{formatTime(activity.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Product Views</h3>
                <ScrollArea className="h-[300px] rounded-md border">
                  {productViews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                      <Activity className="h-6 w-6 mb-2 opacity-50" />
                      <p className="text-sm">No product views yet</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {productViews.map((view, index) => (
                        <div key={index} className="flex justify-between p-2 border-b border-muted last:border-0">
                          <span className="font-medium text-sm">Product #{view.product_id}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(view.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Cart Activities</h3>
                <ScrollArea className="h-[300px] rounded-md border">
                  {cartActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                      <ShoppingCart className="h-6 w-6 mb-2 opacity-50" />
                      <p className="text-sm">No cart activities yet</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {cartActivities.map((activity, index) => (
                        <div key={index} className="p-2 border-b border-muted last:border-0">
                          <div className="flex justify-between">
                            <span className="font-medium text-sm">Product #{activity.product_id}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</span>
                          </div>
                          {activity.user_id && (
                            <div className="text-xs text-muted-foreground mt-1">Added by User #{activity.user_id}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div>
              <h3 className="text-sm font-medium mb-2">Order Updates</h3>
              <ScrollArea className="h-[400px] rounded-md border">
                {orderUpdates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    <p>No order updates yet</p>
                    <p className="text-xs">Order status changes will appear here</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {orderUpdates.map((update, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Order #{update.order_id}</div>
                            <div className="text-sm mt-1">
                              Status: <Badge variant="outline">{update.status}</Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatTime(update.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <div>
              <h3 className="text-sm font-medium mb-2">Inventory Updates</h3>
              <ScrollArea className="h-[400px] rounded-md border">
                {inventoryUpdates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mb-2 opacity-50" />
                    <p>No inventory updates yet</p>
                    <p className="text-xs">Stock level changes will appear here</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {inventoryUpdates.map((update, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">Product #{update.product_id}</div>
                            <div className="text-sm mt-1">
                              Stock Level:{" "}
                              <Badge
                                variant="outline"
                                className={update.stock_level <= 5 ? "bg-red-50 text-red-700 border-red-200" : ""}
                              >
                                {update.stock_level}
                              </Badge>
                              {update.stock_level <= 5 && <span className="text-xs text-red-600 ml-2">Low Stock!</span>}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatTime(update.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          {isConnected ? "Connected to WebSocket server" : "Disconnected from WebSocket server"}
        </div>
        <div className="text-xs text-muted-foreground">{activities.length} events received</div>
      </CardFooter>
    </Card>
  )
}
