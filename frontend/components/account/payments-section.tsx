"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  CreditCard,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"
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

interface TransactionResponse {
  status: string
  transactions: Transaction[]
  pagination: {
    page: number
    pages: number
    per_page: number
    total: number
    has_next: boolean
    has_prev: boolean
  }
  summary: {
    total_amount: number
    completed_count: number
    pending_count: number
    failed_count: number
    cancelled_count: number
  }
}

export default function PaymentsSection() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get<TransactionResponse>("/api/pesapal/transactions")

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
        description: "Failed to load payment history. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter transactions based on active filter and search query
  const filteredTransactions = transactions.filter((transaction) => {
    // Filter by status
    if (activeFilter !== "all" && transaction.status !== activeFilter) {
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
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
      case "cancelled":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-800">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Cancelled
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-800">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cherry-800 mb-4" />
        <p className="text-gray-500">Loading payment history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchTransactions} className="bg-cherry-800 hover:bg-cherry-900">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
        <p className="text-gray-600 mt-1">View all your payment transactions</p>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by transaction ID, payment method, or receipt number..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
          className={activeFilter === "all" ? "bg-cherry-800 hover:bg-cherry-900" : ""}
        >
          All
        </Button>
        <Button
          variant={activeFilter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("completed")}
          className={activeFilter === "completed" ? "bg-cherry-800 hover:bg-cherry-900" : ""}
        >
          Completed
        </Button>
        <Button
          variant={activeFilter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("pending")}
          className={activeFilter === "pending" ? "bg-cherry-800 hover:bg-cherry-900" : ""}
        >
          Pending
        </Button>
        <Button
          variant={activeFilter === "failed" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("failed")}
          className={activeFilter === "failed" ? "bg-cherry-800 hover:bg-cherry-900" : ""}
        >
          Failed
        </Button>
        <Button
          variant={activeFilter === "cancelled" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("cancelled")}
          className={activeFilter === "cancelled" ? "bg-cherry-800 hover:bg-cherry-900" : ""}
        >
          Cancelled
        </Button>
      </div>

      {/* Transactions list */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No payments found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? "No payments match your search criteria"
              : activeFilter !== "all"
                ? `You don't have any ${activeFilter} payments yet`
                : "You haven't made any payments yet"}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="overflow-hidden">
              <div className="bg-gray-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {transaction.payment_method || "Card Payment"}
                      {transaction.card_type && ` - ${transaction.card_type}`}
                    </h3>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{transaction.merchant_reference}</p>
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

              <CardContent className="p-4">
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
                        className="text-sm font-medium text-cherry-800 hover:underline flex items-center"
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

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {transaction.order_id && (
                    <Button variant="outline" size="sm" className="text-xs h-8 bg-transparent" asChild>
                      <Link href={`/orders/${transaction.order_id}`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Order
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
