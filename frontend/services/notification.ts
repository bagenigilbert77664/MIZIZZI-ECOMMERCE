import api, { getApiPath } from "@/lib/api"
import { websocketService } from "@/services/websocket"
import { logger } from "@/lib/logger"
import type {
  AdminNotification,
  Notification,
  NotificationPreferences,
  NotificationPriority,
  NotificationTarget,
  NotificationType,
  UserSegment,
} from "@/types/notification"

/**
 * Service for handling notifications in the application
 * Connects to the Flask backend API for notification operations
 */
export const notificationService = {
  /**
   * Get user notifications from the API
   * @returns Promise<Notification[]> Array of user notifications
   */
  async getUserNotifications(): Promise<Notification[]> {
    try {
      // Use the API utility to construct the URL
      const response = await api.get(getApiPath("/notifications"))
      return response.data
    } catch (error) {
      logger.error("Error fetching user notifications:", error)
      // Return mock data for development if API fails
      return getMockNotifications()
    }
  },

  /**
   * Mark a notification as read
   * @param id Notification ID
   * @returns Promise<boolean> Success status
   */
  async markAsRead(id: string): Promise<boolean> {
    try {
      await api.put(getApiPath(`/notifications/${id}/read`))
      return true
    } catch (error) {
      logger.error(`Error marking notification ${id} as read:`, error)
      return false
    }
  },

  /**
   * Mark all notifications as read
   * @returns Promise<boolean> Success status
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      await api.put(getApiPath("/notifications/read-all"))
      return true
    } catch (error) {
      logger.error("Error marking all notifications as read:", error)
      return false
    }
  },

  /**
   * Delete a notification
   * @param id Notification ID
   * @returns Promise<boolean> Success status
   */
  async deleteNotification(id: string): Promise<boolean> {
    try {
      await api.delete(getApiPath(`/notifications/${id}`))
      return true
    } catch (error) {
      logger.error(`Error deleting notification ${id}:`, error)
      return false
    }
  },

  /**
   * Get user notification preferences
   * @returns Promise<NotificationPreferences> User notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await api.get(getApiPath("/notifications/preferences"))
      return response.data
    } catch (error) {
      logger.error("Error fetching notification preferences:", error)
      // Return default preferences
      return getDefaultPreferences()
    }
  },

  /**a
   * Update user notification preferences
   * @param preferences Partial<NotificationPreferences> Updated preferences
   * @returns Promise<NotificationPreferences> Updated notification preferences
   */
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const response = await api.put(getApiPath("/notifications/preferences"), preferences)
      return response.data
    } catch (error) {
      logger.error("Error updating notification preferences:", error)
      throw error
    }
  },

  /**
   * Send an admin notification to users
   * @param notification Notification data
   * @returns Promise<AdminNotification> Created notification
   */
  async sendAdminNotification(notification: {
    title: string
    message: string
    type: NotificationType
    targetUsers: NotificationTarget
    userIds?: string[]
    userSegment?: UserSegment
    priority: NotificationPriority
    actionUrl?: string
    expiresAt?: string
    image?: string
  }): Promise<AdminNotification> {
    try {
      // Use the API utility to construct the URL
      const response = await api.post(getApiPath("/admin/notifications/send"), notification)

      // Also send via WebSocket for real-time delivery if available
      try {
        websocketService.send("admin_notification", {
          ...notification,
          id: response.data.id,
          createdAt: new Date().toISOString(),
        })
      } catch (wsError) {
        logger.warn("WebSocket notification failed, but HTTP request succeeded:", wsError)
      }

      return response.data
    } catch (error) {
      logger.error("Error sending admin notification:", error)
      throw error
    }
  },

  /**
   * Get admin sent notifications
   * @param params Query parameters
   * @returns Promise<AdminNotification[]> Array of sent notifications
   */
  async getAdminSentNotifications(params: Record<string, any> = {}): Promise<AdminNotification[]> {
    try {
      const response = await api.get(getApiPath("/admin/notifications/sent"), {
        params,
      })
      return response.data
    } catch (error) {
      logger.error("Error fetching sent admin notifications:", error)
      // Return mock data for development if API fails
      return getMockSentNotifications()
    }
  },

  /**
   * Get notification analytics
   * @param notificationId Notification ID
   * @returns Promise<any> Notification analytics
   */
  async getNotificationAnalytics(notificationId: string): Promise<any> {
    try {
      const response = await api.get(getApiPath(`/admin/notifications/${notificationId}/analytics`))
      return response.data
    } catch (error) {
      logger.error(`Error fetching analytics for notification ${notificationId}:`, error)
      return {
        delivered: 0,
        read: 0,
        clicked: 0,
      }
    }
  },

  /**
   * Subscribe to real-time notifications
   * @param callback Callback function to handle notifications
   * @returns Function to unsubscribe
   */
  subscribeToNotifications(callback: (notification: Notification) => void): () => void {
    // Subscribe to WebSocket notifications
    const unsubscribe = websocketService.subscribe("notification", callback)

    // Also subscribe to admin notifications
    const unsubscribeAdmin = websocketService.subscribe("admin_notification", callback)

    // Return combined unsubscribe function
    return () => {
      unsubscribe()
      unsubscribeAdmin()
    }
  },

  /**
   * Get unread notification count
   * @returns Promise<number> Number of unread notifications
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get(getApiPath("/notifications/unread-count"))
      return response.data.count
    } catch (error) {
      logger.error("Error fetching unread notification count:", error)
      // Return mock data for development if API fails
      const mockNotifications = getMockNotifications()
      return mockNotifications.filter((n) => !n.read).length
    }
  },

  /**
   * Get notifications by type
   * @param type Notification type
   * @returns Promise<Notification[]> Array of notifications of the specified type
   */
  async getNotificationsByType(type: NotificationType): Promise<Notification[]> {
    try {
      const response = await api.get(getApiPath(`/notifications/type/${type}`))
      return response.data
    } catch (error) {
      logger.error(`Error fetching notifications of type ${type}:`, error)
      // Return filtered mock data for development if API fails
      const mockNotifications = getMockNotifications()
      return mockNotifications.filter((n) => n.type === type)
    }
  },
}

