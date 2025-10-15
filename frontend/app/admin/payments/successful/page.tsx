"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Eye, CheckCircle2, CreditCard, Smartphone, TrendingUp, DollarSign } from "lucide-react"

interface Transaction {
  id: number
  order_id: number
  amount: number
  currency: string
  status: string
  payment_method: string
  card_type?: string
  email: string
  phone_number: string
  pesapal_tracking_id: string
  merchant_reference: string
  created_at: string
  transaction_date: string
}

export default function SuccessfulPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    averageAmount: 0,
    cardPayments: 0,
    mobilePayments: 0,
  })

  const itemsPerPage = 20

  useEffect(() => {
    fetchSuccessfulTransactions()
  }, [currentPage, paymentMethodFilter])

  const fetchSuccessfulTransactions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: itemsPerPage.toString(),
        status: "COMPLETED", // Filter for successful payments only
      })

      if (paymentMethodFilter !== "all") {
        params.append("payment_method", paymentMethodFilter)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/transactions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch successful transactions")
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      setTotalPages(data.total_pages || data.pages || 1)

      // Calculate stats
      calculateStats(data.transactions || [])
    } catch (error) {
      console.error("Error fetching successful transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (txns: Transaction[]) => {
    const totalAmount = txns.reduce((sum, t) => sum + t.amount, 0)
    const totalCount = txns.length
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0
    const cardPayments = txns.filter((t) => t.payment_method?.toLowerCase().includes("card")).length
    const mobilePayments = txns.filter((t) => t.payment_method?.toLowerCase().includes("mobile")).length

    setStats({
      totalAmount,
      totalCount,
      averageAmount,
      cardPayments,
      mobilePayments,
    })
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.phone_number.includes(searchTerm) ||
      transaction.pesapal_tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.merchant_reference.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Order ID",
      "Amount",
      "Currency",
      "Payment Method",
      "Card Type",
      "Email",
      "Phone",
      "Tracking ID",
      "Date",
    ]
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.order_id,
      t.amount,
      t.currency,
      t.payment_method,
      t.card_type || "N/A",
      t.email,
      t.phone_number,
      t.pesapal_tracking_id,
      new Date(t.transaction_date).toLocaleString(),
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `successful-payments-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const formatCurrency = (amount: number, currency = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Successful Payments</h1>
          <p className="text-muted-foreground mt-1">View and manage all completed Pesapal transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">Total Revenue</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-100" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">Successful Payments</p>
              <p className="text-2xl font-bold mt-2">{stats.totalCount}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-blue-100" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-100">Average Transaction</p>
              <p className="text-2xl font-bold mt-2">{formatCurrency(stats.averageAmount)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-100" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-100">Payment Methods</p>
              <p className="text-sm mt-2">
                <CreditCard className="inline h-4 w-4 mr-1" />
                {stats.cardPayments} Card
                <Smartphone className="inline h-4 w-4 ml-3 mr-1" />
                {stats.mobilePayments} Mobile
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by email, phone, tracking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="mobile">Mobile Money</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading successful payments...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No successful payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">
                      {transaction.pesapal_tracking_id.substring(0, 12)}...
                    </TableCell>
                    <TableCell>#{transaction.order_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{transaction.email}</span>
                        <span className="text-xs text-muted-foreground">{transaction.phone_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{transaction.payment_method}</span>
                        {transaction.card_type && (
                          <span className="text-xs text-muted-foreground">{transaction.card_type}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(transaction)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{selectedTransaction.pesapal_tracking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Merchant Reference</p>
                  <p className="font-mono text-sm">{selectedTransaction.merchant_reference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-semibold">#{selectedTransaction.order_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg text-green-600">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-semibold">{selectedTransaction.payment_method}</p>
                  {selectedTransaction.card_type && (
                    <p className="text-sm text-muted-foreground">{selectedTransaction.card_type}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer Email</p>
                  <p className="text-sm">{selectedTransaction.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="text-sm">{selectedTransaction.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Date</p>
                  <p className="text-sm">{new Date(selectedTransaction.transaction_date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="text-sm">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
