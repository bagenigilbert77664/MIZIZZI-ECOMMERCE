"use client"

import { CardContent } from "@/components/ui/card"
import { Users, ShoppingCart, DollarSign, Package, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface KpiCardsProps {
  data: {
    users: number
    products: number
    orders: number
    categories?: number
    brands?: number
    reviews?: number
    pending_reviews?: number
    newsletter_subscribers?: number
    low_stock_products?: any[]
    new_signups?: {
      today: number
      week: number
    }
    orders_in_transit?: number
    pending_payments?: number
  }
  sales: {
    today: number
    yesterday?: number
    weekly?: number
    monthly: number
    yearly?: number
  }
  orderStatus?: Record<string, number>
}

export function KpiCards({ data, sales, orderStatus = {} }: KpiCardsProps) {
  // Calculate sales growth percentage
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const dailyGrowth = sales.yesterday ? calculateGrowth(sales.today, sales.yesterday) : 0
  const pendingOrders = orderStatus.PENDING || 0
  const lowStockCount = data.low_stock_products?.length || 0
  const newsletterSubscribers = data.newsletter_subscribers || 0

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Revenue Card */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="group relative overflow-hidden rounded-xl bg-white transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl dark:bg-gray-800"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 opacity-80"></div>
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-violet-500 to-purple-600"></div>

        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-transform duration-300 group-hover:scale-110 dark:bg-violet-900/30 dark:text-violet-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {formatCurrency(sales.monthly)}
          </div>

          <div className="flex items-center">
            <div
              className={cn(
                "mr-2 flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                dailyGrowth > 0
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : dailyGrowth < 0
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
              )}
            >
              {dailyGrowth > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : dailyGrowth < 0 ? (
                <TrendingDown className="mr-1 h-3 w-3" />
              ) : null}
              {dailyGrowth !== 0 ? `${Math.abs(dailyGrowth).toFixed(1)}%` : "0%"}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">from yesterday</span>
          </div>
        </CardContent>
      </motion.div>

      {/* Orders Card */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="group relative overflow-hidden rounded-xl bg-white transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl dark:bg-gray-800"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-80"></div>
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-cyan-600"></div>

        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Orders</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform duration-300 group-hover:scale-110 dark:bg-blue-900/30 dark:text-blue-300">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {data.orders.toLocaleString()}
          </div>

          <div className="flex items-center">
            {pendingOrders > 0 ? (
              <div className="flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <AlertCircle className="mr-1 h-3 w-3" />
                {pendingOrders} pending orders
              </div>
            ) : (
              <div className="flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                All orders processed
              </div>
            )}
          </div>
        </CardContent>
      </motion.div>

      {/* Products Card */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="group relative overflow-hidden rounded-xl bg-white transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl dark:bg-gray-800"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-80"></div>
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-teal-600"></div>

        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Products</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform duration-300 group-hover:scale-110 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Package className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {data.products.toLocaleString()}
          </div>

          <div className="flex items-center">
            {lowStockCount > 0 ? (
              <div className="flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                <AlertCircle className="mr-1 h-3 w-3 animate-pulse" />
                {lowStockCount} low stock items
              </div>
            ) : (
              <div className="flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                All items in stock
              </div>
            )}
          </div>
        </CardContent>
      </motion.div>

      {/* Customers Card */}
      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="group relative overflow-hidden rounded-xl bg-white transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl dark:bg-gray-800"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 opacity-80"></div>
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-500 to-orange-600"></div>

        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Customers</h3>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition-transform duration-300 group-hover:scale-110 dark:bg-amber-900/30 dark:text-amber-300">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {data.users.toLocaleString()}
          </div>

          <div className="flex items-center">
            <div className="flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {newsletterSubscribers} newsletter subscribers
            </div>
          </div>
        </CardContent>
      </motion.div>
    </div>
  )
}

