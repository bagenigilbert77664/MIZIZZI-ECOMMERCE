"use client"

import { useState, useEffect } from "react"
import { AlertCircle, ThumbsUp, Filter, Star, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Review } from "@/types"

// Placeholder reviews for when API fails
const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    product_id: 1,
    user_id: 1,
    rating: 5,
    title: "Excellent product",
    comment: "This product exceeded my expectations. The quality is outstanding and it works perfectly.",
    is_verified_purchase: true,
    is_recommended: true,
    likes_count: 12,
    reviewer_name: "John Doe",
    user: {
      id: 1,
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      role: "customer",
      is_verified: true,
    },
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    product_id: 1,
    user_id: 2,
    rating: 4,
    title: "Very good, with minor issues",
    comment:
      "I'm quite happy with this purchase. It's well-made and functions as advertised. The only downside is that setup was a bit complex.",
    is_verified_purchase: true,
    is_recommended: true,
    reviewer_name: "Jane Smith",
    user: {
      id: 2,
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com",
      role: "customer",
      is_verified: true,
    },
    },
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    product_id: 1,
    user_id: 3,
    rating: 3,
    title: "Decent product for the price",
    comment:
      "It's an average product. Does what it says, but nothing special. For the price point, I'd say it's fair value.",
    is_verified_purchase: false,
    reviewer_name: "Robert Johnson",
    user: {
      id: 3,
      first_name: "Robert",
      last_name: "Johnson",
      email: "robert@example.com",
      role: "customer",
      is_verified: true,
    },
      is_verified: true,
    },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

interface ReviewCardProps {
  review: Review
}

