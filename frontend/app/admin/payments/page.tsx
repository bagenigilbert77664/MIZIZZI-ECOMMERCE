"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  DollarSign,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MoreHorizontal,
  Smartphone,
  Wallet,
  AlertCircle,
  FileText,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { toast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { formatDate, formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface PesapalTransaction {
  id: string
  user_id: number
  order_id: string
  amount: number
  currency: string
  email: string
  phone_number?: string
  first_name?: string
  last_name?: string
  description?: string
  pesapal_tracking_id?: string
  merchant_reference: string
  payment_method?: string
  card_type?: string
  pesapal_receipt_number?: string
  status: string
  created_at: string
  transaction_date?: string
  error_message?: string
  user?: {
    name: string
    email: string
  }
  order?: {
    order_number: string
  }
}

interface PaymentStats {
  total_revenue: number
  total_transactions: number
  successful_payments: number
  pending_payments: number
  failed_payments: number
  average_transaction: number
  today_revenue: number
  today_transactions: number
  yesterday_revenue?: number
  revenue_change?: number
  payment_methods: {
    card: number
    mobile: number
    other: number
  }
}

export default function PaymentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const router = useRouter()

  // State management
  const [transactions, setTransactions] = useState<PesapalTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<PesapalTransaction | null>(null)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Statistics state
  const [stats, setStats] = useState<PaymentStats>({
    total_revenue: 0,
    total_transactions: 0,
    successful_payments: 0,
    pending_payments: 0,
    failed_payments: 0,
    average_transaction: 0,
    today_revenue: 0,
    today_transactions: 0,
    payment_methods: {
      card: 0,
      mobile: 0,
      other: 0,
    },
  })

  const [revenueTrends, setRevenueTrends] = useState<Array<{ date: string; amount: number }>>([])
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem("admin_token")

      console.log("[v0] Fetching transactions with token:", token ? "present" : "missing")

      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(paymentMethodFilter !== "all" && { payment_method: paymentMethodFilter }),
        ...(searchQuery && { search: searchQuery }),
      })

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/pesapal/admin/transactions?${params}`
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
        console.error("[v0] Error response:", errorData)
        throw new Error(errorData.message || "Failed to fetch transactions")
      }

      const data = await response.json()
      console.log("[v0] Received data:", data)

      setTransactions(data.transactions || [])
      setTotalPages(data.pagination?.total_pages || data.pagination?.pages || 1)
      setTotalItems(data.pagination?.total_items || data.pagination?.total || 0)

      // Calculate statistics
      calculateStats(data.transactions || [])
    } catch (error) {
      console.error("[v0] Failed to fetch transactions:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load transactions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (transactionsList: PesapalTransaction[]) => {
    const successful = transactionsList.filter((t) => t.status === "completed")
    const pending = transactionsList.filter((t) => t.status === "pending" || t.status === "initiated")
    const failed = transactionsList.filter((t) => t.status === "failed" || t.status === "cancelled")

    const totalRevenue = successful.reduce((sum, t) => sum + t.amount, 0)
    const avgTransaction = successful.length > 0 ? totalRevenue / successful.length : 0

    // Today's stats
    const today = new Date().toDateString()
    const todayTransactions = transactionsList.filter((t) => new Date(t.created_at).toDateString() === today)
    const todaySuccessful = todayTransactions.filter((t) => t.status === "completed")
    const todayRevenue = todaySuccessful.reduce((sum, t) => sum + t.amount, 0)

    // Yesterday's stats for comparison
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const yesterdayTransactions = transactionsList.filter((t) => new Date(t.created_at).toDateString() === yesterday)
    const yesterdaySuccessful = yesterdayTransactions.filter((t) => t.status === "completed")
    const yesterdayRevenue = yesterdaySuccessful.reduce((sum, t) => sum + t.amount, 0)

    // Calculate revenue trends for last 7 days
    const trends: Array<{ date: string; amount: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000)
      const dateStr = date.toDateString()
      const dayTransactions = transactionsList.filter(
        (t) => new Date(t.created_at).toDateString() === dateStr && t.status === "completed",
      )
      const dayRevenue = dayTransactions.reduce((sum, t) => sum + t.amount, 0)
      trends.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        amount: dayRevenue,
      })
    }
    setRevenueTrends(trends)

    // Payment methods breakdown
    const cardPayments = successful.filter((t) => t.payment_method?.toLowerCase().includes("card")).length
    const mobilePayments = successful.filter(
      (t) =>
        t.payment_method?.toLowerCase().includes("mobile") ||
        t.payment_method?.toLowerCase().includes("mpesa") ||
        t.payment_method?.toLowerCase().includes("airtel"),
    ).length
    const otherPayments = successful.length - cardPayments - mobilePayments

    setStats({
      total_revenue: totalRevenue,
      total_transactions: transactionsList.length,
      successful_payments: successful.length,
      pending_payments: pending.length,
      failed_payments: failed.length,
      average_transaction: avgTransaction,
      today_revenue: todayRevenue,
      today_transactions: todayTransactions.length,
      yesterday_revenue: yesterdayRevenue,
      revenue_change: yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0,
      payment_methods: {
        card: cardPayments,
        mobile: mobilePayments,
        other: otherPayments,
      },
    })
  }

  // Refetch transactions when relevant filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions()
    }
  }, [isAuthenticated, currentPage, statusFilter, paymentMethodFilter, searchQuery])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchTransactions()
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchTransactions()
    toast({
      title: "Refreshed",
      description: "Transactions list has been updated.",
    })
  }

  // Handle export
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("admin_token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pesapal/admin/transactions?export=csv`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `pesapal-transactions-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Export Started",
        description: "Your transactions export will download shortly.",
      })
    } catch (error) {
      console.error("[v0] Export failed:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export transactions. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    const configs: Record<string, { icon: React.ElementType; className: string }> = {
      completed: {
        icon: CheckCircle2,
        className: "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200",
      },
      pending: {
        icon: Clock,
        className: "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200",
      },
      initiated: {
        icon: Activity,
        className: "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200",
      },
      failed: {
        icon: XCircle,
        className: "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200",
      },
      cancelled: {
        icon: XCircle,
        className: "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200",
      },
    }

    const config = configs[statusLower] || {
      icon: AlertCircle,
      className: "bg-gray-50 text-gray-700 border-gray-200",
    }

    const Icon = config.icon

    return (
      <Badge variant="outline" className={`${config.className} flex items-center gap-1.5 px-2.5 py-1`}>
        <Icon className="h-3 w-3" />
        <span className="capitalize">{status}</span>
      </Badge>
    )
  }

  // Get payment method icon
  const getPaymentMethodIcon = (method?: string) => {
    if (!method) return <Wallet className="h-4 w-4" />
    const methodLower = method.toLowerCase()
    if (methodLower.includes("card")) return <CreditCard className="h-4 w-4" />
    if (methodLower.includes("mobile") || methodLower.includes("mpesa") || methodLower.includes("airtel"))
      return <Smartphone className="h-4 w-4" />
    return <Wallet className="h-4 w-4" />
  }

  // View transaction details
  const viewTransactionDetails = (transaction: PesapalTransaction) => {
    setSelectedTransaction(transaction)
    setShowTransactionDetails(true)
  }

  // Filter transactions by active tab
  const filteredTransactions = transactions.filter((transaction) => {
    if (activeTab === "all") return true
    if (activeTab === "completed") return transaction.status === "completed"
    if (activeTab === "pending") return transaction.status === "pending" || transaction.status === "initiated"
    if (activeTab === "failed") return transaction.status === "failed" || transaction.status === "cancelled"
    return true
  })

  if (authLoading || (isLoading && transactions.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Pesapal Payments
            </h1>
            <p className="text-gray-600 text-lg mt-1">Manage and track all Pesapal payment transactions</p>
          </div>
          <Button onClick={() => setShowAnalytics(!showAnalytics)} variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {showAnalytics ? "Hide" : "Show"} Analytics
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.total_revenue)}</div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-blue-100 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {formatCurrency(stats.today_revenue)} today
              </p>
              {stats.revenue_change !== undefined && stats.revenue_change !== 0 && (
                <Badge
                  variant="secondary"
                  className={`text-xs ${stats.revenue_change > 0 ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-100"}`}
                >
                  {stats.revenue_change > 0 ? (
                    <ArrowUpRight className="h-3 w-3 inline" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 inline" />
                  )}
                  {Math.abs(stats.revenue_change).toFixed(1)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Successful Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.successful_payments}</div>
            <p className="text-xs text-green-100 mt-1">Avg: {formatCurrency(stats.average_transaction)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-amber-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-100 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pending_payments}</div>
            <p className="text-xs text-yellow-100 mt-1">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-100 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Failed Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.failed_payments}</div>
            <p className="text-xs text-red-100 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {showAnalytics && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-xl flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Payment Analytics
            </CardTitle>
            <CardDescription>Revenue trends and payment method distribution</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-4">7-Day Revenue Trend</h3>
                <div className="space-y-3">
                  {revenueTrends.map((trend, index) => {
                    const maxAmount = Math.max(...revenueTrends.map((t) => t.amount))
                    const percentage = maxAmount > 0 ? (trend.amount / maxAmount) * 100 : 0
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{trend.date}</span>
                          <span className="font-semibold">{formatCurrency(trend.amount)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Payment Methods Distribution */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Payment Methods Distribution</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-sm text-gray-600">Card Payments</span>
                      </div>
                      <span className="font-semibold">{stats.payment_methods.card}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${(stats.payment_methods.card / stats.successful_payments) * 100 || 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500" />
                        <span className="text-sm text-gray-600">Mobile Money</span>
                      </div>
                      <span className="font-semibold">{stats.payment_methods.mobile}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${(stats.payment_methods.mobile / stats.successful_payments) * 100 || 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-500" />
                        <span className="text-sm text-gray-600">Other Methods</span>
                      </div>
                      <span className="font-semibold">{stats.payment_methods.other}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${(stats.payment_methods.other / stats.successful_payments) * 100 || 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-900">Success Rate</span>
                    <span className="text-2xl font-bold text-green-700">
                      {stats.total_transactions > 0
                        ? ((stats.successful_payments / stats.total_transactions) * 100).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              Card Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.payment_methods.card}</div>
            <p className="text-xs text-gray-500 mt-1">Successful card transactions</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-indigo-600" />
              Mobile Money
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.payment_methods.mobile}</div>
            <p className="text-xs text-gray-500 mt-1">M-Pesa & Airtel Money</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-cyan-600" />
              Other Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{stats.payment_methods.other}</div>
            <p className="text-xs text-gray-500 mt-1">Alternative payment methods</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Transactions</CardTitle>
              <CardDescription className="mt-1">View and manage all Pesapal payment transactions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 bg-transparent">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by order number, email, tracking ID, or merchant reference..."
                  className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-11 px-6 bg-blue-600 hover:bg-blue-700">
                Search
              </Button>
            </form>

            {showFilters && (
              <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="initiated">Initiated</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger className="w-[180px] bg-white">
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="all" className="gap-2">
                All
                <Badge variant="secondary" className="ml-1">
                  {transactions.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                Completed
                <Badge variant="secondary" className="ml-1">
                  {stats.successful_payments}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                Pending
                <Badge variant="secondary" className="ml-1">
                  {stats.pending_payments}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="failed" className="gap-2">
                Failed
                <Badge variant="secondary" className="ml-1">
                  {stats.failed_payments}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Transactions Table */}
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold">Transaction</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Order</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Method</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Amount</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-gray-500">
                            <DollarSign className="h-12 w-12 text-gray-300" />
                            <p className="font-medium">No transactions found</p>
                            <p className="text-sm">Try adjusting your filters or search query</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => viewTransactionDetails(transaction)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900">
                                {transaction.merchant_reference}
                              </span>
                              {transaction.pesapal_tracking_id && (
                                <span className="text-xs text-gray-500">{transaction.pesapal_tracking_id}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">
                                {transaction.first_name} {transaction.last_name}
                              </span>
                              <span className="text-xs text-gray-500">{transaction.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-blue-600">
                              {transaction.order?.order_number || transaction.order_id}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {formatDate(transaction.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(transaction.payment_method)}
                              <span className="text-sm capitalize">{transaction.payment_method || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell className="text-right font-semibold text-gray-900">
                            {formatCurrency(transaction.amount)} {transaction.currency}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => viewTransactionDetails(transaction)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/orders?search=${transaction.order_id}`)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Order
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download Receipt
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalItems)} of {totalItems}{" "}
                    transactions
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
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum =
                        currentPage <= 3
                          ? i + 1
                          : currentPage >= totalPages - 2
                            ? totalPages - 4 + i
                            : currentPage - 2 + i
                      if (pageNum <= 0 || pageNum > totalPages) return null
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Transaction Details</DialogTitle>
            <DialogDescription>Complete information about this Pesapal transaction</DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-4">
                {/* Transaction Header */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTransaction.merchant_reference}</h3>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(selectedTransaction.created_at)}</p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(selectedTransaction.status)}
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(selectedTransaction.amount)} {selectedTransaction.currency}
                    </p>
                  </div>
                </div>

                {/* Customer Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Name</Label>
                        <p className="font-medium">
                          {selectedTransaction.first_name} {selectedTransaction.last_name}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Email</Label>
                        <p className="font-medium">{selectedTransaction.email}</p>
                      </div>
                      {selectedTransaction.phone_number && (
                        <div>
                          <Label className="text-xs text-gray-500">Phone</Label>
                          <p className="font-medium">{selectedTransaction.phone_number}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-gray-500">User ID</Label>
                        <p className="font-medium">{selectedTransaction.user_id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Payment Method</Label>
                        <p className="font-medium capitalize">{selectedTransaction.payment_method || "N/A"}</p>
                      </div>
                      {selectedTransaction.card_type && (
                        <div>
                          <Label className="text-xs text-gray-500">Card Type</Label>
                          <p className="font-medium">{selectedTransaction.card_type}</p>
                        </div>
                      )}
                      {selectedTransaction.pesapal_receipt_number && (
                        <div>
                          <Label className="text-xs text-gray-500">Receipt Number</Label>
                          <p className="font-medium">{selectedTransaction.pesapal_receipt_number}</p>
                        </div>
                      )}
                      {selectedTransaction.pesapal_tracking_id && (
                        <div>
                          <Label className="text-xs text-gray-500">Tracking ID</Label>
                          <p className="font-medium text-xs">{selectedTransaction.pesapal_tracking_id}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Order Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Order ID</Label>
                        <p className="font-medium">{selectedTransaction.order_id}</p>
                      </div>
                      {selectedTransaction.order?.order_number && (
                        <div>
                          <Label className="text-xs text-gray-500">Order Number</Label>
                          <p className="font-medium">{selectedTransaction.order.order_number}</p>
                        </div>
                      )}
                      {selectedTransaction.description && (
                        <div className="col-span-2">
                          <Label className="text-xs text-gray-500">Description</Label>
                          <p className="font-medium">{selectedTransaction.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Error Message (if any) */}
                {selectedTransaction.error_message && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-red-900 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Error Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-800">{selectedTransaction.error_message}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
