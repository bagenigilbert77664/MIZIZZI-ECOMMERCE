/**
 * Review Service for handling review-related API calls
 * Provides methods for fetching, creating, updating, and deleting reviews
 */

interface Review {
  id: number
  user_id: number
  product_id: number
  rating: number
  title?: string
  comment: string
  is_verified_purchase: boolean
  created_at: string
  updated_at: string
  user?: {
    id: number
    name: string
    first_name?: string
    role: string
  }
  product?: {
    id: number
    name: string
    slug: string
  }
  likes_count?: number
}

interface ReviewSummary {
  total_reviews: number
  average_rating: number
  verified_reviews: number
  rating_distribution: {
    "5": number
    "4": number
    "3": number
    "2": number
    "1": number
  }
}

interface CreateReviewData {
  rating: number
  title?: string
  comment: string
}

interface UpdateReviewData {
  rating?: number
  title?: string
  comment?: string
}

interface PaginatedReviews {
  items: Review[]
  pagination: {
    page: number
    per_page: number
    total_pages: number
    total_items: number
  }
}

class ReviewService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/reviews/user${endpoint}`

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (typeof window !== "undefined") {
      // Try the correct token key first, then fallback to the old one
      const token = localStorage.getItem("mizizzi_token") || localStorage.getItem("access_token")
      if (token) {
        defaultHeaders.Authorization = `Bearer ${token}`
      }
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          // Token might be expired, try to refresh or redirect to login
          if (typeof window !== "undefined") {
            // Dispatch custom event for auth refresh
            window.dispatchEvent(new CustomEvent("auth-token-expired"))
          }
          throw new Error("Please sign in to continue")
        }

        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Review API request failed: ${endpoint}`, error)
      throw error
    }
  }

  /**
   * Get all reviews for a specific product (public endpoint)
   */
  async getProductReviews(
    productId: number,
    options: {
      page?: number
      per_page?: number
      rating?: number
      sort_by?: "created_at" | "updated_at" | "rating" | "id"
      sort_order?: "asc" | "desc"
      verified_only?: boolean
    } = {},
  ): Promise<PaginatedReviews> {
    const params = new URLSearchParams()

    if (options.page) params.append("page", options.page.toString())
    if (options.per_page) params.append("per_page", options.per_page.toString())
    if (options.rating) params.append("rating", options.rating.toString())
    if (options.sort_by) params.append("sort_by", options.sort_by)
    if (options.sort_order) params.append("sort_order", options.sort_order)
    if (options.verified_only) params.append("verified_only", "true")

    const queryString = params.toString()
    const endpoint = `/products/${productId}/reviews${queryString ? `?${queryString}` : ""}`

    return this.makeRequest<PaginatedReviews>(endpoint)
  }

  /**
   * Get review summary for a product (public endpoint)
   */
  async getProductReviewSummary(productId: number): Promise<ReviewSummary> {
    return this.makeRequest<ReviewSummary>(`/products/${productId}/reviews/summary`)
  }

  /**
   * Get a specific review by ID (public endpoint)
   */
  async getReview(reviewId: number): Promise<Review> {
    return this.makeRequest<Review>(`/reviews/${reviewId}`)
  }

  /**
   * Create a new review for a product (requires authentication)
   */
  async createReview(productId: number, reviewData: CreateReviewData): Promise<{ message: string; review: Review }> {
    return this.makeRequest<{ message: string; review: Review }>(`/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    })
  }

  /**
   * Update user's own review (requires authentication)
   */
  async updateReview(reviewId: number, reviewData: UpdateReviewData): Promise<{ message: string; review: Review }> {
    return this.makeRequest<{ message: string; review: Review }>(`/reviews/${reviewId}`, {
      method: "PUT",
      body: JSON.stringify(reviewData),
    })
  }

  /**
   * Delete user's own review (requires authentication)
   */
  async deleteReview(reviewId: number): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/reviews/${reviewId}`, {
      method: "DELETE",
    })
  }

  /**
   * Get current user's reviews (requires authentication)
   */
  async getMyReviews(
    options: {
      page?: number
      per_page?: number
      product_id?: number
      rating?: number
    } = {},
  ): Promise<PaginatedReviews> {
    const params = new URLSearchParams()

    if (options.page) params.append("page", options.page.toString())
    if (options.per_page) params.append("per_page", options.per_page.toString())
    if (options.product_id) params.append("product_id", options.product_id.toString())
    if (options.rating) params.append("rating", options.rating.toString())

    const queryString = params.toString()
    const endpoint = `/my-reviews${queryString ? `?${queryString}` : ""}`

    return this.makeRequest<PaginatedReviews>(endpoint)
  }

  /**
   * Mark a review as helpful (requires authentication)
   */
  async markReviewHelpful(reviewId: number): Promise<{ message: string; review_id: number }> {
    try {
      return await this.makeRequest<{ message: string; review_id: number }>(`/reviews/${reviewId}/helpful`, {
        method: "POST",
      })
    } catch (error: any) {
      if (error.message.includes("sign in") || error.message.includes("Authorization")) {
        throw new Error("Please sign in to mark reviews as helpful")
      }
      throw error
    }
  }

  /**
   * Check if user can review a product (helper method)
   */
  async canUserReviewProduct(productId: number): Promise<boolean> {
    try {
      // Try to get user's reviews for this product
      const myReviews = await this.getMyReviews({ product_id: productId, per_page: 1 })
      // If user already has a review for this product, they can't review again
      return myReviews.items.length === 0
    } catch (error) {
      // If not authenticated or other error, assume they can't review
      return false
    }
  }
}

// Export singleton instance
export const reviewService = new ReviewService()
export type { Review, ReviewSummary, CreateReviewData, UpdateReviewData, PaginatedReviews }
