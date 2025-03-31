"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
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
    return <div className="text-center py-6 text-muted-foreground">No recent customers found</div>
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => (
        <div key={customer.id} className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage
                src={customer.avatar_url || "/placeholder-avatar.png"}
                alt={`${customer.name || "User"}'s avatar`}
                width={40}
                height={40}
              />
              <AvatarFallback>{customer.name ? customer.name.substring(0, 2).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{customer.name || "Anonymous User"}</p>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
              <p className="text-xs text-muted-foreground">Joined {formatDate(customer.created_at)}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={() => (window.location.href = `mailto:${customer.email}`)}>
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/admin/customers/${customer.id}`)}>
              View
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
