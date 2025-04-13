import { io, type Socket } from "socket.io-client"

class WebSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000 // Start with 2 seconds
  private reconnectTimer: NodeJS.Timeout | null = null
  private enableWebsocket: boolean = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true"
  private messageQueue: Array<{ event: string; data: any }> = [] // Queue for messages when socket is not connected
  private connecting = false // Flag to track connection in progress

  constructor() {
    // Initialize the socket connection if enabled
    this.enableWebsocket = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true"

    // Connect immediately if in browser environment and enabled
    if (typeof window !== "undefined" && this.enableWebsocket) {
      this.connect()
    }
  }

  // Connect to the WebSocket server
  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket || !this.enableWebsocket || this.connecting) {
        resolve(this.isConnected)
        return
      }

      this.connecting = true

      try {
        console.log("Attempting to connect to WebSocket server...")

        // Make sure we have a valid API URL
        const socketUrl =
          process.env.NEXT_PUBLIC_WEBSOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

        this.socket = io(`${socketUrl}`, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          timeout: 10000,
        })

        this.socket.on("connect", () => {
          console.log("WebSocket connected successfully")
          this.isConnected = true
          this.connecting = false

          // Notify all connection status subscribers
          const handlers = this.eventHandlers.get("connection_status")
          if (handlers) {
            handlers.forEach((handler) => handler(true))
          }

          this.reconnectAttempts = 0
          this.reconnectDelay = 2000 // Reset delay on successful connection

          // Process any queued messages
          this.processMessageQueue()

          resolve(true)
        })

        this.socket.on("disconnect", (reason) => {
          console.log(`WebSocket disconnected: ${reason}`)
          this.isConnected = false
          this.connecting = false

          // Notify all connection status subscribers
          const handlers = this.eventHandlers.get("connection_status")
          if (handlers) {
            handlers.forEach((handler) => handler(false))
          }

          this.handleReconnect(reason)
          resolve(false)
        })

        this.socket.on("connect_error", (error) => {
          console.error("WebSocket connection error:", error)
          this.isConnected = false
          this.connecting = false

          // Notify all connection status subscribers
          const handlers = this.eventHandlers.get("connection_status")
          if (handlers) {
            handlers.forEach((handler) => handler(false))
          }

          this.handleReconnect("connect_error")
          resolve(false)
        })

        // Set up handlers for all registered events
        this.eventHandlers.forEach((handlers, event) => {
          if (event !== "connection_status") {
            // Skip connection status to avoid duplicates
            handlers.forEach((handler) => {
              this.socket?.on(event, handler)
            })
          }
        })
      } catch (error) {
        console.error("Error initializing WebSocket:", error)
        this.connecting = false
        resolve(false)
      }
    })
  }

  // Process any messages that were queued while disconnected
  private processMessageQueue(): void {
    if (!this.isConnected || !this.socket) return

    console.log(`Processing ${this.messageQueue.length} queued messages`)

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        try {
          this.socket.emit(message.event, message.data)
          console.log(`Sent queued message: ${message.event}`)
        } catch (error) {
          console.error(`Error sending queued message ${message.event}:`, error)
        }
      }
    }
  }

  // Handle reconnection with exponential backoff
  private handleReconnect(reason: string): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000) // Max 30 seconds

      console.log(`Attempting to reconnect in ${delay / 1000} seconds...`)

      this.reconnectTimer = setTimeout(() => {
        console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
        this.connect()
      }, delay)
    } else {
      console.error("Max reconnection attempts reached. Please refresh the page.")
    }
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
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }

    this.eventHandlers.get(event)?.add(callback)

    // If socket exists, register the handler
    if (this.socket) {
      this.socket.on(event, callback)
    }

    // Return a function to remove this handler
    return () => this.off(event, callback)
  }

  // Alias for 'on' method to maintain compatibility
  public subscribe(event: string, callback: (data: any) => void): () => void {
    return this.on(event, callback)
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
      this.socket.emit(event, data)
    } else {
      // Queue the message for later
      this.messageQueue.push({ event, data })
      console.log(`Queued message ${event} for later delivery. Queue size: ${this.messageQueue.length}`)

      // Try to connect if not already connecting
      if (!this.connecting) {
        await this.connect()
      }
    }
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

  // Update the send method to handle disconnected state better
  public async send(type: string, payload: any): Promise<void> {
    if (this.socket && this.isConnected) {
      this.socket.emit(type, payload)
    } else {
      // Queue the message for later
      this.messageQueue.push({ event: type, data: payload })
      console.log(`Queued message ${type} for later delivery. Queue size: ${this.messageQueue.length}`)

      // Try to connect if not already connecting
      if (!this.connecting) {
        await this.connect()
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
