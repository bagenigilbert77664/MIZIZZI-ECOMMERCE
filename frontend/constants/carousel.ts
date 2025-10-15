import {
  Zap,
  Crown,
  Heart,
  Package,
  HeadphonesIcon,
  Search,
  Phone,
  MessageCircle,
  Shield,
  Star,
  Truck,
  Gift,
} from "lucide-react"
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
    image:
      "https://images.unsplash.com/photo-1556740738-b676540e7c8c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Discover Our Latest Collection",
    description: "Explore the newest trends and exclusive designs for a limited time.",
    buttonText: "SHOP NEW ARRIVALS",
    href: "/products",
    badge: "NEW ARRIVALS",
    discount: "30% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1585487000160-6be74267207d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Unleash Your Style",
    description: "Find unique pieces that reflect your personality and elevate your wardrobe.",
    buttonText: "EXPLORE FASHION",
    href: "/products",
    badge: "TRENDING",
    discount: "40% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1523275371510-ae2700b9179e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Timeless Elegance in Every Detail",
    description: "Experience craftsmanship and quality that lasts a lifetime.",
    buttonText: "VIEW COLLECTION",
    href: "/products",
    badge: "EXCLUSIVE",
    discount: "25% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Step Up Your Game",
    description: "Discover our range of high-performance athletic wear and footwear.",
    buttonText: "SHOP SPORTSWEAR",
    href: "/products",
    badge: "ATHLETIC",
    discount: "35% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1596462502278-27ddab8a248d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Indulge in Pure Luxury",
    description: "Premium skincare and beauty products for a radiant you.",
    buttonText: "BEAUTY ESSENTIALS",
    href: "/products",
    badge: "LUXURY",
    discount: "20% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1520006403209-5191927050b0?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Sophistication Redefined",
    description: "Curated menswear collection for the modern gentleman.",
    buttonText: "MEN'S COLLECTION",
    href: "/products",
    badge: "GENTLEMAN",
    discount: "30% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c436?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Empower Your Wardrobe",
    description: "Chic and elegant designs for every woman.",
    buttonText: "WOMEN'S FASHION",
    href: "/products",
    badge: "ELEGANCE",
    discount: "45% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Walk in Style",
    description: "Premium footwear for comfort and fashion.",
    buttonText: "SHOP FOOTWEAR",
    href: "/products",
    badge: "FOOTWEAR",
    discount: "20% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Innovate Your Life",
    description: "Cutting-edge electronics and gadgets for the modern home.",
    buttonText: "TECH DEALS",
    href: "/products",
    badge: "INNOVATION",
    discount: "15% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1556912167-f556f1f39f75?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Transform Your Space",
    description: "Stylish home decor and essentials for every room.",
    buttonText: "HOME & LIVING",
    href: "/products",
    badge: "HOME",
    discount: "25% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1534030347204-4e5960c374b3?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Timeless Pieces, Modern Twist",
    description: "Discover our curated collection of vintage-inspired fashion.",
    buttonText: "VINTAGE FINDS",
    href: "/products",
    badge: "RETRO",
    discount: "50% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1518495973542-4542c06a58b4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Gear Up for Adventure",
    description: "Durable and reliable outdoor equipment for your next journey.",
    buttonText: "ADVENTURE GEAR",
    href: "/products",
    badge: "OUTDOOR",
    discount: "10% OFF",
  },
  {
    image:
      "https://images.unsplash.com/photo-1513506003901-ad1694683a8d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    title: "Handcrafted with Passion",
    description: "Unique artisan gifts and crafts for every special occasion.",
    buttonText: "DISCOVER GIFTS",
    href: "/products",
    badge: "ARTISAN",
    discount: "15% OFF",
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
  minSpaceForSidePanels: 1536, // Changed from 1200 to 1536 (2xl breakpoint)
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
