"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ArrowLeft, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { reviewService } from "@/services/review-service"
import { useRouter } from "next/navigation"

interface ReviewFormSectionProps {
  productId: number
  productName: string
  productImage: string
  orderNumber: string
  onBack: () => void
}

export function ReviewFormSection({
  productId,
  productName,
  productImage,
  orderNumber,
  onBack,
}: ReviewFormSectionProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [title, setTitle] = useState("")
  const [userName, setUserName] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get user name from localStorage or user context
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserName(user.name || user.email || "")
      } catch (e) {
        console.error("[v0] Error parsing user data:", e)
      }
    }
  }, [])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError("Please select a rating")
      return
    }

    if (comment.length < 10) {
      setError("Review must be at least 10 characters long")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await reviewService.createReview(productId, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      })

      // Navigate back to reviews list
      onBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header with back button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Rate & Review</span>
        </button>
      </div>

      {/* Rating Section */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase mb-4">SELECT THE STARS TO RATE THE PRODUCT</h2>

        <div className="flex items-start gap-4">
          <img
            src={productImage || "/placeholder.svg"}
            alt={productName}
            className="h-20 w-20 object-cover rounded border"
          />
          <div className="flex-1">
            <h3 className="text-sm text-gray-800 mb-3">{productName}</h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`${
                      star <= (hoveredRating || rating)
                        ? "fill-[#8B1538] text-[#8B1538]"
                        : "fill-[#d4a5b0] text-[#d4a5b0]"
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Review Form */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase mb-6">LEAVE A REVIEW</h2>

        <form onSubmit={handleSubmitReview} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-xs text-gray-500 mb-2">
                Review Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. I like it! / I don't like it!"
                className="w-full"
                maxLength={200}
              />
            </div>
            <div>
              <label htmlFor="userName" className="block text-xs text-gray-500 mb-2">
                Your name
              </label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label htmlFor="comment" className="block text-xs text-gray-500 mb-2">
              Detailed Review
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your rating!"
              rows={6}
              className="w-full resize-none"
              maxLength={2000}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#8B1538] hover:bg-[#6d1029] text-white h-12 text-base font-medium"
          >
            {isSubmitting ? "Submitting your review..." : "Submit your review"}
          </Button>
        </form>
      </div>
    </div>
  )
}
