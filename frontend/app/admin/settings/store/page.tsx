"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import type { SystemSettings } from "@/types/admin"
import { Store, Save, RefreshCw, Wrench } from "lucide-react"

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

export default function StoreSettingsPage() {
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
      })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      await adminService.updateSettings(settings)
      toast({
        title: "Success",
        description: "Store settings saved successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store Settings</h1>
          <p className="text-muted-foreground">Configure your store's operational settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Configuration
          </CardTitle>
          <CardDescription>Configure your store's operational settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-currency">Store Currency</Label>
              <Select
                value={settings.site.currency}
                onValueChange={(value) => updateSetting("site", "currency", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency-symbol">Currency Symbol</Label>
              <Input
                id="currency-symbol"
                value={settings.site.currency_symbol}
                onChange={(e) => updateSetting("site", "currency_symbol", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Inventory Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="low-stock-threshold">Low Stock Threshold</Label>
                <Input
                  id="low-stock-threshold"
                  type="number"
                  value={settings.inventory.low_stock_threshold}
                  onChange={(e) => updateSetting("inventory", "low_stock_threshold", Number.parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="notify-low-stock"
                  checked={settings.inventory.notify_on_low_stock}
                  onCheckedChange={(checked) => updateSetting("inventory", "notify_on_low_stock", checked)}
                />
                <Label htmlFor="notify-low-stock">Notify when stock is low</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-backorders"
                  checked={settings.inventory.allow_backorders}
                  onCheckedChange={(checked) => updateSetting("inventory", "allow_backorders", checked)}
                />
                <Label htmlFor="allow-backorders">Allow backorders</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-out-of-stock"
                  checked={settings.inventory.show_out_of_stock_products}
                  onCheckedChange={(checked) => updateSetting("inventory", "show_out_of_stock_products", checked)}
                />
                <Label htmlFor="show-out-of-stock">Show out of stock products</Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Review Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="reviews-enabled"
                  checked={settings.reviews.enabled}
                  onCheckedChange={(checked) => updateSetting("reviews", "enabled", checked)}
                />
                <Label htmlFor="reviews-enabled">Enable product reviews</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="require-approval"
                  checked={settings.reviews.require_approval}
                  onCheckedChange={(checked) => updateSetting("reviews", "require_approval", checked)}
                />
                <Label htmlFor="require-approval">Require admin approval for reviews</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allow-guest-reviews"
                  checked={settings.reviews.allow_guest_reviews}
                  onCheckedChange={(checked) => updateSetting("reviews", "allow_guest_reviews", checked)}
                />
                <Label htmlFor="allow-guest-reviews">Allow guest reviews</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notify-new-review"
                  checked={settings.reviews.notify_on_new_review}
                  onCheckedChange={(checked) => updateSetting("reviews", "notify_on_new_review", checked)}
                />
                <Label htmlFor="notify-new-review">Notify admin of new reviews</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>Put your site in maintenance mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="maintenance-mode"
              checked={settings.maintenance.maintenance_mode}
              onCheckedChange={(checked) => updateSetting("maintenance", "maintenance_mode", checked)}
            />
            <Label htmlFor="maintenance-mode">Enable maintenance mode</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-message">Maintenance Message</Label>
            <Textarea
              id="maintenance-message"
              value={settings.maintenance.maintenance_message || ""}
              onChange={(e) => updateSetting("maintenance", "maintenance_message", e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
