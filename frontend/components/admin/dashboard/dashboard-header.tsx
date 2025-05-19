"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Download, Filter, RefreshCw, ChevronDown, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface DashboardHeaderProps {
  onRefresh: () => void
  isRefreshing: boolean
  dateRange?: {
    from: Date
    to: Date
  }
  setDateRange?: (range: { from: Date; to: Date }) => void
  userName?: string
}

export function DashboardHeader({
  onRefresh,
  isRefreshing,
  dateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  },
  setDateRange,
  userName = "Admin User",
}: DashboardHeaderProps) {
  const [greeting, setGreeting] = useState("")
  const [showStats, setShowStats] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Get appropriate greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good morning")
    else if (hour < 18) setGreeting("Good afternoon")
    else setGreeting("Good evening")

    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Format date range for display
  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
    const fromStr = dateRange.from.toLocaleDateString("en-US", options)
    const toStr = dateRange.to.toLocaleDateString("en-US", options)
    return `${fromStr} - ${toStr}`
  }

  // Mock data for quick stats
  const quickStats = [
    { label: "Today's Sales", value: "$4,289", change: "+12.5%", positive: true },
    { label: "Active Users", value: "1,342", change: "+8.3%", positive: true },
    { label: "Pending Orders", value: "28", change: "-3.2%", positive: false },
  ]

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                Dashboard
              </h1>
              <Badge
                variant="outline"
                className="ml-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
              >
                Admin
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-gray-500 dark:text-gray-400">
                {greeting}, <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span>
              </p>
              <span className="text-gray-400 dark:text-gray-500 text-sm">•</span>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex items-center w-full sm:w-auto">
              <motion.div
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setDateRange && setDateRange(dateRange)}
              >
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>{formatDateRange()}</span>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </motion.div>

              {/* Date picker would go here */}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filter</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>All Data</DropdownMenuItem>
                  <DropdownMenuItem>Sales Only</DropdownMenuItem>
                  <DropdownMenuItem>Users Only</DropdownMenuItem>
                  <DropdownMenuItem>Products Only</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                  <DropdownMenuItem>Export as Excel</DropdownMenuItem>
                  <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div
          className="mt-4"
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: showStats ? "auto" : 0,
            opacity: showStats ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          {showStats && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                {quickStats.map((stat, index) => (
                  <Card key={index} className="p-3 border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm ${stat.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {stat.positive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4 transform rotate-180" />
                        )}
                        <span>{stat.change}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </motion.div>

        <div className="flex justify-center mt-2">
          <motion.button
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            onClick={() => setShowStats(!showStats)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-300 ${showStats ? "transform rotate-180" : ""}`}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
