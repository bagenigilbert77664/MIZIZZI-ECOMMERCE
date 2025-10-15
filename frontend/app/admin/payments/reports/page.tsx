"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import {
  Download,
  CalendarIcon,
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  BarChart3,
  PieChart,
  FileText,
} from "lucide-react"
import { Line, Bar, Pie } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

interface ReportData {
  total_revenue: number
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  average_transaction_value: number
  payment_methods: { method: string; count: number; amount: number }[]
  daily_revenue: { date: string; revenue: number; count: number }[]
  top_customers: { name: string; email: string; total_spent: number; transaction_count: number }[]
}

export default function TransactionReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState("revenue")
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30))
  const [dateTo, setDateTo] = useState<Date>(new Date())

  useEffect(() => {
    fetchReportData()
  }, [dateFrom, dateTo])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("admin_token")

      const params = new URLSearchParams({
        date_from: format(dateFrom, "yyyy-MM-dd"),
        date_to: format(dateTo, "yyyy-MM-dd"),
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pesapal/admin/stats?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch report data")
      }

      const data = await response.json()
      setReportData(data)
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const setQuickDateRange = (range: string) => {
    const now = new Date()
    switch (range) {
      case "today":
        setDateFrom(now)
        setDateTo(now)
        break
      case "week":
        setDateFrom(subDays(now, 7))
        setDateTo(now)
        break
      case "month":
        setDateFrom(startOfMonth(now))
        setDateTo(endOfMonth(now))
        break
      case "year":
        setDateFrom(startOfYear(now))
        setDateTo(endOfYear(now))
        break
    }
  }

  const exportReport = (type: string) => {
    if (!reportData) return

    let csv = ""
    let filename = ""

    switch (type) {
      case "summary":
        csv = [
          ["Metric", "Value"],
          ["Total Revenue", `KES ${reportData.total_revenue.toLocaleString()}`],
          ["Total Transactions", reportData.total_transactions],
          ["Successful Transactions", reportData.successful_transactions],
          ["Failed Transactions", reportData.failed_transactions],
          ["Average Transaction Value", `KES ${reportData.average_transaction_value.toLocaleString()}`],
          [
            "Success Rate",
            `${((reportData.successful_transactions / reportData.total_transactions) * 100).toFixed(2)}%`,
          ],
        ]
          .map((row) => row.join(","))
          .join("\n")
        filename = "summary-report"
        break

      case "daily":
        csv = [
          ["Date", "Revenue", "Transactions"],
          ...reportData.daily_revenue.map((day) => [day.date, day.revenue, day.count]),
        ]
          .map((row) => row.join(","))
          .join("\n")
        filename = "daily-revenue-report"
        break

      case "methods":
        csv = [
          ["Payment Method", "Transactions", "Total Amount"],
          ...reportData.payment_methods.map((method) => [method.method, method.count, method.amount]),
        ]
          .map((row) => row.join(","))
          .join("\n")
        filename = "payment-methods-report"
        break

      case "customers":
        csv = [
          ["Customer Name", "Email", "Total Spent", "Transactions"],
          ...reportData.top_customers.map((customer) => [
            customer.name,
            customer.email,
            customer.total_spent,
            customer.transaction_count,
          ]),
        ]
          .map((row) => row.join(","))
          .join("\n")
        filename = "top-customers-report"
        break
    }

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
  }

  const revenueChartData = {
    labels: reportData?.daily_revenue.map((d) => format(new Date(d.date), "MMM dd")) || [],
    datasets: [
      {
        label: "Revenue (KES)",
        data: reportData?.daily_revenue.map((d) => d.revenue) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
    ],
  }

  const transactionChartData = {
    labels: reportData?.daily_revenue.map((d) => format(new Date(d.date), "MMM dd")) || [],
    datasets: [
      {
        label: "Transactions",
        data: reportData?.daily_revenue.map((d) => d.count) || [],
        backgroundColor: "rgba(99, 102, 241, 0.8)",
      },
    ],
  }

  const paymentMethodsChartData = {
    labels: reportData?.payment_methods.map((m) => m.method) || [],
    datasets: [
      {
        data: reportData?.payment_methods.map((m) => m.amount) || [],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(99, 102, 241, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(168, 85, 247, 0.8)",
        ],
      },
    ],
  }

  const successRate = reportData
    ? ((reportData.successful_transactions / reportData.total_transactions) * 100).toFixed(2)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Transaction Reports
            </h1>
            <p className="text-slate-600 mt-1">Comprehensive analytics and reporting for Pesapal payments</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange("today")}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange("week")}>
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange("month")}>
                  This Month
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDateRange("year")}>
                  This Year
                </Button>
              </div>

              <div className="flex gap-2 ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateFrom, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={(date) => date && setDateFrom(date)} />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateTo, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Generating reports...</p>
          </div>
        ) : reportData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-100">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">KES {reportData.total_revenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-purple-100">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">{reportData.total_transactions}</p>
                      <p className="text-sm text-purple-100 mt-1">{reportData.successful_transactions} successful</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-100">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">{successRate}%</p>
                      <p className="text-sm text-green-100 mt-1">{reportData.failed_transactions} failed</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-indigo-100">Avg Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">KES {reportData.average_transaction_value.toLocaleString()}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Revenue Trend</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportReport("daily")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <CardDescription>Daily revenue over selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <Line data={revenueChartData} options={{ responsive: true, maintainAspectRatio: true }} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Transaction Volume</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportReport("daily")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <CardDescription>Daily transaction count</CardDescription>
                </CardHeader>
                <CardContent>
                  <Bar data={transactionChartData} options={{ responsive: true, maintainAspectRatio: true }} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Payment Methods</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportReport("methods")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <CardDescription>Revenue by payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <Pie data={paymentMethodsChartData} options={{ responsive: true, maintainAspectRatio: true }} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Top Customers</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportReport("customers")}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <CardDescription>Highest spending customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.top_customers.slice(0, 5).map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-slate-600">{customer.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">KES {customer.total_spent.toLocaleString()}</p>
                          <p className="text-sm text-slate-600">{customer.transaction_count} transactions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Reports</CardTitle>
                <CardDescription>Download detailed reports in CSV format</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" onClick={() => exportReport("summary")} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Summary Report
                  </Button>
                  <Button variant="outline" onClick={() => exportReport("daily")} className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Daily Revenue
                  </Button>
                  <Button variant="outline" onClick={() => exportReport("methods")} className="gap-2">
                    <PieChart className="h-4 w-4" />
                    Payment Methods
                  </Button>
                  <Button variant="outline" onClick={() => exportReport("customers")} className="gap-2">
                    <Users className="h-4 w-4" />
                    Top Customers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No report data available</p>
          </div>
        )}
      </div>
    </div>
  )
}
