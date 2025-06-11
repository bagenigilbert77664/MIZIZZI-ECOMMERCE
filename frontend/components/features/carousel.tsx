"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import {
  Package,
  HeadphonesIcon,
  Phone,
  MessageCircle,
  Truck,
  Shield,
  CreditCard,
  ChevronRight,
  Crown,
  Sparkles,
  Users,
  Gem,
  ArrowRight,
  Timer,
  Watch,
  Shirt,
  Eye,
  Heart,
  TrendingUp,
  Award,
  Layers,
  Zap,
  Search,
} from "lucide-react"

// Enhanced carousel items with better advertising content
const carouselItems = [
  {
    image:
      "https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    title: "Premium Luxury Collection",
    description: "Exclusive Designer Pieces at Unbeatable Prices",
    buttonText: "SHOP NOW",
    href: "/products",
    badge: "NEW ARRIVALS",
    discount: "30% OFF",
  },
  {
    image:
      "https://images.pexels.com/photos/5872361/pexels-photo-5872361.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    title: "Summer Fashion Sale",
    description: "Limited Time Offers on Designer Brands",
    buttonText: "EXPLORE NOW",
    href: "/products",
    badge: "TRENDING",
    discount: "50% OFF",
  },
  {
    image:
      "https://images.pexels.com/photos/1078958/pexels-photo-1078958.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    title: "Exclusive Jewelry Collection",
    description: "Handcrafted Pieces for Every Occasion",
    buttonText: "DISCOVER MORE",
    href: "/products",
    badge: "FEATURED",
    discount: "25% OFF",
  },
]

// Updated feature cards with Apple-style real icons
const featureCards = [
  {
    icon: <Zap className="h-4 w-4" />,
    title: "FLASH SALES",
    description: "Limited Time Offers",
    href: "/flash-sales",
    iconBg: "bg-gradient-to-br from-yellow-50 to-orange-50",
    iconColor: "text-orange-600",
    hoverBg: "hover:bg-orange-50/80",
  },
  {
    icon: <Crown className="h-4 w-4" />,
    title: "LUXURY DEALS",
    description: "Premium Collections",
    href: "/luxury",
    iconBg: "bg-gradient-to-br from-purple-50 to-indigo-50",
    iconColor: "text-purple-600",
    hoverBg: "hover:bg-purple-50/80",
  },
  {
    icon: <Heart className="h-4 w-4" />,
    title: "WISHLIST",
    description: "Save Your Favorites",
    href: "/wishlist",
    iconBg: "bg-gradient-to-br from-pink-50 to-rose-50",
    iconColor: "text-pink-600",
    hoverBg: "hover:bg-pink-50/80",
  },
  {
    icon: <Package className="h-4 w-4" />,
    title: "ORDERS",
    description: "Track Your Purchases",
    href: "/orders",
    iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    iconColor: "text-blue-600",
    hoverBg: "hover:bg-blue-50/80",
  },
  {
    icon: <HeadphonesIcon className="h-4 w-4" />,
    title: "SUPPORT",
    description: "24/7 Assistance",
    href: "/help",
    iconBg: "bg-gradient-to-br from-green-50 to-emerald-50",
    iconColor: "text-green-600",
    hoverBg: "hover:bg-green-50/80",
  },
  {
    icon: <Search className="h-4 w-4" />,
    title: "PRODUCTS",
    description: "Browse All Items",
    href: "/products",
    iconBg: "bg-gradient-to-br from-gray-50 to-slate-50",
    iconColor: "text-gray-600",
    hoverBg: "hover:bg-gray-50/80",
  },
]

