"use client"

import { useEffect, useState } from "react"
import { DotMatrixText } from "@/components/ui/dot-matrix-text"
import { cn } from "@/lib/utils"

interface DotMatrixBannerProps {
  text: string
  scrolling?: boolean
  speed?: "slow" | "medium" | "fast"
  className?: string
  color?: string
  size?: "sm" | "md" | "lg"
}

export function DotMatrixBanner({
  text,
  scrolling = true,
  speed = "medium",
  className,
  color = "text-green-500",
  size = "md",
}: DotMatrixBannerProps) {
  const [displayText, setDisplayText] = useState(text)

  // For scrolling text effect
  useEffect(() => {
    if (!scrolling) return

    const speedValues = {
      slow: 300,
      medium: 200,
      fast: 100,
    }

    const interval = setInterval(() => {
      setDisplayText((prev) => {
        const firstChar = prev.charAt(0)
        return prev.substring(1) + firstChar
      })
    }, speedValues[speed])

    return () => clearInterval(interval)
  }, [scrolling, speed, text])

  return (
    <div className={cn("overflow-hidden bg-black p-2 rounded-md", className)}>
      <DotMatrixText text={scrolling ? displayText : text} color={color} size={size} />
    </div>
  )
}

