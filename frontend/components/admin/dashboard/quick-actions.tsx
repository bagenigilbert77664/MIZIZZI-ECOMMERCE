"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  PlusCircle,
  Users,
  ShoppingCart,
  Package,
  Layers,
  Settings,
  BarChart3,
  Mail,
  MessageSquare,
  Zap,
  Crown,
  Star,
  Gift,
  MapPin,
  Bell,
  Percent,
  Megaphone,
  Search,
  FileText,
  UserCog,
  Truck,
  CreditCard,
  Layout,
  Image,
  FileCode,
  Calendar,
  Tag,
  Repeat,
  HelpCircle,
  Shield,
  Clipboard,
  Database,
  Globe,
  Smartphone,
  Palette,
} from "lucide-react"
import { motion } from "framer-motion"
import { useMobile } from "@/hooks/use-mobile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function QuickActions() {
  const router = useRouter()
  const isMobile = useMobile()

  const actionCategories = {
    products: [
      {
        label: "New Product",
        icon: <PlusCircle className="h-5 w-5" />,
        href: "/admin/products/new",
        color: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
      },
      {
        label: "Low Stock",
        icon: <Package className="h-5 w-5" />,
        href: "/admin/products?filter=low-stock",
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
      },
      {
        label: "New Category",
        icon: <Layers className="h-5 w-5" />,
        href: "/admin/categories/new",
        color: "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700",
      },
      {
        label: "Create Sale",
        icon: <Zap className="h-5 w-5" />,
        href: "/admin/flash-sales/new",
        color: "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700",
      },
      {
        label: "Luxury Item",
        icon: <Crown className="h-5 w-5" />,
        href: "/admin/luxury/new",
        color: "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700",
      },
      {
        label: "New Discount",
        icon: <Percent className="h-5 w-5" />,
        href: "/admin/discounts/new",
        color: "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700",
      },
      {
        label: "Manage Tags",
        icon: <Tag className="h-5 w-5" />,
        href: "/admin/tags",
        color: "bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700",
      },
      {
        label: "Upload Images",
        icon: <Image className="h-5 w-5" />,
        href: "/admin/media/upload",
        color: "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700",
      },
    ],
    customers: [
      {
        label: "VIP Customers",
        icon: <Users className="h-5 w-5" />,
        href: "/admin/customers?filter=vip",
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      },
      {
        label: "New Reviews",
        icon: <Star className="h-5 w-5" />,
        href: "/admin/reviews?filter=new",
        color: "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700",
      },
      {
        label: "Issue Gift Card",
        icon: <Gift className="h-5 w-5" />,
        href: "/admin/gift-cards/new",
        color: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
      },
      {
        label: "Send Newsletter",
        icon: <Mail className="h-5 w-5" />,
        href: "/admin/newsletters/new",
        color: "bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700",
      },
      {
        label: "Add Staff",
        icon: <UserCog className="h-5 w-5" />,
        href: "/admin/staff/new",
        color: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
      },
      {
        label: "Send Alert",
        icon: <Bell className="h-5 w-5" />,
        href: "/admin/notifications/new",
        color: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
      },
    ],
    orders: [
      {
        label: "Pending Orders",
        icon: <ShoppingCart className="h-5 w-5" />,
        href: "/admin/orders?status=pending",
        color: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
      },
      {
        label: "Track Shipment",
        icon: <Truck className="h-5 w-5" />,
        href: "/admin/shipping/track",
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      },
      {
        label: "Process Refund",
        icon: <CreditCard className="h-5 w-5" />,
        href: "/admin/payments/refunds",
        color: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
      },
      {
        label: "Handle Returns",
        icon: <Repeat className="h-5 w-5" />,
        href: "/admin/returns/pending",
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
      },
    ],
    marketing: [
      {
        label: "Sales Report",
        icon: <BarChart3 className="h-5 w-5" />,
        href: "/admin/analytics/sales",
        color: "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700",
      },
      {
        label: "New Campaign",
        icon: <Megaphone className="h-5 w-5" />,
        href: "/admin/campaigns/new",
        color: "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700",
      },
      {
        label: "SEO Audit",
        icon: <Search className="h-5 w-5" />,
        href: "/admin/seo/audit",
        color: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700",
      },
      {
        label: "Generate Report",
        icon: <FileText className="h-5 w-5" />,
        href: "/admin/reports/generate",
        color: "bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700",
      },
      {
        label: "Schedule Event",
        icon: <Calendar className="h-5 w-5" />,
        href: "/admin/events/schedule",
        color: "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700",
      },
    ],
    content: [
      {
        label: "Add Store",
        icon: <MapPin className="h-5 w-5" />,
        href: "/admin/store-locator/add",
        color: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
      },
      {
        label: "Customer Chat",
        icon: <MessageSquare className="h-5 w-5" />,
        href: "/admin/communications/chat",
        color: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700",
      },
      {
        label: "Edit Homepage",
        icon: <Layout className="h-5 w-5" />,
        href: "/admin/website/homepage",
        color: "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700",
      },
      {
        label: "Change Theme",
        icon: <Palette className="h-5 w-5" />,
        href: "/admin/theme/customize",
        color: "bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700",
      },
      {
        label: "App Settings",
        icon: <Smartphone className="h-5 w-5" />,
        href: "/admin/mobile-app/settings",
        color: "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700",
      },
    ],
    system: [
      {
        label: "User Roles",
        icon: <Settings className="h-5 w-5" />,
        href: "/admin/settings/users",
        color: "bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700",
      },
      {
        label: "Connect API",
        icon: <FileCode className="h-5 w-5" />,
        href: "/admin/integrations/new",
        color: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
      },
      {
        label: "Audit Access",
        icon: <Shield className="h-5 w-5" />,
        href: "/admin/security/audit",
        color: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
      },
      {
        label: "View Logs",
        icon: <Clipboard className="h-5 w-5" />,
        href: "/admin/logs/system",
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
      },
      {
        label: "Backup Data",
        icon: <Database className="h-5 w-5" />,
        href: "/admin/database/backup",
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      },
      {
        label: "Manage DNS",
        icon: <Globe className="h-5 w-5" />,
        href: "/admin/domains/dns",
        color: "bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700",
      },
      {
        label: "Support",
        icon: <HelpCircle className="h-5 w-5" />,
        href: "/admin/help/support",
        color: "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700",
      },
    ],
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="mb-4 w-full flex flex-wrap justify-start overflow-x-auto">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {Object.entries(actionCategories).map(([category, actions]) => (
          <TabsContent key={category} value={category} className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {actions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="h-full"
                >
                  <Button
                    variant="default"
                    className={`w-full h-auto py-4 px-3 flex items-center justify-start text-white shadow-sm ${action.color} transition-all duration-200`}
                    onClick={() => router.push(action.href)}
                  >
                    <div className="mr-3">{action.icon}</div>
                    <span className={isMobile ? "text-sm" : "text-base font-medium"}>{action.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

