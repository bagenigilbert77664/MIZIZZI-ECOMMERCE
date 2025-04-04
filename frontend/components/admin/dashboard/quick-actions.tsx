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
        label: "Add Product",
        icon: <PlusCircle className="h-4 w-4 mr-2" />,
        href: "/admin/products/new",
        color: "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
      },
      {
        label: "Inventory",
        icon: <Package className="h-4 w-4 mr-2" />,
        href: "/admin/products",
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
      },
      {
        label: "Categories",
        icon: <Layers className="h-4 w-4 mr-2" />,
        href: "/admin/categories",
        color: "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700",
      },
      {
        label: "Flash Sales",
        icon: <Zap className="h-4 w-4 mr-2" />,
        href: "/admin/flash-sales",
        color: "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700",
      },
      {
        label: "Luxury Deals",
        icon: <Crown className="h-4 w-4 mr-2" />,
        href: "/admin/luxury",
        color: "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700",
      },
      {
        label: "Discounts",
        icon: <Percent className="h-4 w-4 mr-2" />,
        href: "/admin/discounts",
        color: "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700",
      },
      {
        label: "Tags",
        icon: <Tag className="h-4 w-4 mr-2" />,
        href: "/admin/tags",
        color: "bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700",
      },
      {
        label: "Media Library",
        icon: <Image className="h-4 w-4 mr-2" />,
        href: "/admin/media",
        color: "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700",
      },
    ],
    customers: [
      {
        label: "Customers",
        icon: <Users className="h-4 w-4 mr-2" />,
        href: "/admin/customers",
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      },
      {
        label: "Reviews",
        icon: <Star className="h-4 w-4 mr-2" />,
        href: "/admin/reviews",
        color: "bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700",
      },
      {
        label: "Gift Cards",
        icon: <Gift className="h-4 w-4 mr-2" />,
        href: "/admin/gift-cards",
        color: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
      },
      {
        label: "Newsletters",
        icon: <Mail className="h-4 w-4 mr-2" />,
        href: "/admin/newsletters",
        color: "bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700",
      },
      {
        label: "Staff",
        icon: <UserCog className="h-4 w-4 mr-2" />,
        href: "/admin/staff",
        color: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
      },
      {
        label: "Notifications",
        icon: <Bell className="h-4 w-4 mr-2" />,
        href: "/admin/notifications",
        color: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
      },
    ],
    orders: [
      {
        label: "Orders",
        icon: <ShoppingCart className="h-4 w-4 mr-2" />,
        href: "/admin/orders",
        color: "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
      },
      {
        label: "Shipping",
        icon: <Truck className="h-4 w-4 mr-2" />,
        href: "/admin/shipping",
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      },
      {
        label: "Payments",
        icon: <CreditCard className="h-4 w-4 mr-2" />,
        href: "/admin/payments",
        color: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700",
      },
      {
        label: "Returns",
        icon: <Repeat className="h-4 w-4 mr-2" />,
        href: "/admin/returns",
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
      },
    ],
    marketing: [
      {
        label: "Analytics",
        icon: <BarChart3 className="h-4 w-4 mr-2" />,
        href: "/admin/analytics",
        color: "bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700",
      },
      {
        label: "Campaigns",
        icon: <Megaphone className="h-4 w-4 mr-2" />,
        href: "/admin/campaigns",
        color: "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700",
      },
      {
        label: "SEO",
        icon: <Search className="h-4 w-4 mr-2" />,
        href: "/admin/seo",
        color: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700",
      },
      {
        label: "Reports",
        icon: <FileText className="h-4 w-4 mr-2" />,
        href: "/admin/reports",
        color: "bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700",
      },
      {
        label: "Events",
        icon: <Calendar className="h-4 w-4 mr-2" />,
        href: "/admin/events",
        color: "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700",
      },
    ],
    content: [
      {
        label: "Store Locator",
        icon: <MapPin className="h-4 w-4 mr-2" />,
        href: "/admin/store-locator",
        color: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
      },
      {
        label: "Communications",
        icon: <MessageSquare className="h-4 w-4 mr-2" />,
        href: "/admin/communications",
        color: "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700",
      },
      {
        label: "Website",
        icon: <Layout className="h-4 w-4 mr-2" />,
        href: "/admin/website",
        color: "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700",
      },
      {
        label: "Theme",
        icon: <Palette className="h-4 w-4 mr-2" />,
        href: "/admin/theme",
        color: "bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700",
      },
      {
        label: "Mobile App",
        icon: <Smartphone className="h-4 w-4 mr-2" />,
        href: "/admin/mobile-app",
        color: "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700",
      },
    ],
    system: [
      {
        label: "Settings",
        icon: <Settings className="h-4 w-4 mr-2" />,
        href: "/admin/settings",
        color: "bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700",
      },
      {
        label: "Integrations",
        icon: <FileCode className="h-4 w-4 mr-2" />,
        href: "/admin/integrations",
        color: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
      },
      {
        label: "Security",
        icon: <Shield className="h-4 w-4 mr-2" />,
        href: "/admin/security",
        color: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700",
      },
      {
        label: "Logs",
        icon: <Clipboard className="h-4 w-4 mr-2" />,
        href: "/admin/logs",
        color: "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
      },
      {
        label: "Database",
        icon: <Database className="h-4 w-4 mr-2" />,
        href: "/admin/database",
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
      },
      {
        label: "Domains",
        icon: <Globe className="h-4 w-4 mr-2" />,
        href: "/admin/domains",
        color: "bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700",
      },
      {
        label: "Help",
        icon: <HelpCircle className="h-4 w-4 mr-2" />,
        href: "/admin/help",
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {actions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Button
                    variant="default"
                    className={`w-full h-auto py-2 px-2 flex flex-col items-center justify-center text-white shadow-sm ${action.color}`}
                    onClick={() => router.push(action.href)}
                  >
                    <div className="flex items-center justify-center">
                      {action.icon}
                      <span className={isMobile ? "text-xs" : "text-sm"}>{action.label}</span>
                    </div>
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

