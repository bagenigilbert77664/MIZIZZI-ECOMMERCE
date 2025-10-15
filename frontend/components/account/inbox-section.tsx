"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { Card } from "@/components/ui/card"
import { Package, Truck, CheckCircle, XCircle, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface InboxMessage {
  id: string
  date: string
  title: string
  description: string
  orderId: string
  productImage?: string
  productName?: string
  type: "delivery" | "shipped" | "cancelled" | "pending"
}

export function InboxSection() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInboxMessages = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        if (response.ok) {
          const orders = await response.json()

          // Generate inbox messages from orders
          const inboxMessages: InboxMessage[] = []

          orders.forEach((order: any) => {
            const orderDate = new Date(order.created_at).toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
            })

            // Get first product image and name
            const firstItem = order.items?.[0]
            const productImage = firstItem?.product?.images?.[0]
            const productName = firstItem?.product?.name

            // Create message based on order status
            if (order.status === "DELIVERED") {
              inboxMessages.push({
                id: `${order.id}-delivered`,
                date: orderDate,
                title: "Package delivered!",
                description: `Package# ${order.order_number} is delivered. You can rate your product to let other people know about it. Not happy? You can return it within 7 days from now! Thank you for shopping with us!`,
                orderId: order.id,
                productImage,
                productName,
                type: "delivery",
              })
            } else if (order.status === "SHIPPED") {
              inboxMessages.push({
                id: `${order.id}-shipped`,
                date: orderDate,
                title: "Shipped",
                description: `Item(s) from your order ${order.order_number} have been shipped and are expected to be delivered soon. Please note that you can pay via M-Pesa, Airtel, or by Bank card at the time of delivery; simply inform your delivery agent. Thank you!`,
                orderId: order.id,
                productImage,
                productName,
                type: "shipped",
              })
            } else if (order.status === "OUT_FOR_DELIVERY") {
              inboxMessages.push({
                id: `${order.id}-out`,
                date: orderDate,
                title: "Arriving Today!",
                description: `Great (ed. 07:17:156023) will deliver your package ${order.order_number} today. Please note that you can choose to pay the amount of Ksh ${order.total_amount} by Jumia Pay (M-Pesa, Airtel or Bank Cards) at the time of delivery; simply inform your delivery agent. Thank you!`,
                orderId: order.id,
                productImage,
                productName,
                type: "delivery",
              })
            } else if (order.status === "CANCELLED") {
              inboxMessages.push({
                id: `${order.id}-cancelled`,
                date: orderDate,
                title: "Order Cancelled",
                description: `Your order ${order.order_number} has been cancelled. If you have any questions, please contact our customer support team.`,
                orderId: order.id,
                productImage,
                productName,
                type: "cancelled",
              })
            } else if (order.status === "PENDING") {
              inboxMessages.push({
                id: `${order.id}-pending`,
                date: orderDate,
                title: "Order Confirmation Pending",
                description: `Your order ${order.order_number} is being processed. We will notify you once it has been confirmed and shipped.`,
                orderId: order.id,
                productImage,
                productName,
                type: "pending",
              })
            }
          })

          // Sort by date (most recent first)
          inboxMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

          setMessages(inboxMessages)
        }
      } catch (error) {
        console.error("Error fetching inbox messages:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInboxMessages()
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case "delivery":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "shipped":
        return <Truck className="h-5 w-5 text-blue-600" />
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "pending":
        return <Clock className="h-5 w-5 text-orange-600" />
      default:
        return <Package className="h-5 w-5 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No messages yet</h3>
        <p className="text-gray-500 text-sm">You'll receive notifications about your orders here</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card key={message.id} className="p-4 hover:shadow-md transition-shadow border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm text-gray-500">{message.date}</span>
            <Link
              href={`/account?tab=order-details&id=${message.orderId}`}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              See Details
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-2">
            {getIcon(message.type)}
            <h3 className="font-semibold text-gray-900">{message.title}</h3>
          </div>

          <p className="text-sm text-gray-600 mb-3 leading-relaxed">{message.description}</p>

          {message.productImage && message.productName && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={message.productImage || "/placeholder.svg"}
                  alt={message.productName}
                  fill
                  className="object-cover rounded"
                />
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{message.productName}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
