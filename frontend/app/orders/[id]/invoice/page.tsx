"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { orderService } from "@/services/orders"
import type { Order } from "@/types"
import { formatDate } from "@/lib/utils"

function InvoiceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="mt-6 md:mt-0 md:text-right">
              <Skeleton className="h-6 w-24 mb-2 ml-auto" />
              <Skeleton className="h-4 w-40 mb-1 ml-auto" />
              <Skeleton className="h-4 w-36 mb-1 ml-auto" />
              <Skeleton className="h-4 w-32 mb-1 ml-auto" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </div>

          <div className="mb-8">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-12 py-2 border-b">
              <Skeleton className="h-4 w-16 col-span-6" />
              <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
              <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
              <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 py-3 border-b">
                <Skeleton className="h-4 w-32 col-span-6" />
                <Skeleton className="h-4 w-8 col-span-2 ml-auto" />
                <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
                <Skeleton className="h-4 w-16 col-span-2 ml-auto" />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between py-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-4 w-32 mb-4" />

            <div className="mt-6">
              <Skeleton className="h-4 w-40 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const data = await orderService.getOrderById(params.id)
        setOrder(data)
      } catch (err: any) {
        console.error("Failed to fetch order:", err)
        setError(err.message || "Failed to load order details")
        toast({
          title: "Error",
          description: "Could not load invoice. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [params.id, toast])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // In a real application, you would generate a PDF here
    // For now, we'll just show a toast
    toast({
      title: "PDF Download",
      description: "Invoice PDF download started.",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <InvoiceSkeleton />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-1">Invoice not found</h3>
          <p className="text-muted-foreground mb-4">
            The invoice you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Generate invoice number if not available
  const invoiceNumber = `INV-${order.id}-001`

  // Company information - replace with your actual company info
  const companyInfo = {
    name: "Your Store Name",
    address: "123 Commerce St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    country: "USA",
    email: "support@yourstore.com",
    phone: "+1 (555) 123-4567",
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Invoice #{invoiceNumber}</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orders/${order.id}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Order
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold mb-1">{companyInfo.name}</h2>
                <p className="text-sm">{companyInfo.address}</p>
                <p className="text-sm">
                  {companyInfo.city}, {companyInfo.state} {companyInfo.zipCode}
                </p>
                <p className="text-sm">{companyInfo.country}</p>
                <p className="text-sm mt-2">{companyInfo.email}</p>
                <p className="text-sm">{companyInfo.phone}</p>
              </div>
              <div className="mt-6 md:mt-0 md:text-right">
                <h3 className="text-lg font-semibold mb-1">Invoice</h3>
                <p className="text-sm">
                  <span className="font-medium">Invoice Number:</span> {invoiceNumber}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Order Number:</span> {order.order_number}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Date:</span> {formatDate(order.created_at)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Due Date:</span> {formatDate(order.created_at)}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
              <p className="text-sm font-medium">{order.billing_address.name}</p>
              <p className="text-sm">{order.billing_address.street}</p>
              <p className="text-sm">
                {order.billing_address.city}, {order.billing_address.state} {order.billing_address.zipCode}
              </p>
              <p className="text-sm">{order.billing_address.country}</p>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-12 font-medium text-sm py-2 border-b">
                <div className="col-span-6">Item</div>
                <div className="col-span-2 text-right">Quantity</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 text-sm py-3 border-b">
                  <div className="col-span-6">
                    {item.product?.name || item.product_name || item.name || `Product #${item.product_id}`}
                    {item.variation && Object.keys(item.variation).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.entries(item.variation)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-right">{item.quantity}</div>
                  <div className="col-span-2 text-right">${item.price.toFixed(2)}</div>
                  <div className="col-span-2 text-right">${(item.quantity * item.price).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-sm py-2">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span>Shipping</span>
                  <span>{order.shipping === 0 ? "Free" : `$${order.shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span>Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium py-2">
                  <span>Total</span>
                  <span>${(order.total_amount || order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
              <p className="text-sm">Payment Method: {order.payment_method}</p>
              <p className="text-sm mt-4">
                Payment Status: <span className="text-green-600 font-medium">Paid</span>
              </p>

              <div className="mt-6">
                <p className="text-sm font-medium">Thank you for your business!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If you have any questions about this invoice, please contact our customer support.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
