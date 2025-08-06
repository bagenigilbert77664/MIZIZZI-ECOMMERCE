"use client"

import { useState, useEffect } from "react"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import type { SystemSettings as OriginalSystemSettings } from "@/types/admin"

// Extend SystemSettings to include 'site' if not present
type SystemSettings = OriginalSystemSettings & {
  site: {
    name: string
    tagline: string
    description: string
    logo_url: string
    favicon_url: string
    email: string
    phone: string
    address: string
    social_links: {
      facebook: string
      instagram: string
      twitter: string
      youtube: string
      pinterest: string
      linkedin: string
    }
    currency: string
    currency_symbol: string
    timezone: string
    date_format: string
    time_format: string
    default_language: string
    available_languages: string[]
  }
}

const defaultSettings: SystemSettings = {
  site: {
    name: "Mizizzi E-commerce",
    tagline: "Your Premium Shopping Destination",
    description: "Discover amazing products at unbeatable prices",
    logo_url: "/logo.png",
    favicon_url: "/favicon.ico",
    email: "info@mizizzi.com",
    phone: "+254 700 000 000",
    address: "Nairobi, Kenya",
    social_links: {
      facebook: "",
      instagram: "",
      twitter: "",
      youtube: "",
      pinterest: "",
      linkedin: "",
    },
    currency: "KES",
    currency_symbol: "KSh",
    timezone: "Africa/Nairobi",
    date_format: "DD/MM/YYYY",
    time_format: "24h",
    default_language: "en",
    available_languages: ["en", "sw"],
  },
  seo: {
    meta_title: "Mizizzi - Premium E-commerce Store",
    meta_description: "Shop the latest products with fast delivery and great prices",
    meta_keywords: "ecommerce, shopping, online store, kenya",
    google_analytics_id: "",
    facebook_pixel_id: "",
    robots_txt: "User-agent: *\nAllow: /",
    sitemap_enabled: true,
  },
  email: {
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_encryption: "tls",
    from_email: "noreply@mizizzi.com",
    from_name: "Mizizzi Store",
    email_signature: "Best regards,\nThe Mizizzi Team",
    email_templates: {
      welcome: {
        subject: "Welcome to Mizizzi!",
        body: "Thank you for joining us!",
        is_active: true,
      },
      order_confirmation: {
        subject: "Order Confirmation - #{order_number}",
        body: "Your order has been confirmed.",
        is_active: true,
      },
      shipping_notification: {
        subject: "Your order is on the way!",
        body: "Your order has been shipped.",
        is_active: true,
      },
    },
  },
  payment: {
    payment_methods: [
      { id: "mpesa", name: "M-Pesa", is_active: true, config: {} },
      { id: "card", name: "Credit/Debit Card", is_active: true, config: {} },
      { id: "cod", name: "Cash on Delivery", is_active: true, config: {} },
    ],
    currency: "KES",
    tax_rate: 16,
    tax_included_in_price: false,
  },
  shipping: {
    shipping_methods: [
      { id: "standard", name: "Standard Delivery", is_active: true, price: 200, free_shipping_threshold: 2000 },
      { id: "express", name: "Express Delivery", is_active: true, price: 500, free_shipping_threshold: 5000 },
      { id: "pickup", name: "Store Pickup", is_active: true, price: 0 },
    ],
    shipping_zones: [
      {
        id: 1,
        name: "Nairobi",
        countries: ["KE"],
        states: ["Nairobi"],
        zip_codes: [],
        shipping_methods: [
          { id: "standard", price: 200 },
          { id: "express", price: 500 },
        ],
      },
    ],
  },
  inventory: {
    low_stock_threshold: 10,
    notify_on_low_stock: true,
    allow_backorders: false,
    show_out_of_stock_products: true,
  },
  reviews: {
    enabled: true,
    require_approval: true,
    allow_guest_reviews: false,
    notify_on_new_review: true,
  },
  security: {
    password_min_length: 8,
    password_requires_special_char: true,
    password_requires_number: true,
    password_requires_uppercase: true,
    max_login_attempts: 5,
    lockout_time: 15,
    session_lifetime: 24,
    enable_two_factor: false,
  },
  maintenance: {
    maintenance_mode: false,
    maintenance_message: "We're currently performing maintenance. Please check back soon.",
    allowed_ips: [],
  },
}

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await adminService.getSettings()
      setSettings({ ...defaultSettings, ...data })
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        title: "Error",
        description: "Failed to load settings. Using defaults.",
        variant: "destructive",
  const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(typeof prev[section] === "object" && prev[section] !== null ? prev[section] : {}),
        [key]: value,
      },
    }))
  }

  const updateNestedSetting = (section: keyof SystemSettings, parentKey: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(typeof prev[section] === "object" && prev[section] !== null ? prev[section] : {}),
        [parentKey]: {
          ...(prev[section] && typeof (prev[section] as any)[parentKey] === "object" && (prev[section] as any)[parentKey] !== null
            ? (prev[section] as any)[parentKey]
            : {}),
          [key]: value,
        },
      },
    }))
  }
      })
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const updateNestedSetting = (section: keyof SystemSettings, parentKey: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentKey]: {
          ...(prev[section] as any)[parentKey],
          [key]: value,
        },
      },
    }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return {
    settings,
    loading,
    saving,
    loadSettings,
    saveSettings,
    updateSetting,
    updateNestedSetting,
    resetSettings,
  }
}
