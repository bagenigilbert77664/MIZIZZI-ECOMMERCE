"use client"

import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Customer {
  id: string
  name: string
  email: string
  created_at: string
}

interface RecentCustomersProps {
  customers: Customer[]
}

export function RecentCustomers({ customers }: RecentCustomersProps) {
  const router = useRouter()

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center bg-gray-50 rounded-md">
        <p className="text-gray-500">No recent customers</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${customer.name}`} />
              <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{customer.name}</h3>
              <p className="text-sm text-gray-500">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500 hidden sm:block">{formatDate(customer.created_at)}</p>
            <Button variant="outline" size="sm" onClick={() => router.push(`/admin/customers/${customer.id}`)}>
              View
            </Button>
          </div>
        </div>
      ))}
      <div className="flex justify-center pt-2">
        <Button variant="link" onClick={() => router.push("/admin/customers")}>
          View All Customers
        </Button>
      </div>
    </div>
  )
}