function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(review.likes_count || 0)

  const isLongComment = (review.comment || "").length > 200
  const displayComment = expanded || !isLongComment ? review.comment : `${review.comment?.substring(0, 200)}...`

  function formatDate(dateString?: string) {
    if (!dateString) return "Unknown date"

    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date)
    } catch (error) {
      console.error("Error formatting date:", error)
      return "Invalid date"
    }
  }

  const handleLike = () => {
    if (!liked) {
      setLikesCount((prev) => prev + 1)
    } else {
      setLikesCount((prev) => Math.max(0, prev - 1))
    }
    setLiked(!liked)
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  }

  return (
    <div className="border-b pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 bg-orange-100 text-orange-800">
            <AvatarFallback>{getInitials(review.user?.first_name, review.user?.last_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-medium text-gray-800">
              {review.user?.first_name} {review.user?.last_name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={14}
                    className={`${
                      index < (review.rating || 0) ? "fill-cherry-800 text-cherry-800" : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">{formatDate(review.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {review.title && <h3 className="mt-3 font-medium text-gray-800">{review.title}</h3>}
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{displayComment}</p>

      {isLongComment && (
        <Button
          variant="link"
          className="mt-1 h-auto p-0 text-xs text-primary hover:text-secondary hover:no-underline flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Read more <ChevronDown size={14} />
            </>
          )}
        </Button>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {review.is_verified_purchase && (
            <Badge className="text-xs bg-green-50 text-green-700 border-green-200 rounded-sm font-normal">
              Verified Purchase
            </Badge>
          )}
          {review.is_recommended && (
            <Badge variant="outline" className="text-xs rounded-sm font-normal">
              Recommended
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 text-xs ${liked ? "text-primary" : "text-gray-600"}`}
          onClick={handleLike}
        >
          <ThumbsUp size={14} className={liked ? "fill-primary" : ""} />
          Helpful ({likesCount})
        </Button>
      </div>
    </div>
  )
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border-b pb-6 space-y-3 last:border-b-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-16 w-full" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface ReviewsSummaryProps {
  reviews: Review[]
  selectedRating: number | null
  onFilterByRating: (rating: number | null) => void
}

function ReviewsSummary({ reviews, selectedRating, onFilterByRating }: ReviewsSummaryProps) {
  // Calculate rating distribution
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let totalRating = 0

  reviews.forEach((review) => {
    const rating = review.rating || 0
    if (rating >= 1 && rating <= 5) {
      ratingCounts[rating as keyof typeof ratingCounts]++
      totalRating += rating
    }
  })

  const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : "0.0"

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-cherry-800 mb-4 flex items-center gap-2">
        <MessageSquare size={18} className="text-cherry-800" />
        Ratings & Reviews
      </h3>

      <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
        <div className="flex flex-col items-center justify-center p-4 bg-cherry-50 rounded-lg">
          <span className="text-5xl font-bold text-primary">{averageRating}</span>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                size={20}
                className={`${
                  index < Number.parseFloat(averageRating)
                    ? "fill-cherry-700 text-cherry-700"
                    : "fill-gray-200 text-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Based on {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingCounts[rating as keyof typeof ratingCounts]
            const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0

            return (
              <button
                key={rating}
                className={`w-full text-left hover:bg-cherry-50 rounded px-2 py-1 transition-colors ${
                  selectedRating === rating ? "bg-cherry-100" : ""
                }`}
                onClick={() => onFilterByRating(selectedRating === rating ? null : rating)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 min-w-[60px]">{rating} stars</span>
                  <Progress
                    value={percentage}
                    className="h-2 flex-1"
                    style={{
                      backgroundColor: "#f1f5f9",
                    }}
                  />
                  <span className="text-sm text-gray-500 min-w-[40px] text-right">{percentage}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface ReviewsFilterProps {
  sortBy: string
  onSortChange: (sort: string) => void
  reviewCount: number
}

function ReviewsFilter({ sortBy, onSortChange, reviewCount }: ReviewsFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-gray-50 p-3 rounded-lg">
      <h3 className="text-base font-medium text-gray-700">Customer Reviews ({reviewCount})</h3>
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-gray-500" />
        <Tabs value={sortBy} onValueChange={onSortChange} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger
              value="newest"
              className="text-xs data-[state=active]:bg-cherry-800 data-[state=active]:text-white"
            >
              Newest
            </TabsTrigger>
            <TabsTrigger
              value="highest"
              className="text-xs data-[state=active]:bg-cherry-800 data-[state=active]:text-white"
            >
              Highest
            </TabsTrigger>
            <TabsTrigger
              value="helpful"
              className="text-xs data-[state=active]:bg-cherry-800 data-[state=active]:text-white"
            >
              Helpful
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}

interface ReviewsSectionProps {
  productId: number
  initialReviews?: Review[]
}

export function ReviewsSection({ productId, initialReviews = [] }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [loading, setLoading] = useState(initialReviews.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("newest")
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const reviewsPerPage = 5

  // Only fetch reviews if we don't have initial reviews
  useEffect(() => {
    async function fetchReviews() {
      if (initialReviews.length > 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.example.com"
        const url = `${API_URL}/api/products/${productId}/reviews`

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch reviews: ${response.status}`)
        }

        const data = await response.json()
        setReviews(Array.isArray(data) ? data : MOCK_REVIEWS)
      } catch (err) {
        console.error("Error fetching reviews:", err)
        setError("We couldn't load the reviews. Using sample reviews instead.")
        setReviews(MOCK_REVIEWS)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [productId, initialReviews])

  // Filter and sort reviews
  const filteredReviews = selectedRating ? reviews.filter((review) => review.rating === selectedRating) : reviews

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    } else if (sortBy === "highest") {
      return (b.rating || 0) - (a.rating || 0)
    } else {
      // helpful
      return (b.likes_count || 0) - (a.likes_count || 0)
    }
  })

  // Calculate pagination
  const totalPages = Math.ceil(sortedReviews.length / reviewsPerPage)
  const paginatedReviews = sortedReviews.slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <ReviewsSummary reviews={reviews} selectedRating={selectedRating} onFilterByRating={setSelectedRating} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-6">
        {/* Filter */}
        <ReviewsFilter sortBy={sortBy} onSortChange={setSortBy} reviewCount={filteredReviews.length} />

        {/* Reviews List */}
        {loading ? (
          <ReviewsSkeleton />
        ) : paginatedReviews.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {paginatedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed p-8 text-center rounded-lg bg-gray-50">
            <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
            <h4 className="font-medium text-gray-700">No reviews match your filter</h4>
            {selectedRating && (
              <Button
                variant="link"
                className="mt-2 text-cherry-800 hover:text-cherry-700"
                onClick={() => setSelectedRating(null)}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="border-gray-300 text-gray-700"
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }).map((_, index) => (
              <Button
                key={index}
                variant={currentPage === index + 1 ? "default" : "outline"}
                size="sm"
                className={`w-8 ${
                  currentPage === index + 1
                    ? "bg-cherry-800 hover:bg-cherry-700 text-white border-cherry-800"
                    : "border-gray-300 text-gray-700"
                }`}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="border-gray-300 text-gray-700"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
