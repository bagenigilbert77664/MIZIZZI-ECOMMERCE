"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Download, Printer, Mail, Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InvoiceItem {
  id: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  total: number
  image?: string
}

interface InvoiceData {
  id: string
  invoiceNumber: string
  orderNumber: string
  date: string
  dueDate: string
  status: "paid" | "pending" | "overdue" | "cancelled"
  customer: {
    name: string
    email: string
    phone: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
  }
  items: InvoiceItem[]
  subtotal: number
  tax: number
  taxRate: number
  shipping: number
  discount: number
  total: number
  paymentMethod: string
  paymentStatus: string
  notes?: string
}

const mockInvoiceData: InvoiceData = {
  id: "3",
  invoiceNumber: "INV-2024-001003",
  orderNumber: "ORD-2024-001003",
  date: "2024-01-15",
  dueDate: "2024-01-30",
  status: "paid",
  customer: {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+254 712 345 678",
    address: {
      street: "123 Main Street",
      city: "Nairobi",
      state: "Nairobi County",
      zipCode: "00100",
      country: "Kenya",
    },
  },
  items: [
    {
      id: "1",
      name: "Premium Wireless Headphones",
      sku: "PWH-001",
      quantity: 1,
      unitPrice: 15000,
      total: 15000,
      image: "/placeholder.svg?height=60&width=60",
    },
    {
      id: "2",
      name: "Smartphone Case",
      sku: "SC-002",
      quantity: 2,
      unitPrice: 2500,
      total: 5000,
      image: "/placeholder.svg?height=60&width=60",
    },
  ],
  subtotal: 20000,
  tax: 3200,
  taxRate: 16,
  shipping: 500,
  discount: 1000,
  total: 22700,
  paymentMethod: "M-Pesa",
  paymentStatus: "Completed",
  notes: "Thank you for your business!",
}

const companyInfo = {
  name: "Mizizzi Store",
  address: "456 Business Avenue",
  city: "Nairobi, Kenya",
  phone: "+254 700 123 456",
  email: "info@mizizzistore.com",
  website: "www.mizizzistore.com",
  taxId: "KRA-TAX-123456789",
}

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const orderId = params?.id as string

  useEffect(() => {
    if (!orderId || isNaN(Number(orderId))) {
      setError("Invalid order ID")
      setLoading(false)
      return
    }

    // Simulate API call
    const fetchInvoice = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setInvoice(mockInvoiceData)
      } catch (err) {
        setError("Failed to load invoice")
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
  }, [orderId])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // In a real app, this would generate and download a PDF
    toast({
      title: "PDF Download",
      description: "Invoice PDF download started",
    })
  }

  const handleEmailInvoice = () => {
    // In a real app, this would send the invoice via email
    toast({
      title: "Email Sent",
      description: "Invoice has been sent to customer",
    })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Link Copied",
        description: "Invoice link copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "overdue":
        return "bg-red-100 text-red-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || "Invoice not found"}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Order
        </Button>

        <div className="flex gap-2">
          <Button onClick={handleCopyLink} variant="outline" size="sm">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button onClick={handleEmailInvoice} variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Content */}
      <Card ref={invoiceRef} className="print:shadow-none print:border-none">
        <CardContent className="p-8">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <div className="text-sm text-gray-600">
                <p>Invoice #: {invoice.invoiceNumber}</p>
                <p>Order #: {invoice.orderNumber}</p>
                <p>Date: {new Date(invoice.date).toLocaleDateString()}</p>
                <p>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{companyInfo.name}</h2>
              <div className="text-sm text-gray-600">
                <p>{companyInfo.address}</p>
                <p>{companyInfo.city}</p>
                <p>{companyInfo.phone}</p>
                <p>{companyInfo.email}</p>
                <p>Tax ID: {companyInfo.taxId}</p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge className={getStatusColor(invoice.status)}>{invoice.status.toUpperCase()}</Badge>
          </div>

          {/* Bill To Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">Bill To:</h3>
              <div className="text-sm">
                <p className="font-medium">{invoice.customer.name}</p>
                <p>{invoice.customer.email}</p>
                <p>{invoice.customer.phone}</p>
                <div className="mt-2">
                  <p>{invoice.customer.address.street}</p>
                  <p>
                    {invoice.customer.address.city}, {invoice.customer.address.state}
                  </p>
                  <p>{invoice.customer.address.zipCode}</p>
                  <p>{invoice.customer.address.country}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Payment Details:</h3>
              <div className="text-sm">
                <p>
                  <span className="font-medium">Method:</span> {invoice.paymentMethod}
                </p>
                <p>
                  <span className="font-medium">Status:</span> {invoice.paymentStatus}
                </p>
                <p>
                  <span className="font-medium">Total Amount:</span> {formatCurrency(invoice.total)}
                </p>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Items Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Item</th>
                    <th className="text-left py-2 px-2">SKU</th>
                    <th className="text-center py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Unit Price</th>
                    <th className="text-right py-2 px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{item.sku}</td>
                      <td className="py-3 px-2 text-center">{item.quantity}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-full max-w-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{formatCurrency(invoice.shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({invoice.taxRate}%):</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <p className="text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t pt-4">
            <p>Thank you for your business!</p>
            <p>For questions about this invoice, contact us at {companyInfo.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
