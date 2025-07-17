"use client"

import { useState, useEffect, type Dispatch, type SetStateAction } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  CreditCard,
  Calendar,
  Clock,
  Download,
  Receipt,
  ExternalLink,
  Search,
  RefreshCw,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import mpesaService from "@/services/mpesa-service"
import Link from "next/link"

interface MpesaTransaction {
  id: number
  transaction_id: string
  checkout_request_id: string
  merchant_request_id: string
  phone_number: string
  amount: number
  account_reference: string
  transaction_desc: string
  status: "pending" | "completed" | "failed" | "cancelled"
  result_code?: number
  result_desc?: string
  mpesa_receipt_number?: string
  transaction_date?: string
  created_at: string
  updated_at: string
  order_id?: number
}

interface Transaction {
  id: number
  transaction_id: string | null
  amount: number
  currency: string
  payment_method: string
  status: string
  created_at: string
  completed_at?: string | null
  provider?: string
  provider_transaction_id?: string
  order?: {
    id: number
    order_number: string
    status: string
  }
  receipt_number?: string
  receipt_url?: string
  order_id?: number
  order_number?: string
  reference?: string
  transaction_data?: any
  phone_number?: string
  mpesa_receipt_number?: string
  result_desc?: string
}

export interface TransactionHistoryProps {
  transactions?: Transaction[]
  loading?: boolean
  totalPages?: number
  page?: number
  setPage?: Dispatch<SetStateAction<number>>
  selectedStatus?: string | undefined
  setSelectedStatus?: Dispatch<SetStateAction<string | undefined>>
  showMpesaOnly?: boolean
}

