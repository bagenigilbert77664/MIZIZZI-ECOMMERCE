"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tag,
  Layers,
  LogOut,
  X,
  Boxes,
  Search,
  ChevronDown,
  UsersRound,
  Menu,
  BarChart3,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMyAdminAuth } from "@/contexts/myadmin/auth-context"
import ImageComponent from "next/image"
import { useMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { useOnClickOutside } from "@/hooks/use-on-click-outside"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface SidebarItemProps {
  icon: React.ReactNode
  title: string
  href: string
  isCollapsed: boolean
  isActive?: boolean
  badge?: number | string
  onClick?: () => void
  variant?: "default" | "ghost" | "highlight"
}

interface SidebarSectionProps {
  title: string
  isCollapsed: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}

interface MyAdminSidebarProps {
  isCollapsed: boolean
  toggleSidebar: () => void
}

interface SubMenuItemProps {
  title: string
  href: string
  isActive?: boolean
  badge?: number | string
  onClick?: () => void
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.1 } },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.025,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
}

// Enhanced section with collapsible behavior
function SidebarSection({ title, isCollapsed, children, defaultOpen = true }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const toggleSection = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <>
      <div className={cn("mt-4 mb-1", isCollapsed && "mt-4 mb-1")}>
        {!isCollapsed && (
          <button
            onClick={toggleSection}
            className="w-full flex items-center justify-between px-4 py-1 text-xs font-semibold transition-colors"
            style={{ color: "hsl(var(--myadmin-muted-foreground))" }}
          >
            <span>{title}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", !isOpen && "-rotate-90")} />
          </button>
        )}
        {isCollapsed && (
          <div className="border-b mx-2 my-2" style={{ borderColor: "hsl(var(--myadmin-border))" }}></div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(!isCollapsed || isCollapsed) && (isOpen || isCollapsed) && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            className={cn("grid gap-1", !isOpen && !isCollapsed && "hidden")}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      {!isCollapsed && isOpen && (
        <div className="border-b mx-2 my-2" style={{ borderColor: "hsl(var(--myadmin-border))" }}></div>
      )}
    </>
  )
}

function SidebarItemComponent({
  icon,
  title,
  href,
  isCollapsed,
  isActive,
  badge,
  onClick,
  variant = "default",
}: SidebarItemProps) {
  return (
    <motion.div variants={itemVariants}>
      {isCollapsed ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  "flex items-center justify-center rounded-lg p-2 mx-2 transition-all relative overflow-hidden",
                  isActive ? "text-white shadow-sm" : "hover:bg-opacity-10 transition-colors",
                  variant === "highlight" && !isActive && "text-opacity-80",
                )}
                style={{
                  backgroundColor: isActive ? "hsl(var(--myadmin-primary))" : "transparent",
                  color: isActive ? "hsl(var(--myadmin-primary-foreground))" : "hsl(var(--myadmin-foreground))",
                }}
                onClick={onClick}
              >
                <span className="relative z-10">{icon}</span>

                {badge && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 w-4 min-w-4 items-center justify-center rounded-full text-[10px] font-medium text-white"
                    style={{
                      backgroundColor: isActive ? "white" : "hsl(var(--myadmin-primary))",
                      color: isActive ? "hsl(var(--myadmin-primary))" : "white",
                    }}
                  >
                    {typeof badge === "number" ? (badge > 9 ? "9+" : badge) : badge}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-medium">
              {title}
              {badge && <span className="ml-1.5 text-xs">({badge})</span>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 mx-1.5 text-sm transition-all relative overflow-hidden group myadmin-sidebar-item",
            isActive && "active",
            variant === "highlight" && !isActive && "text-opacity-80",
          )}
          onClick={onClick}
        >
          <span className="relative transition-transform duration-200 group-hover:scale-110">{icon}</span>

          <span className="font-medium flex-1">{title}</span>

          {badge && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full text-xs font-medium px-1"
              style={{
                backgroundColor: isActive ? "white" : "hsl(var(--myadmin-primary) / 0.2)",
                color: isActive ? "hsl(var(--myadmin-primary))" : "hsl(var(--myadmin-primary))",
              }}
            >
              {badge}
            </span>
          )}
        </Link>
      )}
    </motion.div>
  )
}

function SubMenuItem({ title, href, isActive, badge, onClick }: SubMenuItemProps) {
  return (
    <motion.div variants={itemVariants}>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs transition-all relative overflow-hidden ml-8 group",
          isActive ? "font-medium" : "transition-colors",
        )}
        style={{
          backgroundColor: isActive ? "hsl(var(--myadmin-primary) / 0.1)" : "transparent",
          color: isActive ? "hsl(var(--myadmin-primary))" : "hsl(var(--myadmin-muted-foreground))",
        }}
        onClick={onClick}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 group-hover:opacity-100"></div>

        <span className="font-medium">{title}</span>

        {badge && (
          <span
            className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-medium px-1"
            style={{
              backgroundColor: "hsl(var(--myadmin-primary) / 0.1)",
              color: "hsl(var(--myadmin-primary))",
            }}
          >
            {badge}
          </span>
        )}
      </Link>
    </motion.div>
  )
}

