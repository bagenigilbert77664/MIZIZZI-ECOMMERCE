"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { motion, AnimatePresence } from "framer-motion"

interface DateRangePickerProps {
  dateRange: DateRange | { from: Date; to: Date }
  setDateRange: (range: DateRange) => void
  className?: string
  align?: "center" | "start" | "end"
  showLabel?: boolean
}

export function DateRangePicker({
  dateRange,
  setDateRange,
  className,
  align = "start",
  showLabel = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Predefined date ranges
  const predefinedRanges = [
    { label: "Today", days: 0 },
    { label: "Yesterday", days: 1 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "This month", type: "month" },
    { label: "Last month", type: "lastMonth" },
    { label: "This year", type: "year" },
  ]

  const handlePredefinedRange = (range: { label: string; days?: number; type?: string }) => {
    const today = new Date()
    let from: Date
    let to: Date = new Date()

    if (range.days !== undefined) {
      if (range.days === 0) {
        // Today
        from = new Date()
        from.setHours(0, 0, 0, 0)
      } else if (range.days === 1) {
        // Yesterday
        from = new Date()
        from.setDate(from.getDate() - 1)
        from.setHours(0, 0, 0, 0)
        to = new Date(from)
        to.setHours(23, 59, 59, 999)
      } else {
        // Last X days
        from = new Date()
        from.setDate(from.getDate() - range.days)
        from.setHours(0, 0, 0, 0)
      }
    } else if (range.type) {
      switch (range.type) {
        case "month":
          // This month
          from = new Date(today.getFullYear(), today.getMonth(), 1)
          to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          break
        case "lastMonth":
          // Last month
          from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          to = new Date(today.getFullYear(), today.getMonth(), 0)
          break
        case "year":
          // This year
          from = new Date(today.getFullYear(), 0, 1)
          to = new Date(today.getFullYear(), 11, 31)
          break
        default:
          from = new Date()
          from.setDate(from.getDate() - 30)
      }
    } else {
      // Default to last 30 days
      from = new Date()
      from.setDate(from.getDate() - 30)
    }

    setDateRange({ from, to })
    setIsOpen(false)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 opacity-50" />
          <span className="text-sm font-medium">Date Range</span>
        </div>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col sm:flex-row"
            >
              <div className="border-r p-2 sm:p-3 space-y-2 bg-muted/20">
                <p className="text-sm font-medium mb-2">Quick Select</p>
                {predefinedRanges.map((range) => (
                  <Button
                    key={range.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => handlePredefinedRange(range)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
              <div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range) {
                      setDateRange(range)
                    }
                  }}
                  numberOfMonths={2}
                  className="p-3"
                />
                <div className="flex items-center justify-end gap-2 p-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => setIsOpen(false)}>
                    Apply
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </PopoverContent>
      </Popover>
    </div>
  )
}