// Apple-inspired Product Showcase for Left Side
const ProductShowcase = () => {
  const [currentProduct, setCurrentProduct] = useState(0)
  const [liveStats, setLiveStats] = useState({
    totalProducts: 2847,
    newArrivals: 156,
    categories: 89,
    brands: 234,
  })

  const productCategories = [
    {
      title: "MIZIZZI JEWELRY",
      metric: `${liveStats.totalProducts.toLocaleString()}+`,
      description: "Authentic African Jewelry",
      icon: <Gem className="h-5 w-5" />,
      gradient: "from-amber-500 to-yellow-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-yellow-50",
      textColor: "text-amber-900",
      accentColor: "text-amber-600",
      features: ["Handcrafted", "Traditional", "Modern Fusion", "Premium"],
    },
    {
      title: "AFRICAN FASHION",
      metric: `${liveStats.newArrivals}+`,
      description: "Contemporary African Wear",
      icon: <Shirt className="h-5 w-5" />,
      gradient: "from-emerald-500 to-green-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-green-50",
      textColor: "text-emerald-900",
      accentColor: "text-emerald-600",
      features: ["Ankara Styles", "Kente Designs", "Modern Cuts", "Heritage"],
    },
    {
      title: "LUXURY ACCESSORIES",
      metric: `${liveStats.categories}+`,
      description: "Premium African Accessories",
      icon: <Watch className="h-5 w-5" />,
      gradient: "from-purple-500 to-indigo-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50",
      textColor: "text-purple-900",
      accentColor: "text-purple-600",
      features: ["Leather Goods", "Beaded Items", "Carved Wood", "Artisan Made"],
    },
    {
      title: "MIZIZZI EXCLUSIVE",
      metric: `${liveStats.brands}+`,
      description: "Limited Edition Collections",
      icon: <Crown className="h-5 w-5" />,
      gradient: "from-rose-500 to-pink-600",
      bgColor: "bg-gradient-to-br from-rose-50 to-pink-50",
      textColor: "text-rose-900",
      accentColor: "text-rose-600",
      features: ["Designer Collabs", "Limited Editions", "VIP Access", "Exclusive"],
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProduct((prev) => (prev + 1) % productCategories.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [productCategories.length])

  // Simulate live stats updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats((prev) => ({
        totalProducts: prev.totalProducts + Math.floor(Math.random() * 3),
        newArrivals: prev.newArrivals + Math.floor(Math.random() * 2),
        categories: prev.categories + Math.floor(Math.random() * 1),
        brands: prev.brands + Math.floor(Math.random() * 1),
      }))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden backdrop-blur-xl">
      {/* Apple-style Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-2 h-2 bg-green-500 rounded-full shadow-sm"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-xs font-semibold text-gray-700 tracking-wide">MIZIZZI CATALOG</span>
          </div>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Layers className="h-4 w-4 text-gray-500" />
          </motion.div>
        </div>
      </div>

      {/* Main showcase with smooth Apple-like transitions */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProduct}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute inset-0 ${productCategories[currentProduct].bgColor} p-4`}
          >
            <div className="text-center h-full flex flex-col justify-center">
              {/* Icon with Apple-style design */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
                className="inline-flex mb-4 justify-center"
              >
                <div
                  className={`p-3 rounded-2xl bg-gradient-to-r ${productCategories[currentProduct].gradient} text-white shadow-lg`}
                >
                  {productCategories[currentProduct].icon}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`text-sm font-bold mb-2 ${productCategories[currentProduct].textColor} tracking-wide`}
              >
                {productCategories[currentProduct].title}
              </motion.h3>

              {/* Metric with counter animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
                className={`text-2xl font-black mb-2 ${productCategories[currentProduct].accentColor}`}
              >
                {productCategories[currentProduct].metric}
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={`text-xs ${productCategories[currentProduct].textColor} opacity-80 mb-4 font-medium`}
              >
                {productCategories[currentProduct].description}
              </motion.p>

              {/* Features with Apple-style cards - NO DOTS */}
              <div className="grid grid-cols-2 gap-2">
                {productCategories[currentProduct].features.map((feature, index) => (
                  <motion.div
                    key={`${currentProduct}-${feature}-${index}`}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.5 + index * 0.1,
                      type: "spring",
                      stiffness: 300,
                    }}
                    className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-white/20 shadow-sm"
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-[10px] font-medium text-gray-700">{feature}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/40 rounded-full"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${25 + (i % 3) * 25}%`,
                  }}
                  animate={{
                    x: [0, 15, -15, 0],
                    y: [0, -10, 10, 0],
                    opacity: [0.3, 0.7, 0.3],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Apple-style Footer CTA */}
      <motion.div
        className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-t border-gray-200"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Link href="/products" className="flex items-center justify-center text-gray-700 space-x-2 group">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Eye className="h-4 w-4 text-blue-500" />
          </motion.div>
          <span className="text-xs font-semibold tracking-wide group-hover:tracking-wider transition-all">
            EXPLORE MIZIZZI
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </div>
  )
}

