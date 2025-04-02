"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { websocketService } from "@/services/websocket"
import { useAuth } from "@/contexts/auth/auth-context"

// Define the shape of the socket context
interface SocketContextType {
  isConnected: boolean
  subscribe: (type: string, callback: (data: any) => void) => () => void
  send: (type: string, payload: any) => void
}

// Create the context with a default value
const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  subscribe: () => () => {},
  send: () => {},
})

// Custom hook to use the socket context
export const useSocket = () => useContext(SocketContext)

// Provider component
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const { user, isAuthenticated } = useAuth() as { user: { token: string } | null; isAuthenticated: boolean }

  // Initialize connection when component mounts
  useEffect(() => {
    // Only attempt to connect if the service is enabled
    if (websocketService.isEnabled()) {
      // Listen for connection status changes
      const onConnectionChange = (status: boolean) => {
        setIsConnected(status)
      }

      // Subscribe to connection status events
      const unsubscribe = websocketService.subscribe("connection_status", onConnectionChange)

      // Clean up subscription when component unmounts
      return () => {
        unsubscribe()
        websocketService.close()
      }
    }
  }, [])

  // Authenticate the WebSocket connection when user auth state changes
  useEffect(() => {
    if (isAuthenticated && user && websocketService.isEnabled()) {
      // Send authentication message with user token
      websocketService.send("authenticate", { token: user?.token || "" })
    }
  }, [isAuthenticated, user])

  // Wrapper for the subscribe method
  const subscribe = useCallback((type: string, callback: (data: any) => void) => {
    return websocketService.subscribe(type, callback)
  }, [])

  // Wrapper for the send method
  const send = useCallback((type: string, payload: any) => {
    websocketService.send(type, payload)
  }, [])

  // Provide the socket context to children
  return (
    <SocketContext.Provider
      value={{
        isConnected,
        subscribe,
        send,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
