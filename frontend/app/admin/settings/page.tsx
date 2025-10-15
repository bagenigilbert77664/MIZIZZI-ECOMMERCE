"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { adminService } from "@/services/admin"
import type { SystemSettings } from "@/types/admin"
import {
  Settings,
  Store,
  Users,
  Calculator,
  Puzzle,
  Globe,
  Volume2,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Mail,
  CreditCard,
  Wrench,
  Bell,
  Monitor,
} from "lucide-react"

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

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [showPasswords, setShowPasswords] = useState(false)

  // Additional state for extended settings
  const [userPermissions, setUserPermissions] = useState({
    roles: [
      { id: "admin", name: "Administrator", permissions: ["all"] },
      { id: "manager", name: "Manager", permissions: ["products", "orders", "customers"] },
      { id: "editor", name: "Editor", permissions: ["products", "content"] },
      { id: "viewer", name: "Viewer", permissions: ["view"] },
    ],
    defaultRole: "viewer",
    registrationEnabled: true,
    emailVerificationRequired: true,
    adminApprovalRequired: false,
  })

  const [taxSettings, setTaxSettings] = useState({
    enableTax: true,
    taxCalculationMethod: "exclusive", // exclusive, inclusive
    defaultTaxRate: 16,
    taxClasses: [
      { id: "standard", name: "Standard Rate", rate: 16 },
      { id: "reduced", name: "Reduced Rate", rate: 8 },
      { id: "zero", name: "Zero Rate", rate: 0 },
      { id: "exempt", name: "Tax Exempt", rate: 0 },
    ],
    taxBasedOn: "billing", // billing, shipping, store
    displayPricesIncludingTax: false,
    displayTaxTotals: true,
  })

  const [integrations, setIntegrations] = useState({
    analytics: {
      googleAnalytics: { enabled: false, trackingId: "", enhanced: false },
      facebookPixel: { enabled: false, pixelId: "", events: [] },
      hotjar: { enabled: false, siteId: "", version: 6 },
    },
    payments: {
      mpesa: { enabled: true, shortcode: "", consumerKey: "", consumerSecret: "", environment: "sandbox" },
      stripe: { enabled: false, publicKey: "", secretKey: "", webhookSecret: "" },
      paypal: { enabled: false, clientId: "", clientSecret: "", environment: "sandbox" },
    },
    shipping: {
      dhl: { enabled: false, apiKey: "", accountNumber: "" },
      fedex: { enabled: false, apiKey: "", accountNumber: "" },
      ups: { enabled: false, apiKey: "", accountNumber: "" },
    },
    communication: {
      twilio: { enabled: false, accountSid: "", authToken: "", phoneNumber: "" },
      mailgun: { enabled: false, apiKey: "", domain: "" },
      sendgrid: { enabled: false, apiKey: "", fromEmail: "" },
    },
  })

  const [localizationSettings, setLocalizationSettings] = useState({
    defaultLanguage: "en",
    availableLanguages: [
      { code: "en", name: "English", flag: "🇺🇸", rtl: false },
      { code: "sw", name: "Swahili", flag: "🇰🇪", rtl: false },
      { code: "fr", name: "French", flag: "🇫🇷", rtl: false },
      { code: "ar", name: "Arabic", flag: "🇸🇦", rtl: true },
    ],
    defaultCurrency: "KES",
    availableCurrencies: [
      { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 1 },
      { code: "USD", name: "US Dollar", symbol: "$", rate: 0.0067 },
      { code: "EUR", name: "Euro", symbol: "€", rate: 0.0061 },
      { code: "GBP", name: "British Pound", symbol: "£", rate: 0.0053 },
    ],
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    timezone: "Africa/Nairobi",
    numberFormat: {
      decimalSeparator: ".",
      thousandSeparator: ",",
      decimalPlaces: 2,
    },
    addressFormat: {
      format: "{name}\n{company}\n{address_1}\n{address_2}\n{city}, {state} {postcode}\n{country}",
      required: ["name", "address_1", "city", "country"],
    },
  })

  const [soundSettings, setSoundSettings] = useState({
    enabled: true,
    volume: 0.5,
    sounds: {
      newOrder: { enabled: true, file: "/sounds/new-order.mp3" },
      lowStock: { enabled: true, file: "/sounds/alert.mp3" },
      newMessage: { enabled: true, file: "/sounds/notification.mp3" },
      error: { enabled: true, file: "/sounds/error.mp3" },
      success: { enabled: true, file: "/sounds/success.mp3" },
    },
    notifications: {
      desktop: true,
      browser: true,
      email: false,
    },
  })

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
        description: "Settings saved successfully!",
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
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure your store settings and preferences</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="taxes" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Taxes</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="localization" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Localization</span>
          </TabsTrigger>
          <TabsTrigger value="sound" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">Sound</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Basic configuration for your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input
                    id="site-name"
                    value={settings.site.name}
                    onChange={(e) => updateSetting("site", "name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-tagline">Tagline</Label>
                  <Input
                    id="site-tagline"
                    value={settings.site.tagline || ""}
                    onChange={(e) => updateSetting("site", "tagline", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-description">Description</Label>
                <Textarea
                  id="site-description"
                  value={settings.site.description || ""}
                  onChange={(e) => updateSetting("site", "description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo-url">Logo URL</Label>
                  <Input
                    id="logo-url"
                    value={settings.site.logo_url || ""}
                    onChange={(e) => updateSetting("site", "logo_url", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon-url">Favicon URL</Label>
                  <Input
                    id="favicon-url"
                    value={settings.site.favicon_url || ""}
                    onChange={(e) => updateSetting("site", "favicon_url", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-email">Contact Email</Label>
                  <Input
                    id="site-email"
                    type="email"
                    value={settings.site.email}
                    onChange={(e) => updateSetting("site", "email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-phone">Contact Phone</Label>
                  <Input
                    id="site-phone"
                    value={settings.site.phone || ""}
                    onChange={(e) => updateSetting("site", "phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-address">Address</Label>
                <Textarea
                  id="site-address"
                  value={settings.site.address || ""}
                  onChange={(e) => updateSetting("site", "address", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password-min-length">Minimum Password Length</Label>
                <Input
                  id="password-min-length"
                  type="number"
                  min="6"
                  max="50"
                  value={settings.security.password_min_length}
                  onChange={(e) => updateSetting("security", "password_min_length", Number.parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="require-special-char"
                    checked={settings.security.password_requires_special_char}
                    onCheckedChange={(checked) => updateSetting("security", "password_requires_special_char", checked)}
                  />
                  <Label htmlFor="require-special-char">Require special characters</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="require-number"
                    checked={settings.security.password_requires_number}
                    onCheckedChange={(checked) => updateSetting("security", "password_requires_number", checked)}
                  />
                  <Label htmlFor="require-number">Require numbers</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="require-uppercase"
                    checked={settings.security.password_requires_uppercase}
                    onCheckedChange={(checked) => updateSetting("security", "password_requires_uppercase", checked)}
                  />
                  <Label htmlFor="require-uppercase">Require uppercase letters</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-two-factor"
                    checked={settings.security.enable_two_factor}
                    onCheckedChange={(checked) => updateSetting("security", "enable_two_factor", checked)}
                  />
                  <Label htmlFor="enable-two-factor">Enable two-factor authentication</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                  <Input
                    id="max-login-attempts"
                    type="number"
                    min="3"
                    max="10"
                    value={settings.security.max_login_attempts}
                    onChange={(e) => updateSetting("security", "max_login_attempts", Number.parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-time">Lockout Time (minutes)</Label>
                  <Input
                    id="lockout-time"
                    type="number"
                    min="5"
                    max="60"
                    value={settings.security.lockout_time}
                    onChange={(e) => updateSetting("security", "lockout_time", Number.parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-lifetime">Session Lifetime (hours)</Label>
                  <Input
                    id="session-lifetime"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.security.session_lifetime}
                    onChange={(e) => updateSetting("security", "session_lifetime", Number.parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Settings */}
        <TabsContent value="store" className="space-y-6">
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
                      onChange={(e) =>
                        updateSetting("inventory", "low_stock_threshold", Number.parseInt(e.target.value))
                      }
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
        </TabsContent>

        {/* Users & Permissions */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>Configure user registration and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Registration Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="registration-enabled"
                      checked={userPermissions.registrationEnabled}
                      onCheckedChange={(checked) =>
                        setUserPermissions((prev) => ({ ...prev, registrationEnabled: checked }))
                      }
                    />
                    <Label htmlFor="registration-enabled">Allow user registration</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email-verification"
                      checked={userPermissions.emailVerificationRequired}
                      onCheckedChange={(checked) =>
                        setUserPermissions((prev) => ({ ...prev, emailVerificationRequired: checked }))
                      }
                    />
                    <Label htmlFor="email-verification">Require email verification</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="admin-approval"
                      checked={userPermissions.adminApprovalRequired}
                      onCheckedChange={(checked) =>
                        setUserPermissions((prev) => ({ ...prev, adminApprovalRequired: checked }))
                      }
                    />
                    <Label htmlFor="admin-approval">Require admin approval for new accounts</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-role">Default User Role</Label>
                  <Select
                    value={userPermissions.defaultRole}
                    onValueChange={(value) => setUserPermissions((prev) => ({ ...prev, defaultRole: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userPermissions.roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">User Roles & Permissions</h4>
                  <Button
                    size="sm"
                    onClick={() => {
                      const newRole = {
                        id: `role_${Date.now()}`,
                        name: "New Role",
                        permissions: ["view"],
                      }
                      setUserPermissions((prev) => ({
                        ...prev,
                        roles: [...prev.roles, newRole],
                      }))
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                </div>

                <div className="space-y-3">
                  {userPermissions.roles.map((role, index) => (
                    <div key={role.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Input
                          value={role.name}
                          onChange={(e) => {
                            const updatedRoles = [...userPermissions.roles]
                            updatedRoles[index] = { ...role, name: e.target.value }
                            setUserPermissions((prev) => ({ ...prev, roles: updatedRoles }))
                          }}
                          className="w-48"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedRoles = userPermissions.roles.filter((_, i) => i !== index)
                            setUserPermissions((prev) => ({ ...prev, roles: updatedRoles }))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="flex flex-wrap gap-2">
                          {["all", "products", "orders", "customers", "content", "analytics", "settings", "view"].map(
                            (permission) => (
                              <Badge
                                key={permission}
                                variant={role.permissions.includes(permission) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const updatedRoles = [...userPermissions.roles]
                                  const currentPermissions = role.permissions
                                  if (currentPermissions.includes(permission)) {
                                    updatedRoles[index] = {
                                      ...role,
                                      permissions: currentPermissions.filter((p) => p !== permission),
                                    }
                                  } else {
                                    updatedRoles[index] = {
                                      ...role,
                                      permissions: [...currentPermissions, permission],
                                    }
                                  }
                                  setUserPermissions((prev) => ({ ...prev, roles: updatedRoles }))
                                }}
                              >
                                {permission}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings */}
        <TabsContent value="taxes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax Configuration
              </CardTitle>
              <CardDescription>Configure tax rates and calculation methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-tax"
                    checked={taxSettings.enableTax}
                    onCheckedChange={(checked) => setTaxSettings((prev) => ({ ...prev, enableTax: checked }))}
                  />
                  <Label htmlFor="enable-tax">Enable tax calculation</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-calculation">Tax Calculation Method</Label>
                    <Select
                      value={taxSettings.taxCalculationMethod}
                      onValueChange={(value) => setTaxSettings((prev) => ({ ...prev, taxCalculationMethod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exclusive">Tax Exclusive (add tax to price)</SelectItem>
                        <SelectItem value="inclusive">Tax Inclusive (tax included in price)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-tax-rate">Default Tax Rate (%)</Label>
                    <Input
                      id="default-tax-rate"
                      type="number"
                      step="0.01"
                      value={taxSettings.defaultTaxRate}
                      onChange={(e) =>
                        setTaxSettings((prev) => ({ ...prev, defaultTaxRate: Number.parseFloat(e.target.value) }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-based-on">Calculate tax based on</Label>
                  <Select
                    value={taxSettings.taxBasedOn}
                    onValueChange={(value) => setTaxSettings((prev) => ({ ...prev, taxBasedOn: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="billing">Customer billing address</SelectItem>
                      <SelectItem value="shipping">Customer shipping address</SelectItem>
                      <SelectItem value="store">Store address</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="display-prices-including-tax"
                      checked={taxSettings.displayPricesIncludingTax}
                      onCheckedChange={(checked) =>
                        setTaxSettings((prev) => ({ ...prev, displayPricesIncludingTax: checked }))
                      }
                    />
                    <Label htmlFor="display-prices-including-tax">Display prices including tax</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="display-tax-totals"
                      checked={taxSettings.displayTaxTotals}
                      onCheckedChange={(checked) => setTaxSettings((prev) => ({ ...prev, displayTaxTotals: checked }))}
                    />
                    <Label htmlFor="display-tax-totals">Display tax totals in cart and checkout</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Tax Classes</h4>
                  <Button
                    size="sm"
                    onClick={() => {
                      const newTaxClass = {
                        id: `tax_${Date.now()}`,
                        name: "New Tax Class",
                        rate: 0,
                      }
                      setTaxSettings((prev) => ({
                        ...prev,
                        taxClasses: [...prev.taxClasses, newTaxClass],
                      }))
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tax Class
                  </Button>
                </div>

                <div className="space-y-3">
                  {taxSettings.taxClasses.map((taxClass, index) => (
                    <div key={taxClass.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        <Input
                          value={taxClass.name}
                          onChange={(e) => {
                            const updatedClasses = [...taxSettings.taxClasses]
                            updatedClasses[index] = { ...taxClass, name: e.target.value }
                            setTaxSettings((prev) => ({ ...prev, taxClasses: updatedClasses }))
                          }}
                          className="w-48"
                        />
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={taxClass.rate}
                            onChange={(e) => {
                              const updatedClasses = [...taxSettings.taxClasses]
                              updatedClasses[index] = { ...taxClass, rate: Number.parseFloat(e.target.value) || 0 }
                              setTaxSettings((prev) => ({ ...prev, taxClasses: updatedClasses }))
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedClasses = taxSettings.taxClasses.filter((_, i) => i !== index)
                          setTaxSettings((prev) => ({ ...prev, taxClasses: updatedClasses }))
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Puzzle className="h-5 w-5" />
                Third-Party Integrations
              </CardTitle>
              <CardDescription>Configure external services and APIs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Analytics Integrations */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Analytics & Tracking
                </h4>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="google-analytics">Google Analytics</Label>
                    <Switch
                      id="google-analytics"
                      checked={integrations.analytics.googleAnalytics.enabled}
                      onCheckedChange={(checked) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          analytics: {
                            ...prev.analytics,
                            googleAnalytics: { ...prev.analytics.googleAnalytics, enabled: checked },
                          },
                        }))
                      }
                    />
                  </div>
                  {integrations.analytics.googleAnalytics.enabled && (
                    <div className="space-y-2">
                      <Input
                        placeholder="GA-XXXXXXXXX-X"
                        value={integrations.analytics.googleAnalytics.trackingId}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            analytics: {
                              ...prev.analytics,
                              googleAnalytics: { ...prev.analytics.googleAnalytics, trackingId: e.target.value },
                            },
                          }))
                        }
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enhanced-ecommerce"
                          checked={integrations.analytics.googleAnalytics.enhanced}
                          onCheckedChange={(checked) =>
                            setIntegrations((prev) => ({
                              ...prev,
                              analytics: {
                                ...prev.analytics,
                                googleAnalytics: { ...prev.analytics.googleAnalytics, enhanced: checked },
                              },
                            }))
                          }
                        />
                        <Label htmlFor="enhanced-ecommerce">Enable Enhanced E-commerce</Label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="facebook-pixel">Facebook Pixel</Label>
                    <Switch
                      id="facebook-pixel"
                      checked={integrations.analytics.facebookPixel.enabled}
                      onCheckedChange={(checked) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          analytics: {
                            ...prev.analytics,
                            facebookPixel: { ...prev.analytics.facebookPixel, enabled: checked },
                          },
                        }))
                      }
                    />
                  </div>
                  {integrations.analytics.facebookPixel.enabled && (
                    <Input
                      placeholder="123456789012345"
                      value={integrations.analytics.facebookPixel.pixelId}
                      onChange={(e) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          analytics: {
                            ...prev.analytics,
                            facebookPixel: { ...prev.analytics.facebookPixel, pixelId: e.target.value },
                          },
                        }))
                      }
                    />
                  )}
                </div>
              </div>

              {/* Payment Integrations */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Gateways
                </h4>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mpesa-integration">M-Pesa</Label>
                    <Switch
                      id="mpesa-integration"
                      checked={integrations.payments.mpesa.enabled}
                      onCheckedChange={(checked) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          payments: { ...prev.payments, mpesa: { ...prev.payments.mpesa, enabled: checked } },
                        }))
                      }
                    />
                  </div>
                  {integrations.payments.mpesa.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        placeholder="Shortcode"
                        value={integrations.payments.mpesa.shortcode}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            payments: {
                              ...prev.payments,
                              mpesa: { ...prev.payments.mpesa, shortcode: e.target.value },
                            },
                          }))
                        }
                      />
                      <Select
                        value={integrations.payments.mpesa.environment}
                        onValueChange={(value) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            payments: {
                              ...prev.payments,
                              mpesa: { ...prev.payments.mpesa, environment: value },
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          type={showPasswords ? "text" : "password"}
                          placeholder="Consumer Key"
                          value={integrations.payments.mpesa.consumerKey}
                          onChange={(e) =>
                            setIntegrations((prev) => ({
                              ...prev,
                              payments: {
                                ...prev.payments,
                                mpesa: { ...prev.payments.mpesa, consumerKey: e.target.value },
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="relative">
                        <Input
                          type={showPasswords ? "text" : "password"}
                          placeholder="Consumer Secret"
                          value={integrations.payments.mpesa.consumerSecret}
                          onChange={(e) =>
                            setIntegrations((prev) => ({
                              ...prev,
                              payments: {
                                ...prev.payments,
                                mpesa: { ...prev.payments.mpesa, consumerSecret: e.target.value },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stripe-integration">Stripe</Label>
                    <Switch
                      id="stripe-integration"
                      checked={integrations.payments.stripe.enabled}
                      onCheckedChange={(checked) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          payments: { ...prev.payments, stripe: { ...prev.payments.stripe, enabled: checked } },
                        }))
                      }
                    />
                  </div>
                  {integrations.payments.stripe.enabled && (
                    <div className="space-y-3">
                      <Input
                        placeholder="Publishable Key"
                        value={integrations.payments.stripe.publicKey}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            payments: {
                              ...prev.payments,
                              stripe: { ...prev.payments.stripe, publicKey: e.target.value },
                            },
                          }))
                        }
                      />
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Secret Key"
                        value={integrations.payments.stripe.secretKey}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            payments: {
                              ...prev.payments,
                              stripe: { ...prev.payments.stripe, secretKey: e.target.value },
                            },
                          }))
                        }
                      />
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Webhook Secret"
                        value={integrations.payments.stripe.webhookSecret}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            payments: {
                              ...prev.payments,
                              stripe: { ...prev.payments.stripe, webhookSecret: e.target.value },
                            },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Communication Integrations */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Communication Services
                </h4>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="twilio-integration">Twilio SMS</Label>
                    <Switch
                      id="twilio-integration"
                      checked={integrations.communication.twilio.enabled}
                      onCheckedChange={(checked) =>
                        setIntegrations((prev) => ({
                          ...prev,
                          communication: {
                            ...prev.communication,
                            twilio: { ...prev.communication.twilio, enabled: checked },
                          },
                        }))
                      }
                    />
                  </div>
                  {integrations.communication.twilio.enabled && (
                    <div className="space-y-3">
                      <Input
                        placeholder="Account SID"
                        value={integrations.communication.twilio.accountSid}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            communication: {
                              ...prev.communication,
                              twilio: { ...prev.communication.twilio, accountSid: e.target.value },
                            },
                          }))
                        }
                      />
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Auth Token"
                        value={integrations.communication.twilio.authToken}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            communication: {
                              ...prev.communication,
                              twilio: { ...prev.communication.twilio, authToken: e.target.value },
                            },
                          }))
                        }
                      />
                      <Input
                        placeholder="Phone Number"
                        value={integrations.communication.twilio.phoneNumber}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            communication: {
                              ...prev.communication,
                              twilio: { ...prev.communication.twilio, phoneNumber: e.target.value },
                            },
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPasswords(!showPasswords)}>
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPasswords ? "Hide" : "Show"} API Keys
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Localization */}
        <TabsContent value="localization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Localization Settings
              </CardTitle>
              <CardDescription>Configure languages, currencies, and regional settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Language Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-language">Default Language</Label>
                    <Select
                      value={localizationSettings.defaultLanguage}
                      onValueChange={(value) =>
                        setLocalizationSettings((prev) => ({ ...prev, defaultLanguage: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {localizationSettings.availableLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Available Languages</Label>
                  {localizationSettings.availableLanguages.map((lang, index) => (
                    <div key={lang.code} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <div>
                          <p className="font-medium">{lang.name}</p>
                          <p className="text-sm text-muted-foreground">{lang.code}</p>
                        </div>
                        {lang.rtl && <Badge variant="secondary">RTL</Badge>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updatedLanguages = localizationSettings.availableLanguages.filter((_, i) => i !== index)
                          setLocalizationSettings((prev) => ({ ...prev, availableLanguages: updatedLanguages }))
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Currency Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-currency">Default Currency</Label>
                    <Select
                      value={localizationSettings.defaultCurrency}
                      onValueChange={(value) =>
                        setLocalizationSettings((prev) => ({ ...prev, defaultCurrency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {localizationSettings.availableCurrencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.name} ({currency.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Currency Exchange Rates</Label>
                  {localizationSettings.availableCurrencies.map((currency, index) => (
                    <div key={currency.code} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-sm">{currency.code}</span>
                        <span>{currency.name}</span>
                        <span className="text-lg">{currency.symbol}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          step="0.000001"
                          value={currency.rate}
                          onChange={(e) => {
                            const updatedCurrencies = [...localizationSettings.availableCurrencies]
                            updatedCurrencies[index] = { ...currency, rate: Number.parseFloat(e.target.value) || 0 }
                            setLocalizationSettings((prev) => ({ ...prev, availableCurrencies: updatedCurrencies }))
                          }}
                          className="w-32"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedCurrencies = localizationSettings.availableCurrencies.filter(
                              (_, i) => i !== index,
                            )
                            setLocalizationSettings((prev) => ({ ...prev, availableCurrencies: updatedCurrencies }))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Regional Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select
                      value={localizationSettings.dateFormat}
                      onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, dateFormat: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time-format">Time Format</Label>
                    <Select
                      value={localizationSettings.timeFormat}
                      onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, timeFormat: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                        <SelectItem value="24h">24 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={localizationSettings.timezone}
                      onValueChange={(value) => setLocalizationSettings((prev) => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Nairobi">Africa/Nairobi</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-medium">Number Format</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="decimal-separator">Decimal Separator</Label>
                      <Input
                        id="decimal-separator"
                        value={localizationSettings.numberFormat.decimalSeparator}
                        onChange={(e) =>
                          setLocalizationSettings((prev) => ({
                            ...prev,
                            numberFormat: { ...prev.numberFormat, decimalSeparator: e.target.value },
                          }))
                        }
                        maxLength={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="thousand-separator">Thousand Separator</Label>
                      <Input
                        id="thousand-separator"
                        value={localizationSettings.numberFormat.thousandSeparator}
                        onChange={(e) =>
                          setLocalizationSettings((prev) => ({
                            ...prev,
                            numberFormat: { ...prev.numberFormat, thousandSeparator: e.target.value },
                          }))
                        }
                        maxLength={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decimal-places">Decimal Places</Label>
                      <Input
                        id="decimal-places"
                        type="number"
                        min="0"
                        max="4"
                        value={localizationSettings.numberFormat.decimalPlaces}
                        onChange={(e) =>
                          setLocalizationSettings((prev) => ({
                            ...prev,
                            numberFormat: { ...prev.numberFormat, decimalPlaces: Number.parseInt(e.target.value) },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-medium">Address Format</h5>
                  <div className="space-y-2">
                    <Label htmlFor="address-format">Address Format Template</Label>
                    <Textarea
                      id="address-format"
                      value={localizationSettings.addressFormat.format}
                      onChange={(e) =>
                        setLocalizationSettings((prev) => ({
                          ...prev,
                          addressFormat: { ...prev.addressFormat, format: e.target.value },
                        }))
                      }
                      rows={4}
                      placeholder="{name}\n{company}\n{address_1}\n{address_2}\n{city}, {state} {postcode}\n{country}"
                    />
                    <p className="text-sm text-muted-foreground">
                      Use placeholders: {"{name}"}, {"{company}"}, {"{address_1}"}, {"{address_2}"}, {"{city}"},{" "}
                      {"{state}"}, {"{postcode}"}, {"{country}"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sound Settings */}
        <TabsContent value="sound" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Sound & Notification Settings
              </CardTitle>
              <CardDescription>Configure audio notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sounds-enabled"
                    checked={soundSettings.enabled}
                    onCheckedChange={(checked) => setSoundSettings((prev) => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="sounds-enabled">Enable sound notifications</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volume">Master Volume</Label>
                  <div className="flex items-center space-x-4">
                    <input
                      id="volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={soundSettings.volume}
                      onChange={(e) =>
                        setSoundSettings((prev) => ({ ...prev, volume: Number.parseFloat(e.target.value) }))
                      }
                      className="flex-1"
                      disabled={!soundSettings.enabled}
                    />
                    <span className="text-sm text-muted-foreground w-12">
                      {Math.round(soundSettings.volume * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Sound Events</h4>
                <div className="space-y-3">
                  {Object.entries(soundSettings.sounds).map(([eventKey, sound]) => (
                    <div key={eventKey} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="capitalize">{eventKey.replace(/([A-Z])/g, " $1").trim()}</Label>
                          <p className="text-sm text-muted-foreground">
                            {eventKey === "newOrder" && "Plays when a new order is received"}
                            {eventKey === "lowStock" && "Plays when product stock is low"}
                            {eventKey === "newMessage" && "Plays when a new message is received"}
                            {eventKey === "error" && "Plays when an error occurs"}
                            {eventKey === "success" && "Plays when an action is successful"}
                          </p>
                        </div>
                        <Switch
                          checked={sound.enabled}
                          onCheckedChange={(checked) =>
                            setSoundSettings((prev) => ({
                              ...prev,
                              sounds: { ...prev.sounds, [eventKey]: { ...sound, enabled: checked } },
                            }))
                          }
                          disabled={!soundSettings.enabled}
                        />
                      </div>

                      {sound.enabled && soundSettings.enabled && (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={sound.file}
                            onChange={(e) =>
                              setSoundSettings((prev) => ({
                                ...prev,
                                sounds: { ...prev.sounds, [eventKey]: { ...sound, file: e.target.value } },
                              }))
                            }
                            placeholder="/sounds/notification.mp3"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const audio = new Audio(sound.file)
                              audio.volume = soundSettings.volume
                              audio.play().catch(() => {
                                toast({
                                  title: "Error",
                                  description: "Could not play sound file",
                                  variant: "destructive",
                                })
                              })
                            }}
                          >
                            Test
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Preferences
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="desktop-notifications"
                      checked={soundSettings.notifications.desktop}
                      onCheckedChange={(checked) =>
                        setSoundSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, desktop: checked },
                        }))
                      }
                    />
                    <Label htmlFor="desktop-notifications">Desktop notifications</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="browser-notifications"
                      checked={soundSettings.notifications.browser}
                      onCheckedChange={(checked) =>
                        setSoundSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, browser: checked },
                        }))
                      }
                    />
                    <Label htmlFor="browser-notifications">Browser notifications</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email-notifications"
                      checked={soundSettings.notifications.email}
                      onCheckedChange={(checked) =>
                        setSoundSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, email: checked },
                        }))
                      }
                    />
                    <Label htmlFor="email-notifications">Email notifications</Label>
                  </div>
                </div>

                {soundSettings.notifications.desktop && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Note:</strong> Desktop notifications require browser permission. Click the button below to
                      request permission.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        if ("Notification" in window) {
                          Notification.requestPermission().then((permission) => {
                            if (permission === "granted") {
                              new Notification("Mizizzi Admin", {
                                body: "Desktop notifications are now enabled!",
                                icon: "/favicon.ico",
                              })
                            }
                          })
                        }
                      }}
                    >
                      Request Permission
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
