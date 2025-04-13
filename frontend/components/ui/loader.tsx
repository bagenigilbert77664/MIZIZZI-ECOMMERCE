import type React from "react"
import { cn } from "@/lib/utils"

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  color?: "default" | "primary" | "secondary" | "accent"
}

export const Loader: React.FC<LoaderProps> = ({ size = "md", color = "default", className, ...props }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  }

  const colorClasses = {
    default: "border-muted-foreground/20 border-t-muted-foreground/60",
    primary: "border-muted-foreground/20 border-t-primary",
    secondary: "border-muted-foreground/20 border-t-secondary",
    accent: "border-muted-foreground/20 border-t-accent",
  }

  return (
    <div className={cn("animate-spin rounded-full", sizeClasses[size], colorClasses[color], className)} {...props} />
  )
}
