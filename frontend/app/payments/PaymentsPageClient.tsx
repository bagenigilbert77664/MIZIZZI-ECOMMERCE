"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
  Shield,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import TransactionHistory from "@/components/payment/transaction-history"
import mpesaService from "@/services/mpesa-service"

interface PaymentMethod {
  id: string
  name: string
  code: string
  description: string
  instructions?: string
  is_active: boolean
}

interface PaymentStats {
  total_transactions: number
  total_amount: number
  successful_payments: number
  pending_payments: number
  failed_payments: number
  this_month_amount: number
  last_month_amount: number
}

export default function PaymentsPageClient() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("transactions")
  const [loading, setLoading] = useState(true)
  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: "mpesa",
      name: "M-PESA",
      code: "mpesa",
      description: "Pay using your M-PESA mobile money account",
      instructions: "Enter your M-PESA registered phone number to receive a payment prompt",
      is_active: true,
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      code: "card",
      description: "Pay using your Visa, Mastercard, or other supported cards",
      instructions: "Enter your card details securely to complete payment",
      is_active: false,
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      code: "cod",
      description: "Pay with cash when your order is delivered",
      instructions: "Have exact change ready when the delivery agent arrives",
      is_active: true,
    },
  ])
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [serviceHealth, setServiceHealth] = useState<{
    status: string
    timestamp: string
  } | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/payments")
      return
    }

    fetchPaymentStats()
    checkServiceHealth()
  }, [isAuthenticated, router])

  const fetchPaymentStats = async () => {
    setLoading(true)
    try {
      const response = await mpesaService.getTransactionHistory(1, 100) // Get more for stats

      if (response.success) {
        const transactions = response.transactions
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

        const stats: PaymentStats = {
          total_transactions: transactions.length,
          total_amount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
          successful_payments: transactions.filter((tx) => tx.status === "completed").length,
          pending_payments: transactions.filter((tx) => tx.status === "pending").length,
          failed_payments: transactions.filter((tx) => tx.status === "failed").length,
          this_month_amount: transactions
            .filter((tx) => new Date(tx.created_at) >= thisMonth)
            .reduce((sum, tx) => sum + tx.amount, 0),
          last_month_amount: transactions
            .filter((tx) => {
              const txDate = new Date(tx.created_at)
              return txDate >= lastMonth && txDate <= lastMonthEnd
            })
            .reduce((sum, tx) => sum + tx.amount, 0),
        }

        setPaymentStats(stats)
      }
    } catch (error) {
      console.error("Error fetching payment stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const checkServiceHealth = async () => {
    try {
      const health = await mpesaService.getServiceHealth()
      setServiceHealth({
        status: health.status,
        timestamp: health.timestamp,
      })
    } catch (error) {
      console.error("Error checking service health:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
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
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-800">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            {status}
          </Badge>
        )
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const renderPaymentStats = () => {
    if (!paymentStats) return null

    const monthlyGrowth = calculateGrowth(paymentStats.this_month_amount, paymentStats.last_month_amount)

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(paymentStats.total_amount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(paymentStats.this_month_amount)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className={`h-3 w-3 mr-1 ${monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"}`} />
                  <span className={`text-xs ${monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {monthlyGrowth >= 0 ? "+" : ""}
                    {monthlyGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Smartphone className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{paymentStats.successful_payments}</p>
                <p className="text-xs text-gray-500">
                  {paymentStats.total_transactions > 0
                    ? `${((paymentStats.successful_payments / paymentStats.total_transactions) * 100).toFixed(1)}% success rate`
                    : "No transactions yet"}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">{paymentStats.total_transactions}</p>
                <div className="flex gap-2 mt-1">
                  {paymentStats.pending_payments > 0 && (
                    <span className="text-xs text-yellow-600">{paymentStats.pending_payments} pending</span>
                  )}
                  {paymentStats.failed_payments > 0 && (
                    <span className="text-xs text-red-600">{paymentStats.failed_payments} failed</span>
                  )}
                </div>
              </div>
              <CreditCard className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderPaymentMethods = () => {
    return (
      <div className="space-y-4">
        {paymentMethods.map((method) => (
          <Card key={method.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {method.code === "mpesa" && <Smartphone className="h-5 w-5 text-green-600" />}
                    {method.code === "card" && <CreditCard className="h-5 w-5 text-blue-600" />}
                    {method.code === "cod" && <DollarSign className="h-5 w-5 text-orange-600" />}

                    <h3 className="font-medium text-gray-900">{method.name}</h3>

                    {method.is_active ? (
                      <Badge className="bg-green-50 text-green-700 hover:bg-green-100">
                        <Shield className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Coming Soon</Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{method.description}</p>

                  {method.instructions && (
                    <div className="text-sm bg-gray-50 p-3 rounded-md">
                      <p className="text-gray-700">{method.instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {method.code === "mpesa" && serviceHealth && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Service Status:</span>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          serviceHealth.status === "healthy"
                            ? "bg-green-500"
                            : serviceHealth.status === "degraded"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      />
                      <span
                        className={`capitalize ${
                          serviceHealth.status === "healthy"
                            ? "text-green-600"
                            : serviceHealth.status === "degraded"
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {serviceHealth.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container px-4 md:px-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payments & Transactions</h1>
          <p className="text-gray-600 mt-1">Manage your payment methods and view transaction history</p>
        </div>

        {/* Payment Stats */}
        {renderPaymentStats()}

        <Tabs defaultValue="transactions" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              M-PESA Transactions
            </TabsTrigger>
            <TabsTrigger value="methods" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <TransactionHistory showMpesaOnly={true} />
          </TabsContent>

          <TabsContent value="methods" className="space-y-4">
            {renderPaymentMethods()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
