"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Mail, User, ExternalLink } from "lucide-react"
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

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-gray-400 dark:text-gray-500">
          <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No recent customers found</p>
          <p className="text-xs mt-2">New customers will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {customers.slice(0, 5).map((customer) => (
        <div
          key={customer.id}
          className="flex items-center justify-between space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
              <AvatarImage
                src={customer.avatar_url || "/placeholder-avatar.png"}
                alt={`${customer.name || "User"}'s avatar`}
                width={40}
                height={40}
              />
              <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
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
        </div>
      ))}

      {customers.length > 5 && (
        <div className="mt-4 text-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/customers")} className="text-xs">
            View all customers
          </Button>
        </div>
      )}
    </div>
  )
}
