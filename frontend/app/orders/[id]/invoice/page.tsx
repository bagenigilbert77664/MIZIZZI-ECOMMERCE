"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { orderService } from "@/services/orders"
import { useAuth } from "@/contexts/auth/auth-context"
import { AlertCircle, Download, FileText, Printer } from "lucide-react"

export default function OrderInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderId = params.id as string

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/orders")
      return
    }

    if (isAuthenticated && orderId) {
      fetchOrderDetails()
    }
  }, [isAuthenticated, authLoading, orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const data = await orderService.getOrderById(orderId)
      setOrder(data)
    } catch (err: any) {
      console.error("Failed to fetch order details:", err)
      setError(err.message || "Failed to load order details")
      toast({
        title: "Error",
        description: "Could not load the order details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadInvoice = async () => {
    try {
      const blob = await orderService.getOrderInvoice(orderId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${order.order_number}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Failed to download invoice:", err)
      toast({
        title: "Error",
        description: "Could not download the invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading || authLoading) {
    return (
      <div className="container max-w-4xl py-12">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-6 text-gray-600">Loading your invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container max-w-4xl py-12">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "We couldn't find the order you're looking for. Please check the order ID and try again."}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button asChild variant="outline">
            <Link href="/orders">Return to Orders</Link>
          </Button>
        </div>
      </div>
    )
  }

  const {
    order_number,
    status,
    created_at,
    items,
    shipping_address,
    billing_address,
    payment_method,
    shipping_method,
    subtotal_amount,
    shipping_amount,
    tax_amount,
    total_amount,
    discount_amount,
  } = order

  return (
    <div className="bg-white py-8">
      <div className="container max-w-4xl">
        {/* Print Control Buttons - Hidden when printing */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href={`/orders/${orderId}`}>Back to Order Details</Link>
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={downloadInvoice}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button className="flex items-center gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white border border-gray-200 shadow-sm p-8 print:border-0 print:shadow-none print:p-0">
          {/* Invoice Header */}
          <div className="flex flex-col md:flex-row justify-between mb-12">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">INVOICE</h1>
              <p className="text-gray-500">#{order_number}</p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-gray-800">MIZIZZI</h2>
              </div>
              <p className="text-gray-500">mizizzi.com</p>
              <p className="text-gray-500">support@mizizzi.com</p>
              <p className="text-gray-500">+254 700 000000</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-sm font-medium uppercase text-gray-500 mb-3">Bill To</h3>
              <p className="font-medium text-gray-800">
                {billing_address.first_name} {billing_address.last_name}
              </p>
              <p className="text-gray-600">{billing_address.email}</p>
              <p className="text-gray-600">{billing_address.phone}</p>
              <p className="text-gray-600 mt-2">{billing_address.address_line1}</p>
              {billing_address.address_line2 && <p className="text-gray-600">{billing_address.address_line2}</p>}
              <p className="text-gray-600">
                {billing_address.city}, {billing_address.state} {billing_address.postal_code}
              </p>
              <p className="text-gray-600">{billing_address.country}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium uppercase text-gray-500 mb-3">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <p className="text-gray-500">Invoice Date:</p>
                <p className="text-gray-800">{formatDate(created_at)}</p>

                <p className="text-gray-500">Order Date:</p>
                <p className="text-gray-800">{formatDate(created_at)}</p>

                <p className="text-gray-500">Payment Method:</p>
                <p className="text-gray-800">
                  {payment_method === "cash_on_delivery"
                    ? "Cash on Delivery"
                    : payment_method === "credit-card"
                      ? "Credit Card"
                      : payment_method}
                </p>

                <p className="text-gray-500">Order Status:</p>
                <p className="text-gray-800">{status}</p>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-10">
            <h3 className="text-sm font-medium uppercase text-gray-500 mb-3">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-2 border-y border-gray-200 text-gray-500 font-medium text-sm">Item</th>
                    <th className="px-4 py-2 border-y border-gray-200 text-gray-500 font-medium text-sm">Quantity</th>
                    <th className="px-4 py-2 border-y border-gray-200 text-gray-500 font-medium text-sm">Unit Price</th>
                    <th className="px-4 py-2 border-y border-gray-200 text-gray-500 font-medium text-sm text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-4 border-b border-gray-200">
                        <p className="font-medium text-gray-800">{item.product.name}</p>
                        {item.product.variation && Object.keys(item.product.variation).length > 0 && (
                          <p className="text-sm text-gray-500">
                            {Object.entries(item.product.variation)
                              .map(([key, value]) => `${key}: ${String(value)}`)
                              .join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 border-b border-gray-200 text-gray-800">{item.quantity}</td>
                      <td className="px-4 py-4 border-b border-gray-200 text-gray-800">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-4 border-b border-gray-200 text-gray-800 text-right">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="flex justify-end mb-10">
            <div className="w-full md:w-1/2">
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-gray-500">Subtotal:</p>
                  <p className="text-gray-800 text-right">{formatCurrency(subtotal_amount)}</p>

                  <p className="text-gray-500">Shipping:</p>
                  <p className="text-gray-800 text-right">{formatCurrency(shipping_amount)}</p>

                  {tax_amount > 0 && (
                    <>
                      <p className="text-gray-500">Tax:</p>
                      <p className="text-gray-800 text-right">{formatCurrency(tax_amount)}</p>
                    </>
                  )}

                  {discount_amount > 0 && (
                    <>
                      <p className="text-green-600">Discount:</p>
                      <p className="text-green-600 text-right">-{formatCurrency(discount_amount)}</p>
                    </>
                  )}

                  <p className="text-gray-800 font-medium text-base pt-2 border-t border-gray-200 mt-2">Total:</p>
                  <p className="text-primary font-bold text-base text-right pt-2 border-t border-gray-200 mt-2">
                    {formatCurrency(total_amount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Footer */}
          <div className="border-t border-gray-200 pt-6 text-center text-gray-500 text-sm">
            <p className="mb-2">Thank you for shopping with MIZIZZI.</p>
            <p>
              If you have any questions about this invoice, please contact our customer support at support@mizizzi.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

