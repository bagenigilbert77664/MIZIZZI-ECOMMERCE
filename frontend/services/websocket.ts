// WebSocket service for real-time updates
class WebSocketService {
  private socket: WebSocket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000 // 3 seconds
  private isConnecting = false

  constructor() {
    // Initialize connection when in browser environment
    if (typeof window !== "undefined") {
      this.connect()
    }
  }

  private connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return

    this.isConnecting = true
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://api.example.com/ws"

    try {
      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        console.log("WebSocket connection established")
        this.reconnectAttempts = 0
        this.isConnecting = false

        // Authenticate the connection if needed
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
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
      }
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error)
      this.isConnecting = false
      this.attemptReconnect()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Maximum reconnection attempts reached")
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  public subscribe(type: string, callback: (data: any) => void): () => void {
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
}

// Create a singleton instance
export const websocketService = new WebSocketService()

