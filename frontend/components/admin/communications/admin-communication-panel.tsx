"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CalendarIcon, Clock, Users, Send, AlertCircle, Info, Tag, Package, Bell } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { notificationService } from "@/services/notification"
import type { NotificationPriority, NotificationTarget, NotificationType, UserSegment } from "@/types/notification"

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }).max(100),
  message: z.string().min(10, { message: "Message must be at least 10 characters" }).max(500),
  type: z.enum(["announcement", "product_update", "price_change", "stock_alert", "promotion", "system"]),
  targetUsers: z.enum(["all", "specific", "segment"]),
  userSegment: z.enum(["new", "returning", "premium", "inactive", "recent_purchasers"]).optional(),
  priority: z.enum(["high", "medium", "low"]),
  actionUrl: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal("")),
  expiresAt: z.date().optional(),
  image: z.string().url({ message: "Please enter a valid image URL" }).optional().or(z.literal("")),
  scheduleDelivery: z.boolean().default(false),
  scheduledDate: z.date().optional(),
})

type FormValues = z.infer<typeof formSchema>

const notificationTypes = [
  { value: "announcement", label: "Announcement", icon: Bell },
  { value: "product_update", label: "Product Update", icon: Package },
  { value: "price_change", label: "Price Change", icon: Tag },
  { value: "stock_alert", label: "Stock Alert", icon: AlertCircle },
  { value: "promotion", label: "Promotion", icon: Tag },
  { value: "system", label: "System", icon: Info },
]

const userSegments = [
  { value: "new", label: "New Users" },
  { value: "returning", label: "Returning Users" },
  { value: "premium", label: "Premium Users" },
  { value: "inactive", label: "Inactive Users" },
  { value: "recent_purchasers", label: "Recent Purchasers" },
]

export function AdminCommunicationPanel() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentNotifications, setSentNotifications] = useState<any[]>([])
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "announcement",
      targetUsers: "all",
      priority: "medium",
      actionUrl: "",
      image: "",
      scheduleDelivery: false,
    },
  })

  const targetUsers = form.watch("targetUsers")
  const scheduleDelivery = form.watch("scheduleDelivery")

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    try {
      // Format the data for the API
      const notificationData = {
        title: data.title,
        message: data.message,
        type: data.type as NotificationType,
        targetUsers: data.targetUsers as NotificationTarget,
        userSegment: data.userSegment as UserSegment,
        priority: data.priority as NotificationPriority,
        actionUrl: data.actionUrl || undefined,
        expiresAt: data.expiresAt ? data.expiresAt.toISOString() : undefined,
        image: data.image || undefined,
        scheduledDate: data.scheduledDate ? data.scheduledDate.toISOString() : undefined,
      }

      // Send the notification
      await notificationService.sendAdminNotification(notificationData)

      // Show success toast
      toast({
        title: "Notification sent",
        description: `Your notification has been ${data.scheduleDelivery ? "scheduled" : "sent"} successfully.`,
        variant: "default",
      })

      // Reset the form
      form.reset()

      // Refresh the sent notifications list
      loadSentNotifications()
    } catch (error: any) {
      console.error("Error sending notification:", error)
      toast({
        title: "Error sending notification",
        description: error.message || "An error occurred while sending the notification.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadSentNotifications = async () => {
    try {
      const notifications = await notificationService.getAdminSentNotifications()
      setSentNotifications(notifications)
    } catch (error) {
      console.error("Error loading sent notifications:", error)
    }
  }

  // Load sent notifications on component mount
  useState(() => {
    loadSentNotifications()
  })

  return (
    <Tabs defaultValue="compose" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="compose">Compose</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="compose" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Send Notification to Users</CardTitle>
            <CardDescription>
              Create and send notifications to your users. These will appear in their notification center.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter notification title" {...field} />
                      </FormControl>
                      <FormDescription>This will be displayed as the notification heading.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notification Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter the notification message" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormDescription>
                        The main content of your notification. Keep it clear and concise.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select notification type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {notificationTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center">
                                  <type.icon className="mr-2 h-4 w-4" />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>This determines how the notification will be categorized.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>High priority notifications are highlighted to users.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="targetUsers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="all" />
                            </FormControl>
                            <FormLabel className="font-normal">All Users</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="segment" />
                            </FormControl>
                            <FormLabel className="font-normal">User Segment</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="specific" />
                            </FormControl>
                            <FormLabel className="font-normal">Specific Users (Coming Soon)</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {targetUsers === "segment" && (
                  <FormField
                    control={form.control}
                    name="userSegment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Segment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user segment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {userSegments.map((segment) => (
                              <SelectItem key={segment.value} value={segment.value}>
                                {segment.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Target specific user segments based on their behavior.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="actionUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/page" {...field} />
                      </FormControl>
                      <FormDescription>
                        Users will be directed to this URL when they click the notification.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} />
                      </FormControl>
                      <FormDescription>An image to display with the notification.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduleDelivery"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Schedule Delivery</FormLabel>
                        <FormDescription>Send this notification at a later time.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {scheduleDelivery && (
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Scheduled Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value && "text-muted-foreground"
                                }`}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>The notification will be sent on this date.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>The notification will be automatically removed after this date.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Send className="mr-2 h-4 w-4" />
                      {scheduleDelivery ? "Schedule Notification" : "Send Notification"}
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Sent Notifications</CardTitle>
            <CardDescription>View and manage notifications you've sent to users.</CardDescription>
          </CardHeader>
          <CardContent>
            {sentNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="mt-4 text-muted-foreground">No notifications have been sent yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentNotifications.map((notification) => (
                  <Card key={notification.id} className="overflow-hidden">
                    <div
                      className={`h-2 ${notification.priority === "high" ? "bg-red-500" : notification.priority === "medium" ? "bg-blue-500" : "bg-gray-300"}`}
                    />
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {notification.type.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          <span>
                            {notification.targetUsers === "all"
                              ? "All Users"
                              : notification.targetUsers === "segment"
                                ? `Segment: ${notification.userSegment}`
                                : "Specific Users"}
                          </span>
                        </div>
                        <div>
                          <span>Sent: {new Date(notification.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={loadSentNotifications}>
              Refresh
            </Button>
            {sentNotifications.length > 0 && <Button variant="outline">Export Report</Button>}
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

