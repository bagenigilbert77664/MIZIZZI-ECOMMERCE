"use client"

import { useState, useEffect } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader } from "@/components/ui/loader"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export function WebSocketDebugger() {
  const { isConnected, isConnecting, connect, disconnect, subscribe, send, lastError } = useSocket()
  const [messages, setMessages] = useState<string[]>([])
  const [eventType, setEventType] = useState("test_message")
  const [eventData, setEventData] = useState('{"message": "Hello from client"}')
  const [receivedMessages, setReceivedMessages] = useState<any[]>([])
  const [autoScroll, setAutoScroll] = useState(true)

  // Add a message to the log
  const addMessage = (message: string) => {
    setMessages((prev) => {
      const newMessages = [...prev, `${new Date().toLocaleTimeString()}: ${message}`]
      // Keep only the last 100 messages to prevent memory issues
      return newMessages.slice(-100)
    })
  }

  // Handle manual connection
  const handleConnect = () => {
    addMessage("Manually connecting to WebSocket...")
    connect()
  }

  // Handle manual disconnection
  const handleDisconnect = () => {
    addMessage("Manually disconnecting from WebSocket...")
    disconnect()
  }

  // Send a test message
  const handleSendMessage = () => {
    try {
      addMessage(`Sending ${eventType} event...`)
      const parsedData = JSON.parse(eventData)
      send(eventType, parsedData)
    } catch (error) {
      addMessage(`Error parsing JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Listen for connection status changes
  useEffect(() => {
    addMessage(`WebSocket status: ${isConnected ? "Connected" : "Disconnected"}`)
    if (lastError) {
      addMessage(`Error: ${lastError}`)
    }
  }, [isConnected, lastError])

  // Listen for all incoming messages
  useEffect(() => {
    if (!isConnected) return

    const handleMessage = (data: any) => {
      setReceivedMessages((prev) => {
        const newMessages = [data, ...prev]
        // Keep only the last 50 messages to prevent memory issues
        return newMessages.slice(0, 50)
      })
      addMessage(`Received message: ${JSON.stringify(data)}`)
    }

    // Subscribe to specific events
    const unsubEcho = subscribe("echo_response", handleMessage)
    const unsubProductView = subscribe("product_view_activity", handleMessage)
    const unsubCartActivity = subscribe("cart_activity", handleMessage)
    const unsubProductUpdate = subscribe("product_updated", handleMessage)
    const unsubInventoryUpdate = subscribe("inventory_updated", handleMessage)
    const unsubOrderUpdate = subscribe("order_updated", handleMessage)
    const unsubNotification = subscribe("notification", handleMessage)

    return () => {
      unsubEcho()
      unsubProductView()
      unsubCartActivity()
      unsubProductUpdate()
      unsubInventoryUpdate()
      unsubOrderUpdate()
      unsubNotification()
    }
  }, [isConnected, subscribe])

  // Auto-scroll log to bottom
  useEffect(() => {
    if (autoScroll) {
      const logElement = document.getElementById("websocket-log")
      if (logElement) {
        logElement.scrollTop = logElement.scrollHeight
      }
    }
  }, [messages, autoScroll])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>WebSocket Debugger</CardTitle>
        <CardDescription>Test and debug WebSocket connections</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Disconnected
              </Badge>
            )}
          </div>
          <div>
            <span className="text-sm text-muted-foreground">
              WebSocket Enabled: {process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true" ? "Yes" : "No (Mock Mode)"}
            </span>
          </div>
        </div>

        <div className="grid gap-4 mb-4">
          <div className="grid gap-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger id="event-type">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test_message">test_message</SelectItem>
                <SelectItem value="product_view">product_view</SelectItem>
                <SelectItem value="add_to_cart">add_to_cart</SelectItem>
                <SelectItem value="echo">echo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-data">Event Data (JSON)</Label>
            <Input
              id="event-data"
              value={eventData}
              onChange={(e) => setEventData(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </div>

          <Button onClick={handleSendMessage} disabled={!isConnected}>
            Send Message
          </Button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Log</h3>
          <div className="flex items-center space-x-2">
            <Switch id="auto-scroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
            <Label htmlFor="auto-scroll">Auto-scroll</Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <ScrollArea id="websocket-log" className="h-[300px] rounded-md border bg-gray-50 p-2">
              {messages.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">No messages yet</div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className="py-1 border-b border-gray-100 last:border-0 text-sm">
                    {message}
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          <div>
            <h3 className="font-medium mb-2">Received Messages</h3>
            <ScrollArea className="h-[300px] rounded-md border bg-gray-50 p-2">
              {receivedMessages.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">No messages received</div>
              ) : (
                receivedMessages.map((msg, index) => (
                  <div key={index} className="py-1 border-b border-gray-100 last:border-0 text-sm">
                    <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(msg, null, 2)}</pre>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <Button variant="outline" onClick={handleConnect} disabled={isConnected || isConnecting} className="mr-2">
            {isConnecting ? (
              <>
                <Loader size="sm" className="mr-2" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
          <Button variant="outline" onClick={handleDisconnect} disabled={!isConnected}>
            Disconnect
          </Button>
        </div>
        <Button variant="destructive" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </CardFooter>
    </Card>
  )
}
