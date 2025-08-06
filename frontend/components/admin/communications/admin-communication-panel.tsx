"use client"

import type React from "react"
import { useState } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

interface AdminCommunicationPanelProps {
  className?: string
}

export const AdminCommunicationPanel: React.FC<AdminCommunicationPanelProps> = ({ className }) => {
  const { socket, isConnected, send } = useSocket() // Use send instead of sendMessage
  const [messageType, setMessageType] = useState("notification")
  const [userId, setUserId] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSendMessage = () => {
    if (!isConnected) {
      toast({
        title: "Error",
        description: "Socket is not connected. Cannot send message.",
        variant: "destructive",
      })
      return
    }

    if (!message) {
      toast({
        title: "Error",
        description: "Message content is required.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    try {
      if (userId) {
        // Send to specific user
        send("send_user_notification", {
          // Changed from sendMessage to send
          user_id: userId,
          type: messageType,
          title: title || "Notification",
          message,
        })
      } else {
        // Broadcast to all users
        send("broadcast_notification", {
          // Changed from sendMessage to send
          type: messageType,
          title: title || "Notification",
          message,
        })
      }

      toast({
        title: "Success",
        description: userId ? `Message sent to user ${userId}` : "Message broadcast to all users",
      })

      // Reset form
      setTitle("")
      setMessage("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Communication Panel</CardTitle>
        <CardDescription>Send notifications to users in real-time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Message Type</label>
          <Select value={messageType} onValueChange={setMessageType}>
            <SelectTrigger>
              <SelectValue placeholder="Select message type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="notification">General Notification</SelectItem>
              <SelectItem value="alert">Alert</SelectItem>
              <SelectItem value="promotion">Promotion</SelectItem>
              <SelectItem value="update">System Update</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">User ID (optional)</label>
          <Input
            placeholder="Leave empty to broadcast to all users"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Title (optional)</label>
          <Input placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            placeholder="Enter your message here"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSendMessage} disabled={isSending || !isConnected || !message} className="w-full">
          {isSending ? "Sending..." : "Send Message"}
        </Button>
      </CardFooter>
    </Card>
  )
}
