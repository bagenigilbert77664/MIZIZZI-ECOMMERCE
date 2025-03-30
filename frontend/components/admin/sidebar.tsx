"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tag,
  Layers,
  BarChart3,
  MessageSquare,
  LogOut,
  Truck,
  Star,
  Percent,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface SidebarItemProps {
  icon: React.ReactNode
  title: string
  href: string
  isCollapsed: boolean
  isActive?: boolean
  badge?: number
}

function SidebarItem({ icon, title, href, isCollapsed, isActive, badge }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
        isActive ? "bg-cherry-100 text-cherry-900 font-medium" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        isCollapsed && "justify-center py-2 px-2",
      )}
    >
      {icon}
      {!isCollapsed && <span>{title}</span>}
      {!isCollapsed && badge && badge > 0 && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-cherry-100 text-xs font-medium text-cherry-900">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  )
}

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { logout } = useAdminAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-white transition-all duration-300",
        isCollapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <div className="flex h-14 items-center border-b px-3 py-2">
        {!isCollapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-cherry-100 p-1">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                alt="Mizizzi Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-lg font-bold">Mizizzi</span>
          </Link>
        )}
        {isCollapsed && (
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-cherry-100 p-1 mx-auto">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-white"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          <SidebarItem
            icon={<LayoutDashboard className="h-4 w-4" />}
            title="Dashboard"
            href="/admin"
            isCollapsed={isCollapsed}
            isActive={pathname === "/admin"}
          />
          <SidebarItem
            icon={<ShoppingBag className="h-4 w-4" />}
            title="Orders"
            href="/admin/orders"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/orders")}
            badge={5}
          />
          <SidebarItem
            icon={<Package className="h-4 w-4" />}
            title="Products"
            href="/admin/products"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/products")}
          />
          <SidebarItem
            icon={<Layers className="h-4 w-4" />}
            title="Categories"
            href="/admin/categories"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/categories")}
          />
          <SidebarItem
            icon={<Tag className="h-4 w-4" />}
            title="Brands"
            href="/admin/brands"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/brands")}
          />
          <SidebarItem
            icon={<Users className="h-4 w-4" />}
            title="Customers"
            href="/admin/customers"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/customers")}
          />
          <SidebarItem
            icon={<CreditCard className="h-4 w-4" />}
            title="Payments"
            href="/admin/payments"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/payments")}
          />
          <SidebarItem
            icon={<Truck className="h-4 w-4" />}
            title="Shipping"
            href="/admin/shipping"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/shipping")}
          />
          <SidebarItem
            icon={<Star className="h-4 w-4" />}
            title="Reviews"
            href="/admin/reviews"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/reviews")}
            badge={3}
          />
          <SidebarItem
            icon={<Percent className="h-4 w-4" />}
            title="Discounts"
            href="/admin/discounts"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/discounts")}
          />
          <SidebarItem
            icon={<BarChart3 className="h-4 w-4" />}
            title="Analytics"
            href="/admin/analytics"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/analytics")}
          />
          <SidebarItem
            icon={<MessageSquare className="h-4 w-4" />}
            title="Messages"
            href="/admin/messages"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/messages")}
            badge={12}
          />
          <SidebarItem
            icon={<Settings className="h-4 w-4" />}
            title="Settings"
            href="/admin/settings"
            isCollapsed={isCollapsed}
            isActive={pathname.startsWith("/admin/settings")}
          />
        </nav>
      </ScrollArea>
      <div className="mt-auto border-t p-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            isCollapsed && "justify-center px-0",
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  )
}

