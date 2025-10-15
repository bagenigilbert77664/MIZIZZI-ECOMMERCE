"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Eye, Clock, DollarSign, CreditCard, TrendingUp } from "lucide-react"

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
  order_id?: number
}

interface Stats {
  total_amount: number
  transaction_count: number
  average_transaction: number
  payment_methods: Record<string, number>
}

export default function PendingPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const itemsPerPage = 20

  useEffect(() => {
    fetchTransactions()
  }, [currentPage, searchTerm, paymentMethodFilter, dateFrom, dateTo])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")

      console.log("[v0] Fetching pending transactions with token:", token ? "Present" : "Missing")

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: itemsPerPage.toString(),
        status: "PENDING",
      })

      if (searchTerm) params.append("search", searchTerm)
      if (paymentMethodFilter !== "all") params.append("payment_method", paymentMethodFilter)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)

      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/transactions?${params}`
      console.log("[v0] Fetching from URL:", url)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.log("[v0] Error data:", errorData)
        throw new Error(errorData.message || `Failed to fetch pending transactions (Status: ${response.status})`)
      }

      const data = await response.json()
      console.log("[v0] Received data:", data)
      setTransactions(data.transactions || [])
      setTotalPages(data.total_pages || data.pages || 1)

      // Calculate stats from pending transactions
      calculateStats(data.transactions || [])
    } catch (error) {
      console.error("Error fetching pending transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (txns: Transaction[]) => {
    const totalAmount = txns.reduce((sum, t) => sum + Number.parseFloat(t.amount.toString()), 0)
    const paymentMethods: Record<string, number> = {}

    txns.forEach((t) => {
      const method = t.payment_method || "Unknown"
      paymentMethods[method] = (paymentMethods[method] || 0) + 1
    })

    setStats({
      total_amount: totalAmount,
      transaction_count: txns.length,
      average_transaction: txns.length > 0 ? totalAmount / txns.length : 0,
      payment_methods: paymentMethods,
    })
  }

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Tracking ID",
      "Reference",
      "Amount",
      "Currency",
      "Payment Method",
      "Email",
      "Phone",
      "Date",
      "Status",
    ]
    const rows = transactions.map((t) => [
      t.id,
      t.pesapal_tracking_id,
      t.merchant_reference,
      t.amount,
      t.currency,
      t.payment_method,
      t.email,
      t.phone_number || "",
      new Date(t.created_at).toLocaleString(),
      t.status,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pending-payments-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const formatCurrency = (amount: number, currency = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Payments</h1>
            <p className="text-gray-600 mt-1">Monitor and manage pending Pesapal transactions</p>
          </div>
          <Button onClick={exportToCSV} className="bg-amber-600 hover:bg-amber-700">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Total Pending</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.total_amount)}</p>
                </div>
                <DollarSign className="h-12 w-12 text-amber-200" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-amber-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pending Count</p>
                  <p className="text-2xl font-bold mt-2">{stats.transaction_count}</p>
                </div>
                <Clock className="h-12 w-12 text-yellow-200" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Average Value</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.average_transaction)}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-orange-200" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-amber-600 to-yellow-700 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Payment Methods</p>
                  <p className="text-2xl font-bold mt-2">{Object.keys(stats.payment_methods).length}</p>
                </div>
                <CreditCard className="h-12 w-12 text-amber-200" />
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by email, phone, or tracking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From Date" />

            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To Date" />
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No pending transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">{transaction.pesapal_tracking_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {transaction.first_name} {transaction.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{transaction.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400" />
                          <span className="capitalize">{transaction.payment_method}</span>
                          {transaction.card_type && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.card_type}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                          <Clock className="mr-1 h-3 w-3" />
                          {transaction.status}
                        </Badge>
                      </TableCell>
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
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
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
      </div>

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
                  <p className="text-sm text-gray-500">Tracking ID</p>
                  <p className="font-mono text-sm">{selectedTransaction.pesapal_tracking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Merchant Reference</p>
                  <p className="font-mono text-sm">{selectedTransaction.merchant_reference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className="bg-amber-100 text-amber-800">{selectedTransaction.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer Name</p>
                  <p>
                    {selectedTransaction.first_name} {selectedTransaction.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{selectedTransaction.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p>{selectedTransaction.phone_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="capitalize">{selectedTransaction.payment_method}</p>
                </div>
                {selectedTransaction.card_type && (
                  <div>
                    <p className="text-sm text-gray-500">Card Type</p>
                    <p className="uppercase">{selectedTransaction.card_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Transaction Date</p>
                  <p>{new Date(selectedTransaction.created_at).toLocaleString()}</p>
                </div>
                {selectedTransaction.order_id && (
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p>#{selectedTransaction.order_id}</p>
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
