"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Zap,
  Crown,
  Heart,
  ShoppingBag,
  Headphones,
  Search,
  Phone,
  MessageCircle,
  Award,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface SidebarPanel {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  color: string
  gradient: string
  link: string
  badge?: string | number
  items?: string[]
  metrics?: {
    value: string
    label: string
  }
}

const sidebarPanels: SidebarPanel[] = [
  {
    id: "flash-sales",
    title: "FLASH SALES",
    subtitle: "Limited Time Offers",
    icon: <Zap className="h-5 w-5" />,
    color: "from-orange-500 to-red-600",
    gradient: "bg-gradient-to-br from-orange-50 to-red-50",
    link: "/flash-sales",
    badge: "HOT",
    items: ["Up to 70% OFF", "24h Only", "Premium Items"],
  },
  {
    id: "luxury-deals",
    title: "LUXURY DEALS",
    subtitle: "Premium Collections",
    icon: <Crown className="h-5 w-5" />,
    color: "from-purple-600 to-pink-600",
    gradient: "bg-gradient-to-br from-purple-50 to-pink-50",
    link: "/luxury",
    items: ["Exclusive Designs", "Limited Edition", "VIP Access"],
  },
  {
    id: "wishlist",
    title: "WISHLIST",
    subtitle: "Save Your Favorites",
    icon: <Heart className="h-5 w-5" />,
    color: "from-pink-500 to-rose-600",
    gradient: "bg-gradient-to-br from-pink-50 to-rose-50",
    link: "/wishlist",
    badge: 12,
  },
  {
    id: "orders",
    title: "ORDERS",
    subtitle: "Track Your Purchases",
    icon: <ShoppingBag className="h-5 w-5" />,
    color: "from-blue-500 to-indigo-600",
    gradient: "bg-gradient-to-br from-blue-50 to-indigo-50",
    link: "/orders",
    badge: 3,
  },
  {
    id: "support",
    title: "SUPPORT",
    subtitle: "24/7 Assistance",
    icon: <Headphones className="h-5 w-5" />,
    color: "from-green-500 to-emerald-600",
    gradient: "bg-gradient-to-br from-green-50 to-emerald-50",
    link: "/help",
  },
  {
    id: "products",
    title: "PRODUCTS",
    subtitle: "Browse All Items",
    icon: <Search className="h-5 w-5" />,
    color: "from-gray-600 to-slate-700",
    gradient: "bg-gradient-to-br from-gray-50 to-slate-50",
    link: "/products",
  },
]

const excellenceMetrics = {
  satisfaction: "98.7%",
  service: "Premium",
  guarantee: "Quality",
  curation: "Expert",
  products: "Authentic",
}

export function LuxurySidebar() {
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const panelVariants = {
    hidden: {
      opacity: 0,
      x: 50,
      scale: 0.9,
    },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        delay: index * 0.1,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
    hover: {
      scale: 1.02,
      y: -2,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  }

  const iconVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
      scale: 1.1,
      rotate: 5,
      transition: { duration: 0.2 },
    },
  }

  const badgeVariants = {
    rest: { scale: 1 },
    hover: {
      scale: 1.1,
      transition: { duration: 0.2 },
    },
  }

  return (
    <div className="space-y-4 w-full max-w-sm">
      {/* Main Sidebar Panels */}
      <div className="space-y-3">
        {sidebarPanels.map((panel, index) => (
          <motion.div
            key={panel.id}
            custom={index}
            variants={panelVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            whileHover="hover"
            onHoverStart={() => setHoveredPanel(panel.id)}
            onHoverEnd={() => setHoveredPanel(null)}
            className="relative group"
          >
            <Link href={panel.link}>
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl p-4 border border-white/20 backdrop-blur-sm transition-all duration-300 cursor-pointer",
                  panel.gradient,
                  "hover:shadow-xl hover:border-white/30",
                )}
              >
                {/* Background Gradient */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-r opacity-10 group-hover:opacity-20 transition-opacity duration-300",
                    panel.color,
                  )}
                />

                {/* Sparkle Effect */}
                <AnimatePresence>
                  {hoveredPanel === panel.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute top-2 right-2"
                    >
                      <Sparkles className="h-4 w-4 text-amber-400" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      variants={iconVariants}
                      initial="rest"
                      whileHover="hover"
                      className={cn("p-2 rounded-lg bg-gradient-to-r text-white shadow-lg", panel.color)}
                    >
                      {panel.icon}
                    </motion.div>

                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{panel.title}</h3>
                      <p className="text-xs text-gray-600">{panel.subtitle}</p>

                      {panel.items && (
                        <div className="mt-1 space-y-1">
                          {panel.items.map((item, idx) => (
                            <div key={idx} className="flex items-center text-xs text-gray-500">
                              <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    {panel.badge && (
                      <motion.div variants={badgeVariants}>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs font-bold text-white border-0",
                            typeof panel.badge === "string"
                              ? "bg-gradient-to-r from-red-500 to-orange-500"
                              : "bg-gradient-to-r from-blue-500 to-purple-500",
                          )}
                        >
                          {panel.badge}
                        </Badge>
                      </motion.div>
                    )}

                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Call/WhatsApp Button */}
      <motion.div
        variants={panelVariants}
        custom={sidebarPanels.length}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        whileHover="hover"
        className="relative group"
      >
        <Button
          asChild
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-0"
        >
          <Link href="tel:+254700000000" className="flex items-center justify-center space-x-3">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold">CALL OR WHATSAPP</div>
              <div className="text-lg font-bold">0746 741 719</div>
            </div>
          </Link>
        </Button>
      </motion.div>

      {/* Excellence Panel */}
      <motion.div
        variants={panelVariants}
        custom={sidebarPanels.length + 1}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        whileHover="hover"
        className="relative group"
      >
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200/50 backdrop-blur-sm">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center mb-2">
              <Award className="h-6 w-6 text-amber-600 mr-2" />
              <h3 className="font-bold text-lg text-gray-900">MIZIZZI EXCELLENCE</h3>
            </div>

            <div className="text-4xl font-bold text-amber-600 mb-1">{excellenceMetrics.satisfaction}</div>
            <p className="text-sm text-gray-600">Customer Satisfaction Rate</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white/50 rounded-lg p-3">
              <div className="font-bold text-sm text-gray-900">{excellenceMetrics.service}</div>
              <div className="text-xs text-gray-600">Service</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <div className="font-bold text-sm text-gray-900">{excellenceMetrics.guarantee}</div>
              <div className="text-xs text-gray-600">Guarantee</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <div className="font-bold text-sm text-gray-900">{excellenceMetrics.curation}</div>
              <div className="text-xs text-gray-600">Curation</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3">
              <div className="font-bold text-sm text-gray-900">{excellenceMetrics.products}</div>
              <div className="text-xs text-gray-600">Products</div>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="w-full mt-4 border-amber-300 text-amber-700 hover:bg-amber-100 font-semibold bg-transparent"
          >
            <Link href="/about" className="flex items-center justify-center">
              JOIN MIZIZZI
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
