import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, value, ...props }, ref) => {
  // Convert null values to empty strings to avoid React warnings
  const safeValue = value === null ? "" : value

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-cherry-100 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cherry-200 focus-visible:border-cherry-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
        className,
      )}
      ref={ref}
      value={safeValue}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }

