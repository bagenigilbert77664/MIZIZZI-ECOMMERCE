"use client"

import { Star } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ReviewsSummaryProps {
  averageRating: number
  totalReviews: number
  ratingCounts: Record<number, number>
  onFilterChange: (rating: number | null) => void
  currentFilter: number | null
}

export function ReviewsSummary({
  averageRating,
  totalReviews,
  ratingCounts,
  onFilterChange,
  currentFilter,
}: ReviewsSummaryProps) {
  // Format average rating to one decimal place
  const formattedRating = averageRating.toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl font-bold text-center min-w-[60px]">
          {formattedRating}
          <div className="flex justify-center mt-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200",
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Based on</p>
          <p className="font-medium">{totalReviews} reviews</p>
        </div>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingCounts[rating] || 0
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0

          return (
            <Button
              key={rating}
              variant="ghost"
              className={cn("w-full justify-start p-2 h-auto hover:bg-muted", currentFilter === rating && "bg-muted")}
              onClick={() => onFilterChange(currentFilter === rating ? null : rating)}
            >
              <div className="flex items-center w-full gap-2">
                <div className="flex items-center min-w-[40px]">
                  <span>{rating}</span>
                  <Star className="h-3 w-3 ml-1 fill-amber-400 text-amber-400" />
                </div>

                <Progress value={percentage} className="h-2 flex-1" />

                <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

