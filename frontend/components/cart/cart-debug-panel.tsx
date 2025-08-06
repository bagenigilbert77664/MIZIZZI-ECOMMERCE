"use client"

import { useState, useEffect } from "react"
import { useCart } from "@/contexts/cart/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Bug, Info } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface DebugInfo {
  timestamp: string
  operation: string
  status: "success" | "error" | "warning"
  details: any
}

export function CartDebugPanel() {
  const {
    cart,
    items,
    isLoading,
    error,
    validation,
    pendingOperations,
    refreshCart,
    validateCart,
    getPerformanceMetrics,
    resetPerformanceMetrics,
  } = useCart()

  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([])
  const [showRawData, setShowRawData] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)

  // Log cart operations
  useEffect(() => {
    const logOperation = (operation: string, status: "success" | "error" | "warning", details: any) => {
      setDebugLogs((prev) => [
        ...prev.slice(-9),
        {
          timestamp: new Date().toISOString(),
          operation,
          status,
          details,
        },
      ])
    }

    // Listen for cart events
    const handleCartUpdate = (event: CustomEvent) => {
      logOperation("cart_updated", "success", event.detail)
    }

    const handleCartError = (event: CustomEvent) => {
      logOperation("cart_error", "error", event.detail)
    }

    document.addEventListener("cart-updated", handleCartUpdate as EventListener)
    document.addEventListener("cart-error", handleCartError as EventListener)

    return () => {
      document.removeEventListener("cart-updated", handleCartUpdate as EventListener)
      document.removeEventListener("cart-error", handleCartError as EventListener)
    }
  }, [])

  // Update performance metrics
  useEffect(() => {
    const updateMetrics = () => {
      try {
        const metrics = getPerformanceMetrics()
        setPerformanceMetrics(metrics)
      } catch (error) {
        console.error("Error getting performance metrics:", error)
      }
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [getPerformanceMetrics])

  const handleValidateCart = async () => {
    try {
      const result = await validateCart()
      toast({
        title: "Cart Validation",
        description: result.is_valid ? "Cart is valid" : `Found ${result.errors.length} errors`,
        variant: result.is_valid ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate cart",
        variant: "destructive",
      })
    }
  }

  const handleRefreshCart = async () => {
    try {
      await refreshCart()
      toast({
        title: "Cart Refreshed",
        description: "Cart data has been refreshed from server",
      })
    } catch (error) {
      toast({
        title: "Refresh Error",
        description: "Failed to refresh cart",
        variant: "destructive",
      })
    }
  }

  const clearDebugLogs = () => {
    setDebugLogs([])
  }

  const resetMetrics = () => {
    resetPerformanceMetrics()
    setPerformanceMetrics(null)
    toast({
      title: "Metrics Reset",
      description: "Performance metrics have been reset",
    })
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Cart Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cart Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {isLoading ? (
                  <Badge variant="secondary">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Loading
                  </Badge>
                ) : error ? (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Items</span>
                <Badge variant="outline">{items.length}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Ops</span>
                <Badge variant={pendingOperations.size > 0 ? "secondary" : "outline"}>{pendingOperations.size}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Status */}
        {validation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Validation Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                {validation.is_valid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">{validation.is_valid ? "Valid" : `${validation.errors.length} errors`}</span>
              </div>

              {validation.errors.length > 0 && (
                <div className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error.message}
                    </div>
                  ))}
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      {warning.message}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        {performanceMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Performance Metrics
                <Button variant="outline" size="sm" onClick={resetMetrics}>
                  Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {(Array.from(performanceMetrics.entries()) as [string, any][]).map(([operation, metrics]) => (
                  <div key={operation} className="space-y-1">
                    <p className="font-medium">{operation}</p>
                    <div className="text-gray-600 space-y-0.5">
                      <p>Avg: {metrics.avg.toFixed(2)}ms</p>
                      <p>Min: {metrics.min.toFixed(2)}ms</p>
                      <p>Max: {metrics.max.toFixed(2)}ms</p>
                      <p>Count: {metrics.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleValidateCart}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Validate Cart
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshCart}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Cart
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowRawData(!showRawData)}>
            <Info className="h-4 w-4 mr-1" />
            {showRawData ? "Hide" : "Show"} Raw Data
          </Button>
          <Button variant="outline" size="sm" onClick={clearDebugLogs}>
            Clear Logs
          </Button>
        </div>

        {/* Raw Data Display */}
        {showRawData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Raw Cart Data</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-64">
                {JSON.stringify({ cart, items, validation }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Debug Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Debug Logs
              <Badge variant="outline">{debugLogs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-auto">
              {debugLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No logs yet</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="text-xs border rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{log.operation}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.status === "success" ? "default" : log.status === "error" ? "destructive" : "secondary"
                          }
                          className="text-xs"
                        >
                          {log.status}
                        </Badge>
                        <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <pre className="text-xs text-gray-600 bg-gray-50 p-1 rounded overflow-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Operations */}
        {pendingOperations.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pending Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Array.from(pendingOperations.keys()).map((operation, index) => (
                  <div key={index} className="text-xs bg-blue-50 p-2 rounded flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {operation}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
