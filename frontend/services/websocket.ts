// WebSocket service for real-time updates
class WebSocketService {
  private socket: WebSocket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000 // 3 seconds
  private isConnecting = false
  private enabled = false // Flag to control whether WebSocket should be enabled

  constructor() {
    // Only initialize in browser and if explicitly enabled
    if (typeof window !== "undefined") {
      // Check if WebSocket URL is properly configured
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL
      this.enabled = !!wsUrl && wsUrl !== "wss://api.example.com/ws"

      if (this.enabled) {
        console.log("WebSocket service initialized with URL:", wsUrl)
        this.connect()
      } else {
        console.log("WebSocket service disabled - no valid URL configured")
      }
    }
  }

  private connect() {
    if (!this.enabled || this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return

    this.isConnecting = true
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || ""

    try {
      console.log(`Attempting to connect to WebSocket at ${wsUrl}`)
      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        console.log("WebSocket connection established")
        this.reconnectAttempts = 0
        this.isConnecting = false

        // Notify listeners about connection status
        this.notifyListeners("connection_status", true)

        // Authenticate the connection if needed
        const token = typeof window !== "undefined" ? localStorage.getItem("mizizzi_token") : null
        if (token) {
          this.send("authenticate", { token })
        }
      }

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          const { type, payload } = message

          if (this.listeners.has(type)) {
            this.listeners.get(type)?.forEach((callback) => callback(payload))
          }

          // Handle special message types
          if (type === "product_updated") {
            // Broadcast to all product listeners
            this.listeners.get("product")?.forEach((callback) => callback(payload))
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      this.socket.onclose = (event) => {
        this.isConnecting = false
        // Notify listeners about connection status
        this.notifyListeners("connection_status", false)

        if (event.code !== 1000) {
          // 1000 is normal closure
          console.warn(`WebSocket connection closed unexpectedly. Code: ${event.code}`)
          this.attemptReconnect()
        } else {
          console.log("WebSocket connection closed")
        }
      }

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error)
        this.isConnecting = false
        // Notify listeners about connection status
        this.notifyListeners("connection_status", false)
      }
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error)
      this.isConnecting = false
      this.attemptReconnect()
    }
  }

  private notifyListeners(type: string, data: any) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)?.forEach((callback) => callback(data))
    }
  }

  private attemptReconnect() {
    if (!this.enabled || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Maximum reconnection attempts reached or WebSocket disabled")
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  public subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.enabled) {
      console.log("WebSocket service is disabled, subscription ignored")
      return () => {}
    }

    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }

    this.listeners.get(type)?.add(callback)

    // If socket is closed or closing, try to reconnect
    if (this.socket?.readyState === WebSocket.CLOSED || this.socket?.readyState === WebSocket.CLOSING) {
      this.connect()
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback)
      if (this.listeners.get(type)?.size === 0) {
        this.listeners.delete(type)
      }
    }
  }

  public send(type: string, payload: any) {
    if (!this.enabled) {
      console.log("WebSocket service is disabled, message not sent")
      return
    }

    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not connected. Attempting to connect...")
      this.connect()
      // Queue the message to be sent when connection is established
      setTimeout(() => this.send(type, payload), 1000)
      return
    }

    try {
      const message = JSON.stringify({ type, payload })
      this.socket.send(message)
    } catch (error) {
      console.error("Error sending WebSocket message:", error)
    }
  }

  public close() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  // Method to check if WebSocket is enabled
  public isEnabled(): boolean {
    return this.enabled
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService()