export function MyAdminSidebar({ isCollapsed, toggleSidebar }: MyAdminSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname() || ""
  const { logout } = useMyAdminAuth()
  const router = useRouter()
  const isMobile = useMobile()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
    router.push("/myadmin/login")
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center px-3 py-2 border-b" style={{ borderColor: "hsl(var(--myadmin-border))" }}>
        <motion.div
          className={cn("flex items-center gap-2 cursor-pointer", isCollapsed ? "justify-center w-full" : "")}
          onClick={toggleSidebar}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md p-1 shadow-sm border"
            style={{ backgroundColor: "hsl(var(--myadmin-background))", borderColor: "hsl(var(--myadmin-border))" }}
          >
            <ImageComponent
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
              alt="Mizizzi Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <motion.span
              className="text-lg font-bold flex items-center gap-1"
              style={{ color: "hsl(var(--myadmin-foreground))" }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              MyAdmin
              <span
                className="text-xs px-1.5 py-0.5 rounded-sm font-medium text-white"
                style={{ backgroundColor: "hsl(var(--myadmin-primary))" }}
              >
                Pro
              </span>
            </motion.span>
          )}
        </motion.div>

        {isMobile && isMobileMenuOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full"
            style={{ color: "hsl(var(--myadmin-muted-foreground))" }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 py-2 px-2">
        <nav className="grid gap-0.5">
          <LayoutGroup id="myadmin-sidebar-navigation">
            {/* SEARCH */}
            {!isCollapsed && (
              <div className="px-3 py-2 mb-2">
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-2.5 h-4 w-4"
                    style={{ color: "hsl(var(--myadmin-muted-foreground))" }}
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 myadmin-input"
                    style={{
                      backgroundColor: "hsl(var(--myadmin-input))",
                      borderColor: "hsl(var(--myadmin-border))",
                      color: "hsl(var(--myadmin-foreground))",
                    }}
                  />
                </div>
              </div>
            )}

            {/* PRIMARY NAVIGATION */}
            <div className="grid gap-1 px-1.5 mb-2">
              <SidebarItemComponent
                icon={<LayoutDashboard className="h-[18px] w-[18px]" />}
                title="Dashboard"
                href="/myadmin"
                isCollapsed={isCollapsed}
                isActive={pathname === "/myadmin" || pathname === "/myadmin/dashboard"}
                onClick={() => setIsMobileMenuOpen(false)}
                variant="default"
              />

              <SidebarItemComponent
                icon={<ShoppingBag className="h-[18px] w-[18px]" />}
                title="Orders"
                href="/myadmin/orders"
                isCollapsed={isCollapsed}
                isActive={pathname.startsWith("/myadmin/orders")}
                badge={8}
                onClick={() => setIsMobileMenuOpen(false)}
                variant="highlight"
              />

              <SidebarItemComponent
                icon={<Package className="h-[18px] w-[18px]" />}
                title="Products"
                href="/myadmin/products"
                isCollapsed={isCollapsed}
                isActive={pathname.startsWith("/myadmin/products")}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <SidebarItemComponent
                icon={<UsersRound className="h-[18px] w-[18px]" />}
                title="Users"
                href="/myadmin/users"
                isCollapsed={isCollapsed}
                isActive={pathname.startsWith("/myadmin/users")}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </div>

            {/* MANAGEMENT & ANALYTICS */}
            <SidebarSection title="MANAGEMENT & ANALYTICS" isCollapsed={isCollapsed} defaultOpen={true}>
              {!isCollapsed && (
                <SubMenuItem
                  title="All Products"
                  href="/myadmin/products"
                  isActive={pathname === "/myadmin/products"}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}

              {!isCollapsed && (
                <SubMenuItem
                  title="Add New Product"
                  href="/myadmin/products/new"
                  isActive={pathname === "/myadmin/products/new"}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}

              <SidebarItemComponent
                icon={<Layers className="h-[18px] w-[18px]" />}
                title="Categories"
                href="/myadmin/categories"
                isCollapsed={isCollapsed}
                isActive={pathname.startsWith("/myadmin/categories")}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <SidebarItemComponent
                icon={<Tag className="h-[18px] w-[18px]" />}
                title="Brands"
                href="/myadmin/brands"
                isCollapsed={isCollapsed}
                isActive={pathname.startsWith("/myadmin/brands")}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <SidebarItemComponent
                icon={<Boxes className="h-[18px] w-[18px]" />}
                title="Inventory"
                href="/myadmin/inventory"
                isCollapsed={isCollapsed}
                isActive={pathname === "/myadmin/inventory"}
                badge={5}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              <SidebarItemComponent
                icon={<BarChart3 className="h-[18px] w-[18px]" />}
                title="Analytics"
                href="/myadmin/analytics"
                isCollapsed={isCollapsed}
                isActive={pathname.startsWith("/myadmin/analytics")}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </SidebarSection>

            {/* SYSTEM */}
            <SidebarSection title="SYSTEM" isCollapsed={isCollapsed} defaultOpen={true}>
              <SidebarItemComponent
                icon={<Settings className="h-[18px] w-[18px]" />}
                title="Settings"
                href="/myadmin/settings"
                isCollapsed={isCollapsed}
                isActive={pathname.startsWith("/myadmin/settings")}
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </SidebarSection>
          </LayoutGroup>
        </nav>
      </ScrollArea>

      <div className="mt-auto border-t p-2" style={{ borderColor: "hsl(var(--myadmin-border))" }}>
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "px-2 py-1")}>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-medium" style={{ color: "hsl(var(--myadmin-foreground))" }}>
                MyAdmin User
              </span>
              <span className="text-xs" style={{ color: "hsl(var(--myadmin-muted-foreground))" }}>
                admin@mizizzi.com
              </span>
            </div>
          )}

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="ml-auto flex">
            <Button
              variant="ghost"
              size={isCollapsed ? "icon" : "sm"}
              className={cn("transition-colors", isCollapsed && "rounded-full h-9 w-9")}
              style={{ color: "hsl(var(--myadmin-muted-foreground))" }}
              onClick={handleLogout}
            >
              <LogOut className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
              {!isCollapsed && <span className="text-xs">Logout</span>}
            </Button>
          </motion.div>
        </div>
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
            "fixed inset-y-0 left-0 z-40 w-[60px] flex flex-col border-r shadow-sm",
            isMobileMenuOpen ? "hidden" : "block",
          )}
          style={{
            backgroundColor: "hsl(var(--myadmin-sidebar))",
            borderColor: "hsl(var(--myadmin-sidebar-border))",
          }}
        >
          <div
            className="flex h-16 items-center justify-center border-b cursor-pointer"
            style={{ borderColor: "hsl(var(--myadmin-sidebar-border))" }}
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <motion.div
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md p-1 shadow-sm border"
              style={{ backgroundColor: "hsl(var(--myadmin-background))", borderColor: "hsl(var(--myadmin-border))" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ImageComponent
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
                alt="Mizizzi Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </motion.div>
          </div>

          {/* Essential navigation icons for mobile */}
          <motion.nav className="mt-2 grid gap-1 px-2" variants={containerVariants} initial="hidden" animate="visible">
            {/* Dashboard */}
            <motion.div variants={itemVariants} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-lg transition-colors",
                  pathname === "/myadmin" && "text-white shadow-sm",
                )}
                style={{
                  backgroundColor: pathname === "/myadmin" ? "hsl(var(--myadmin-primary))" : "transparent",
                  color: pathname === "/myadmin" ? "white" : "hsl(var(--myadmin-foreground))",
                }}
                onClick={() => router.push("/myadmin")}
              >
                <LayoutDashboard className="h-[18px] w-[18px]" />
              </Button>
            </motion.div>

            {/* Menu Icon - Open Full Menu */}
            <motion.div
              variants={itemVariants}
              className="mt-2 pt-2 border-t"
              style={{ borderColor: "hsl(var(--myadmin-border))" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg transition-colors"
                style={{ color: "hsl(var(--myadmin-foreground))" }}
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-[18px] w-[18px]" />
              </Button>
            </motion.div>
          </motion.nav>
        </div>

        {/* Mobile Full Sidebar */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                ref={sidebarRef}
                className="fixed inset-y-0 left-0 w-[280px] border-r shadow-xl z-50 flex flex-col"
                style={{
                  backgroundColor: "hsl(var(--myadmin-sidebar))",
                  borderColor: "hsl(var(--myadmin-sidebar-border))",
                }}
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{
                  type: "spring",
                  damping: 30,
                  stiffness: 300,
                  mass: 1,
                }}
              >
                <SidebarContent />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  // Desktop sidebar with smooth animations
  return (
    <TooltipProvider>
      <motion.div
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r shadow-sm",
          isCollapsed ? "w-[70px]" : "w-[280px]",
        )}
        style={{
          backgroundColor: "hsl(var(--myadmin-sidebar))",
          borderColor: "hsl(var(--myadmin-sidebar-border))",
        }}
        initial={false}
        animate={{
          width: isCollapsed ? "70px" : "280px",
          transition: {
            duration: 0.3,
            ease: [0.3, 0.0, 0.2, 1], // Custom ease for smoother animation
          },
        }}
      >
        <SidebarContent />
      </motion.div>
    </TooltipProvider>
  )
}
