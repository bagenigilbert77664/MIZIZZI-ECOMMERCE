"use client"

import { useAuth } from "@/contexts/auth/auth-context"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"

export function TokenMonitor() {
  const { token, tokenExpiry, refreshToken, isAuthenticated } = useAuth()
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!tokenExpiry) return

    const updateTimer = () => {
      const now = Date.now()
      const timeLeft = tokenExpiry - now
      setTimeUntilExpiry(Math.max(0, timeLeft))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [tokenExpiry])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshToken()
    } catch (error) {
      console.error("Manual refresh failed:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getStatusColor = () => {
    if (!timeUntilExpiry) return "secondary"
    if (timeUntilExpiry < 300000) return "destructive" // Less than 5 minutes
    if (timeUntilExpiry < 900000) return "default" // Less than 15 minutes
    return "default"
  }

  const getStatusIcon = () => {
    if (!isAuthenticated) return <AlertTriangle className="h-4 w-4" />
    if (!timeUntilExpiry || timeUntilExpiry < 300000) return <AlertTriangle className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          Token Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Authentication:</span>
          <Badge variant={isAuthenticated ? "default" : "destructive"}>{isAuthenticated ? "Active" : "Inactive"}</Badge>
        </div>

        {token && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Token:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {token.substring(0, 8)}...
            </Badge>
          </div>
        )}

        {timeUntilExpiry !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Expires in:</span>
            <Badge variant={getStatusColor()}>{formatTime(timeUntilExpiry)}</Badge>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Refresh Token:</span>
          <Badge variant={localStorage.getItem("mizizzi_refresh_token") ? "default" : "destructive"}>
            {localStorage.getItem("mizizzi_refresh_token") ? "Available" : "Missing"}
          </Badge>
        </div>

        <Button onClick={handleManualRefresh} disabled={isRefreshing || !isAuthenticated} size="sm" className="w-full">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Token"}
        </Button>

        {timeUntilExpiry !== null && timeUntilExpiry < 300000 && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
            ⚠️ Token expires soon! It will auto-refresh in the background.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
