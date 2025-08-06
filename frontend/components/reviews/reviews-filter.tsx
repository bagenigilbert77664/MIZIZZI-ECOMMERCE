"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FilterX } from "lucide-react"

interface ReviewsFilterProps {
  totalReviews: number
  onSortChange: (value: string) => void
  currentSort: string
  onFilterChange: (rating: number | null) => void
  currentFilter: number | null
}

export function ReviewsFilter({
  totalReviews,
  onSortChange,
  currentSort,
  onFilterChange,
  currentFilter,
}: ReviewsFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{totalReviews}</span> reviews
          {currentFilter !== null && (
            <>
              <span> filtered by </span>
              <Badge variant="outline" className="ml-1 font-normal">
                {currentFilter} Star{currentFilter !== 1 ? "s" : ""}
                <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 p-0" onClick={() => onFilterChange(null)}>
                  <FilterX className="h-3 w-3" />
                  <span className="sr-only">Clear filter</span>
                </Button>
              </Badge>
            </>
          )}
        </p>
      </div>

      <Select value={currentSort} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest First</SelectItem>
          <SelectItem value="oldest">Oldest First</SelectItem>
          <SelectItem value="highest">Highest Rated</SelectItem>
          <SelectItem value="lowest">Lowest Rated</SelectItem>
          <SelectItem value="helpful">Most Helpful</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