export function TransactionHistory({
  transactions: externalTransactions,
  loading: externalLoading,
  totalPages,
  page,
  setPage,
  selectedStatus: externalStatus,
  setSelectedStatus,
  showMpesaOnly = false,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [mpesaTransactions, setMpesaTransactions] = useState<MpesaTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalMpesaPages, setTotalMpesaPages] = useState(1)
  const { toast } = useToast()

  // Determine if we're using external state or internal state
  const isControlled = externalTransactions !== undefined
  const currentTransactions = isControlled ? externalTransactions : transactions
  const isLoading = isControlled ? (externalLoading !== undefined ? externalLoading : false) : loading

  // Sync activeTab with external selectedStatus if provided
  useEffect(() => {
    if (externalStatus !== undefined) {
      setActiveTab(externalStatus)
    }
  }, [externalStatus])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (setSelectedStatus) {
      setSelectedStatus(value)
    }
  }

  // Fetch M-PESA transactions
  const fetchMpesaTransactions = async (pageNum = 1) => {
    try {
      setLoading(true)
      setError(null)

      const response = await mpesaService.getTransactionHistory(pageNum, 10)

      if (response.success) {
        setMpesaTransactions(response.transactions || [])
        setTotalMpesaPages(response.pagination.pages)
      } else {
        throw new Error(response.error || "Failed to fetch M-PESA transactions")
      }
    } catch (err: any) {
      console.error("Error fetching M-PESA transactions:", err)
      setError(err.message || "Failed to fetch M-PESA transactions")

      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load M-PESA transaction history. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch regular transactions only if not controlled externally and not M-PESA only
  useEffect(() => {
    if (!isControlled && !showMpesaOnly) {
      const fetchTransactions = async () => {
        try {
          setLoading(true)
          setError(null)

          // This would be your regular transaction API call
          // For now, we'll just set empty array
          setTransactions([])
        } catch (err: any) {
          console.error("Error fetching transactions:", err)
          setError(err.message || "Failed to fetch transactions")
        } finally {
          setLoading(false)
        }
      }

      fetchTransactions()
    }
  }, [isControlled, showMpesaOnly])

  // Fetch M-PESA transactions
  useEffect(() => {
    fetchMpesaTransactions(currentPage)
  }, [currentPage])

  // Convert M-PESA transactions to Transaction format for unified display
  const convertMpesaToTransaction = (mpesaTx: MpesaTransaction): Transaction => ({
    id: mpesaTx.id,
    transaction_id: mpesaTx.transaction_id,
    amount: mpesaTx.amount,
    currency: "KES",
    payment_method: "M-PESA",
    status: mpesaTx.status === "completed" ? "paid" : mpesaTx.status,
    created_at: mpesaTx.created_at,
    completed_at: mpesaTx.status === "completed" ? mpesaTx.updated_at : null,
    provider: "Safaricom",
    provider_transaction_id: mpesaTx.mpesa_receipt_number,
    receipt_number: mpesaTx.mpesa_receipt_number,
    reference: mpesaTx.account_reference,
    phone_number: mpesaTx.phone_number,
    mpesa_receipt_number: mpesaTx.mpesa_receipt_number,
    result_desc: mpesaTx.result_desc,
    order_id: mpesaTx.order_id,
    transaction_data: {
      phone_number: mpesaTx.phone_number,
      receipt_number: mpesaTx.mpesa_receipt_number,
      checkout_request_id: mpesaTx.checkout_request_id,
      merchant_request_id: mpesaTx.merchant_request_id,
      transaction_desc: mpesaTx.transaction_desc,
      result_code: mpesaTx.result_code,
    },
  })

  // Combine transactions if showing both types
  const allTransactions = showMpesaOnly
    ? mpesaTransactions.map(convertMpesaToTransaction)
    : [...currentTransactions, ...mpesaTransactions.map(convertMpesaToTransaction)].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

  // Filter transactions based on active tab and search query
  const filteredTransactions = allTransactions.filter((transaction) => {
    // Filter by status
    if (activeTab !== "all" && transaction.status !== activeTab) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        transaction.transaction_id?.toLowerCase().includes(query) ||
        transaction.payment_method.toLowerCase().includes(query) ||
        (transaction.receipt_number && transaction.receipt_number.toLowerCase().includes(query)) ||
        (transaction.order?.order_number && transaction.order.order_number.toLowerCase().includes(query)) ||
        (transaction.phone_number && transaction.phone_number.includes(query)) ||
        (transaction.reference && transaction.reference.toLowerCase().includes(query))
      )
    }

    return true
  })

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "failed":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
      case "refunded":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  // View receipt
  const viewReceipt = (transaction: Transaction) => {
    if (transaction.receipt_url) {
      window.open(transaction.receipt_url, "_blank")
    } else {
      toast({
        variant: "destructive",
        title: "Receipt Unavailable",
        description: "Receipt is not available for this transaction.",
      })
    }
  }

  // Refresh transactions
  const refreshTransactions = () => {
    if (showMpesaOnly) {
      fetchMpesaTransactions(currentPage)
    } else {
      window.location.reload()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center">
              {showMpesaOnly && <Smartphone className="h-5 w-5 mr-2 text-green-600" />}
              {showMpesaOnly ? "M-PESA Transaction History" : "Payment History"}
            </CardTitle>
            <CardDescription>
              {showMpesaOnly ? "View your M-PESA payment transactions" : "View and manage your payment transactions"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshTransactions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search and filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search transactions..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {renderTransactionList(filteredTransactions)}
          </TabsContent>

          <TabsContent value="paid" className="mt-0">
            {renderTransactionList(filteredTransactions)}
          </TabsContent>

          <TabsContent value="pending" className="mt-0">
            {renderTransactionList(filteredTransactions)}
          </TabsContent>

          <TabsContent value="failed" className="mt-0">
            {renderTransactionList(filteredTransactions)}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0">
            {renderTransactionList(filteredTransactions)}
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {showMpesaOnly && totalMpesaPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || isLoading}
              >
                Previous
              </Button>
              <div className="flex items-center px-2">
                <span className="text-sm">
                  Page {currentPage} of {totalMpesaPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalMpesaPages, prev + 1))}
                disabled={currentPage >= totalMpesaPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* External pagination if controlled */}
        {isControlled && totalPages && totalPages > 1 && page !== undefined && setPage && (
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <div className="flex items-center px-2">
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Helper function to render transaction list
  function renderTransactionList(transactions: Transaction[]) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading transactions...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={refreshTransactions}>Retry</Button>
        </div>
      )
    }

    if (transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {showMpesaOnly ? (
            <Smartphone className="h-12 w-12 text-gray-300 mb-4" />
          ) : (
            <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? "No transactions match your search criteria"
              : activeTab !== "all"
                ? `You don't have any ${activeTab} transactions yet`
                : showMpesaOnly
                  ? "You haven't made any M-PESA payments yet"
                  : "You haven't made any payments yet"}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.transaction_id || `transaction-${transaction.id}`}
            className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="bg-gray-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {transaction.payment_method === "M-PESA" && <Smartphone className="h-4 w-4 text-green-600" />}
                    <h3 className="font-medium text-gray-900">{transaction.payment_method}</h3>
                  </div>
                  <Badge className={`${getStatusColor(transaction.status)} flex items-center gap-1`}>
                    {getStatusIcon(transaction.status)}
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {transaction.transaction_id || transaction.reference || `ID: ${transaction.id}`}
                </p>
                {transaction.phone_number && <p className="text-xs text-gray-400">Phone: {transaction.phone_number}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatPrice(transaction.amount)}</p>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(transaction.created_at)}
                  <Clock className="h-3 w-3 ml-2 mr-1" />
                  {formatTime(transaction.created_at)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* M-PESA Receipt Number */}
                {transaction.mpesa_receipt_number && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">M-PESA Receipt</p>
                    <p className="text-sm font-mono">{transaction.mpesa_receipt_number}</p>
                  </div>
                )}

                {/* Phone number */}
                {transaction.phone_number && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Phone Number</p>
                    <p className="text-sm">{transaction.phone_number}</p>
                  </div>
                )}

                {/* Reference */}
                {transaction.reference && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Reference</p>
                    <p className="text-sm">{transaction.reference}</p>
                  </div>
                )}

                {/* Order link */}
                {transaction.order && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Order</p>
                    <Link
                      href={`/orders/${transaction.order.id}`}
                      className="text-sm font-medium text-primary hover:underline flex items-center"
                    >
                      {transaction.order.order_number}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </div>
                )}

                {/* Completed date */}
                {transaction.completed_at && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Completed At</p>
                    <p className="text-sm">
                      {formatDate(transaction.completed_at)} {formatTime(transaction.completed_at)}
                    </p>
                  </div>
                )}

                {/* Result description for failed transactions */}
                {transaction.result_desc && transaction.status === "failed" && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Error Details</p>
                    <p className="text-sm text-red-600">{transaction.result_desc}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {transaction.receipt_url && (
                  <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => viewReceipt(transaction)}>
                    <Receipt className="h-3 w-3 mr-1" />
                    View Receipt
                  </Button>
                )}

                {transaction.status === "paid" && transaction.mpesa_receipt_number && (
                  <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => viewReceipt(transaction)}>
                    <Download className="h-3 w-3 mr-1" />
                    Download Receipt
                  </Button>
                )}

                {transaction.order && (
                  <Button variant="outline" size="sm" className="text-xs h-8" asChild>
                    <Link href={`/orders/${transaction.order.id}`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Order
                    </Link>
                  </Button>
                )}

                {/* Retry button for failed M-PESA transactions */}
                {transaction.status === "failed" &&
                  transaction.payment_method === "M-PESA" &&
                  transaction.phone_number && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        toast({
                          title: "Retry Payment",
                          description: "Please initiate a new payment to retry this transaction.",
                        })
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry Payment
                    </Button>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
}

export default TransactionHistory
