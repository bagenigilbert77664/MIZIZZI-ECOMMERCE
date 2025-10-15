"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MenuProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Menu = React.forwardRef<HTMLDivElement, MenuProps>(
  ({ className, children, open, onOpenChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [mounted, setMounted] = React.useState(false)

    // Use useLayoutEffect to prevent hydration mismatch
    React.useLayoutEffect(() => {
      setMounted(true)
    }, [])

    // Sync controlled state with internal state
    React.useEffect(() => {
      if (typeof open !== "undefined") {
        setIsOpen(open)
      }
    }, [open])

    // Notify parent of changes
    const handleOpenChange = React.useCallback(
      (value: boolean) => {
        setIsOpen(value)
        onOpenChange?.(value)
      },
      [onOpenChange],
    )

    // Don't render menu content until mounted to prevent hydration mismatch
    if (!mounted) {
      return <div ref={ref} className={cn("relative", className)} {...props} />
    }

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child

          // Pass isOpen state to children if they accept it
          if (typeof child.type === "object" && "displayName" in child.type) {
            if (
              React.isValidElement(child) &&
              typeof child.type === "object" &&
              "displayName" in child.type &&
              (child.type as { displayName?: string }).displayName === "MenuItem"
            ) {
              return React.cloneElement(child as React.ReactElement, {
                onClick: (e: React.MouseEvent) => {
                  (child as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e)
                  handleOpenChange(false)
                },
              })
            }
          }
          return child
        })}
      </div>
    )
  },
)
Menu.displayName = "Menu"

interface MenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean
}

const MenuItem = React.forwardRef<HTMLDivElement, MenuItemProps>(({ className, children, disabled, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
MenuItem.displayName = "MenuItem"

export { Menu, MenuItem }
