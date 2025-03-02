"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Package, Search, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

// Mock tracking data
const mockTracking = {
  orderNumber: "ORD-2024-001",
  status: "in_transit",
  estimatedDelivery: "February 28, 2024",
  carrier: "DHL Express",
  trackingNumber: "TRK123456789",
  updates: [
    {
      date: "2024-02-26 14:30",
      status: "Package in transit",
      location: "Nairobi, Kenya",
      description: "Package is out for delivery",
    },
    {
      date: "2024-02-25 10:15",
      status: "Arrived at sorting facility",
      location: "Mombasa, Kenya",
      description: "Package has arrived at local facility",
    },
    {
      date: "2024-02-24 08:00",
      status: "Package shipped",
      location: "Dubai, UAE",
      description: "Package has left origin facility",
    },
    {
      date: "2024-02-23 15:45",
      status: "Order processed",
      location: "Dubai, UAE",
      description: "Order has been processed and packed",
    },
  ],
  order: {
    items: [
      {
        name: "Diamond Tennis Bracelet",
        price: 149999,
        image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300&h=300&fit=crop",
      },
    ],
  },
}

export default function TrackOrderPage() {
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackingResult, setTrackingResult] = useState<typeof mockTracking | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setTrackingResult(mockTracking)
    } catch (err) {
      setError("Failed to fetch tracking information. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Track Your Order</h1>
          <p className="mt-2 text-muted-foreground">Enter your order or tracking number to get real-time updates</p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleTrackOrder} className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter order or tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                type="submit"
                className="bg-cherry-600 hover:bg-cherry-700"
                disabled={!trackingNumber || isLoading}
              >
                {isLoading ? "Tracking..." : "Track Order"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </motion.div>
        )}

        {trackingResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Order #{trackingResult.orderNumber}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <Image
                        src={trackingResult.order.items[0].image || "/placeholder.svg"}
                        alt={trackingResult.order.items[0].name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{trackingResult.order.items[0].name}</h3>
                      <p className="text-sm text-muted-foreground">
                        KSh {trackingResult.order.items[0].price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-medium">Carrier</p>
                      <p className="text-sm text-muted-foreground">{trackingResult.carrier}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tracking Number</p>
                      <p className="text-sm text-muted-foreground">{trackingResult.trackingNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Estimated Delivery</p>
                      <p className="text-sm text-muted-foreground">{trackingResult.estimatedDelivery}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-8">
                  {/* Progress Line */}
                  <div className="absolute left-[27px] top-0 h-full w-px bg-muted" />

                  {trackingResult.updates.map((update, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative flex gap-6"
                    >
                      <div
                        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                          index === 0 ? "border-green-500 bg-green-50 text-green-600" : "border-muted bg-background"
                        }`}
                      >
                        {index === 0 ? (
                          <Truck className="h-6 w-6" />
                        ) : index === trackingResult.updates.length - 1 ? (
                          <Package className="h-6 w-6" />
                        ) : (
                          <Clock className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className="font-medium">{update.status}</h3>
                        <p className="text-sm text-muted-foreground">{update.description}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{update.location}</span>
                          <span>•</span>
                          <span>{new Date(update.date).toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>We're here to assist you with your delivery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-cherry-50 p-3">
                      <CheckCircle className="h-6 w-6 text-cherry-600" />
                    </div>
                    <div>
                      <p className="font-medium">Delivery Protection</p>
                      <p className="text-sm text-muted-foreground">Your package is insured and protected</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="border-cherry-200 text-cherry-600 hover:bg-cherry-50 hover:text-cherry-700"
                  >
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

