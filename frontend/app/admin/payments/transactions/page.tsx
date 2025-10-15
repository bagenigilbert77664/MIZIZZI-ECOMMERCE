"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Download, Filter, Eye, Calendar, CreditCard, Smartphone, DollarSign, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"

interface Transaction {
  id: number
  pesapal_tracking_id: string
  merchant_reference: string
  amount: number
  currency: string
  payment_method: string
  card_type?: string
  status: string
  email: string
  phone_number?: string
  first_name?: string
  last_name?: string
  created_at: string
  transaction_date?: string
  callback_received_at?: string
  order_id?: number
}

export default function AllTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [perPage, setPerPage] = useState(20)

  useEffect(() => {
    fetchTransactions()
  }, [currentPage, perPage, statusFilter, paymentMethodFilter, sortBy, sortOrder])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("admin_token")
      console.log("[v0] Token present:", !!token)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      if (statusFilter !== "all") params.append("status", statusFilter)
      if (paymentMethodFilter !== "all") params.append("payment_method", paymentMethodFilter)
      if (searchQuery) params.append("search", searchQuery)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)

      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/transactions?${params}`
      console.log("[v0] Fetching from URL:", url)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.log("[v0] Error data:", errorData)
        throw new Error(errorData.message || `Failed to fetch transactions (Status: ${response.status})`)
      }

      const data = await response.json()
      console.log("[v0] Success! Received data:", data)
      setTransactions(data.transactions || [])
      setTotalPages(data.total_pages || data.pages || 1)
      setTotalItems(data.total_items || data.total || 0)
    } catch (err) {
      console.error("[v0] Error fetching transactions:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch transactions")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchTransactions()
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const exportTransactions = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const params = new URLSearchParams()

      if (statusFilter !== "all") params.append("status", statusFilter)
      if (paymentMethodFilter !== "all") params.append("payment_method", paymentMethodFilter)
      if (searchQuery) params.append("search", searchQuery)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/transactions/export?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) throw new Error("Failed to export transactions")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Error exporting transactions:", err)
      alert("Failed to export transactions")
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      COMPLETED: "bg-green-500/10 text-green-500 border-green-500/20",
      PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      FAILED: "bg-red-500/10 text-red-500 border-red-500/20",
      CANCELLED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    }

    return (
      <Badge variant="outline" className={statusColors[status] || "bg-gray-500/10 text-gray-500"}>
        {status}
      </Badge>
    )
  }

  const getPaymentMethodIcon = (method: string) => {
    if (method?.toLowerCase().includes("card")) {
      return <CreditCard className="h-4 w-4" />
    }
    return <Smartphone className="h-4 w-4" />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">All Transactions</h1>
          <p className="text-muted-foreground mt-1">View and manage all Pesapal payment transactions</p>
        </div>
        <Button onClick={exportTransactions} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Order ID, Email, Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                  <SelectItem value="mobile">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Per Page */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Items per page</label>
              <Select value={perPage.toString()} onValueChange={(v) => setPerPage(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date From
              </label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date To
              </label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("")
              setStatusFilter("all")
              setPaymentMethodFilter("all")
              setDateFrom("")
              setDateTo("")
              setCurrentPage(1)
            }}
          >
            Clear All Filters
          </Button>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                Showing {transactions.length} of {totalItems} transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchTransactions} className="mt-4">
                Retry
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("id")} className="gap-1">
                          ID
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("amount")} className="gap-1">
                          Amount
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("created_at")} className="gap-1">
                          Date
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">#{transaction.id}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {transaction.pesapal_tracking_id?.substring(0, 16)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {transaction.first_name} {transaction.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{transaction.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-semibold">
                            <DollarSign className="h-3 w-3" />
                            {transaction.amount.toLocaleString()} {transaction.currency}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(transaction.payment_method)}
                            <span className="text-sm">{transaction.payment_method}</span>
                          </div>
                          {transaction.card_type && (
                            <p className="text-xs text-muted-foreground mt-1">{transaction.card_type}</p>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell>{format(new Date(transaction.created_at), "MMM dd, yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setShowDetails(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Complete information about this transaction</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                  <p className="font-semibold">#{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="font-semibold text-lg">
                    {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{selectedTransaction.payment_method}</p>
                  {selectedTransaction.card_type && (
                    <p className="text-sm text-muted-foreground">{selectedTransaction.card_type}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Pesapal Tracking ID</p>
                  <p className="font-mono text-sm break-all">{selectedTransaction.pesapal_tracking_id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Merchant Reference</p>
                  <p className="font-mono text-sm">{selectedTransaction.merchant_reference}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                  <p className="font-medium">
                    {selectedTransaction.first_name} {selectedTransaction.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedTransaction.email}</p>
                </div>
                {selectedTransaction.phone_number && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{selectedTransaction.phone_number}</p>
                  </div>
                )}
                {selectedTransaction.order_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                    <p className="font-medium">#{selectedTransaction.order_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created At</p>
                  <p className="font-medium">{format(new Date(selectedTransaction.created_at), "PPpp")}</p>
                </div>
                {selectedTransaction.transaction_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transaction Date</p>
                    <p className="font-medium">{format(new Date(selectedTransaction.transaction_date), "PPpp")}</p>
                  </div>
                )}
                {selectedTransaction.callback_received_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Callback Received</p>
                    <p className="font-medium">{format(new Date(selectedTransaction.callback_received_at), "PPpp")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
