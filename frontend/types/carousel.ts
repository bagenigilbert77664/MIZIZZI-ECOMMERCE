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

export interface CarouselHookProps {
  itemsLength: number
  autoPlay?: boolean
  interval?: number
}

export interface CarouselHookReturn {
  currentSlide: number
  isPaused: boolean
  nextSlide: () => void
  prevSlide: () => void
  pause: () => void
  resume: () => void
  goToSlide: (index: number) => void
}

export interface ResponsiveLayoutReturn {
  isMobile: boolean
  isTablet: boolean
  isLargeTablet: boolean
  isDesktop: boolean
  sidePanelsVisible: boolean
}
