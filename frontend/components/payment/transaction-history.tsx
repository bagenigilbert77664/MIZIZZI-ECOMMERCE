"use client"

import { useState, useEffect, type Dispatch, type SetStateAction } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, CreditCard, Calendar, Clock, ExternalLink, Search, RefreshCw } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import api from "@/lib/api"
import Link from "next/link"

interface Transaction {
  id: string
  order_id: string
  merchant_reference: string
  amount: number
  currency: string
  email: string
  status: string
  description: string
  payment_method?: string
  card_type?: string
  last_four_digits?: string
  receipt_number?: string
  transaction_date?: string
  created_at: string
  expires_at?: string
  status_message?: string
}

export interface TransactionHistoryProps {
  transactions?: Transaction[]
  loading?: boolean
  totalPages?: number
  page?: number
  setPage?: Dispatch<SetStateAction<number>>
  selectedStatus?: string | undefined
  setSelectedStatus?: Dispatch<SetStateAction<string | undefined>>
}

export function TransactionHistory({
  transactions: externalTransactions,
  loading: externalLoading,
  totalPages,
  page,
  setPage,
  selectedStatus: externalStatus,
  setSelectedStatus,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
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

  // Fetch transactions only if not controlled externally
  useEffect(() => {
    if (!isControlled) {
      const fetchTransactions = async () => {
        try {
          setLoading(true)
          setError(null)

          const response = await api.get("/api/pesapal/transactions")

          if (response.data.status === "success") {
            setTransactions(response.data.transactions || [])
          } else {
            throw new Error("Failed to fetch transactions")
          }
        } catch (err: any) {
          console.error("Error fetching transactions:", err)
          setError(err.message || "Failed to fetch transactions")

          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load transaction history. Please try again.",
          })
        } finally {
          setLoading(false)
        }
      }

      fetchTransactions()
    }
  }, [isControlled, toast])

  // Filter transactions based on active tab and search query
  const filteredTransactions = currentTransactions.filter((transaction) => {
    // Filter by status
    if (activeTab !== "all" && transaction.status !== activeTab) {
      return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        transaction.merchant_reference?.toLowerCase().includes(query) ||
        transaction.payment_method?.toLowerCase().includes(query) ||
        transaction.receipt_number?.toLowerCase().includes(query) ||
        transaction.order_id?.toLowerCase().includes(query) ||
        transaction.email?.toLowerCase().includes(query)
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
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
      case "failed":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "cancelled":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  // View receipt
  const viewReceipt = (transaction: Transaction) => {
    if (transaction.receipt_number) {
      window.open(`/receipts/${transaction.receipt_number}`, "_blank")
    } else {
      toast({
        variant: "destructive",
        title: "Receipt Unavailable",
        description: "Receipt is not available for this transaction.",
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Payment History</CardTitle>
        <CardDescription>View and manage your payment transactions</CardDescription>
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
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            {renderTransactionList(filteredTransactions)}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
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

        {/* Pagination if controlled externally */}
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
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )
    }

    if (transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? "No transactions match your search criteria"
              : activeTab !== "all"
                ? `You don't have any ${activeTab} transactions yet`
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
          <div key={transaction.id} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
                    {transaction.payment_method || "Card Payment"}
                    {transaction.card_type && ` - ${transaction.card_type}`}
                  </h3>
                  <Badge className={getStatusColor(transaction.status)}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{transaction.merchant_reference}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  {formatPrice(transaction.amount)} {transaction.currency}
                </p>
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
                {/* Email */}
                {transaction.email && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                    <p className="text-sm">{transaction.email}</p>
                  </div>
                )}

                {/* Receipt number */}
                {transaction.receipt_number && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Receipt Number</p>
                    <p className="text-sm">{transaction.receipt_number}</p>
                  </div>
                )}

                {/* Order ID */}
                {transaction.order_id && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Order</p>
                    <Link
                      href={`/orders/${transaction.order_id}`}
                      className="text-sm font-medium text-primary hover:underline flex items-center"
                    >
                      {transaction.order_id}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </div>
                )}

                {/* Card details */}
                {transaction.last_four_digits && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Card</p>
                    <p className="text-sm">**** **** **** {transaction.last_four_digits}</p>
                  </div>
                )}

                {/* Transaction date */}
                {transaction.transaction_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Completed At</p>
                    <p className="text-sm">
                      {formatDate(transaction.transaction_date)} {formatTime(transaction.transaction_date)}
                    </p>
                  </div>
                )}

                {/* Description */}
                {transaction.description && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                    <p className="text-sm">{transaction.description}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {transaction.order_id && (
                  <Button variant="outline" size="sm" className="text-xs h-8 bg-transparent" asChild>
                    <Link href={`/orders/${transaction.order_id}`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Order
                    </Link>
                  </Button>
                )}

                {transaction.status === "failed" && transaction.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
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
