"use client"

import { useState } from "react"
import { Bell, Settings, Info } from "lucide-react"
import { useNotifications, type NotificationType } from "@/services/notification/notification-context"
import { NotificationList } from "@/components/notifications/notification-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"

export function NotificationCenter() {
  const { notifications, addNotification } = useNotifications()
  const [preferences, setPreferences] = useState({
    email: {
      orders: true,
      promotions: true,
      system: true,
      payment: true,
      shipping: true,
    },
    push: {
      orders: true,
      promotions: false,
      system: true,
      payment: true,
      shipping: true,
    },
    sms: {
      orders: false,
      promotions: false,
      system: false,
      payment: true,
      shipping: false,
    },
  })

  const handleToggleChange = (channel: "email" | "push" | "sms", type: keyof typeof preferences.email) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: !prev[channel][type],
      },
    }))

    toast({
      title: "Preferences updated",
      description: `${channel.charAt(0).toUpperCase() + channel.slice(1)} notifications for ${type} have been ${preferences[channel][type] ? "disabled" : "enabled"}.`,
    })
  }

  const handleSavePreferences = () => {
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated successfully.",
    })
  }

  // For demo purposes - add a test notification
  const addTestNotification = () => {
    const types: NotificationType[] = ["order", "promotion", "system", "payment", "shipping"]
    const randomType = types[Math.floor(Math.random() * types.length)]

    const titles = {
      order: "New Order Placed",
      promotion: "Special Offer Just For You",
      system: "Security Alert",
      payment: "Payment Processed",
      shipping: "Order Shipped",
    }

    const messages = {
      order: "Your order #" + Math.floor(10000 + Math.random() * 90000) + " has been confirmed.",
      promotion: "Enjoy 25% off on selected items this weekend!",
      system: "We detected a login from a new device. Was this you?",
      payment: "Your payment of $" + (Math.random() * 200).toFixed(2) + " has been processed.",
      shipping: "Your order has been shipped and will arrive in 2-3 business days.",
    }

    addNotification({
      title: titles[randomType as keyof typeof titles],
      message: messages[randomType as keyof typeof messages],
      type: randomType,
      link: randomType === "order" ? "/orders" : randomType === "promotion" ? "/promotions" : "/account",
    })

    toast({
      title: "Test notification added",
      description: "A new test notification has been added to your inbox.",
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="w-full max-w-md mx-auto mb-6">
          <TabsTrigger value="notifications" className="flex-1">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>View and manage your recent notifications</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <NotificationList
                showHeader={false}
                maxHeight="400px"
                onClose={() => toast({ title: "Notification closed", description: "You have closed a notification." })}
              />
            </CardContent>
          </Card>

          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={addTestNotification} className="text-sm">
              Send Test Notification
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how and when you want to be notified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Email Notifications */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <Bell className="h-4 w-4 mr-2 text-cherry-800" />
                    Email Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-orders" className="flex-1 text-sm">
                        Order updates
                        <p className="text-xs text-gray-500 font-normal mt-0.5">Receive updates about your orders</p>
                      </Label>
                      <Switch
                        id="email-orders"
                        checked={preferences.email.orders}
                        onCheckedChange={() => handleToggleChange("email", "orders")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-promotions" className="flex-1 text-sm">
                        Promotions and offers
                        <p className="text-xs text-gray-500 font-normal mt-0.5">
                          Receive promotional offers and discounts
                        </p>
                      </Label>
                      <Switch
                        id="email-promotions"
                        checked={preferences.email.promotions}
                        onCheckedChange={() => handleToggleChange("email", "promotions")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-system" className="flex-1 text-sm">
                        System notifications
                        <p className="text-xs text-gray-500 font-normal mt-0.5">
                          Important account and security updates
                        </p>
                      </Label>
                      <Switch
                        id="email-system"
                        checked={preferences.email.system}
                        onCheckedChange={() => handleToggleChange("email", "system")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-payment" className="flex-1 text-sm">
                        Payment notifications
                        <p className="text-xs text-gray-500 font-normal mt-0.5">
                          Updates about your payments and transactions
                        </p>
                      </Label>
                      <Switch
                        id="email-payment"
                        checked={preferences.email.payment}
                        onCheckedChange={() => handleToggleChange("email", "payment")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-shipping" className="flex-1 text-sm">
                        Shipping updates
                        <p className="text-xs text-gray-500 font-normal mt-0.5">
                          Get notified about shipping and delivery status
                        </p>
                      </Label>
                      <Switch
                        id="email-shipping"
                        checked={preferences.email.shipping}
                        onCheckedChange={() => handleToggleChange("email", "shipping")}
                      />
                    </div>
                  </div>
                </div>

                {/* Push Notifications */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <Bell className="h-4 w-4 mr-2 text-cherry-800" />
                    Push Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-orders" className="flex-1 text-sm">
                        Order updates
                      </Label>
                      <Switch
                        id="push-orders"
                        checked={preferences.push.orders}
                        onCheckedChange={() => handleToggleChange("push", "orders")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-promotions" className="flex-1 text-sm">
                        Promotions and offers
                      </Label>
                      <Switch
                        id="push-promotions"
                        checked={preferences.push.promotions}
                        onCheckedChange={() => handleToggleChange("push", "promotions")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="push-system" className="flex-1 text-sm">
                        System notifications
                      </Label>
                      <Switch
                        id="push-system"
                        checked={preferences.push.system}
                        onCheckedChange={() => handleToggleChange("push", "system")}
                      />
                    </div>
                  </div>
                </div>

                {/* SMS Notifications */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <Bell className="h-4 w-4 mr-2 text-cherry-800" />
                    SMS Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-orders" className="flex-1 text-sm">
                        Order updates
                      </Label>
                      <Switch
                        id="sms-orders"
                        checked={preferences.sms.orders}
                        onCheckedChange={() => handleToggleChange("sms", "orders")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-payment" className="flex-1 text-sm">
                        Payment notifications
                      </Label>
                      <Switch
                        id="sms-payment"
                        checked={preferences.sms.payment}
                        onCheckedChange={() => handleToggleChange("sms", "payment")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-shipping" className="flex-1 text-sm">
                        Shipping updates
                      </Label>
                      <Switch
                        id="sms-shipping"
                        checked={preferences.sms.shipping}
                        onCheckedChange={() => handleToggleChange("sms", "shipping")}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-md flex items-start gap-2 text-sm text-blue-800">
                  <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p>
                    Some notifications, such as security alerts and order confirmations, cannot be disabled as they are
                    essential to your account.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Reset to Default
                  </Button>
                  <Button size="sm" className="bg-cherry-800 hover:bg-cherry-900" onClick={handleSavePreferences}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
