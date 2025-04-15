"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import Image from "next/image"
import { useMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { useOnClickOutside } from "@/hooks/use-on-click-outside"

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
          ? "bg-cherry-900/20 text-white font-medium"
          : "text-cherry-100/70 hover:bg-cherry-900/30 hover:text-white",
        isCollapsed && "justify-center py-2 px-2",
      )}
      onClick={onClick}
    >
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-cherry-300 rounded-r-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
      <motion.div
        className={cn("relative z-10 transition-transform duration-200")}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {icon}
      </motion.div>

      {!isCollapsed && (
        <AnimatePresence mode="wait">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="font-medium"
          >
            {title}
          </motion.span>
        </AnimatePresence>
      )}

      {!isCollapsed && badge && badge > 0 && (
        <motion.span
          className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-cherry-300 text-xs font-medium text-cherry-950"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {badge > 99 ? "99+" : badge}
        </motion.span>
      )}

      {isCollapsed && badge && badge > 0 && (
        <motion.span
          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cherry-300 text-[10px] font-medium text-cherry-950"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {badge > 9 ? "9+" : badge}
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
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
    } else {
      // Get saved preference from localStorage for desktop
      const savedState = localStorage.getItem("adminSidebarCollapsed")
      if (savedState !== null) {
        setIsCollapsed(savedState === "true")
      }
    }
  }, [isMobile])

  // Save sidebar state to localStorage when it changes (only on desktop)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem("adminSidebarCollapsed", isCollapsed.toString())
    }
  }, [isCollapsed, isMobile])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Close sidebar when clicking outside on mobile
  useOnClickOutside(sidebarRef, () => {
    if (isMobile && isMobileMenuOpen) {
      setIsMobileMenuOpen(false)
    }
  })

  const handleLogout = async () => {
    await logout()
    router.push("/admin/login")
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center px-3 py-2 bg-gradient-to-r from-cherry-800 to-cherry-700 border-b border-cherry-700">
        <motion.div
          className={cn("flex items-center gap-2 cursor-pointer", isCollapsed ? "justify-center w-full" : "")}
          onClick={toggleSidebar}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white p-1">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <motion.span
              className="text-lg font-bold text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              Mizizzi
            </motion.span>
          )}
        </motion.div>

        {isMobile && isMobileMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-cherry-700/50 text-white hover:bg-cherry-600/50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 py-4 px-2">
        <nav className="grid gap-1">
          <div className={cn("mb-2 px-4 text-xs font-semibold text-cherry-300", isCollapsed && "sr-only")}>
            MAIN MENU
          </div>
          <SidebarItem
            icon={<LayoutDashboard className={cn("h-5 w-5", pathname === "/admin" && "text-cherry-300")} />}
            title="Dashboard"
            href="/admin"
            isCollapsed={isCollapsed}
            isActive={pathname === "/admin"}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <ShoppingBag
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/orders") && "text-cherry-300")}
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
              <Package className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/products") && "text-cherry-300")} />
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
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/categories") && "text-cherry-300")}
              />
            }
            title="Categories"
            href="/admin/categories"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/categories")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={<Tag className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/brands") && "text-cherry-300")} />}
            title="Brands"
            href="/admin/brands"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/brands")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Users className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/customers") && "text-cherry-300")} />
            }
            title="Customers"
            href="/admin/customers"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/customers")}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-cherry-800/50"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-cherry-300", isCollapsed && "sr-only")}>
            SALES & MARKETING
          </div>

          <SidebarItem
            icon={
              <Percent
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/discounts") && "text-cherry-300")}
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
              <Zap className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/flash-sales") && "text-cherry-300")} />
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
              <Gift className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/vouchers") && "text-cherry-300")} />
            }
            title="Vouchers"
            href="/admin/vouchers"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/vouchers")}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <SidebarItem
            icon={
              <Star className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/reviews") && "text-cherry-300")} />
            }
            title="Reviews"
            href="/admin/reviews"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/reviews")}
            badge={3}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-cherry-800/50"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-cherry-300", isCollapsed && "sr-only")}>
            OPERATIONS
          </div>

          <SidebarItem
            icon={
              <Truck className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/shipping") && "text-cherry-300")} />
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
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/payments") && "text-cherry-300")}
              />
            }
            title="Payments"
            href="/admin/payments"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/payments")}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-cherry-800/50"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-cherry-300", isCollapsed && "sr-only")}>
            INSIGHTS
          </div>

          <SidebarItem
            icon={
              <BarChart3
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/analytics") && "text-cherry-300")}
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
              <FileText className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/reports") && "text-cherry-300")} />
            }
            title="Reports"
            href="/admin/reports"
            isCollapsed={isCollapsed}
            isActive={(pathname ?? "").startsWith("/admin/reports")}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {!isCollapsed && <div className="my-2 border-t border-cherry-800/50"></div>}

          <div className={cn("mt-4 mb-2 px-4 text-xs font-semibold text-cherry-300", isCollapsed && "sr-only")}>
            SUPPORT
          </div>

          <SidebarItem
            icon={
              <MessageSquare
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/messages") && "text-cherry-300")}
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
              <HelpCircle className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/help") && "text-cherry-300")} />
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
                className={cn("h-5 w-5", (pathname ?? "").startsWith("/admin/settings") && "text-cherry-300")}
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
      <div className="mt-auto border-t border-cherry-800 p-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-cherry-100/70 hover:bg-cherry-900/30 hover:text-white",
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

  // Mobile sidebar implementation
  if (isMobile) {
    return (
      <>
        {/* Mobile Collapsed Sidebar */}
        <div
          className={cn(
            "w-[60px] relative flex flex-col border-r border-cherry-800 bg-cherry-950 shadow-sm z-40",
            isMobileMenuOpen ? "hidden" : "block",
          )}
        >
          <div
            className="flex h-16 items-center justify-center border-b border-cherry-800 bg-gradient-to-r from-cherry-800 to-cherry-700 cursor-pointer"
            onClick={() => setIsMobileMenuOpen(true)}
          >
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

          {/* Quick access icons for mobile */}
          <nav className="mt-2 grid gap-1 px-2">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg text-cherry-100/70 hover:bg-cherry-900/30 hover:text-white",
                  pathname === "/admin" && "bg-cherry-900/20 text-white",
                )}
                onClick={() => router.push("/admin")}
              >
                <LayoutDashboard className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg text-cherry-100/70 hover:bg-cherry-900/30 hover:text-white",
                  (pathname ?? "").startsWith("/admin/orders") && "bg-cherry-900/20 text-white",
                )}
                onClick={() => router.push("/admin/orders")}
              >
                <ShoppingBag className="h-5 w-5" />
              </Button>
              <motion.span
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cherry-300 text-[10px] font-medium text-cherry-950"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                5
              </motion.span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-lg text-cherry-100/70 hover:bg-cherry-900/30 hover:text-white",
                  (pathname ?? "").startsWith("/admin/products") && "bg-cherry-900/20 text-white",
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
                  "h-10 w-10 rounded-lg text-cherry-100/70 hover:bg-cherry-900/30 hover:text-white",
                  (pathname ?? "").startsWith("/admin/categories") && "bg-cherry-900/20 text-white",
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
                  "h-10 w-10 rounded-lg text-cherry-100/70 hover:bg-cherry-900/30 hover:text-white",
                  (pathname ?? "").startsWith("/admin/customers") && "bg-cherry-900/20 text-white",
                )}
                onClick={() => router.push("/admin/customers")}
              >
                <Users className="h-5 w-5" />
              </Button>
            </motion.div>
          </nav>
        </div>

        {/* Mobile Full Sidebar */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                ref={sidebarRef}
                className="fixed inset-y-0 left-0 w-[280px] bg-cherry-950 border-r border-cherry-800 shadow-xl z-50 flex flex-col"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              >
                <SidebarContent />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  // Desktop sidebar
  return (
    <motion.div
      className={cn(
        "relative flex flex-col border-r border-cherry-800 bg-cherry-950 shadow-sm",
        isCollapsed ? "w-[60px]" : "w-[240px]",
      )}
      initial={false}
      animate={{ width: isCollapsed ? "60px" : "240px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <SidebarContent />
    </motion.div>
  )
}
