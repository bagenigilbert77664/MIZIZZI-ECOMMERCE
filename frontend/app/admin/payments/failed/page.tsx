"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Download, AlertCircle, Eye } from "lucide-react"

interface Transaction {
  id: string
  order_id: string
  amount: number
  currency: string
  email: string
  phone_number: string
  payment_method: string
  status: string
  error_message: string
  created_at: string
  merchant_reference: string
}

export default function FailedPaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    total_failed: 0,
    total_amount: 0,
    avg_amount: 0,
  })

  useEffect(() => {
    fetchTransactions()
    fetchStats()
  }, [currentPage, searchTerm])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "20",
        status: "failed",
        search: searchTerm,
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/transactions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch failed transactions")
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      setTotalPages(data.total_pages || 1)
    } catch (error) {
      console.error("Error fetching failed transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/stats?status=failed`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats({
          total_failed: data.total_transactions || 0,
          total_amount: data.total_amount || 0,
          avg_amount: data.average_amount || 0,
        })
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const exportTransactions = async () => {
    try {
      const token = localStorage.getItem("admin_token")
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/transactions/export?status=failed`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `failed-payments-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error exporting transactions:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Failed Payments</h1>
            <p className="mt-1 text-sm text-gray-600">Monitor and analyze failed payment transactions</p>
          </div>
          <Button onClick={exportTransactions} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Total Failed</p>
                <p className="mt-2 text-3xl font-bold text-red-900">{stats.total_failed}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Failed Amount</p>
                <p className="mt-2 text-3xl font-bold text-red-900">{formatCurrency(stats.total_amount)}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Avg Transaction</p>
                <p className="mt-2 text-3xl font-bold text-red-900">{formatCurrency(stats.avg_amount)}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by order ID, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Error Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No failed transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.order_id}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{transaction.email}</div>
                          <div className="text-gray-500">{transaction.phone_number}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.payment_method || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-red-600">
                        {transaction.error_message || "Unknown error"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(transaction.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Failed</Badge>
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
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Failed Transaction Details</DialogTitle>
            <DialogDescription>Complete information about the failed payment</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order ID</p>
                  <p className="mt-1 font-semibold">{selectedTransaction.order_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="mt-1 font-semibold">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{selectedTransaction.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1">{selectedTransaction.phone_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Method</p>
                  <p className="mt-1">{selectedTransaction.payment_method || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="mt-1">{formatDate(selectedTransaction.created_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Error Message</p>
                <p className="mt-1 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {selectedTransaction.error_message || "No error message available"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Merchant Reference</p>
                <p className="mt-1 font-mono text-sm">{selectedTransaction.merchant_reference}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
