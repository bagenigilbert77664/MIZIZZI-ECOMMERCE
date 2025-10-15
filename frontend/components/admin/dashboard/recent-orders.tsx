"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { formatDate, cn } from "@/lib/utils"
import { Eye, Package, ShoppingBag, ArrowUpRight, RefreshCw, Filter, Search, PlusCircle } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Order {
  id: string
  order_number: string
  status: string
  total_amount: number
  created_at: string
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

interface RecentOrdersProps {
  orders: Order[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  const router = useRouter()
  const isMobile = useMobile()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const refreshOrders = () => {
    setIsRefreshing(true)
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "all") return matchesSearch
    return matchesSearch && order.status.toLowerCase() === activeTab.toLowerCase()
  })

  const getStatusColor = (status: string): "default" | "outline" | "destructive" | "secondary" => {
    const statusLower = status.toLowerCase()
    if (statusLower === "delivered") return "outline"
    if (statusLower === "shipped") return "secondary"
    if (statusLower === "processing") return "default"
    if (statusLower === "pending") return "secondary"
    if (statusLower === "cancelled") return "destructive"
    return "default"
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getAvatarColor = (email: string) => {
    const colors = [
      "bg-rose-500",
      "bg-pink-500",
      "bg-fuchsia-500",
      "bg-purple-500",
      "bg-violet-500",
      "bg-indigo-500",
      "bg-blue-500",
      "bg-sky-500",
      "bg-cyan-500",
      "bg-teal-500",
      "bg-emerald-500",
      "bg-green-500",
      "bg-lime-500",
      "bg-yellow-500",
      "bg-amber-500",
      "bg-orange-500",
      "bg-red-500",
    ]

    // Simple hash function to get consistent color for same email
    const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
              <CardDescription>Monitor your latest customer orders</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshOrders} className="h-9 gap-1" disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-12 px-4 text-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-full blur-xl opacity-70"></div>
              <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 p-6 rounded-full">
                <ShoppingBag className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h3 className="text-xl font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              When customers place orders, they'll appear here for you to process and track.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button onClick={() => router.push("/admin/products/new")} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Add Products
              </Button>
              <Button variant="outline" onClick={() => router.push("/admin/orders")} className="gap-2">
                <Package className="h-4 w-4" />
                View All Orders
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  // Mobile-optimized card view for orders
  if (isMobile) {
    return (
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
              <CardDescription>Monitor your latest customer orders</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshOrders} className="h-9 gap-1" disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search orders..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filter</span>
            </Button>
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
            </TabsList>
          </Tabs>

          <AnimatePresence>
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-8 text-center"
              >
                <p className="text-muted-foreground">No matching orders found</p>
              </motion.div>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredOrders.slice(0, 5).map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border rounded-lg bg-card shadow-sm overflow-hidden"
                  >
                    <div className="p-3 flex justify-between items-center border-b">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          {order.user?.avatar ? (
                            <AvatarImage
                              src={order.user.avatar || "/placeholder.svg"}
                              alt={order.user.name || "Customer"}
                            />
                          ) : (
                            <AvatarFallback className={getAvatarColor(order.user?.email || "")}>
                              {getInitials(order.user?.name || "User")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium line-clamp-1">{order.user?.name || "Guest"}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {order.user?.email || "No email"}
                          </div>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(order.status)} className="capitalize">
                        {order.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                        <div className="font-medium text-green-600 dark:text-green-400">
                          +${order.total_amount?.toFixed(2) || "0.00"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View order</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
                {orders.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/admin/orders")}
                      className="gap-1 text-xs"
                    >
                      View all orders
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    )
  }

  // Desktop table view
  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">Recent Orders</CardTitle>
            <CardDescription>Monitor your latest customer orders</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshOrders} className="h-9 gap-1" disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by order number, customer name or email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <Filter className="h-4 w-4" />
            <span className="sr-only">Filter</span>
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="overflow-x-auto -mx-6 px-6">
          <AnimatePresence>
            {filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-12 text-center"
              >
                <p className="text-muted-foreground">No matching orders found</p>
              </motion.div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px]">Customer</TableHead>
                    <TableHead className="w-[120px]">Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.slice(0, 5).map((order, index) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="group hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            {order.user?.avatar ? (
                              <AvatarImage
                                src={order.user.avatar || "/placeholder.svg"}
                                alt={order.user.name || "Customer"}
                              />
                            ) : (
                              <AvatarFallback className={getAvatarColor(order.user?.email || "")}>
                                {getInitials(order.user?.name || "User")}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                              {order.user?.name || "Guest"}
                            </div>
                            <div className="text-xs text-muted-foreground">{order.user?.email || "No email"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)} className="capitalize">
                          {order.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                        +${order.total_amount?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View order</span>
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
      {filteredOrders.length > 0 && orders.length > 5 && (
        <CardFooter className="flex justify-center py-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/orders")} className="gap-1">
            View all orders
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