/**
 * Get default notification preferences
 * @returns NotificationPreferences Default preferences
 */
function getDefaultPreferences(): NotificationPreferences {
  return {
    order: true,
    payment: true,
    product: true,
    promotion: true,
    system: true,
    announcement: true,
    product_update: true,
    price_change: true,
    stock_alert: true,
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
  }
}

/**
 * Get mock notifications for development and testing
 * @returns Notification[] Array of mock notifications
 */
function getMockNotifications(): Notification[] {
  return [
    {
      id: "1",
      type: "order",
      title: "Order Shipped!",
      description: "Your order #12345 has been shipped via DHL Express",
      image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=96&h=96&fit=crop",
      timestamp: "2 hours ago",
      read: false,
      priority: "high",
      link: "/order/12345",
      actions: [
        { label: "Track Order", href: "/track-order/12345" },
        { label: "View Details", href: "/order/12345" },
      ],
    },
    {
      id: "2",
      type: "promotion",
      title: "Flash Sale Starting Soon!",
      description: "Get up to 70% off on luxury jewelry. Sale starts in 2 hours!",
      image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=96&h=96&fit=crop",
      timestamp: "5 hours ago",
      read: false,
      priority: "medium",
      link: "/flash-sale",
      actions: [
        { label: "Set Reminder", href: "#" },
        { label: "View Catalog", href: "/flash-sale" },
      ],
    },
    {
      id: "3",
      type: "product",
      title: "New Collection Arrived",
      description: "Discover our latest Summer 2024 Jewelry Collection",
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=96&h=96&fit=crop",
      timestamp: "1 day ago",
      read: true,
      priority: "medium",
      link: "/new-arrivals",
      badge: "New Arrival",
    },
    {
      id: "4",
      type: "order",
      title: "Order Delivered!",
      description: "Your order #12344 has been delivered successfully",
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=96&h=96&fit=crop",
      timestamp: "1 day ago",
      read: true,
      priority: "medium",
      link: "/order/12344",
      actions: [{ label: "Write Review", href: "/review/12344" }],
    },
    {
      id: "5",
      type: "payment",
      title: "Payment Successful",
      description: "Your payment of KSh 29,999 has been processed",
      image: "https://images.unsplash.com/photo-1601591563168-fdb40a21d0e3?w=96&h=96&fit=crop",
      timestamp: "2 days ago",
      read: true,
      priority: "medium",
      link: "/payments",
    },
    {
      id: "6",
      type: "announcement",
      title: "Important Store Update",
      description: "Our store will be undergoing maintenance on July 15th from 2-4 AM.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=96&h=96&fit=crop",
      timestamp: "3 days ago",
      read: false,
      priority: "high",
      link: "/announcements/maintenance",
    },
  ]
}

/**
 * Get mock sent notifications for development and testing
 * @returns AdminNotification[] Array of mock sent notifications
 */
function getMockSentNotifications(): AdminNotification[] {
  return [
    {
      id: "notif_1",
      title: "New Summer Collection",
      message: "Check out our latest summer collection with exclusive discounts!",
      type: "promotion",
      targetUsers: "all",
      priority: "medium",
      actionUrl: "/summer-collection",
      createdBy: "admin_user",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      id: "notif_2",
      title: "Important System Update",
      message: "We've updated our terms of service. Please review the changes.",
      type: "system",
      targetUsers: "all",
      priority: "high",
      actionUrl: "/terms",
      createdBy: "admin_user",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    },
    {
      id: "notif_3",
      title: "Flash Sale: 50% Off",
      message: "Limited time offer! Get 50% off on all premium products.",
      type: "promotion",
      targetUsers: "segment",
      userSegment: "premium",
      priority: "high",
      actionUrl: "/flash-sale",
      createdBy: "admin_user",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
  ]
}

