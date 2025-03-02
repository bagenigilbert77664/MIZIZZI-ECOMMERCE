"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Package2, Search, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Image from "next/image"

// Mock order data
const orders = [
  {
    id: "ORD-2024-001",
    date: "2024-02-26",
    total: 149999,
    status: "delivered",
    items: [
      {
        id: 1,
        name: "Diamond Tennis Bracelet",
        price: 149999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300&h=300&fit=crop",
        quantity: 1,
      },
    ],
    tracking: {
      number: "TRK123456789",
      carrier: "DHL Express",
      estimatedDelivery: "2024-02-28",
      updates: [
        { date: "2024-02-26", status: "Delivered", location: "Nairobi, Kenya" },
        { date: "2024-02-25", status: "Out for Delivery", location: "Nairobi, Kenya" },
        { date: "2024-02-24", status: "In Transit", location: "Mombasa, Kenya" },
        { date: "2024-02-23", status: "Order Processed", location: "Dubai, UAE" },
      ],
    },
  },
  {
    id: "ORD-2024-002",
    date: "2024-02-25",
    total: 299999,
    status: "in_transit",
    items: [
      {
        id: 2,
        name: "Sapphire and Diamond Ring",
        price: 199999,
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop",
        quantity: 1,
      },
      {
        id: 3,
        name: "Pearl Drop Necklace",
        price: 99999,
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop",
        quantity: 1,
      },
    ],
    tracking: {
      number: "TRK987654321",
      carrier: "DHL Express",
      estimatedDelivery: "2024-02-29",
      updates: [
        { date: "2024-02-25", status: "In Transit", location: "Dubai, UAE" },
        { date: "2024-02-24", status: "Order Processed", location: "Dubai, UAE" },
      ],
    },
  },
  {
    id: "ORD-2024-003",
    date: "2024-02-24",
    total: 89999,
    status: "processing",
    items: [
      {
        id: 4,
        name: "Designer Evening Gown",
        price: 89999,
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop",
        quantity: 1,
      },
    ],
    tracking: {
      number: "TRK456789123",
      carrier: "DHL Express",
      estimatedDelivery: "2024-03-01",
      updates: [{ date: "2024-02-24", status: "Order Processed", location: "Dubai, UAE" }],
    },
  },
]

const statusColors = {
  delivered: "bg-green-500",
  in_transit: "bg-blue-500",
  processing: "bg-yellow-500",
  cancelled: "bg-red-500",
}

const statusLabels = {
  delivered: "Delivered",
  in_transit: "In Transit",
  processing: "Processing",
  cancelled: "Cancelled",
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date_desc")

  const filteredOrders = orders
    .filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        return (
          order.id.toLowerCase().includes(searchLower) ||
          order.items.some((item) => item.name.toLowerCase().includes(searchLower))
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case "date_desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case "total_asc":
          return a.total - b.total
        case "total_desc":
          return b.total - a.total
        default:
          return 0
      }
    })

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="mt-2 text-muted-foreground">Track and manage your orders</p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="in_transit">In Transit</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:min-w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-fit gap-1">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">Sort by</span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="date_desc">Newest First</SelectItem>
                <SelectItem value="date_asc">Oldest First</SelectItem>
                <SelectItem value="total_desc">Highest Amount</SelectItem>
                <SelectItem value="total_asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <Package2 className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No orders found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Start shopping to see your orders here.</p>
              <Button asChild className="mt-4 bg-cherry-600 hover:bg-cherry-700">
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-lg border bg-white shadow-sm"
                >
                  {/* Order Header */}
                  <div className="border-b bg-muted/40 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-medium">Order #{order.id}</p>
                          <p className="text-xs text-muted-foreground">
                            Placed on {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={`${statusColors[order.status as keyof typeof statusColors]} text-white`}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Total</p>
                        <p className="text-lg font-bold text-cherry-600">KSh {order.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="divide-y">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4">
                        <div className="relative h-20 w-20 flex-none overflow-hidden rounded-md border bg-muted">
                          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                            </div>
                            <p className="text-sm font-medium">KSh {item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Tracking */}
                  <div className="border-t bg-muted/40 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">Tracking Number: {order.tracking.number}</p>
                        <p className="text-xs text-muted-foreground">Carrier: {order.tracking.carrier}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/track-order?id=${order.id}`}>Track Order</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-cherry-200 text-cherry-600 hover:bg-cherry-50 hover:text-cherry-700"
                        >
                          Need Help?
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processing">{/* Similar content structure for processing orders */}</TabsContent>

        <TabsContent value="in_transit">{/* Similar content structure for in-transit orders */}</TabsContent>

        <TabsContent value="delivered">{/* Similar content structure for delivered orders */}</TabsContent>
      </Tabs>
    </div>
  )
}

