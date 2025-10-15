"use client"

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
import { User, Package, ShoppingCart, Settings, Edit, Trash, Eye, Plus } from "lucide-react"

interface Activity {
  id: string
  type: "user" | "product" | "order" | "system" | "admin"
  action: string
  user: {
    name: string
    avatar_url?: string
  }
  target?: string
  created_at: string
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>No recent activities found</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          <p>Activity logs will appear here</p>
        </CardContent>
      </div>
    )
  }

  const getActivityIcon = (type: string, action: string) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4" />
      case "product":
        if (action.includes("add") || action.includes("create")) return <Plus className="h-4 w-4" />
        if (action.includes("edit") || action.includes("update")) return <Edit className="h-4 w-4" />
        if (action.includes("delete")) return <Trash className="h-4 w-4" />
        if (action.includes("view")) return <Eye className="h-4 w-4" />
        return <Package className="h-4 w-4" />
      case "order":
        return <ShoppingCart className="h-4 w-4" />
      case "admin":
        return <User className="h-4 w-4" />
      case "system":
        return <Settings className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string, action: string) => {
    if (action.includes("delete") || action.includes("remove"))
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
    if (action.includes("add") || action.includes("create"))
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
    if (action.includes("edit") || action.includes("update"))
      return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"

    switch (type) {
      case "user":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      case "product":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
      case "order":
        return "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
      case "admin":
        return "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
      case "system":
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  return (
    <div>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions across your store</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[350px] overflow-auto pr-2">
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-start space-x-4 rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${getActivityColor(activity.type, activity.action)}`}
              >
                {getActivityIcon(activity.type, activity.action)}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  <span className="font-semibold">{activity.user.name}</span> {activity.action}
                  {activity.target && <span className="font-medium"> {activity.target}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </div>
  )
}