// Apple-inspired Customer Experience for Right Side
const PremiumCustomerExperience = () => {
  const [currentExperience, setCurrentExperience] = useState(0)
  const [liveMetrics, setLiveMetrics] = useState({
    satisfaction: 98.7,
    deliveryTime: 24,
    savings: 156789,
    members: 12847,
  })

  const experiences = [
    {
      title: "MIZIZZI EXCELLENCE",
      metric: `${liveMetrics.satisfaction.toFixed(1)}%`,
      description: "Customer Satisfaction Rate",
      icon: <Award className="h-5 w-5" />,
      gradient: "from-amber-500 to-yellow-600",
      bgColor: "bg-gradient-to-br from-amber-50 to-yellow-50",
      textColor: "text-amber-900",
      accentColor: "text-amber-600",
      features: ["Premium Service", "Quality Guarantee", "Expert Curation", "Authentic Products"],
    },
    {
      title: "KENYA DELIVERY",
      metric: `${Math.floor(liveMetrics.deliveryTime)}H`,
      description: "Average Delivery Time",
      icon: <Timer className="h-5 w-5" />,
      gradient: "from-emerald-500 to-green-600",
      bgColor: "bg-gradient-to-br from-emerald-50 to-green-50",
      textColor: "text-emerald-900",
      accentColor: "text-emerald-600",
      features: ["Nairobi Same Day", "Nationwide Express", "Secure Packaging", "Live Tracking"],
    },
    {
      title: "CUSTOMER SAVINGS",
      metric: `KSh ${(liveMetrics.savings / 1000).toFixed(0)}K`,
      description: "Total Savings This Month",
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: "from-rose-500 to-red-600",
      bgColor: "bg-gradient-to-br from-rose-50 to-red-50",
      textColor: "text-rose-900",
      accentColor: "text-rose-600",
      features: ["Best Prices", "Flash Deals", "Bulk Discounts", "Loyalty Rewards"],
    },
    {
      title: "MIZIZZI FAMILY",
      metric: `${(liveMetrics.members / 1000).toFixed(1)}K`,
      description: "Happy Customers & Growing",
      icon: <Users className="h-5 w-5" />,
      gradient: "from-purple-500 to-indigo-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-indigo-50",
      textColor: "text-purple-900",
      accentColor: "text-purple-600",
      features: ["Community Driven", "Cultural Pride", "Local Support", "African Heritage"],
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExperience((prev) => (prev + 1) % experiences.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [experiences.length])

  // Simulate live metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetrics((prev) => ({
        satisfaction: Math.min(99.9, prev.satisfaction + Math.random() * 0.1),
        deliveryTime: Math.max(12, prev.deliveryTime - Math.random() * 2),
        savings: prev.savings + Math.floor(Math.random() * 1000),
        members: prev.members + Math.floor(Math.random() * 5),
      }))
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden backdrop-blur-xl">
      {/* Apple-style Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-2 h-2 bg-green-500 rounded-full shadow-sm"
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-xs font-semibold text-gray-700 tracking-wide">LIVE METRICS</span>
          </div>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Sparkles className="h-4 w-4 text-gray-500" />
          </motion.div>
        </div>
      </div>

      {/* Main experience showcase */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentExperience}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute inset-0 ${experiences[currentExperience].bgColor} p-4`}
          >
            <div className="text-center h-full flex flex-col justify-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
                className="inline-flex mb-4 justify-center"
              >
                <div
                  className={`p-3 rounded-2xl bg-gradient-to-r ${experiences[currentExperience].gradient} text-white shadow-lg`}
                >
                  {experiences[currentExperience].icon}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`text-sm font-bold mb-2 ${experiences[currentExperience].textColor} tracking-wide`}
              >
                {experiences[currentExperience].title}
              </motion.h3>

              {/* Metric */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
                className={`text-2xl font-black mb-2 ${experiences[currentExperience].accentColor}`}
              >
                {experiences[currentExperience].metric}
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className={`text-xs ${experiences[currentExperience].textColor} opacity-80 mb-4 font-medium`}
              >
                {experiences[currentExperience].description}
              </motion.p>

              {/* Features - NO DOTS */}
              <div className="grid grid-cols-2 gap-2">
                {experiences[currentExperience].features.map((feature, index) => (
                  <motion.div
                    key={`${currentExperience}-${feature}-${index}`}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.5 + index * 0.1,
                      type: "spring",
                      stiffness: 300,
                    }}
                    className="bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-white/20 shadow-sm"
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-[10px] font-medium text-gray-700">{feature}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/40 rounded-full"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${25 + (i % 3) * 25}%`,
                  }}
                  animate={{
                    x: [0, 15, -15, 0],
                    y: [0, -10, 10, 0],
                    opacity: [0.3, 0.7, 0.3],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Apple-style Footer CTA */}
      <motion.div
        className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-t border-gray-200"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Link href="/products" className="flex items-center justify-center text-gray-700 space-x-2 group">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Heart className="h-4 w-4 text-red-500" />
          </motion.div>
          <span className="text-xs font-semibold tracking-wide group-hover:tracking-wider transition-all">
            JOIN MIZIZZI
          </span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </div>
  )
}

