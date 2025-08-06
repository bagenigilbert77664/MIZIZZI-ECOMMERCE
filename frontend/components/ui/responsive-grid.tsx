import type React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export function ResponsiveGrid({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = { xs: 4, sm: 4, md: 6, lg: 6, xl: 6 },
  className,
  ...props
}: ResponsiveGridProps) {
  // Convert columns to grid-template-columns
  const gridTemplateColumns = {
    xs: columns.xs ? `repeat(${columns.xs}, minmax(0, 1fr))` : undefined,
    sm: columns.sm ? `repeat(${columns.sm}, minmax(0, 1fr))` : undefined,
    md: columns.md ? `repeat(${columns.md}, minmax(0, 1fr))` : undefined,
    lg: columns.lg ? `repeat(${columns.lg}, minmax(0, 1fr))` : undefined,
    xl: columns.xl ? `repeat(${columns.xl}, minmax(0, 1fr))` : undefined,
  }

  // Convert gap to gap classes
  const gapClasses = {
    xs: gap.xs !== undefined ? `gap-${gap.xs}` : undefined,
    sm: gap.sm !== undefined ? `sm:gap-${gap.sm}` : undefined,
    md: gap.md !== undefined ? `md:gap-${gap.md}` : undefined,
    lg: gap.lg !== undefined ? `lg:gap-${gap.lg}` : undefined,
    xl: gap.xl !== undefined ? `xl:gap-${gap.xl}` : undefined,
  }

  return (
    <div
      className={cn(
        "grid",
        gridTemplateColumns.xs && `grid-cols-${columns.xs}`,
        gridTemplateColumns.sm && `sm:grid-cols-${columns.sm}`,
        gridTemplateColumns.md && `md:grid-cols-${columns.md}`,
        gridTemplateColumns.lg && `lg:grid-cols-${columns.lg}`,
        gridTemplateColumns.xl && `xl:grid-cols-${columns.xl}`,
        gapClasses.xs,
        gapClasses.sm,
        gapClasses.md,
        gapClasses.lg,
        gapClasses.xl,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

