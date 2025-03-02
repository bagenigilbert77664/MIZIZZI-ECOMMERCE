"use client"

import type React from "react"

import { useState } from "react"
import { Bell, Mail, Shield, User, Tag, Calendar, Gift, Leaf, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

const navigationItems = [
  {
    title: "Profile",
    icon: User,
    id: "profile",
  },
  {
    title: "Security",
    icon: Shield,
    id: "security",
  },
  {
    title: "Notifications",
    icon: Bell,
    id: "notifications",
  },
  {
    title: "Communication",
    icon: Mail,
    id: "communication",
  },
  {
    title: "Preferences",
    icon: Settings,
    id: "preferences",
  },
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState("profile")

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Settings updated",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Navigation Sidebar */}
        <div className="hidden lg:block">
          <nav className="sticky top-8">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-2 ${
                      activeSection === item.id ? "bg-cherry-50 text-cherry-900" : ""
                    }`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <Select value={activeSection} onValueChange={setActiveSection}>
            <SelectTrigger>
              <SelectValue placeholder="Select section">
                {navigationItems.find((item) => item.id === activeSection)?.title}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {navigationItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {activeSection === "profile" && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Personal Information</h2>
              <Separator className="my-4" />
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+254 700 000 000" />
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline">Cancel</Button>
                  <Button type="submit" className="bg-cherry-600 text-white hover:bg-cherry-700" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeSection === "security" && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Security Settings</h2>
              <Separator className="my-4" />
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <label htmlFor="2fa" className="text-sm font-medium">
                      Two-factor Authentication
                    </label>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch id="2fa" aria-label="Toggle two-factor authentication" />
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline">Cancel</Button>
                  <Button type="submit" className="bg-cherry-600 text-white hover:bg-cherry-700" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              <Separator className="my-4" />
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="email-notifications" className="text-sm font-medium">
                        <Mail className="mr-2 inline-block h-4 w-4" />
                        Email Notifications
                      </label>
                      <p className="text-xs text-muted-foreground">Receive order updates and important alerts</p>
                    </div>
                    <Switch id="email-notifications" aria-label="Toggle email notifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="marketing-emails" className="text-sm font-medium">
                        <Bell className="mr-2 inline-block h-4 w-4" />
                        Marketing Emails
                      </label>
                      <p className="text-xs text-muted-foreground">Receive news about products and promotions</p>
                    </div>
                    <Switch id="marketing-emails" aria-label="Toggle marketing emails" />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline">Cancel</Button>
                  <Button type="submit" className="bg-cherry-600 text-white hover:bg-cherry-700" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeSection === "communication" && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Communication Preferences</h2>
              <Separator className="my-4" />
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="newsletter" className="text-sm font-medium">
                        <Mail className="mr-2 inline-block h-4 w-4" />
                        Newsletter Subscription
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Receive our weekly newsletter with exclusive deals and trends
                      </p>
                    </div>
                    <Switch id="newsletter" aria-label="Toggle newsletter subscription" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="product-updates" className="text-sm font-medium">
                        <Tag className="mr-2 inline-block h-4 w-4" />
                        Product Updates
                      </label>
                      <p className="text-xs text-muted-foreground">Get notified about new products and restocks</p>
                    </div>
                    <Switch id="product-updates" aria-label="Toggle product updates" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="events" className="text-sm font-medium">
                        <Calendar className="mr-2 inline-block h-4 w-4" />
                        Events & Promotions
                      </label>
                      <p className="text-xs text-muted-foreground">Stay updated about special events and promotions</p>
                    </div>
                    <Switch id="events" aria-label="Toggle events notifications" defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Frequency</Label>
                    <RadioGroup defaultValue="weekly" className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label htmlFor="daily">Daily</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="weekly" />
                        <Label htmlFor="weekly">Weekly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly">Monthly</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline">Cancel</Button>
                  <Button type="submit" className="bg-cherry-600 text-white hover:bg-cherry-700" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeSection === "preferences" && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold">Shopping Preferences</h2>
              <Separator className="my-4" />
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Swahili</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select defaultValue="kes">
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kes">Kenyan Shilling (KES)</SelectItem>
                        <SelectItem value="usd">US Dollar (USD)</SelectItem>
                        <SelectItem value="eur">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="gift-wrap" className="text-sm font-medium">
                        <Gift className="mr-2 inline-block h-4 w-4" />
                        Default Gift Wrapping
                      </label>
                      <p className="text-xs text-muted-foreground">Automatically add gift wrapping to orders</p>
                    </div>
                    <Switch id="gift-wrap" aria-label="Toggle default gift wrapping" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label htmlFor="eco-packaging" className="text-sm font-medium">
                        <Leaf className="mr-2 inline-block h-4 w-4" />
                        Eco-Friendly Packaging
                      </label>
                      <p className="text-xs text-muted-foreground">Use minimal, recyclable packaging</p>
                    </div>
                    <Switch id="eco-packaging" aria-label="Toggle eco-friendly packaging" defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label>Accessibility</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="reduce-motion" />
                        <label htmlFor="reduce-motion" className="text-sm">
                          Reduce motion
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="high-contrast" />
                        <label htmlFor="high-contrast" className="text-sm">
                          High contrast mode
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="larger-text" />
                        <label htmlFor="larger-text" className="text-sm">
                          Larger text
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button variant="outline">Cancel</Button>
                  <Button type="submit" className="bg-cherry-600 text-white hover:bg-cherry-700" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

