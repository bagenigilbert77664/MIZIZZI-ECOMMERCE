"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, ShoppingBag, Receipt } from "lucide-react"
import paymentService, { type Transaction } from "@/services/payment-service"

export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/payments/" + params.id)
      return
    }

    fetchTransactionDetails()
  }, [isAuthenticated, router, params.id])

  const fetchTransactionDetails = async () => {
    setLoading(true)
    try {
      const transaction = await paymentService.getTransaction(Number.parseInt(params.id))
      if (transaction) {
        setTransaction(transaction)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch transaction details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching transaction details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch transaction details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-800">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-800">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Pending
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-800">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-800">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {status}
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Separator />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Not Found</h1>
            <p className="text-gray-600 mt-1">
              The transaction you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium">Transaction not found</h3>
              <p className="mt-2 text-gray-500">Please check the transaction ID and try again.</p>
              <Button className="mt-4 bg-cherry-800" onClick={() => router.push("/payments")}>
                View All Transactions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container px-4 md:px-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
          <p className="text-gray-600 mt-1">View details of your transaction</p>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payment Information</CardTitle>
              <CardDescription>Details about this payment</CardDescription>
            </div>
            {getStatusBadge(transaction.status)}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Method</p>
                <p className="text-base font-medium">{transaction.payment_method}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Amount</p>
                <p className="text-xl font-semibold text-cherry-800">{formatCurrency(transaction.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Reference</p>
                <p className="text-base">{transaction.reference}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="text-base">{formatDate(transaction.created_at)}</p>
              </div>

              {transaction.transaction_data?.provider === "mpesa" && transaction.transaction_data?.mpesa_code && (
                <div>
                  <p className="text-sm font-medium text-gray-500">M-PESA Code</p>
                  <p className="text-base font-mono font-medium">{transaction.transaction_data.mpesa_code}</p>
                </div>
              )}

              {transaction.transaction_data?.provider === "mpesa" && transaction.transaction_data?.formatted_date && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Transaction Date</p>
                  <p className="text-base">{transaction.transaction_data.formatted_date}</p>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-gray-500">Order Information</p>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <p className="text-base font-medium">Order #{transaction.order_number}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/orders/${transaction.order_id}`)}
                  className="text-cherry-800 border-cherry-800"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  View Order
                </Button>
              </div>
            </div>

            {transaction.completed_at && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed At</p>
                  <p className="text-base">{formatDate(transaction.completed_at)}</p>
                </div>
              </>
            )}

            {transaction.transaction_data && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Transaction Details</p>
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                      {JSON.stringify(transaction.transaction_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button variant="outline" onClick={() => router.push("/payments")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" className="text-cherry-800 border-cherry-800">
              <Receipt className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
            {transaction.status === "pending" && (
              <Button className="bg-cherry-800">
                <CheckCircle className="mr-2 h-4 w-4" />
                Check Status
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
