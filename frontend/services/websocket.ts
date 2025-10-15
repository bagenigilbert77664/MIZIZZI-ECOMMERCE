"use client"

import { io, type Socket } from "socket.io-client"

// Add this type declaration at the top of the file, after the imports
declare global {
  interface Window {
    __websocketServiceInitialized?: boolean
  }
}

class WebSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000 // Start with 3 seconds
  private reconnectTimer: NodeJS.Timeout | null = null
  private enableWebsocket: boolean = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true"
  private messageQueue: Array<{ event: string; data: any }> = [] // Queue for messages when socket is not connected
  private connecting = false // Flag to track connection in progress
  private lastConnectionAttempt = 0
  private readonly CONNECTION_ATTEMPT_COOLDOWN = 5000 // 5 seconds between connection attempts

  constructor() {
    this.enableWebsocket = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true"

    if (typeof window !== "undefined" && this.enableWebsocket) {
      this.connect()
    }

    if (typeof window !== "undefined") {
      window.__websocketServiceInitialized = window.__websocketServiceInitialized || false
    }
  }

  // Connect to the WebSocket server
  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      const now = Date.now()
      if (now - this.lastConnectionAttempt < this.CONNECTION_ATTEMPT_COOLDOWN) {
        console.log("[v0] WebSocket connection attempt too soon, waiting...")
        resolve(this.isConnected)
        return
      }

      if (this.socket || !this.enableWebsocket || this.connecting) {
        resolve(this.isConnected)
        return
      }

      this.connecting = true
      this.lastConnectionAttempt = now

      try {
        console.log("[v0] WebSocket service attempting to connect...")
        console.log("[v0] WebSocket enabled:", this.enableWebsocket)
        console.log("[v0] Environment variable:", process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET)

        const socketUrl =
          process.env.NEXT_PUBLIC_WEBSOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

        console.log("[v0] Connecting to WebSocket URL:", socketUrl)

        const connectionTimeout = setTimeout(() => {
          console.warn("[v0] WebSocket connection timeout - service will operate without real-time features")
          this.connecting = false
          resolve(false)
        }, 20000)

        this.socket = io(`${socketUrl}`, {
          transports: ["websocket", "polling"],
          reconnection: false,
          timeout: 20000, // Increased timeout
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        })

        this.socket.on("connect", () => {
          clearTimeout(connectionTimeout)
          console.log("[v0] WebSocket connected successfully")
          this.isConnected = true
          this.connecting = false
          this.reconnectAttempts = 0

          const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
          if (token) {
            console.log("[v0] Authenticating WebSocket connection...")
            this.socket?.emit("authenticate", { token })
          }

          this.processMessageQueue()

          resolve(true)
        })

        this.socket.on("disconnect", (reason) => {
          clearTimeout(connectionTimeout)
          console.log(`[v0] WebSocket disconnected: ${reason}`)
          this.isConnected = false
          this.socket = null
          this.connecting = false

          if (reason === "transport error" || reason === "transport close") {
            console.log("[v0] WebSocket server not available - service will operate without real-time features")
            resolve(false)
            return
          }

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000)
            console.log(
              `[v0] Attempting to reconnect in ${delay / 1000} seconds... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            )

            this.reconnectTimer = setTimeout(() => {
              this.connect()
            }, delay)
          } else {
            console.error("[v0] Max reconnection attempts reached. Service will operate without real-time features.")
          }
        })

        this.socket.on("connect_error", (error) => {
          clearTimeout(connectionTimeout)
          console.error("[v0] WebSocket connection error:", error)
          this.isConnected = false
          this.connecting = false

          resolve(false)
        })

        // Set up handlers for all registered events
        this.eventHandlers.forEach((handlers, event) => {
          if (event !== "connection_status") {
            handlers.forEach((handler) => {
              this.socket?.on(event, handler)
            })
          }
        })

        resolve(true)
      } catch (error) {
        console.error("Error initializing WebSocket:", error)
        this.connecting = false
        resolve(false)
      }
    })
  }

  // Disconnect from the WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // Register an event handler
  public on<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }

    this.eventHandlers.get(event)!.add(callback as any)

    // If socket exists, register the handler
    if (this.socket) {
      this.socket.on(event, callback)
    }

    // Return a function to remove this handler
    return () => this.off(event, callback)
  }

  // Remove an event handler
  public off(event: string, callback: (data: any) => void): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(callback)
      if (handlers.size === 0) {
        this.eventHandlers.delete(event)
      }
    }

    // If socket exists, remove the handler
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  // Emit an event to the server
  public async emit(event: string, data: any): Promise<void> {
    if (this.socket && this.isConnected) {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      const messageData = token ? { ...data, token } : data

      this.socket.emit(event, messageData)
    } else {
      // Queue the message for when connection is established
      this.messageQueue.push({ event, data })

      // Try to connect if not already connecting
      if (!this.connecting && !this.socket) {
        await this.connect()
      }
    }
  }

  // Send an event to the server (alias for emit for backward compatibility)
  public async send(event: string, data: any): Promise<void> {
    return this.emit(event, data)
  }

  // Check if the WebSocket is connected
  public getConnectionStatus(): boolean {
    return this.isConnected
  }

  // Track user activity for analytics
  public async trackPageView(page: string, userId?: string): Promise<void> {
    await this.emit("page_view", { page, userId, timestamp: new Date().toISOString() })
  }

  // Track product view for analytics
  public async trackProductView(productId: number | string, userId?: string): Promise<void> {
    await this.emit("product_view", { productId, userId, timestamp: new Date().toISOString() })
  }

  // Track add to cart for analytics
  public async trackAddToCart(productId: number | string, quantity: number, userId?: string): Promise<void> {
    await this.emit("add_to_cart", { productId, quantity, userId, timestamp: new Date().toISOString() })
  }

  // Track checkout for analytics
  public async trackCheckout(orderId: string | number, total: number, userId?: string): Promise<void> {
    await this.emit("checkout", { orderId, total, userId, timestamp: new Date().toISOString() })
  }

  // Add a method to check if WebSocket is enabled
  public isEnabled(): boolean {
    return this.enableWebsocket
  }

  // Add a method to get the socket instance
  public getSocket(): Socket | null {
    return this.socket
  }

  // Alias for 'on' method to maintain compatibility
  public subscribe<T>(event: string, callback: (data: T) => void): () => void {
    return this.on(event, callback)
  }

  // Add a method to process the message queue after connection
  private processMessageQueue(): void {
    if (this.isConnected && this.messageQueue.length > 0) {
      console.log(`Processing ${this.messageQueue.length} queued messages`)

      // Process all queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()
        if (message) {
          this.socket?.emit(message.event, message.data)
        }
      }
    }
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService()

// Export a subscribe function for components that don't need the full service
export const subscribe = (event: string, callback: (data: any) => void): (() => void) => {
  return websocketService.on(event, callback)
}

export default websocketService
