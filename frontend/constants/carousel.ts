import { Zap, Crown, Heart, Package, HeadphonesIcon, Search, Phone, MessageCircle, Shield, Star, Truck, Gift } from 'lucide-react'
import type { LucideIcon } from "lucide-react"

export interface CarouselItem {
  image: string
  title: string
  description: string
  buttonText: string
  href: string
  badge: string
  discount: string
}

export interface FeatureCard {
  icon: LucideIcon
  title: string
  description: string
  href: string
  iconBg: string
  iconColor: string
  hoverBg: string
}

export interface PromoSlide {
  icon: LucideIcon
  title: string
  subtitle: string
  description: string
  bgGradient: string
  glowColor: string
  shadowColor: string
  iconBg: string
  particles: string
}

export const carouselItems: CarouselItem[] = [
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    title: "Premium Fashion Collection",
    description: "Discover the Latest Trends in Designer Fashion",
    buttonText: "SHOP NOW",
    href: "/products",
    badge: "NEW ARRIVALS",
    discount: "40% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2126&q=80",
    title: "Luxury Jewelry & Accessories",
    description: "Exquisite Handcrafted Pieces for Every Occasion",
    buttonText: "EXPLORE NOW",
    href: "/products",
    badge: "EXCLUSIVE",
    discount: "35% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80",
    title: "Designer Handbags & Purses",
    description: "Premium Quality Bags from Top International Brands",
    buttonText: "DISCOVER MORE",
    href: "/products",
    badge: "TRENDING",
    discount: "50% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    title: "Athletic & Sportswear",
    description: "High-Performance Gear for Active Lifestyles",
    buttonText: "SHOP SPORTS",
    href: "/products",
    badge: "BESTSELLER",
    discount: "30% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    title: "Premium Skincare & Beauty",
    description: "Luxury Beauty Products for Radiant Skin",
    buttonText: "BEAUTY NOW",
    href: "/products",
    badge: "FEATURED",
    discount: "25% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    title: "Men's Fashion Essentials",
    description: "Sophisticated Style for the Modern Gentleman",
    buttonText: "SHOP MEN",
    href: "/products",
    badge: "NEW SEASON",
    discount: "45% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    title: "Women's Designer Wear",
    description: "Elegant Dresses and Outfits for Every Occasion",
    buttonText: "SHOP WOMEN",
    href: "/products",
    badge: "LUXURY",
    discount: "55% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2012&q=80",
    title: "Premium Footwear Collection",
    description: "Comfortable and Stylish Shoes for Every Step",
    buttonText: "SHOP SHOES",
    href: "/products",
    badge: "COMFORT+",
    discount: "40% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    title: "Tech & Electronics",
    description: "Latest Gadgets and Smart Devices",
    buttonText: "TECH DEALS",
    href: "/products",
    badge: "INNOVATION",
    discount: "60% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80",
    title: "Home & Living Essentials",
    description: "Transform Your Space with Premium Home Decor",
    buttonText: "HOME STYLE",
    href: "/products",
    badge: "INTERIOR",
    discount: "35% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2005&q=80",
    title: "Vintage & Retro Collection",
    description: "Timeless Pieces with Classic Appeal",
    buttonText: "VINTAGE SHOP",
    href: "/products",
    badge: "CLASSIC",
    discount: "30% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    title: "Outdoor & Adventure Gear",
    description: "Equipment for Your Next Great Adventure",
    buttonText: "ADVENTURE",
    href: "/products",
    badge: "OUTDOOR",
    discount: "45% OFF",
  },
  {
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2080&q=80",
    title: "Artisan Crafts & Gifts",
    description: "Unique Handmade Items and Special Gifts",
    buttonText: "GIFT IDEAS",
    href: "/products",
    badge: "HANDMADE",
    discount: "25% OFF",
  },
]

