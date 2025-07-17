"use client"

import {
  AlertCircle,
  BarChart3,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  Globe,
  Mail,
  Package,
  Percent,
  RefreshCcw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Star,
  TrendingDown,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
} from "lucide-react"
import { motion } from "framer-motion"

import { formatCurrency } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface DashboardCardsProps {
  data: any // Replace 'any' with the actual type of your data
  sales: any // Replace 'any' with the actual type of your sales data
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
        icon: <Users className="h-6 w-6" />,
        color: "from-cherry-600 to-cherry-800",
        hoverColor: "from-cherry-700 to-cherry-900",
        growth: {
          value: data.new_signups_week,
          label: "new this week",
          positive: true,
        },
      },
      {
        title: "Total Revenue",
        value: formatCurrency(sales.total_revenue || 0),
        icon: <DollarSign className="h-6 w-6" />,
        color: "from-emerald-500 to-green-600",
        hoverColor: "from-emerald-600 to-green-700",
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
        icon: <ShoppingCart className="h-6 w-6" />,
        color: "from-cherry-500 to-cherry-700",
        hoverColor: "from-cherry-600 to-cherry-800",
        growth: {
          value: data.orders_in_transit,
          label: "in transit",
          positive: true,
        },
      },
      {
        title: "Products in Stock",
        value: data.products?.toLocaleString() || "0",
        icon: <Package className="h-6 w-6" />,
        color: "from-amber-500 to-orange-600",
        hoverColor: "from-amber-600 to-orange-700",
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
        icon: <UserPlus className="h-6 w-6" />,
        color: "from-cherry-400 to-cherry-600",
        hoverColor: "from-cherry-500 to-cherry-700",
        growth: {
          value: data.new_signups_week,
          label: "this week",
          positive: true,
        },
      },
      {
        title: "Newsletter Subs",
        value: data.newsletter_subscribers?.toLocaleString() || "0",
        icon: <Mail className="h-6 w-6" />,
        color: "from-pink-500 to-cherry-600",
        hoverColor: "from-pink-600 to-cherry-700",
        growth: null,
      },
      {
        title: "Reviews",
        value: data.reviews?.toLocaleString() || "0",
        icon: <Star className="h-6 w-6" />,
        color: "from-yellow-500 to-amber-600",
        hoverColor: "from-yellow-600 to-amber-700",
        growth: {
          value: data.pending_reviews,
          label: "pending",
          positive: true,
        },
      },
      {
        title: "Active Visitors",
        value: "12",
        icon: <Eye className="h-6 w-6" />,
        color: "from-cherry-500 to-cherry-700",
        hoverColor: "from-cherry-600 to-cherry-800",
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
        icon: <Truck className="h-6 w-6" />,
        color: "from-teal-500 to-cyan-600",
        hoverColor: "from-teal-600 to-cyan-700",
        growth: null,
      },
      {
        title: "Pending Payments",
        value: formatCurrency(sales.pending_amount || 0),
        icon: <CreditCard className="h-6 w-6" />,
        color: "from-cherry-500 to-cherry-700",
        hoverColor: "from-cherry-600 to-cherry-800",
        growth: null,
      },
      {
        title: "Low Stock Products",
        value: data.low_stock_count?.toLocaleString() || "0",
        icon: <AlertCircle className="h-6 w-6" />,
        color: "from-red-500 to-cherry-600",
        hoverColor: "from-red-600 to-cherry-700",
        growth: null,
      },
      {
        title: "Abandoned Carts",
        value: "3",
        icon: <ShoppingBag className="h-6 w-6" />,
        color: "from-orange-500 to-amber-600",
        hoverColor: "from-orange-600 to-amber-700",
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
        icon: <Percent className="h-6 w-6" />,
        color: "from-cherry-500 to-cherry-700",
        hoverColor: "from-cherry-600 to-cherry-800",
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
        icon: <BarChart3 className="h-6 w-6" />,
        color: "from-cyan-500 to-blue-600",
        hoverColor: "from-cyan-600 to-blue-700",
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
        icon: <RefreshCcw className="h-6 w-6" />,
        color: "from-lime-500 to-green-600",
        hoverColor: "from-lime-600 to-green-700",
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
        icon: <Clock className="h-6 w-6" />,
        color: "from-cherry-400 to-cherry-600",
        hoverColor: "from-cherry-500 to-cherry-700",
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
        icon: <Globe className="h-6 w-6" />,
        color: "from-cherry-500 to-cherry-700",
        hoverColor: "from-cherry-600 to-cherry-800",
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
        icon: <Smartphone className="h-6 w-6" />,
        color: "from-emerald-500 to-green-600",
        hoverColor: "from-emerald-600 to-green-700",
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
        icon: <ShoppingBag className="h-6 w-6" />,
        color: "from-amber-500 to-orange-600",
        hoverColor: "from-amber-600 to-orange-700",
        growth: null,
      },
      {
        title: "Brands",
        value: data.brands?.toLocaleString() || "0",
        icon: <Star className="h-6 w-6" />,
        color: "from-cherry-400 to-cherry-600",
        hoverColor: "from-cherry-500 to-cherry-700",
        growth: null,
      },
    ],
  }

  // Function to get color values for CSS
  const getColorValue = (colorString: string) => {
    return colorString
      .replace("from-cherry-600 to-cherry-800", "#be123c, #9f1239")
      .replace("from-cherry-700 to-cherry-900", "#9f1239, #881337")
      .replace("from-cherry-500 to-cherry-700", "#f43f5e, #be123c")
      .replace("from-cherry-600 to-cherry-800", "#e11d48, #9f1239")
      .replace("from-cherry-400 to-cherry-600", "#fb7185, #e11d48")
      .replace("from-cherry-500 to-cherry-700", "#f43f5e, #be123c")
      .replace("from-emerald-500 to-green-600", "#10b981, #16a34a")
      .replace("from-emerald-600 to-green-700", "#059669, #15803d")
      .replace("from-amber-500 to-orange-600", "#f59e0b, #ea580c")
      .replace("from-amber-600 to-orange-700", "#d97706, #c2410c")
      .replace("from-pink-500 to-cherry-600", "#ec4899, #e11d48")
      .replace("from-pink-600 to-cherry-700", "#db2777, #be123c")
      .replace("from-yellow-500 to-amber-600", "#eab308, #d97706")
      .replace("from-yellow-600 to-amber-700", "#ca8a04, #b45309")
      .replace("from-teal-500 to-cyan-600", "#14b8a6, #0891b2")
      .replace("from-teal-600 to-cyan-700", "#0d9488, #0e7490")
      .replace("from-red-500 to-cherry-600", "#ef4444, #e11d48")
      .replace("from-red-600 to-cherry-700", "#dc2626, #be123c")
      .replace("from-orange-500 to-amber-600", "#f97316, #d97706")
      .replace("from-orange-600 to-amber-700", "#ea580c, #b45309")
      .replace("from-cyan-500 to-blue-600", "#06b6d4, #2563eb")
      .replace("from-cyan-600 to-blue-700", "#0891b2, #1d4ed8")
      .replace("from-lime-500 to-green-600", "#84cc16, #16a34a")
      .replace("from-lime-600 to-green-700", "#65a30d, #15803d")
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="main" className="w-full">
        <div className="overflow-x-auto pb-4">
          <TabsList className="bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-full flex justify-between">
            <TabsTrigger
              value="main"
              className="text-sm font-medium rounded-lg py-2.5 px-4 data-[state=active]:bg-cherry-50 data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Main
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="text-sm font-medium rounded-lg py-2.5 px-4 data-[state=active]:bg-cherry-50 data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Customers
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="text-sm font-medium rounded-lg py-2.5 px-4 data-[state=active]:bg-cherry-50 data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-sm font-medium rounded-lg py-2.5 px-4 data-[state=active]:bg-cherry-50 data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="platform"
              className="text-sm font-medium rounded-lg py-2.5 px-4 data-[state=active]:bg-cherry-50 data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-white"
            >
              Platform
            </TabsTrigger>
          </TabsList>
        </div>

        {Object.entries(allCards).map(([category, cards]) => (
          <TabsContent key={category} value={category} className="mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {cards.map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700"
                >
                  {/* Decorative gradient element */}
                  <div
                    className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${getColorValue(card.color)})`,
                    }}
                  />

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-3 rounded-lg text-white"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${getColorValue(card.color)})`,
                          }}
                        >
                          {card.icon}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{card.title}</h3>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <div className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">{card.value}</div>

                      {card.growth && (
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${
                              card.growth.positive
                                ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            }`}
                          >
                            {card.growth.positive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span>
                              {"isPercentage" in card.growth && card.growth.isPercentage
                                ? `${Math.abs(card.growth.value as number).toFixed(1)}%`
                                : card.growth.value}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{card.growth.label}</span>
                        </div>
                      )}
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