// Apple-inspired Contact CTA component with enhanced animations
const ContactCTA = () => {
  const [currentSlide, setCurrentSlide] = useState(0)

  const promoSlides = [
    {
      icon: <Phone className="h-4 w-4" />,
      title: "CALL OR WHATSAPP",
      subtitle: "0746 741 719",
      description: "TO ORDER",
      bgGradient: "from-blue-500 via-blue-600 to-blue-700",
      shadowColor: "shadow-blue-500/25",
      glowColor: "shadow-blue-400/30",
      iconBg: "bg-white/20",
      particles: "bg-blue-300/40",
    },
    {
      icon: <Truck className="h-4 w-4" />,
      title: "FREE DELIVERY",
      subtitle: "Orders Over KSh 5,000",
      description: "NATIONWIDE",
      bgGradient: "from-emerald-500 via-green-500 to-green-600",
      shadowColor: "shadow-emerald-500/25",
      glowColor: "shadow-emerald-400/30",
      iconBg: "bg-white/20",
      particles: "bg-emerald-300/40",
    },
    {
      icon: <Shield className="h-4 w-4" />,
      title: "SECURE PAYMENT",
      subtitle: "100% Protected",
      description: "SHOP SAFELY",
      bgGradient: "from-purple-500 via-purple-600 to-indigo-600",
      shadowColor: "shadow-purple-500/25",
      glowColor: "shadow-purple-400/30",
      iconBg: "bg-white/20",
      particles: "bg-purple-300/40",
    },
    {
      icon: <CreditCard className="h-4 w-4" />,
      title: "EASY RETURNS",
      subtitle: "30 Days Policy",
      description: "HASSLE FREE",
      bgGradient: "from-orange-500 via-orange-600 to-red-500",
      shadowColor: "shadow-orange-500/25",
      glowColor: "shadow-orange-400/30",
      iconBg: "bg-white/20",
      particles: "bg-orange-300/40",
    },
    {
      icon: <MessageCircle className="h-4 w-4" />,
      title: "24/7 SUPPORT",
      subtitle: "Always Available",
      description: "GET HELP NOW",
      bgGradient: "from-pink-500 via-rose-500 to-red-500",
      shadowColor: "shadow-pink-500/25",
      glowColor: "shadow-pink-400/30",
      iconBg: "bg-white/20",
      particles: "bg-pink-300/40",
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [promoSlides.length])

  return (
    <div className="relative h-[90px] rounded-2xl overflow-hidden">
      {/* Background glow effect */}
      <motion.div
        className={`absolute -inset-1 rounded-2xl ${promoSlides[currentSlide].glowColor} blur-lg`}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{
            opacity: 0,
            scale: 0.9,
            rotateY: -15,
            z: -100,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            rotateY: 0,
            z: 0,
          }}
          exit={{
            opacity: 0,
            scale: 1.1,
            rotateY: 15,
            z: 100,
          }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
            type: "spring",
            stiffness: 100,
            damping: 20,
          }}
          className={`absolute inset-0 bg-gradient-to-br ${promoSlides[currentSlide].bgGradient} ${promoSlides[currentSlide].shadowColor} shadow-xl text-white flex flex-col justify-center items-center p-4 rounded-2xl border border-white/10`}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 opacity-10 rounded-2xl overflow-hidden"
            animate={{
              background: [
                `radial-gradient(circle at 20% 20%, white 1px, transparent 1px)`,
                `radial-gradient(circle at 80% 80%, white 1px, transparent 1px)`,
                `radial-gradient(circle at 50% 50%, white 1px, transparent 1px)`,
              ],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ backgroundSize: "30px 30px" }}
          />

          {/* Liquid morphing background overlay */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{
              background: [
                `linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)`,
                `linear-gradient(135deg, transparent, rgba(255,255,255,0.1), transparent)`,
                `linear-gradient(225deg, transparent, rgba(255,255,255,0.1), transparent)`,
                `linear-gradient(315deg, transparent, rgba(255,255,255,0.1), transparent)`,
              ],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />

          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.2,
            }}
            className="text-center space-y-1 relative z-10"
          >
            {/* Icon with magnetic field effect */}
            <motion.div
              className="flex justify-center mb-2 relative"
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              {/* Pulsing rings */}
              <motion.div
                className="absolute inset-0 border-2 border-white/30 rounded-full"
                animate={{
                  scale: [1, 2.5, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                }}
              />
              <motion.div
                className="absolute inset-0 border border-white/20 rounded-full"
                animate={{
                  scale: [1, 2, 1],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                  delay: 0.3,
                }}
              />
              <motion.div
                className="absolute inset-0 border border-white/15 rounded-full"
                animate={{
                  scale: [1, 1.8, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                  delay: 0.6,
                }}
              />

              <motion.div
                className={`${promoSlides[currentSlide].iconBg} backdrop-blur-sm p-2.5 rounded-full relative z-10 border border-white/20`}
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.95 }}
              >
                {promoSlides[currentSlide].icon}
              </motion.div>
            </motion.div>

            {/* Text with enhanced animations */}
            <motion.p
              className="text-xs font-bold uppercase tracking-widest opacity-90"
              initial={{ opacity: 0, y: 10, letterSpacing: "0.05em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.15em" }}
              transition={{
                duration: 0.6,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {promoSlides[currentSlide].title}
            </motion.p>

            <motion.p
              className="text-lg font-black tracking-wide"
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.4,
              }}
              whileHover={{ scale: 1.05 }}
            >
              {promoSlides[currentSlide].subtitle}
            </motion.p>

            <motion.p
              className="text-[10px] uppercase tracking-widest opacity-85 font-semibold"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{
                duration: 0.6,
                delay: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformOrigin: "center" }}
            >
              {promoSlides[currentSlide].description}
            </motion.p>
          </motion.div>

          {/* Enhanced floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1.5 h-1.5 ${promoSlides[currentSlide].particles} rounded-full`}
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                }}
                animate={{
                  x: [0, 25, -25, 0],
                  y: [0, -20, 20, 0],
                  opacity: [0.4, 0.8, 0.4],
                  scale: [0.5, 1.2, 0.5],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 4 + i * 0.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{
              background: [
                `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
                `linear-gradient(90deg, transparent, transparent, transparent)`,
              ],
              x: [-100, 300],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              repeatDelay: 2,
            }}
          />

          {/* Corner accent lights */}
          <motion.div
            className="absolute top-2 right-2 w-2 h-2 bg-white/30 rounded-full"
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white/20 rounded-full"
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Removed progress indicator dots as requested */}
    </div>
  )
}

