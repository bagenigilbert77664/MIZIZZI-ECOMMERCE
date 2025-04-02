"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Bell, Mail, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { notificationService } from "@/services/notification"
import type { NotificationPreferences } from "@/types/notification"

const formSchema = z.object({
  order: z.boolean(),
  payment: z.boolean(),
  product: z.boolean(),
  promotion: z.boolean(),
  system: z.boolean(),
  announcement: z.boolean(),
  product_update: z.boolean(),
  price_change: z.boolean(),
  stock_alert: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
})

export default function NotificationPreferencesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    },
  })

  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true)
      try {
        const preferences = await notificationService.getNotificationPreferences()
        form.reset(preferences)
      } catch (error) {
        console.error("Error loading notification preferences:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [form])

  const onSubmit = async (data: NotificationPreferences) => {
    setIsLoading(true)
    try {
      await notificationService.updateNotificationPreferences(data)
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating notification preferences:", error)
      toast({
        title: "Error",
        description: "Failed to update notification preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Notification Preferences</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Choose which types of notifications you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Order Updates</FormLabel>
                      <FormDescription>Notifications about your orders, shipping, and delivery</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Payment Updates</FormLabel>
                      <FormDescription>Notifications about payments, refunds, and billing</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Product Updates</FormLabel>
                      <FormDescription>Notifications about products you've viewed or purchased</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="promotion"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Promotions & Deals</FormLabel>
                      <FormDescription>Notifications about sales, discounts, and special offers</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="announcement"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Announcements</FormLabel>
                      <FormDescription>Important announcements from our store</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="system"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">System Updates</FormLabel>
                      <FormDescription>Updates about our platform, terms, and policies</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Methods</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Email Notifications</FormLabel>
                        <FormDescription>Receive notifications via email</FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pushNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Push Notifications</FormLabel>
                        <FormDescription>Receive notifications on your device</FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smsNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">SMS Notifications</FormLabel>
                        <FormDescription>Receive notifications via text message</FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}

