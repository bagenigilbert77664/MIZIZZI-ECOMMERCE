"use client"

import { motion } from "framer-motion"
import {
  ShoppingCart,
  Users,
  BarChart,
  FileText,
  Settings,
  PlusCircle,
  Truck,
  Tag,
  Percent,
  Mail,
  CreditCard,
  Gift,
  MessageSquare,
  UserPlus,
  Star,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Layers,
  ImageIcon,
  Upload,
  Download,
  Printer,
  Search,
  Clock,
  Shield,
  Globe,
  Zap,
  Award,
  Clipboard,
  Repeat,
  Edit,
  Copy,
  Heart,
  ThumbsUp,
  Share2,
  Link,
  LayoutGrid,
  Menu,
  Palette,
  Gauge,
  Boxes,
  ShoppingBag,
  FileTextIcon,
  BarChartIcon,
  SettingsIcon,
  UsersIcon,
  PackageIcon,
  MegaphoneIcon,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export function QuickActions() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  // Define all action categories
  const actionCategories = [
    {
      id: "products",
      name: "Products",
      icon: <PackageIcon className="h-5 w-5" />,
      actions: [
        {
          id: "add-product",
          name: "Add Product",
          description: "Create a new product listing",
          icon: <PlusCircle className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800",
        },
        {
          id: "manage-inventory",
          name: "Manage Inventory",
          description: "Update stock levels and availability",
          icon: <Boxes className="h-5 w-5" />,
          color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        },
        {
          id: "add-category",
          name: "Add Category",
          description: "Create a new product category",
          icon: <Layers className="h-5 w-5" />,
          color: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
        },
        {
          id: "product-import",
          name: "Import Products",
          description: "Bulk import products via CSV",
          icon: <Upload className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
        },
        {
          id: "product-export",
          name: "Export Products",
          description: "Export product data to CSV",
          icon: <Download className="h-5 w-5" />,
          color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
        },
        {
          id: "product-reviews",
          name: "Product Reviews",
          description: "Manage customer product reviews",
          icon: <Star className="h-5 w-5" />,
          color: "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700",
        },
        {
          id: "product-variants",
          name: "Product Variants",
          description: "Manage product options and variants",
          icon: <Copy className="h-5 w-5" />,
          color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
        },
        {
          id: "low-stock",
          name: "Low Stock Alert",
          description: "View products with low inventory",
          icon: <AlertTriangle className="h-5 w-5" />,
          color: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
        },
      ],
    },
    {
      id: "orders",
      name: "Orders",
      icon: <ShoppingCart className="h-5 w-5" />,
      actions: [
        {
          id: "recent-orders",
          name: "Recent Orders",
          description: "View latest customer orders",
          icon: <Clock className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800",
        },
        {
          id: "process-orders",
          name: "Process Orders",
          description: "Fulfill pending customer orders",
          icon: <Clipboard className="h-5 w-5" />,
          color: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
        },
        {
          id: "shipping-labels",
          name: "Shipping Labels",
          description: "Generate and print shipping labels",
          icon: <Printer className="h-5 w-5" />,
          color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        },
        {
          id: "order-returns",
          name: "Process Returns",
          description: "Handle customer returns and refunds",
          icon: <RefreshCw className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
        },
        {
          id: "abandoned-carts",
          name: "Abandoned Carts",
          description: "View and recover abandoned carts",
          icon: <ShoppingBag className="h-5 w-5" />,
          color: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
        },
        {
          id: "order-invoices",
          name: "Order Invoices",
          description: "Generate and send order invoices",
          icon: <FileText className="h-5 w-5" />,
          color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
        },
        {
          id: "track-shipments",
          name: "Track Shipments",
          description: "Monitor order delivery status",
          icon: <Truck className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700",
        },
        {
          id: "payment-status",
          name: "Payment Status",
          description: "Review payment statuses for orders",
          icon: <CreditCard className="h-5 w-5" />,
          color: "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700",
        },
      ],
    },
    {
      id: "customers",
      name: "Customers",
      icon: <UsersIcon className="h-5 w-5" />,
      actions: [
        {
          id: "customer-list",
          name: "Customer List",
          description: "View and manage customer accounts",
          icon: <Users className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800",
        },
        {
          id: "add-customer",
          name: "Add Customer",
          description: "Create a new customer account",
          icon: <UserPlus className="h-5 w-5" />,
          color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        },
        {
          id: "customer-support",
          name: "Customer Support",
          description: "Manage support tickets and inquiries",
          icon: <MessageSquare className="h-5 w-5" />,
          color: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
        },
        {
          id: "loyalty-program",
          name: "Loyalty Program",
          description: "Manage customer rewards and points",
          icon: <Award className="h-5 w-5" />,
          color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
        },
        {
          id: "customer-segments",
          name: "Customer Segments",
          description: "Create and manage customer groups",
          icon: <Users className="h-5 w-5" />,
          color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
        },
        {
          id: "customer-feedback",
          name: "Customer Feedback",
          description: "View and respond to customer feedback",
          icon: <ThumbsUp className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
        },
        {
          id: "customer-wishlist",
          name: "Customer Wishlists",
          description: "View products in customer wishlists",
          icon: <Heart className="h-5 w-5" />,
          color: "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700",
        },
        {
          id: "customer-export",
          name: "Export Customers",
          description: "Export customer data to CSV",
          icon: <Download className="h-5 w-5" />,
          color: "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700",
        },
      ],
    },
    {
      id: "marketing",
      name: "Marketing",
      icon: <MegaphoneIcon className="h-5 w-5" />,
      actions: [
        {
          id: "create-discount",
          name: "Create Discount",
          description: "Create new discount codes and offers",
          icon: <Tag className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800",
        },
        {
          id: "email-campaign",
          name: "Email Campaign",
          description: "Create and send marketing emails",
          icon: <Mail className="h-5 w-5" />,
          color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        },
        {
          id: "flash-sale",
          name: "Flash Sale",
          description: "Set up limited-time promotions",
          icon: <Zap className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
        },
        {
          id: "social-media",
          name: "Social Media",
          description: "Manage social media marketing",
          icon: <Share2 className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700",
        },
        {
          id: "seo-tools",
          name: "SEO Tools",
          description: "Optimize store for search engines",
          icon: <Search className="h-5 w-5" />,
          color: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
        },
        {
          id: "affiliate-program",
          name: "Affiliate Program",
          description: "Manage store affiliate marketing",
          icon: <Link className="h-5 w-5" />,
          color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
        },
        {
          id: "gift-cards",
          name: "Gift Cards",
          description: "Create and manage gift cards",
          icon: <Gift className="h-5 w-5" />,
          color: "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700",
        },
        {
          id: "marketing-automation",
          name: "Automation",
          description: "Set up automated marketing workflows",
          icon: <Repeat className="h-5 w-5" />,
          color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
        },
      ],
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: <BarChartIcon className="h-5 w-5" />,
      actions: [
        {
          id: "sales-report",
          name: "Sales Report",
          description: "View detailed sales analytics",
          icon: <BarChart className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800",
        },
        {
          id: "traffic-analytics",
          name: "Traffic Analytics",
          description: "Monitor store visitor statistics",
          icon: <Globe className="h-5 w-5" />,
          color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        },
        {
          id: "conversion-rates",
          name: "Conversion Rates",
          description: "Track visitor to customer conversion",
          icon: <Percent className="h-5 w-5" />,
          color: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
        },
        {
          id: "product-performance",
          name: "Product Performance",
          description: "Analyze product sales and views",
          icon: <Gauge className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
        },
        {
          id: "customer-insights",
          name: "Customer Insights",
          description: "Analyze customer behavior and trends",
          icon: <Users className="h-5 w-5" />,
          color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
        },
        {
          id: "marketing-roi",
          name: "Marketing ROI",
          description: "Measure marketing campaign performance",
          icon: <DollarSign className="h-5 w-5" />,
          color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
        },
        {
          id: "export-reports",
          name: "Export Reports",
          description: "Download analytics reports",
          icon: <Download className="h-5 w-5" />,
          color: "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700",
        },
        {
          id: "real-time-dashboard",
          name: "Real-time Dashboard",
          description: "View live store performance metrics",
          icon: <Zap className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700",
        },
      ],
    },
    {
      id: "content",
      name: "Content",
      icon: <FileTextIcon className="h-5 w-5" />,
      actions: [
        {
          id: "manage-pages",
          name: "Manage Pages",
          description: "Edit website pages and content",
          icon: <FileText className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800",
        },
        {
          id: "media-library",
          name: "Media Library",
          description: "Manage images and media files",
          icon: <ImageIcon className="h-5 w-5" />,
          color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        },
        {
          id: "blog-posts",
          name: "Blog Posts",
          description: "Create and edit blog content",
          icon: <Edit className="h-5 w-5" />,
          color: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
        },
        {
          id: "navigation-menus",
          name: "Navigation Menus",
          description: "Customize site navigation structure",
          icon: <Menu className="h-5 w-5" />,
          color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
        },
        {
          id: "banners-sliders",
          name: "Banners & Sliders",
          description: "Manage homepage banners and sliders",
          icon: <LayoutGrid className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
        },
        {
          id: "product-badges",
          name: "Product Badges",
          description: "Create and assign product badges",
          icon: <Award className="h-5 w-5" />,
          color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
        },
        {
          id: "theme-customization",
          name: "Theme Customization",
          description: "Customize store appearance and layout",
          icon: <Palette className="h-5 w-5" />,
          color: "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700",
        },
        {
          id: "seo-content",
          name: "SEO Content",
          description: "Optimize content for search engines",
          icon: <Search className="h-5 w-5" />,
          color: "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
        },
      ],
    },
    {
      id: "system",
      name: "System",
      icon: <SettingsIcon className="h-5 w-5" />,
      actions: [
        {
          id: "store-settings",
          name: "Store Settings",
          description: "Configure general store settings",
          icon: <Settings className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cherry-600 to-cherry-700 hover:from-cherry-700 hover:to-cherry-800",
        },
        {
          id: "payment-methods",
          name: "Payment Methods",
          description: "Configure store payment options",
          icon: <CreditCard className="h-5 w-5" />,
          color: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        },
        {
          id: "shipping-methods",
          name: "Shipping Methods",
          description: "Configure shipping options and rates",
          icon: <Truck className="h-5 w-5" />,
          color: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
        },
        {
          id: "tax-settings",
          name: "Tax Settings",
          description: "Configure tax rates and rules",
          icon: <Percent className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700",
        },
        {
          id: "user-accounts",
          name: "User Accounts",
          description: "Manage admin and staff accounts",
          icon: <Users className="h-5 w-5" />,
          color: "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
        },
        {
          id: "security-settings",
          name: "Security Settings",
          description: "Configure store security options",
          icon: <Shield className="h-5 w-5" />,
          color: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
        },
        {
          id: "integrations",
          name: "Integrations",
          description: "Manage third-party app connections",
          icon: <Link className="h-5 w-5" />,
          color: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
        },
        {
          id: "system-status",
          name: "System Status",
          description: "Check system health and performance",
          icon: <Gauge className="h-5 w-5" />,
          color: "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700",
        },
      ],
    },
  ]

  return (
    <Tabs defaultValue="products" className="w-full">
      <TabsList className="flex w-full bg-muted/30 p-1 rounded-xl mb-6 overflow-x-auto">
        {actionCategories.map((category) => (
          <TabsTrigger
            key={category.id}
            value={category.id}
            className={cn(
              "flex items-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium transition-all",
              "data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm",
              "dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-cherry-400",
            )}
          >
            {category.icon}
            <span className="hidden sm:inline">{category.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {actionCategories.map((category) => (
        <TabsContent key={category.id} value={category.id} className="mt-0">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {category.actions.map((action) => (
              <motion.div key={action.id} variants={item}>
                <button
                  className={cn(
                    "w-full h-full text-white rounded-xl p-4 transition-all",
                    "flex flex-col items-start justify-between",
                    "hover:shadow-lg hover:-translate-y-1",
                    action.color,
                  )}
                >
                  <div className="bg-white/20 p-2 rounded-lg mb-3">{action.icon}</div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">{action.name}</h3>
                    <p className="text-xs text-white/80 mt-1 line-clamp-2">{action.description}</p>
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
