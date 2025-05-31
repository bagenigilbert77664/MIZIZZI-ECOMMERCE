"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-cherry-600 text-white hover:bg-cherry-700 shadow-md transition-all duration-200",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-cherry-600 bg-background hover:bg-cherry-50 hover:text-cherry-800 transition-all duration-200",
        ghost: "hover:bg-cherry-50 hover:text-cherry-800 transition-all duration-200",
        link: "text-cherry-700 underline-offset-4 hover:underline",
        premium:
          "bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:from-gold-600 hover:to-gold-700 shadow-md transition-all duration-200 hover:shadow-lg border border-gold-300",
        jumia: "bg-cherry-600 text-white hover:bg-cherry-700 rounded-md font-medium transition-all duration-200",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-md px-4",
        lg: "h-14 rounded-md px-8 text-lg",
        icon: "h-12 w-12",
        jumia: "h-12 px-6 py-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
