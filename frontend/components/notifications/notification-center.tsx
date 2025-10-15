"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Bell, ShoppingBag, CreditCard, Tag, Settings, Loader2 } from "lucide-react"
import { notificationService } from "@/services/notification"
import type { NotificationPreferences } from "@/types/notification"
import { paymentService } from "@/services/payment-service"
import { format } from "date-fns"

export default function NotificationCenter() {
  const [notificationSettings, setNotificationSettings] = useState<NotificationPreferences>({
    order: true,
    payment: true,
    promotion: true,
    product: false,
    system: true,
    announcement: true,
    product_update: false,
    price_change: false,
    stock_alert: false,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [paymentNotifications, setPaymentNotifications] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)

  // Load notification preferences on mount
  useEffect(() => {
    loadPreferences()
    loadPaymentNotifications()
  }, [])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const preferences = await notificationService.getNotificationPreferences()
      setNotificationSettings(preferences)
    } catch (error) {
      console.error("[v0] Error loading notification preferences:", error)
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadPaymentNotifications = async () => {
    try {
      setLoadingPayments(true)
      const response = await paymentService.getTransactions()
      // Ensure we access the array of transactions from the response
      const transactionsArray = Array.isArray(response)
        ? response
        : response.transactions || []
      // Sort by date, most recent first
      const sortedTransactions = transactionsArray
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10) // Get last 10 transactions
      setPaymentNotifications(sortedTransactions)
    } catch (error) {
      console.error("[v0] Error loading payment notifications:", error)
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleToggleChange = (setting: keyof NotificationPreferences) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }))
  }

  const savePreferences = async () => {
    try {
      setIsSaving(true)
      await notificationService.updateNotificationPreferences(notificationSettings)
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated successfully",
      })
    } catch (error) {
      console.error("[v0] Error saving notification preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const clearAllNotifications = () => {
    toast({
      title: "Notifications cleared",
      description: "All notifications have been cleared",
    })
  }

  const getPaymentStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "success":
        return { bg: "bg-green-50", border: "border-green-100", text: "text-green-800", icon: "text-green-600" }
      case "pending":
        return { bg: "bg-yellow-50", border: "border-yellow-100", text: "text-yellow-800", icon: "text-yellow-600" }
      case "failed":
      case "cancelled":
        return { bg: "bg-red-50", border: "border-red-100", text: "text-red-800", icon: "text-red-600" }
      default:
        return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-800", icon: "text-gray-600" }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cherry-600" />
      </div>
    )
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
                    <Label htmlFor="order" className="font-medium">
                      Order Updates
                    </Label>
                    <p className="text-sm text-gray-500">Receive notifications about your order status</p>
                  </div>
                </div>
                <Switch
                  id="order"
                  checked={notificationSettings.order}
                  onCheckedChange={() => handleToggleChange("order")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-cherry-800" />
                  <div>
                    <Label htmlFor="payment" className="font-medium">
                      Payment Notifications
                    </Label>
                    <p className="text-sm text-gray-500">Get updates about payment confirmations and issues</p>
                  </div>
                </div>
                <Switch
                  id="payment"
                  checked={notificationSettings.payment}
                  onCheckedChange={() => handleToggleChange("payment")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Tag className="h-5 w-5 text-cherry-800" />
                  <div>
                    <Label htmlFor="promotion" className="font-medium">
                      Promotions & Offers
                    </Label>
                    <p className="text-sm text-gray-500">Receive notifications about sales and special offers</p>
                  </div>
                </div>
                <Switch
                  id="promotion"
                  checked={notificationSettings.promotion}
                  onCheckedChange={() => handleToggleChange("promotion")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-cherry-800" />
                  <div>
                    <Label htmlFor="product_update" className="font-medium">
                      Product Updates
                    </Label>
                    <p className="text-sm text-gray-500">Get notified about price drops and restocks</p>
                  </div>
                </div>
                <Switch
                  id="product_update"
                  checked={notificationSettings.product_update}
                  onCheckedChange={() => handleToggleChange("product_update")}
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
                  <CardDescription>Recent payment transactions from PesaPal</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadPaymentNotifications}>
                  <Bell className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingPayments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-cherry-600" />
                </div>
              ) : paymentNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No payment notifications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentNotifications.map((transaction) => {
                    const statusStyle = getPaymentStatusStyle(transaction.status)
                    return (
                      <div
                        key={transaction.id}
                        className={`${statusStyle.bg} p-4 rounded-md border ${statusStyle.border}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              <CreditCard className={`h-5 w-5 ${statusStyle.icon}`} />
                            </div>
                            <div>
                              <h4 className={`font-medium ${statusStyle.text}`}>
                                Payment{" "}
                                {transaction.status === "completed"
                                  ? "Successful"
                                  : transaction.status === "pending"
                                    ? "Pending"
                                    : "Failed"}
                              </h4>
                              <p className={`text-sm ${statusStyle.text}`}>
                                {transaction.payment_method === "card" ? "Card Payment" : "M-PESA Payment"} of{" "}
                                {formatCurrency(transaction.amount)} for Order #{transaction.order_id}
                              </p>
                              {transaction.merchant_reference && (
                                <p className={`text-xs ${statusStyle.text} mt-1`}>
                                  Reference: {transaction.merchant_reference}
                                </p>
                              )}
                              <p className={`text-xs ${statusStyle.text} opacity-75 mt-1`}>
                                {format(new Date(transaction.created_at), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          </div>
                          <Badge className={`${statusStyle.bg} ${statusStyle.text} hover:${statusStyle.bg}`}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="text-center pt-2">
                <Button variant="link" className="text-cherry-800" asChild>
                  <a href="/account?tab=payments">View All Payment History</a>
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
                <Switch
                  id="successfulPayments"
                  checked={notificationSettings.payment}
                  onCheckedChange={() => handleToggleChange("payment")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="failedPayments" className="font-medium">
                    Failed Payments
                  </Label>
                  <p className="text-sm text-gray-500">Get notified when your payments fail</p>
                </div>
                <Switch
                  id="failedPayments"
                  checked={notificationSettings.payment}
                  onCheckedChange={() => handleToggleChange("payment")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="pendingPayments" className="font-medium">
                    Pending Payments
                  </Label>
                  <p className="text-sm text-gray-500">Get notified about pending payment status</p>
                </div>
                <Switch
                  id="pendingPayments"
                  checked={notificationSettings.payment}
                  onCheckedChange={() => handleToggleChange("payment")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button className="bg-cherry-800" onClick={savePreferences} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </div>
    </div>
  )
}
