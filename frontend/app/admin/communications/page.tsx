"use client"

import { useState } from "react"
import { AdminCommunicationPanel } from "@/components/admin/communications/admin-communication-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSocket } from "@/contexts/socket-context"

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState("notifications")
  const { isConnected } = useSocket()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Communications</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm">WebSocket Status:</span>
          <span className={`inline-block w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
          <span className="text-sm">{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      <Tabs defaultValue="notifications" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="email">Email Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdminCommunicationPanel />

            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>History of recently sent notifications</CardDescription>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">Flash Sale Alert</h4>
                          <p className="text-sm text-muted-foreground">Sent to all users</p>
                        </div>
                        <span className="text-xs text-muted-foreground">2 hours ago</span>
                      </div>
                      <p className="mt-2 text-sm">
                        Don't miss our flash sale! 50% off all summer items for the next 24 hours.
                      </p>
                    </div>

                    <div className="p-4 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">Order Status Update</h4>
                          <p className="text-sm text-muted-foreground">Sent to user #1234</p>
                        </div>
                        <span className="text-xs text-muted-foreground">Yesterday</span>
                      </div>
                      <p className="mt-2 text-sm">Your order #ORD-7890 has been shipped and is on its way!</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground mb-2">
                      WebSocket connection is required to view notification history
                    </p>
                    <p className="text-sm">Please check your connection settings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>Create and manage email marketing campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This feature is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Communication Analytics</CardTitle>
              <CardDescription>View engagement metrics for your communications</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This feature is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

