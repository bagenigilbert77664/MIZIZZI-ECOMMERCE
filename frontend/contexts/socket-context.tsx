"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/auth/auth-context"
import { useToast } from "@/hooks/use-toast"

// Add this type declaration at the top of the file, after the imports
declare global {
  interface Window {
    __mockModeToastShown?: boolean
  }
}

interface SocketContextType {
  isConnected: boolean
  isConnecting: boolean
  connect: () => void
  disconnect: () => void
  subscribe: <T>(event: string, callback: (data: T) => void) => () => void
  send: (event: string, data: any) => void
  lastError: string | null
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  isConnecting: false,
  connect: () => {},
  disconnect: () => {},
  subscribe: () => () => {},
  send: () => {},
  lastError: null,
})

// Make sure this export is clearly defined
export const useSocket = () => useContext(SocketContext)

interface SocketProviderProps {
  children: React.ReactNode
  url?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

// Mock data for development when no WebSocket server is available
const MOCK_EVENTS = {
  product_view_activity: [
    { product_id: "1", timestamp: new Date().toISOString(), user_id: "user123" },
    { product_id: "2", timestamp: new Date().toISOString(), user_id: "user456" },
  ],
  cart_activity: [
    { product_id: "3", timestamp: new Date().toISOString(), user_id: "user789" },
    { product_id: "1", timestamp: new Date().toISOString(), user_id: "user123" },
  ],
  order_updated: [
    { order_id: "ORD-001", status: "shipped", timestamp: new Date().toISOString() },
    { order_id: "ORD-002", status: "processing", timestamp: new Date().toISOString() },
  ],
  inventory_updated: [
    { product_id: "5", stock_level: 3, timestamp: new Date().toISOString() },
    { product_id: "6", stock_level: 12, timestamp: new Date().toISOString() },
  ],
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:5000",
  autoConnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const mockModeRef = useRef<boolean>(false)
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionAttemptRef = useRef<boolean>(false)
  const { toast } = useToast()
  const { isAuthenticated, token } = useAuth() || { isAuthenticated: false, token: null }

  // Check if WebSocket is enabled
  const isWebSocketEnabled = useCallback(() => {
    return process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true"
  }, [])

  // Send a message to the server
  const send = useCallback(
    (event: string, data: any) => {
      if (mockModeRef.current) {
        console.log(`[MOCK] Sending ${event} event:`, data)

        // For echo events, simulate a response
        if (event === "echo") {
          setTimeout(() => {
            const handlers = eventHandlers.current.get("echo_response")
            if (handlers) {
              handlers.forEach((handler) => {
                handler({ type: "echo_response", ...data, echo: true, timestamp: new Date().toISOString() })
              })
            }
          }, 500)
        }
        return
      }

      if (socket && isConnected) {
        try {
          const adminToken = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
          const messageData = adminToken ? { type: event, ...data, token: adminToken } : { type: event, ...data }

          socket.send(JSON.stringify(messageData))
        } catch (error) {
          console.error(`Error sending ${event} message:`, error)
          setLastError(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`)
        }
      } else {
        console.warn(`Cannot send ${event} message: WebSocket is not connected`)
      }
    },
    [socket, isConnected],
  )

  // Clean up reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // Clean up mock interval
  const clearMockInterval = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
    }
  }, [])

  // Start mock mode
  const startMockMode = useCallback(() => {
    if (mockModeRef.current) return

    console.log("Starting WebSocket mock mode")
    mockModeRef.current = true
    setIsConnected(true)
    setIsConnecting(false)
    reconnectAttempts.current = 0

    // Simulate periodic events
    mockIntervalRef.current = setInterval(() => {
      // Pick a random event type
      const eventTypes = Object.keys(MOCK_EVENTS)
      const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]

      // Pick a random event from that type
      const events = MOCK_EVENTS[randomEventType as keyof typeof MOCK_EVENTS]
      const randomEvent = events[Math.floor(Math.random() * events.length)]

      // Update timestamp to current time
      const eventWithCurrentTime = {
        ...randomEvent,
        timestamp: new Date().toISOString(),
      }

      // Dispatch to handlers
      const handlers = eventHandlers.current.get(randomEventType)
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler({ type: randomEventType, ...eventWithCurrentTime })
          } catch (handlerError) {
            console.error(`Error in ${randomEventType} mock handler:`, handlerError)
          }
        })
      }
    }, 5000) // Send a mock event every 5 seconds

    // Use a static flag to prevent showing the toast multiple times
    if (!window.__mockModeToastShown) {
      window.__mockModeToastShown = true
      toast({
        title: "WebSocket Mock Mode",
        description: "Using simulated WebSocket data for development",
        variant: "default",
      })
    }
  }, [toast])

  // Connect to WebSocket server
  const connect = useCallback(() => {
    // If WebSocket is disabled, use mock mode
    if (!isWebSocketEnabled()) {
      console.log("[v0] WebSocket disabled, starting mock mode")
      startMockMode()
      return
    }

    if (socket || isConnecting || connectionAttemptRef.current) {
      console.log("[v0] Connection already in progress or established")
      return
    }

    try {
      setIsConnecting(true)
      connectionAttemptRef.current = true
      setLastError(null)

      console.log(`[v0] Socket context connecting to WebSocket server at ${url}...`)
      console.log("[v0] WebSocket enabled:", isWebSocketEnabled())

      const connectionTimeout = setTimeout(() => {
        console.warn("[v0] WebSocket connection timeout - falling back to mock mode")
        setIsConnecting(false)
        connectionAttemptRef.current = false
        setLastError("Connection timeout. Using mock data instead.")
        startMockMode()
      }, 20000)

      const ws = new WebSocket(url)

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log("[v0] WebSocket connection established")
        setSocket(ws)
        setIsConnected(true)
        setIsConnecting(false)
        connectionAttemptRef.current = false
        reconnectAttempts.current = 0

        const adminToken = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
        if (adminToken) {
          console.log("[v0] Authenticating WebSocket with admin token")
          send("authenticate", { token: adminToken })
        } else if (isAuthenticated && token) {
          console.log("[v0] Authenticating WebSocket with user token")
          send("authenticate", { token })
        }
      }

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        console.log(`[v0] WebSocket connection closed: ${event.reason} (code: ${event.code})`)
        setIsConnected(false)
        setSocket(null)
        connectionAttemptRef.current = false

        if (event.code === 1006 || event.code === 1002) {
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            setIsConnecting(false)
            setLastError("WebSocket server not available. Using mock data instead.")
            startMockMode()
            return
          }
        }

        // Attempt to reconnect for other error codes
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1
          const delay = Math.min(reconnectInterval * Math.pow(1.5, reconnectAttempts.current - 1), 30000)
          console.log(
            `[v0] Attempting to reconnect in ${delay / 1000} seconds... (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`,
          )

          clearReconnectTimeout()
          reconnectTimeoutRef.current = setTimeout(() => {
            setIsConnecting(false)
            connect()
          }, delay)
        } else {
          setIsConnecting(false)
          setLastError("Maximum reconnection attempts reached. Using mock data instead.")
          startMockMode()
        }
      }

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error("[v0] WebSocket error occurred:", {
          error: error,
          type: error.type || "unknown",
          target: (error.target && (error.target as WebSocket).url) || url,
          readyState: (error.target && (error.target as WebSocket).readyState !== undefined)
            ? (error.target as WebSocket).readyState
            : "unknown",
          timestamp: new Date().toISOString(),
        })

        setIsConnecting(false)
        connectionAttemptRef.current = false

        setLastError("WebSocket connection error occurred.")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const eventType = data.type || "message"

          // Dispatch to all registered handlers for this event type
          const handlers = eventHandlers.current.get(eventType)
          if (handlers) {
            handlers.forEach((handler) => {
              try {
                handler(data)
              } catch (handlerError) {
                console.error(`Error in ${eventType} handler:`, handlerError)
              }
            })
          }

          // Also dispatch to "message" handlers for all events
          const messageHandlers = eventHandlers.current.get("message")
          if (messageHandlers && eventType !== "message") {
            messageHandlers.forEach((handler) => {
              try {
                handler(data)
              } catch (handlerError) {
                console.error("Error in message handler:", handlerError)
              }
            })
          }
        } catch (parseError) {
          console.error("Error parsing WebSocket message:", parseError)
        }
      }
    } catch (error) {
      console.error("Error initializing WebSocket:", error)
      setIsConnecting(false)
      connectionAttemptRef.current = false
      setLastError(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`)

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        startMockMode()
      }
    }
  }, [
    url,
    socket,
    isConnecting,
    isAuthenticated,
    token,
    maxReconnectAttempts,
    reconnectInterval,
    toast,
    clearReconnectTimeout,
    send,
    isWebSocketEnabled,
    startMockMode,
  ])

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    clearReconnectTimeout()
    clearMockInterval()

    if (mockModeRef.current) {
      mockModeRef.current = false
      setIsConnected(false)
      return
    }

    if (socket) {
      socket.close()
      setSocket(null)
      setIsConnected(false)
    }
  }, [socket, clearReconnectTimeout, clearMockInterval])

  // Subscribe to an event
  const subscribe = useCallback(<T,>(event: string, callback: (data: T) => void) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set())
    }

    eventHandlers.current.get(event)!.add(callback as any)

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.current.get(event)
      if (handlers) {
        handlers.delete(callback as any)
        if (handlers.size === 0) {
          eventHandlers.current.delete(event)
        }
      }
    }
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    // Clean up on unmount
    return () => {
      clearReconnectTimeout()
      clearMockInterval()
      disconnect()
    }
  }, [autoConnect, connect, disconnect, clearReconnectTimeout, clearMockInterval])

  // Authenticate when user logs in
  useEffect(() => {
    if (isConnected && isAuthenticated && token) {
      send("authenticate", { token })
    }
  }, [isConnected, isAuthenticated, token, send])

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        isConnecting,
        connect,
        disconnect,
        subscribe,
        send,
        lastError,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

// At the end of the file, after the SocketProvider component
export { SocketContext }