export function Carousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [hoverState, setHoverState] = useState(false)
  const [leftHover, setLeftHover] = useState(false)
  const [rightHover, setRightHover] = useState(false)

  const isDesktop = useMediaQuery("(min-width: 1280px)")
  const isLargeTablet = useMediaQuery("(min-width: 1024px)")

  // Handle slide transitions
  const changeSlide = useCallback(
    (newIndex: number) => {
      if (isTransitioning) return

      setIsTransitioning(true)
      setCurrentSlide(newIndex)

      setTimeout(() => {
        setIsTransitioning(false)
      }, 1000)
    },
    [isTransitioning],
  )

  // Auto-advance slides with pause on hover
  useEffect(() => {
    if (hoverState) return

    const timer = setInterval(() => {
      const nextSlide = (currentSlide + 1) % carouselItems.length
      changeSlide(nextSlide)
    }, 6000)

    return () => clearInterval(timer)
  }, [currentSlide, changeSlide, hoverState])

  return (
    <div className="relative w-full overflow-hidden">
      {/* Left side - Product Showcase - Only on very large screens */}
      {isDesktop && (
        <div className="absolute left-0 top-0 h-full w-[200px] xl:w-[220px] transform z-10 p-2">
          <ProductShowcase />
        </div>
      )}

      {/* Right side - Premium Customer Experience - Only on very large screens */}
      {isDesktop && (
        <div className="absolute right-0 top-0 h-full w-[200px] xl:w-[220px] transform z-10 p-2">
          <PremiumCustomerExperience />
        </div>
      )}

      {/* Main carousel content */}
      <div
        className={cn(
          "mx-auto w-full max-w-[1200px] grid gap-3 sm:gap-4",
          isDesktop ? "px-2 lg:grid-cols-[1fr,280px]" : "px-2 sm:px-4",
          "relative",
        )}
      >
        {/* Enhanced main carousel */}
        <div
          className="relative h-[200px] sm:h-[250px] md:h-[300px] lg:h-[350px] xl:h-[380px] overflow-hidden rounded-xl shadow-sm border border-gray-100"
          onMouseEnter={() => setHoverState(true)}
          onMouseLeave={() => setHoverState(false)}
        >
          <div className="absolute inset-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
              >
                <div className="relative h-full w-full">
                  <Image
                    src={carouselItems[currentSlide].image || "/placeholder.svg"}
                    alt={carouselItems[currentSlide].title}
                    fill
                    className="object-cover"
                    priority={currentSlide === 0}
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

                  {/* Discount badge */}
                  <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-red-500 text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                    {carouselItems[currentSlide].discount}
                  </div>

                  {/* Badge */}
                  <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-white/10 backdrop-blur-md text-white px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wider border border-white/20">
                    {carouselItems[currentSlide].badge}
                  </div>
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-6 md:p-8 lg:p-10 text-white">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    className="max-w-xs sm:max-w-md lg:max-w-lg"
                  >
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-3 leading-tight">
                      {carouselItems[currentSlide].title}
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg font-medium text-white/90 mb-4 sm:mb-6 leading-relaxed">
                      {carouselItems[currentSlide].description}
                    </p>
                    <Button
                      asChild
                      className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 sm:px-8 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 text-sm sm:text-base"
                    >
                      <Link href={carouselItems[currentSlide].href}>{carouselItems[currentSlide].buttonText}</Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation arrows */}
          <div
            className="absolute inset-y-0 left-0 w-1/2 flex items-center z-20"
            onMouseEnter={() => {
              setHoverState(true)
              setLeftHover(true)
            }}
            onMouseLeave={() => {
              setHoverState(false)
              setLeftHover(false)
            }}
          >
            <motion.button
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 m-4 rounded-full border border-white/20 shadow-lg"
              onClick={() => changeSlide((currentSlide - 1 + carouselItems.length) % carouselItems.length)}
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{
                opacity: leftHover ? 1 : 0,
                x: leftHover ? 0 : -20,
                scale: leftHover ? 1 : 0.8,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </motion.button>
          </div>

          <div
            className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end z-20"
            onMouseEnter={() => {
              setHoverState(true)
              setRightHover(true)
            }}
            onMouseLeave={() => {
              setHoverState(false)
              setRightHover(false)
            }}
          >
            <motion.button
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 m-4 rounded-full border border-white/20 shadow-lg"
              onClick={() => changeSlide((currentSlide + 1) % carouselItems.length)}
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{
                opacity: rightHover ? 1 : 0,
                x: rightHover ? 0 : 20,
                scale: rightHover ? 1 : 0.8,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        {/* Side cards - Large tablets and desktop only */}
        <div className={cn("flex-col gap-3", isLargeTablet ? "flex h-[350px] xl:h-[380px]" : "hidden")}>
          {/* Feature cards with Apple-style design and real icons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-grow">
            <div className="flex flex-col h-[290px]">
              {featureCards.map((card, index) => (
                <Link
                  href={card.href}
                  key={index}
                  className={`group flex items-center p-4 ${card.hoverBg} transition-all duration-200 text-gray-800 h-[48.33px] border-b border-gray-50 last:border-b-0`}
                >
                  <div className={`flex-shrink-0 mr-3 p-2.5 rounded-xl ${card.iconBg} ${card.iconColor} shadow-sm`}>
                    {card.icon}
                  </div>
                  <div className="transition-transform duration-200 group-hover:translate-x-1">
                    <h3 className="text-xs font-semibold tracking-wide">{card.title}</h3>
                    <p className="text-[10px] text-gray-600">{card.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Contact CTA */}
          <ContactCTA />
        </div>
      </div>
    </div>
  )
}
