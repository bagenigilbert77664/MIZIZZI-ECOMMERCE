"use client"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { formatPrice } from "@/lib/utils"
import { Download, Printer, Share2, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PaymentReceiptProps {
  receipt: {
    receipt_number: string
    transaction_id: string
    date: string
    amount: number
    currency: string
    payment_method: string
    status: string
    provider?: string
    provider_transaction_id?: string
    provider_reference?: string
    order?: {
      id: number
      order_number: string
      status: string
    }
    user?: {
      id: number
      name: string
      email: string
      phone?: string
    }
    business_name: string
    business_address: string
    business_phone: string
    business_email: string
    business_website: string
    business_logo: string
  }
}

export function PaymentReceipt({ receipt }: PaymentReceiptProps) {
  const { toast } = useToast()

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  // Print receipt
  const printReceipt = () => {
    window.print()
  }

  // Download receipt
  const downloadReceipt = () => {
    // This is a placeholder - in a real app, you would generate a PDF
    toast({
      title: "Receipt Downloaded",
      description: "Your receipt has been downloaded successfully.",
    })
  }

  // Share receipt
  const shareReceipt = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payment Receipt ${receipt.receipt_number}`,
          text: `Payment receipt for ${formatPrice(receipt.amount)} paid via ${receipt.payment_method}`,
          url: window.location.href,
        })
      } catch (err) {
        console.error("Error sharing:", err)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link Copied",
        description: "Receipt link copied to clipboard.",
      })
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto print:shadow-none">
      <CardHeader className="text-center border-b print:border-b-black">
        <div className="flex justify-center mb-4">
          <img src={receipt.business_logo || "/placeholder.svg"} alt={receipt.business_name} className="h-12 w-auto" />
        </div>
        <CardTitle className="text-2xl font-bold">Payment Receipt</CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Receipt header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Receipt Number</p>
            <p className="font-bold">{receipt.receipt_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Date</p>
            <p>{formatDate(receipt.date)}</p>
          </div>
        </div>

        <Separator className="print:border-gray-300" />

        {/* Payment details */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Payment Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-bold text-lg">{formatPrice(receipt.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p>{receipt.payment_method}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Transaction ID</p>
              <p className="font-mono text-xs">{receipt.transaction_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="flex items-center">
                {getStatusIcon(receipt.status)}
                <span className="ml-1 capitalize">{receipt.status}</span>
              </div>
            </div>

            {receipt.provider && (
              <div>
                <p className="text-sm text-gray-500">Provider</p>
                <p className="capitalize">{receipt.provider}</p>
              </div>
            )}

            {receipt.provider_transaction_id && (
              <div>
                <p className="text-sm text-gray-500">Provider Reference</p>
                <p className="font-mono text-xs">{receipt.provider_transaction_id}</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="print:border-gray-300" />

        {/* Order details */}
        {receipt.order && (
          <>
            <div>
              <h3 className="font-semibold text-lg mb-3">Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p>{receipt.order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order Status</p>
                  <p className="capitalize">{receipt.order.status}</p>
                </div>
              </div>
            </div>

            <Separator className="print:border-gray-300" />
          </>
        )}

        {/* Customer details */}
        {receipt.user && (
          <>
            <div>
              <h3 className="font-semibold text-lg mb-3">Customer Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p>{receipt.user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{receipt.user.email}</p>
                </div>
                {receipt.user.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p>{receipt.user.phone}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator className="print:border-gray-300" />
          </>
        )}

        {/* Business details */}
        <div>
          <h3 className="font-semibold text-lg mb-3">Business Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-sm text-gray-500">Business Name</p>
              <p>{receipt.business_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p>{receipt.business_address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p>{receipt.business_phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p>{receipt.business_email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Website</p>
              <p>{receipt.business_website}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 justify-center border-t p-4 print:hidden">
        <Button variant="outline" onClick={printReceipt}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" onClick={downloadReceipt}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" onClick={shareReceipt}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </CardFooter>
    </Card>
  )
}

export default PaymentReceipt
