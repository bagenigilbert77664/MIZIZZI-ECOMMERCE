"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  HelpCircle,
  FileText,
  Gift,
  Zap,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import Image from "next/image"
import { useMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"

interface SidebarItemProps {
  icon: React.ReactNode
  title: string
  href: string
  isCollapsed: boolean
  isActive?: boolean
  badge?: number
  onClick?: () => void
}

function SidebarItem({ icon, title, href, isCollapsed, isActive, badge, onClick }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all relative overflow-hidden group",
        isActive
          ? "bg-orange-50 text-orange-600 font-medium"
          : "text-gray-600 hover:bg-orange-50/50 hover:text-orange-600",
        isCollapsed && "justify-center py-2 px-2",
      )}
      onClick={onClick}
    >
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-r-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
      <div className={cn("relative z-10 transition-transform duration-200", !isActive && "group-hover:scale-110")}>
        {icon}
      </div>

      {!isCollapsed && (
        <AnimatePresence mode="wait">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {title}
          </motion.span>
        </AnimatePresence>
      )}

      {!isCollapsed && badge && badge > 0 && (
        <motion.span
          className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-medium text-white"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {badge > 99 ? "99+" : badge}
        </motion.span>
      )}
    </Link>
  )
}

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname() || ""
  const { logout } = useAdminAuth()
  const router = useRouter()
  const isMobile = useMobile()

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
    }
  }, [isMobile])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center border-b px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600">
        {!isCollapsed && (
          <Link href="/admin" className="flex items-center gap-2">
            <motion.div
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white p-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                alt="Mizizzi Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </motion.div>
            <motion.span
              className="text-lg font-bold text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              Mizizzi
            </motion.span>
          </Link>
        )}
        {isCollapsed && (
          <motion.div
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white p-1 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </motion.div>
        )}
        {!isMobile && (
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-3 top-7 h-6 w-6 rounded-full border bg-white shadow-md text-orange-500 hover:bg-orange-50"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>
          </motion.div>
        )}
        {isMobile && isMobileMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/20 text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          <div className={cn("mb-2 px-4 text-xs font-semibold text-gray-400", isCollapsed && "sr-only")}>MAIN MENU</div>
          <SidebarItem
            icon={<LayoutDashboard className={cn("h-5 w-5", pathname === "/admin" && "text-orange-500")} />}
            title="Dashboard"
            href="/admin"
            isCollapsed={isCollapsed}
            isActive={pathname === "/admin"}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <ShoppingBag
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/orders") && "text-orange-500")}
              />
            }
            title="Orders"
            href="/admin/orders"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/orders")}
            badge={5}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Package className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/products") && "text-orange-500")} />
            }
            title="Products"
            href="/admin/products"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/products")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Layers
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/categories") && "text-orange-500")}
              />
            }
            title="Categories"
            href="/admin/categories"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/categories")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={<Tag className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/brands") && "text-orange-500")} />}
            title="Brands"
            href="/admin/brands"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/brands")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Users className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/customers") && "text-orange-500")} />
            }
            title="Customers"
            href="/admin/customers"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/customers")}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-gray-100"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-gray-400", isCollapsed && "sr-only")}>
            SALES & MARKETING
          </div>

          <SidebarItem
            icon={
              <Percent
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/discounts") && "text-orange-500")}
              />
            }
            title="Promotions"
            href="/admin/discounts"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/discounts")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Zap className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/flash-sales") && "text-orange-500")} />
            }
            title="Flash Sales"
            href="/admin/flash-sales"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/flash-sales")}
            badge={2}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Gift className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/vouchers") && "text-orange-500")} />
            }
            title="Vouchers"
            href="/admin/vouchers"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/vouchers")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Star className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/reviews") && "text-orange-500")} />
            }
            title="Reviews"
            href="/admin/reviews"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/reviews")}
            badge={3}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-gray-100"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-gray-400", isCollapsed && "sr-only")}>
            OPERATIONS
          </div>

          <SidebarItem
            icon={
              <Truck className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/shipping") && "text-orange-500")} />
            }
            title="Shipping"
            href="/admin/shipping"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/shipping")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <CreditCard
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/payments") && "text-orange-500")}
              />
            }
            title="Payments"
            href="/admin/payments"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/payments")}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-gray-100"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-gray-400", isCollapsed && "sr-only")}>
            INSIGHTS
          </div>

          <SidebarItem
            icon={
              <BarChart3
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/analytics") && "text-orange-500")}
              />
            }
            title="Analytics"
            href="/admin/analytics"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/analytics")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <FileText className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/reports") && "text-orange-500")} />
            }
            title="Reports"
            href="/admin/reports"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/reports")}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-gray-100"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-gray-400", isCollapsed && "sr-only")}>
            SUPPORT
          </div>

          <SidebarItem
            icon={
              <MessageSquare
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/messages") && "text-orange-500")}
              />
            }
            title="Messages"
            href="/admin/messages"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/messages")}
            badge={12}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <HelpCircle className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/help") && "text-orange-500")} />
            }
            title="Help Center"
            href="/admin/help"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/help")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Settings
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/settings") && "text-orange-500")}
              />
            }
            title="Settings"
            href="/admin/settings"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/settings")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </nav>
      </ScrollArea>
      <div className="mt-auto border-t p-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-600 hover:bg-orange-50 hover:text-orange-600",
              isCollapsed && "justify-center px-0",
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </motion.div>
      </div>
    </>
  )

  // If mobile, render a collapsible sidebar using Sheet component
  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "w-[60px] relative flex flex-col border-r bg-white shadow-sm",
            isMobileMenuOpen ? "hidden" : "block",
          )}
        >
          <div className="flex h-16 items-center justify-center border-b bg-gradient-to-r from-orange-500 to-orange-600">
            <motion.div
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white p-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                alt="Mizizzi Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </motion.div>
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mx-auto mt-2 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                  aria-label="Open Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </motion.div>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] sm:max-w-sm">
              <div className="flex flex-col h-full">
                <SidebarContent />
              </div>
            </SheetContent>
          </Sheet>
          <nav className="mt-2 grid gap-1 px-2">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 rounded-lg", pathname === "/admin" && "bg-orange-50 text-orange-600")}
                onClick={() => router.push("/admin")}
              >
                <LayoutDashboard className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg",
                  (pathname ?? "").startsWith("/admin/orders") && "bg-orange-50 text-orange-600",
                )}
                onClick={() => router.push("/admin/orders")}
              >
                <ShoppingBag className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg",
                  (pathname ?? "").startsWith("/admin/products") && "bg-orange-50 text-orange-600",
                )}
                onClick={() => router.push("/admin/products")}
              >
                <Package className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg",
                  (pathname ?? "").startsWith("/admin/categories") && "bg-orange-50 text-orange-600",
                )}
                onClick={() => router.push("/admin/categories")}
              >
                <Layers className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg",
                  (pathname ?? "").startsWith("/admin/customers") && "bg-orange-50 text-orange-600",
                )}
                onClick={() => router.push("/admin/customers")}
              >
                <Users className="h-5 w-5" />
              </Button>
            </motion.div>
          </nav>
        </div>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setIsMobileMenuOpen(false)} />
        )}
      </>
    )
  }

  // Desktop sidebar
  return (
    <motion.div
      className={cn("relative flex flex-col border-r bg-white shadow-sm", isCollapsed ? "w-[60px]" : "w-[240px]")}
      initial={false}
      animate={{ width: isCollapsed ? "60px" : "240px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <SidebarContent />
    </motion.div>
  )
}

