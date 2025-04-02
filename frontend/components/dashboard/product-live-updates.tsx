"use client"

import { useState, useEffect } from "react"
import { Package, ArrowRight, Bell } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { websocketService } from "@/services/websocket"
import { notificationService } from "@/services/notification"
import type { Notification } from "@/types/notification"

export function ProductLiveUpdates() {
  const [updates, setUpdates] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load initial product updates
    const loadUpdates = async () => {
      setIsLoading(true)
      try {
        const notifications = await notificationService.getUserNotifications()
        // Filter for product-related notifications
        const productUpdates = notifications.filter(
          (n) =>
            n.type === "product" ||
            n.type === "product_update" ||
            n.type === "price_change" ||
            n.type === "stock_alert",
        )
        setUpdates(productUpdates.slice(0, 5)) // Show only the 5 most recent
      } catch (error) {
        console.error("Error loading product updates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUpdates()

    // Subscribe to real-time product updates
    const unsubscribe = websocketService.subscribe("product_updated", (data) => {
      // Create a notification-like object from the product update
      const update: Notification = {
        id: `update_${Date.now()}`,
        type: "product_update",
        title: `${data.name} Updated`,
        description: `The product "${data.name}" has been updated.`,
        image: data.image_url || data.thumbnail_url || "/placeholder.svg?height=96&width=96",
        timestamp: "Just now",
        read: false,
        priority: "medium",
        link: `/product/${data.id}`,
      }

      // Add to the beginning of the list
      setUpdates((prev) => [update, ...prev.slice(0, 4)])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Product Updates</CardTitle>
            <CardDescription>Real-time updates from our store</CardDescription>
          </div>
          <Badge variant="outline" className="font-normal">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[200px]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : updates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No product updates yet</p>
            <p className="text-xs text-muted-foreground mt-1">Updates will appear here in real-time</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px] pr-4">
            <AnimatePresence mode="popLayout">
              {updates.map((update) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-3 mb-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={update.image || "/placeholder.svg?height=96&width=96"}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{update.title}</p>
                      {!update.read && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{update.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-muted-foreground">{update.timestamp}</span>
                      {update.link && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                          <Link href={update.link}>
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}

        <div className="mt-4 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/notifications">
              <Bell className="mr-2 h-4 w-4" />
              View All Notifications
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

