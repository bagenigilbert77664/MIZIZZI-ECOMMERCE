"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Star, ChevronDown, ChevronUp, ThumbsUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ReviewCardProps {
  review: {
    id?: number
    rating: number
    reviewer_name?: string
    user?: {
      id?: number
      name?: string
      first_name?: string
      last_name?: string
    }
    comment: string
    date?: string
    created_at?: string
    verified_purchase?: boolean
    is_verified_purchase?: boolean
    helpful_count?: number
    reviewer_avatar?: string
  }
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count || 0)
  const [markedHelpful, setMarkedHelpful] = useState(false)

  // Check if the review is long enough to need expansion
  const isLongReview = review.comment.length > 250
  const displayText = isLongReview && !expanded ? `${review.comment.substring(0, 250)}...` : review.comment

  const handleHelpfulClick = () => {
    if (!markedHelpful) {
      setHelpfulCount(helpfulCount + 1)
      setMarkedHelpful(true)
      // In a real app, you would send this to the server
    }
  }

  const getInitials = (user?: any, reviewerName?: string) => {
    // Try user object first (from backend API)
    if (user?.name) {
      const names = user.name.split(" ")
      return `${names[0]?.[0] || ""}${names[1]?.[0] || ""}`.toUpperCase()
    }
    if (user?.first_name || user?.last_name) {
      return `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase()
    }
    // Fallback to reviewer_name if available
    if (reviewerName) {
      const names = reviewerName.split(" ")
      return `${names[0]?.[0] || ""}${names[1]?.[0] || ""}`.toUpperCase()
    }
    return "U"
  }

  const getUserName = (user?: any, reviewerName?: string) => {
    // First try the user object from the backend API
    if (user?.name && user.name.trim()) {
      return user.name.trim()
    }
    // Try first_name + last_name combination
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`.trim()
    }
    // Just first name if available
    if (user?.first_name && user.first_name.trim()) {
      return user.first_name.trim()
    }
    // Fallback to reviewer_name prop if available
    if (reviewerName && reviewerName.trim() && reviewerName !== "Anonymous User") {
      return reviewerName.trim()
    }
    // Only show "Anonymous User" if no name data is available
    return "Anonymous User"
  }

  // Format date to relative time (e.g., "2 days ago")
  const formattedDate = () => {
    try {
      const dateString = review.created_at || review.date
      if (!dateString) return "recently"
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (error) {
      console.error("Error formatting date:", error)
      return "recently"
    }
  }

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={review.reviewer_avatar || "/placeholder.svg"}
            alt={getUserName(review.user, review.reviewer_name)}
          />
          <AvatarFallback>{getInitials(review.user, review.reviewer_name)}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-medium">{getUserName(review.user, review.reviewer_name)}</h4>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < review.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200",
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{formattedDate()}</span>
              </div>
            </div>

            {(review.verified_purchase || review.is_verified_purchase) && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">Verified Purchase</span>
            )}
          </div>

          <div className="mt-3">
            <p className="text-sm text-gray-700 whitespace-pre-line">{displayText}</p>

            {isLongReview && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-auto p-0 text-cherry-600 hover:text-cherry-700 hover:bg-transparent"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <span className="flex items-center">
                    Show less <ChevronUp className="ml-1 h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex items-center">
                    Read more <ChevronDown className="ml-1 h-4 w-4" />
                  </span>
                )}
              </Button>
            )}
          </div>

          <div className="mt-3 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className={cn("text-sm flex items-center gap-1", markedHelpful && "text-cherry-600")}
              onClick={handleHelpfulClick}
              disabled={markedHelpful}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>Helpful ({helpfulCount})</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
