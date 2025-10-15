import { WebSocketDebugger } from "@/components/debug/websocket-debugger"

export default function WebSocketDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">WebSocket Connection Debugger</h1>
      <WebSocketDebugger />
    </div>
  )
}
