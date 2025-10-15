"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AlertCircle, ThumbsUp, Filter, Star, MessageSquare, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { productService } from "@/services/product"
import type { Review } from "@/types"

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

  const getInitials = (user?: any) => {
    if (user?.name) {
      const names = user.name.split(" ")
      return `${names[0]?.[0] || ""}${names[1]?.[0] || ""}`.toUpperCase()
    }
    if (user?.first_name || user?.last_name) {
      return `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`.toUpperCase()
    }
    return "U"
  }

  const getUserName = (user?: any) => {
    if (user?.name && user.name.trim()) {
      return user.name.trim()
    }
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`.trim()
    }
    if (user?.first_name && user.first_name.trim()) {
      return user.first_name.trim()
    }
    return "Anonymous User"
  }

  return (
    <div className="border-b pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 bg-orange-100 text-orange-800">
            <AvatarFallback>{getInitials(review.user)}</AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-medium text-gray-800">{getUserName(review.user)}</h4>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={14}
                    className={`${
                      index < (review.rating || 0) ? "fill-cherry-700 text-cherry-700" : "fill-gray-200 text-gray-200"
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
  summary: any
  selectedRating: number | null
  onFilterByRating: (rating: number | null) => void
}

function ReviewsSummary({ summary, selectedRating, onFilterByRating }: ReviewsSummaryProps) {
  const averageRating = summary?.average_rating || 0
  const totalReviews = summary?.total_reviews || 0
  const ratingDistribution = summary?.rating_distribution || { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
        <MessageSquare size={18} className="text-primary" />
        Ratings & Reviews
      </h3>

      <div className="grid gap-6 md:grid-cols-[1fr,2fr]">
        <div className="flex flex-col items-center justify-center p-4 bg-cherry-50 rounded-lg">
          <span className="text-5xl font-bold text-primary">{averageRating.toFixed(1)}</span>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                size={20}
                className={`${
                  index < averageRating ? "fill-cherry-700 text-cherry-700" : "fill-gray-200 text-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating.toString()] || 0
            const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0

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
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Newest
            </TabsTrigger>
            <TabsTrigger
              value="highest"
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Highest
            </TabsTrigger>
            <TabsTrigger
              value="helpful"
              className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
            >
              Helpful
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}

interface ReviewFormProps {
  productId: number
  onReviewSubmitted: () => void
}

function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError("Please select a rating")
      return
    }

    if (comment.length < 10) {
      setError("Comment must be at least 10 characters long")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await productService.createReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      })

      // Reset form
      setRating(0)
      setTitle("")
      setComment("")
      setIsOpen(false)
      onReviewSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-secondary text-white">
          <Plus size={16} className="mr-2" />
          Write a Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rating">Rating *</Label>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <button key={index} type="button" onClick={() => setRating(index + 1)} className="p-1">
                  <Star
                    size={24}
                    className={`${
                      index < rating ? "fill-cherry-700 text-cherry-700" : "fill-gray-200 text-gray-200"
                    } hover:fill-cherry-500 hover:text-cherry-500 transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your review"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="comment">Review *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this product..."
              rows={4}
              maxLength={2000}
              required
            />
            <div className="text-xs text-gray-500 mt-1">{comment.length}/2000 characters (minimum 10)</div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ReviewsSectionProps {
  productId: number
  initialReviews?: Review[]
}

export function ReviewsSection({ productId, initialReviews = [] }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("newest")
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const reviewsPerPage = 5

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)

      const [reviewsData, summaryData] = await Promise.all([
        productService.getProductReviews(productId),
        productService.getProductReviewSummary(productId),
      ])

      setReviews(reviewsData)
      setSummary(summaryData)
    } catch (err) {
      console.error("Error fetching reviews:", err)
      setError("Failed to load reviews. Please try again later.")
      setReviews([])
      setSummary({
        total_reviews: 0,
        average_rating: 0,
        verified_reviews: 0,
        rating_distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [productId])

  const handleReviewSubmitted = () => {
    fetchReviews() // Refresh reviews after submission
  }

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
      {summary && (
        <ReviewsSummary summary={summary} selectedRating={selectedRating} onFilterByRating={setSelectedRating} />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-6">
        {/* Filter and Add Review Button */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-gray-50 p-3 rounded-lg">
          <h3 className="text-base font-medium text-gray-700">Customer Reviews ({filteredReviews.length})</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <Tabs value={sortBy} onValueChange={setSortBy} className="w-[200px]">
                <TabsList className="grid w-full grid-cols-3 bg-white">
                  <TabsTrigger
                    value="newest"
                    className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    Newest
                  </TabsTrigger>
                  <TabsTrigger
                    value="highest"
                    className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    Highest
                  </TabsTrigger>
                  <TabsTrigger
                    value="helpful"
                    className="text-xs data-[state=active]:bg-primary data-[state=active]:text-white"
                  >
                    Helpful
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <ReviewForm productId={productId} onReviewSubmitted={handleReviewSubmitted} />
          </div>
        </div>

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
            <h4 className="font-medium text-gray-700">
              {selectedRating ? "No reviews match your filter" : "No reviews yet"}
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              {selectedRating ? "Try selecting a different rating filter." : "Be the first to write a review!"}
            </p>
            {selectedRating && (
              <Button
                variant="link"
                className="mt-2 text-primary hover:text-secondary"
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
                    ? "bg-primary hover:bg-secondary text-white border-primary"
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
