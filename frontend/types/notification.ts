// Notification Types
export type NotificationPriority = "high" | "medium" | "low"
export type NotificationTarget = "all" | "specific" | "segment"
export type NotificationType =
  | "order"
  | "payment"
  | "product"
  | "promotion"
  | "system"
  | "announcement"
  | "product_update"
  | "price_change"
  | "stock_alert"

export type UserSegment = "new" | "returning" | "premium" | "inactive" | "recent_purchasers"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  image?: string
  timestamp: string
  read: boolean
  priority: NotificationPriority
  icon?: any // Lucide icon component
  link?: string
  actions?: { label: string; href: string }[]
  badge?: string
  data?: Record<string, any>
}

export interface AdminNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  targetUsers: NotificationTarget
  userIds?: string[] // For specific users
  userSegment?: UserSegment // For user segments
  priority: NotificationPriority
  actionUrl?: string
  expiresAt?: string
  createdBy: string // Admin ID
  createdAt: string
  image?: string
  read?: boolean
}

export interface NotificationPreferences {
  order: boolean
  payment: boolean
  product: boolean
  promotion: boolean
  system: boolean
  announcement: boolean
  product_update: boolean
  price_change: boolean
  stock_alert: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
}

