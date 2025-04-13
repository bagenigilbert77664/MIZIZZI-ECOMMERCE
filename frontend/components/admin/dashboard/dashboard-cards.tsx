"use client"

import {
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Truck,
  CreditCard,
  UserPlus,
  Eye,
  Clock,
  BarChart3,
  Star,
  Mail,
  ShoppingBag,
  Percent,
  RefreshCcw,
  Globe,
  Smartphone,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMobile } from "@/styles/hooks/use-mobile"

interface DashboardCardsProps {
  data: {
    users?: number
    products?: number
    orders?: number
    new_signups_today?: number
    new_signups_week?: number
    orders_in_transit?: number
    pending_payments?: number
    low_stock_count?: number
    categories?: number
    brands?: number
    reviews?: number
    pending_reviews?: number
    newsletter_subscribers?: number
  }
  sales: {
    today?: number
    yesterday?: number
    weekly?: number
    monthly?: number
    yearly?: number
    total_revenue?: number
    pending_amount?: number
  }
}

export function DashboardCards({ data, sales }: DashboardCardsProps) {
  const isMobile = useMobile()

  // Calculate sales growth percentage
  const calculateGrowth = (current = 0, previous = 0) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const dailyGrowth = calculateGrowth(sales.today, sales.yesterday)

  // Define all possible cards with their data
  const allCards = {
    main: [
      {
        title: "Total Users",
        value: data.users?.toLocaleString() || "0",
        icon: <Users className="h-5 w-5" />,
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
        growth: {
          value: data.new_signups_week,
          label: "new this week",
          positive: true,
        },
      },
      {
        title: "Total Revenue",
        value: formatCurrency(sales.total_revenue || 0),
        icon: <DollarSign className="h-5 w-5" />,
        color: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
        growth: {
          value: dailyGrowth,
          label: "from yesterday",
          positive: dailyGrowth > 0,
          isPercentage: true,
        },
      },
      {
        title: "Total Orders",
        value: data.orders?.toLocaleString() || "0",
        icon: <ShoppingCart className="h-5 w-5" />,
        color: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
        growth: {
          value: data.orders_in_transit,
          label: "in transit",
          positive: true,
        },
      },
      {
        title: "Products in Stock",
        value: data.products?.toLocaleString() || "0",
        icon: <Package className="h-5 w-5" />,
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
        growth: {
          value: data.low_stock_count,
          label: "low stock",
          positive: false,
        },
      },
    ],
    customers: [
      {
        title: "New Signups",
        value: data.new_signups_today?.toLocaleString() || "0",
        icon: <UserPlus className="h-5 w-5" />,
        color: "bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700",
        growth: {
          value: data.new_signups_week,
          label: "this week",
          positive: true,
        },
      },
      {
        title: "Newsletter Subs",
        value: data.newsletter_subscribers?.toLocaleString() || "0",
        icon: <Mail className="h-5 w-5" />,
        color: "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700",
        growth: null,
      },
      {
        title: "Reviews",
        value: data.reviews?.toLocaleString() || "0",
        icon: <Star className="h-5 w-5" />,
        color: "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700",
        growth: {
          value: data.pending_reviews,
          label: "pending",
          positive: true,
        },
      },
      {
        title: "Active Visitors",
        value: "12",
        icon: <Eye className="h-5 w-5" />,
        color: "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700",
        growth: {
          value: 3,
          label: "right now",
          positive: true,
        },
      },
    ],
    orders: [
      {
        title: "Orders in Transit",
        value: data.orders_in_transit?.toLocaleString() || "0",
        icon: <Truck className="h-5 w-5" />,
        color: "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700",
        growth: null,
      },
      {
        title: "Pending Payments",
        value: formatCurrency(sales.pending_amount || 0),
        icon: <CreditCard className="h-5 w-5" />,
        color: "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700",
        growth: null,
      },
      {
        title: "Low Stock Products",
        value: data.low_stock_count?.toLocaleString() || "0",
        icon: <AlertCircle className="h-5 w-5" />,
        color: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
        growth: null,
      },
      {
        title: "Abandoned Carts",
        value: "3",
        icon: <ShoppingBag className="h-5 w-5" />,
        color: "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700",
        growth: {
          value: 1,
          label: "today",
          positive: false,
        },
      },
    ],
    analytics: [
      {
        title: "Conversion Rate",
        value: "2.4%",
        icon: <Percent className="h-5 w-5" />,
        color: "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700",
        growth: {
          value: 0.3,
          label: "increase",
          positive: true,
          isPercentage: true,
        },
      },
      {
        title: "Avg. Order Value",
        value: formatCurrency(45.99),
        icon: <BarChart3 className="h-5 w-5" />,
        color: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700",
        growth: {
          value: 2.5,
          label: "increase",
          positive: true,
          isPercentage: true,
        },
      },
      {
        title: "Return Rate",
        value: "1.2%",
        icon: <RefreshCcw className="h-5 w-5" />,
        color: "bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-600 hover:to-green-700",
        growth: {
          value: 0.1,
          label: "decrease",
          positive: true,
          isPercentage: true,
        },
      },
      {
        title: "Processing Time",
        value: "1.4 days",
        icon: <Clock className="h-5 w-5" />,
        color: "bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700",
        growth: {
          value: 0.2,
          label: "faster",
          positive: true,
          isPercentage: false,
        },
      },
    ],
    platform: [
      {
        title: "Web Visitors",
        value: "1,245",
        icon: <Globe className="h-5 w-5" />,
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
        growth: {
          value: 12.5,
          label: "increase",
          positive: true,
          isPercentage: true,
        },
      },
      {
        title: "Mobile Visitors",
        value: "876",
        icon: <Smartphone className="h-5 w-5" />,
        color: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
        growth: {
          value: 8.3,
          label: "increase",
          positive: true,
          isPercentage: true,
        },
      },
      {
        title: "Categories",
        value: data.categories?.toLocaleString() || "0",
        icon: <ShoppingBag className="h-5 w-5" />,
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
        growth: null,
      },
      {
        title: "Brands",
        value: data.brands?.toLocaleString() || "0",
        icon: <Star className="h-5 w-5" />,
        color: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
        growth: null,
      },
    ],
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="main" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <TabsTrigger value="main" className="text-xs sm:text-sm">
              Main
            </TabsTrigger>
            <TabsTrigger value="customers" className="text-xs sm:text-sm">
              Customers
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">
              Orders
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="platform" className="text-xs sm:text-sm">
              Platform
            </TabsTrigger>
          </TabsList>
        </div>

        {Object.entries(allCards).map(([category, cards]) => (
          <TabsContent key={category} value={category} className="mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {cards.map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="shadow-md rounded-xl overflow-hidden"
                >
                  <div className={`w-full h-full text-white ${card.color}`}>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-white/20 p-2 rounded-lg">{card.icon}</div>
                          <span className="font-medium">{card.title}</span>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="text-2xl font-bold mb-2">{card.value}</div>

                        {card.growth && (
                          <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm w-fit">
                            {card.growth.positive ? (
                              <TrendingUp className="mr-1.5 h-4 w-4" />
                            ) : (
                              <TrendingDown className="mr-1.5 h-4 w-4" />
                            )}
                            <span>
                              {"isPercentage" in card.growth && card.growth.isPercentage
                                ? `${Math.abs(card.growth.value as number).toFixed(1)}%`
                                : card.growth.value}{" "}
                              {card.growth.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
