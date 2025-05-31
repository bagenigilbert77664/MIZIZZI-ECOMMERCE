"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  ExternalLink,
  Phone,
  Calendar,
  DollarSign,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import mpesaService from "@/services/mpesa-service"
import { formatDistanceToNow } from "date-fns"

interface PaymentStatusTrackerProps {
  transactionId?: string
  checkoutRequestId?: string
  onStatusChange?: (status: string) => void
  autoRefresh?: boolean
  refreshInterval?: number
}

interface TransactionStatus {
  id: string
  status: string
  amount: number
  phone_number: string
  created_at: string
  updated_at: string
  result_code?: number
  result_desc?: string
  mpesa_receipt_number?: string
  transaction_date?: string
  checkout_request_id?: string
  merchant_request_id?: string
}

export function PaymentStatusTracker({
  transactionId,
  checkoutRequestId,
  onStatusChange,
  autoRefresh = false,
  refreshInterval = 5000,
}: PaymentStatusTrackerProps) {
  const [transaction, setTransaction] = useState<TransactionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const { toast } = useToast()

  // Fetch transaction status
  const fetchTransactionStatus = async (showLoading = true) => {
    if (!transactionId && !checkoutRequestId) {
      setError("No transaction ID or checkout request ID provided")
      setIsLoading(false)
      return
    }

    try {
      if (showLoading) {
        setIsRefreshing(true)
      }
      setError(null)

      let response

      if (transactionId) {
        response = await mpesaService.verifyPayment(transactionId)
      } else if (checkoutRequestId) {
        response = await mpesaService.checkPaymentStatus({
          checkout_request_id: checkoutRequestId,
        })
      }

      if (response?.success && response.response) {
        const statusData: TransactionStatus = {
          id: transactionId || checkoutRequestId || "",
          status: getStatusFromResultCode(response.response.ResultCode),
          amount: response.response.Amount || 0,
          phone_number: response.response.PhoneNumber || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          result_code: response.response.ResultCode,
          result_desc: response.response.ResultDesc,
          mpesa_receipt_number: response.response.MpesaReceiptNumber,
          transaction_date: response.response.TransactionDate
            ? new Date(response.response.TransactionDate * 1000).toISOString()
            : undefined,
          checkout_request_id: checkoutRequestId,
        }

        setTransaction(statusData)
        setLastChecked(new Date())

        // Notify parent component of status change
        if (onStatusChange) {
          onStatusChange(statusData.status)
        }

        // Show toast for status changes
        if (statusData.status === "completed" && transaction?.status !== "completed") {
          toast({
            title: "Payment Confirmed",
            description: "Your M-PESA payment has been successfully processed.",
          })
        } else if (statusData.status === "failed" && transaction?.status !== "failed") {
          toast({
            title: "Payment Failed",
            description: statusData.result_desc || "Payment could not be processed.",
            variant: "destructive",
          })
        }
      } else {
        throw new Error(response?.error || "Failed to fetch transaction status")
      }
    } catch (err: any) {
      console.error("Error fetching transaction status:", err)
      setError(err.message || "Failed to fetch transaction status")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Convert M-PESA result code to status
  const getStatusFromResultCode = (resultCode: number): string => {
    switch (resultCode) {
      case 0:
        return "completed"
      case 1032:
        return "cancelled"
      case 1037:
        return "timeout"
      case 1:
        return "pending"
      default:
        return "failed"
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "failed":
      case "cancelled":
      case "timeout":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            {status === "cancelled" ? "Cancelled" : status === "timeout" ? "Timeout" : "Failed"}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        )
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("254")) {
      return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`
    }
    return phone
  }

  // Manual refresh
  const handleRefresh = () => {
    fetchTransactionStatus(true)
  }

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh && transaction?.status === "pending") {
      const interval = setInterval(() => {
        fetchTransactionStatus(false)
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, transaction?.status])

  // Initial fetch
  useEffect(() => {
    fetchTransactionStatus(true)
  }, [transactionId, checkoutRequestId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} variant="outline" className="mt-4 w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!transaction) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No transaction data found.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Payment Status</CardTitle>
          <CardDescription>Track your M-PESA payment progress</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(transaction.status)}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 w-8 p-0">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Transaction Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <DollarSign className="w-4 h-4 mr-2" />
              Amount
            </div>
            <div className="font-semibold text-lg">{formatCurrency(transaction.amount)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-500">
              <Phone className="w-4 h-4 mr-2" />
              Phone Number
            </div>
            <div className="font-medium">{formatPhoneNumber(transaction.phone_number)}</div>
          </div>

          {transaction.mpesa_receipt_number && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center text-sm text-gray-500">
                <Eye className="w-4 h-4 mr-2" />
                M-PESA Receipt Number
              </div>
              <div className="font-mono text-sm bg-gray-50 p-2 rounded border">{transaction.mpesa_receipt_number}</div>
            </div>
          )}

          {transaction.transaction_date && (
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Transaction Date
              </div>
              <div className="text-sm">
                {new Date(transaction.transaction_date).toLocaleString("en-KE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          )}

          {lastChecked && (
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 mr-2" />
                Last Checked
              </div>
              <div className="text-sm">{formatDistanceToNow(lastChecked, { addSuffix: true })}</div>
            </div>
          )}
        </div>

        {/* Status Description */}
        {transaction.result_desc && (
          <div className="space-y-2">
            <div className="text-sm text-gray-500">Status Description</div>
            <div className="text-sm bg-gray-50 p-3 rounded border">{transaction.result_desc}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          {transaction.status === "pending" && (
            <Button onClick={handleRefresh} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          )}

          {transaction.status === "completed" && transaction.mpesa_receipt_number && (
            <>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button variant="outline" className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </>
          )}
        </div>

        {/* Auto-refresh indicator */}
        {autoRefresh && transaction.status === "pending" && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Auto-refreshing every {refreshInterval / 1000} seconds while payment is pending...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default PaymentStatusTracker
