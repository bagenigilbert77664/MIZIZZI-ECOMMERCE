"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/socket-context"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProductUpdateIndicatorProps {
  productId: string | number
}

export const ProductUpdateIndicator: React.FC<ProductUpdateIndicatorProps> = ({ productId }) => {
  const { socket } = useSocket()
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    if (!socket) return

    const handleProductUpdate = (data: any) => {
      if (data.product_id.toString() === productId.toString()) {
        setLastUpdate(data.timestamp)
        setHasUpdate(true)

        // Reset the indicator after 5 seconds
        setTimeout(() => {
          setHasUpdate(false)
        }, 5000)
      }
    }

    socket.on("product_updated", handleProductUpdate)

    return () => {
      socket.off("product_updated", handleProductUpdate)
    }
  }, [socket, productId])

  if (!hasUpdate && !lastUpdate) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={hasUpdate ? "default" : "outline"} className={`ml-2 ${hasUpdate ? "animate-pulse" : ""}`}>
            {hasUpdate ? "Just Updated" : "Updated"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {lastUpdate ? (
            <p>Last updated: {new Date(lastUpdate).toLocaleString()}</p>
          ) : (
            <p>Product was recently updated</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