export const featureCards: FeatureCard[] = [
  {
    icon: Zap,
    title: "FLASH SALES",
    description: "Limited Time Offers",
    href: "/flash-sales",
    iconBg: "bg-gradient-to-br from-yellow-50 to-orange-50",
    iconColor: "text-orange-600",
    hoverBg: "hover:bg-orange-50/80",
  },
  {
    icon: Crown,
    title: "LUXURY DEALS",
    description: "Premium Collections",
    href: "/luxury",
    iconBg: "bg-gradient-to-br from-purple-50 to-indigo-50",
    iconColor: "text-purple-600",
    hoverBg: "hover:bg-purple-50/80",
  },
  {
    icon: Heart,
    title: "WISHLIST",
    description: "Save Your Favorites",
    href: "/wishlist",
    iconBg: "bg-gradient-to-br from-pink-50 to-rose-50",
    iconColor: "text-pink-600",
    hoverBg: "hover:bg-pink-50/80",
  },
  {
    icon: Package,
    title: "ORDERS",
    description: "Track Your Purchases",
    href: "/orders",
    iconBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    iconColor: "text-blue-600",
    hoverBg: "hover:bg-blue-50/80",
  },
  {
    icon: HeadphonesIcon,
    title: "SUPPORT",
    description: "24/7 Assistance",
    href: "/help",
    iconBg: "bg-gradient-to-br from-green-50 to-emerald-50",
    iconColor: "text-green-600",
    hoverBg: "hover:bg-green-50/80",
  },
  {
    icon: Search,
    title: "PRODUCTS",
    description: "Browse All Items",
    href: "/products",
    iconBg: "bg-gradient-to-br from-gray-50 to-slate-50",
    iconColor: "text-gray-600",
    hoverBg: "hover:bg-gray-50/80",
  },
]

export const promoSlides: PromoSlide[] = [
  {
    icon: Phone,
    title: "CONTACT US",
    subtitle: "0700 123 456",
    description: "24/7 Customer Support",
    bgGradient: "from-blue-600 via-blue-700 to-indigo-800",
    glowColor: "bg-blue-400/30",
    shadowColor: "shadow-blue-500/25",
    iconBg: "bg-white/20",
    particles: "bg-blue-200",
  },
  {
    icon: MessageCircle,
    title: "LIVE CHAT",
    subtitle: "Chat Now",
    description: "Instant Help Available",
    bgGradient: "from-green-600 via-emerald-700 to-teal-800",
    glowColor: "bg-green-400/30",
    shadowColor: "shadow-green-500/25",
    iconBg: "bg-white/20",
    particles: "bg-green-200",
  },
  {
    icon: Shield,
    title: "SECURE SHOPPING",
    subtitle: "100% Safe",
    description: "Protected Transactions",
    bgGradient: "from-purple-600 via-violet-700 to-indigo-800",
    glowColor: "bg-purple-400/30",
    shadowColor: "shadow-purple-500/25",
    iconBg: "bg-white/20",
    particles: "bg-purple-200",
  },
  {
    icon: Star,
    title: "PREMIUM QUALITY",
    subtitle: "5-Star Rated",
    description: "Verified Products Only",
    bgGradient: "from-yellow-500 via-orange-600 to-red-700",
    glowColor: "bg-yellow-400/30",
    shadowColor: "shadow-yellow-500/25",
    iconBg: "bg-white/20",
    particles: "bg-yellow-200",
  },
  {
    icon: Truck,
    title: "FREE DELIVERY",
    subtitle: "Same Day",
    description: "Orders Over KSh 2,000",
    bgGradient: "from-cyan-600 via-blue-700 to-indigo-800",
    glowColor: "bg-cyan-400/30",
    shadowColor: "shadow-cyan-500/25",
    iconBg: "bg-white/20",
    particles: "bg-cyan-200",
  },
  {
    icon: Gift,
    title: "SPECIAL OFFERS",
    subtitle: "Up to 70% Off",
    description: "Limited Time Deals",
    bgGradient: "from-pink-600 via-rose-700 to-red-800",
    glowColor: "bg-pink-400/30",
    shadowColor: "shadow-pink-500/25",
    iconBg: "bg-white/20",
    particles: "bg-pink-200",
  },
]

// Breakpoint constants for responsive layout
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  minSpaceForCards: 600,
  minSpaceForSidePanels: 1200,
}

// Timing constants
export const TIMING = {
  slideInterval: 5000,
  componentRotationInterval: 3000,
  animationDuration: 800,
  progressUpdateInterval: 50,
}

// Animation configurations
export const ANIMATION_CONFIGS = {
  slideTransition: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  },
  iconPulse: {
    duration: 2,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut" as const,
  },
  particleFloat: {
    duration: 3,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut" as const,
  },
}
