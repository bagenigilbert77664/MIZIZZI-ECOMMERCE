/**
 * Frontend service for handling Cloudinary image operations
 */

export interface CloudinaryUploadResult {
  success: boolean
  public_id?: string
  secure_url?: string
  url?: string
  thumbnail_url?: string
  width?: number
  height?: number
  format?: string
  bytes?: number
  error?: string
}

export interface ProductImageData {
  id: number
  product_id: number
  cloudinary_public_id: string
  url: string
  secure_url: string
  thumbnail_url?: string
  filename?: string
  alt_text?: string
  width?: number
  height?: number
  format?: string
  size_bytes?: number
  is_primary: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

class CloudinaryImageService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }
  }

  /**
   * Upload multiple images for a product
   */
  async uploadProductImages(
    productId: string | number,
    files: File[],
    primaryIndex = 0,
    altTextPrefix?: string,
  ): Promise<{
    success: boolean
    uploaded_images: ProductImageData[]
    errors: Array<{ file: string; error: string }>
    message: string
  }> {
    try {
      const formData = new FormData()

      // Add files
      files.forEach((file) => {
        formData.append("images", file)
      })

      // Add metadata
      formData.append("primary_index", primaryIndex.toString())
      if (altTextPrefix) {
        formData.append("alt_text", altTextPrefix)
      }

      const response = await fetch(`${this.baseUrl}/api/admin/products/${productId}/images/upload`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error uploading images:", error)
      throw error
    }
  }

  /**
   * Get all images for a product
   */
  async getProductImages(productId: string | number): Promise<{
    success: boolean
    images: ProductImageData[]
    total_count: number
    thumbnail_url?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/products/${productId}/images`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to get images: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error getting product images:", error)
      throw error
    }
  }

  /**
   * Delete a specific image
   */
  async deleteImage(imageId: number): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/images/${imageId}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Delete failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error deleting image:", error)
      throw error
    }
  }

  /**
   * Set an image as primary
   */
  async setPrimaryImage(imageId: number): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/images/${imageId}/primary`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to set primary: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error setting primary image:", error)
      throw error
    }
  }

  /**
   * Update image metadata
   */
  async updateImageMetadata(
    imageId: number,
    metadata: { alt_text?: string; sort_order?: number },
  ): Promise<{
    success: boolean
    message: string
    image: ProductImageData
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/images/${imageId}/metadata`, {
        method: "PUT",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Update failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error updating image metadata:", error)
      throw error
    }
  }

  /**
   * Reorder product images
   */
  async reorderImages(imageOrders: Array<{ id: number; sort_order: number }>): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/images/reorder`, {
        method: "PUT",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_orders: imageOrders }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Reorder failed with status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error reordering images:", error)
      throw error
    }
  }

  /**
   * Generate a transformed image URL
   */
  generateTransformedUrl(
    publicId: string,
    options: {
      width?: number
      height?: number
      crop?: "fill" | "fit" | "scale" | "crop"
      quality?: "auto" | number
      format?: "auto" | "jpg" | "png" | "webp"
    } = {},
  ): string {
    const { width, height, crop = "fill", quality = "auto", format = "auto" } = options

    // Build transformation string
    const transformations = []

    if (width || height) {
      let transform = `c_${crop}`
      if (width) transform += `,w_${width}`
      if (height) transform += `,h_${height}`
      transformations.push(transform)
    }

    transformations.push(`q_${quality}`)
    transformations.push(`f_${format}`)

    const transformString = transformations.join("/")

    // Note: Replace with your actual Cloudinary cloud name
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "your-cloud-name"

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`
  }

  /**
   * Validate image file before upload
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid file type. Please upload JPEG, PNG, or WebP images.",
      }
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: "File size too large. Please upload images smaller than 10MB.",
      }
    }

    return { valid: true }
  }

  /**
   * Batch validate multiple files
   */
  validateImageFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    files.forEach((file, index) => {
      const validation = this.validateImageFile(file)
      if (!validation.valid) {
        errors.push(`File ${index + 1} (${file.name}): ${validation.error}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Export singleton instance
export const cloudinaryImageService = new CloudinaryImageService()
