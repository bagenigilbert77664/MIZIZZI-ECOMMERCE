"use client"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Mail, ExternalLink, UserPlus, Users } from "lucide-react"
import { useRouter } from "next/navigation"

interface Customer {
  id: string
  name: string
  email: string
  created_at: string
  avatar_url?: string
}

interface RecentCustomersProps {
  customers: Customer[]
}

export function RecentCustomers({ customers }: RecentCustomersProps) {
  const router = useRouter()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  if (!customers || customers.length === 0) {
    return (
      <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No customers yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
            When customers sign up or make purchases, they'll appear here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="bg-cherry-600 hover:bg-cherry-700 text-white gap-2"
              onClick={() => router.push("/admin/customers/new")}
            >
              <UserPlus className="h-4 w-4" />
              Add Customer
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => router.push("/admin/marketing")}>
              <Mail className="h-4 w-4" />
              Send Invites
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div className="space-y-4 p-6" variants={container} initial="hidden" animate="show">
      {customers.slice(0, 5).map((customer, index) => (
        <motion.div
          key={customer.id}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          variants={item}
          whileHover={{ x: 5 }}
        >
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
              <AvatarImage
                src={customer.avatar_url || "/placeholder.svg?height=40&width=40"}
                alt={`${customer.name || "User"}'s avatar`}
              />
              <AvatarFallback className="bg-cherry-100 dark:bg-cherry-900/30 text-cherry-600 dark:text-cherry-400">
                {customer.name ? customer.name.substring(0, 2).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{customer.name || "Anonymous User"}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{customer.email}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Joined {formatDate(customer.created_at)}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(`mailto:${customer.email}`, "_blank")}
              className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              title="Send email"
            >
              <Mail className="h-4 w-4" />
              <span className="sr-only">Email customer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/customers/${customer.id}`)}
              className="h-8 px-2 text-xs gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </Button>
          </div>
        </motion.div>
      ))}

      {customers.length > 5 && (
        <motion.div className="mt-4 text-center pt-2 border-t border-gray-100 dark:border-gray-800" variants={item}>
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/customers")} className="text-xs">
            View all {customers.length} customers
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}
