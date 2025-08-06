"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Bell, ShoppingBag, CreditCard, Tag, Settings, Trash2 } from "lucide-react"

export default function NotificationCenter() {
  const [notificationSettings, setNotificationSettings] = useState({
    orderUpdates: true,
    paymentNotifications: true,
    promotions: true,
    productUpdates: false,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  })

  const handleToggleChange = (setting: string) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev],
    }))

    toast({
      title: "Settings updated",
      description: `${setting} notifications ${notificationSettings[setting as keyof typeof notificationSettings] ? "disabled" : "enabled"}`,
    })
  }

  const clearAllNotifications = () => {
    toast({
      title: "Notifications cleared",
      description: "All notifications have been cleared",
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="preferences">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preferences">Notification Preferences</TabsTrigger>
          <TabsTrigger value="payment">Payment Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Choose which notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="h-5 w-5 text-cherry-800" />
                  <div>
                    <Label htmlFor="orderUpdates" className="font-medium">
                      Order Updates
                    </Label>
                    <p className="text-sm text-gray-500">Receive notifications about your order status</p>
                  </div>
                </div>
                <Switch
                  id="orderUpdates"
                  checked={notificationSettings.orderUpdates}
                  onCheckedChange={() => handleToggleChange("orderUpdates")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-cherry-800" />
                  <div>
                    <Label htmlFor="paymentNotifications" className="font-medium">
                      Payment Notifications
                    </Label>
                    <p className="text-sm text-gray-500">Get updates about payment confirmations and issues</p>
                  </div>
                </div>
                <Switch
                  id="paymentNotifications"
                  checked={notificationSettings.paymentNotifications}
                  onCheckedChange={() => handleToggleChange("paymentNotifications")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Tag className="h-5 w-5 text-cherry-800" />
                  <div>
                    <Label htmlFor="promotions" className="font-medium">
                      Promotions & Offers
                    </Label>
                    <p className="text-sm text-gray-500">Receive notifications about sales and special offers</p>
                  </div>
                </div>
                <Switch
                  id="promotions"
                  checked={notificationSettings.promotions}
                  onCheckedChange={() => handleToggleChange("promotions")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-cherry-800" />
                  <div>
                    <Label htmlFor="productUpdates" className="font-medium">
                      Product Updates
                    </Label>
                    <p className="text-sm text-gray-500">Get notified about price drops and restocks</p>
                  </div>
                </div>
                <Switch
                  id="productUpdates"
                  checked={notificationSettings.productUpdates}
                  onCheckedChange={() => handleToggleChange("productUpdates")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications" className="font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={() => handleToggleChange("emailNotifications")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pushNotifications" className="font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-gray-500">Receive notifications in your browser</p>
                </div>
                <Switch
                  id="pushNotifications"
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={() => handleToggleChange("pushNotifications")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smsNotifications" className="font-medium">
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={notificationSettings.smsNotifications}
                  onCheckedChange={() => handleToggleChange("smsNotifications")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payment Notifications</CardTitle>
                  <CardDescription>Recent payment notifications</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={clearAllNotifications}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-md border border-green-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-green-800">Payment Successful</h4>
                        <p className="text-sm text-green-700">
                          Your payment of KSh 149,999 for Order #ORD-2024-001 was successful.
                        </p>
                        <p className="text-xs text-green-600 mt-1">2 hours ago</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">New</Badge>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        <Bell className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-yellow-800">Payment Pending</h4>
                        <p className="text-sm text-yellow-700">
                          Your M-PESA payment of KSh 89,999 for Order #ORD-2024-003 is pending confirmation.
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        <CreditCard className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">Card Payment Successful</h4>
                        <p className="text-sm text-gray-700">
                          Your card payment of KSh 299,999 for Order #ORD-2024-002 was successful.
                        </p>
                        <p className="text-xs text-gray-500 mt-1">2 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <Button variant="link" className="text-cherry-800">
                  View All Payment Notifications
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Notification Settings</CardTitle>
              <CardDescription>Customize your payment notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="successfulPayments" className="font-medium">
                    Successful Payments
                  </Label>
                  <p className="text-sm text-gray-500">Get notified when your payments are successful</p>
                </div>
                <Switch id="successfulPayments" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="failedPayments" className="font-medium">
                    Failed Payments
                  </Label>
                  <p className="text-sm text-gray-500">Get notified when your payments fail</p>
                </div>
                <Switch id="failedPayments" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pendingPayments" className="font-medium">
                    Pending Payments
                  </Label>
                  <p className="text-sm text-gray-500">Get notified about pending payment status</p>
                </div>
                <Switch id="pendingPayments" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="paymentReminders" className="font-medium">
                    Payment Reminders
                  </Label>
                  <p className="text-sm text-gray-500">Receive reminders for upcoming or pending payments</p>
                </div>
                <Switch id="paymentReminders" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button className="bg-cherry-800">Save Preferences</Button>
      </div>
    </div>
  )
}
