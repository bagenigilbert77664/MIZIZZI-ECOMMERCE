/**
 * Enhanced Cloudinary service for frontend integration
 */

export interface CloudinaryUploadResponse {
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
  message?: string
}

export interface CloudinaryImageData {
  id?: number
  product_id?: number
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

class CloudinaryService {
  private baseUrl: string
  private cloudName: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    this.cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "da35rsdl0"
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
   * Upload multiple images for a product to Cloudinary
   */
  async uploadProductImages(
    productId: string | number,
    files: File[],
    options: {
      primaryIndex?: number
      altTextPrefix?: string
      onProgress?: (progress: number) => void
    } = {},
  ): Promise<{
    success: boolean
    uploaded_images: CloudinaryImageData[]
    errors: Array<{ file: string; error: string }>
    message: string
  }> {
    try {
      const { primaryIndex = 0, altTextPrefix, onProgress } = options

      const formData = new FormData()

      // Add files
      files.forEach((file, index) => {
        formData.append("images", file)
        // Add individual alt text if provided
        if (altTextPrefix) {
          formData.append(`alt_text_${index}`, `${altTextPrefix} - Image ${index + 1}`)
        }
      })

      // Add metadata
      formData.append("primary_index", primaryIndex.toString())
      formData.append("product_id", productId.toString())

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100)
            onProgress(progress)
          }
        })

        xhr.addEventListener("load", async () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } else {
              const errorResponse = JSON.parse(xhr.responseText)
              reject(new Error(errorResponse.error || `Upload failed with status: ${xhr.status}`))
            }
          } catch (error) {
            reject(new Error("Failed to parse response"))
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        // Set headers
        const headers = this.getAuthHeaders()
        Object.entries(headers).forEach(([key, value]) => {
          if (key !== "Accept") {
            // Don't set Accept header for FormData
            xhr.setRequestHeader(key, value as string)
          }
        })

        xhr.open("POST", `${this.baseUrl}/api/admin/products/${productId}/images/upload`)
        xhr.send(formData)
      })
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
    images: CloudinaryImageData[]
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
    image: CloudinaryImageData
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
   * Generate optimized Cloudinary URL
   */
  generateOptimizedUrl(
    publicId: string,
    options: {
      width?: number
      height?: number
      crop?: "fill" | "fit" | "scale" | "crop" | "thumb" | "limit"
      quality?: "auto" | number
      format?: "auto" | "jpg" | "png" | "webp"
      gravity?: "auto" | "face" | "center"
      effect?: string
    } = {},
  ): string {
    const { width, height, crop = "fill", quality = "auto", format = "auto", gravity = "auto", effect } = options

    // Build transformation string
    const transformations = []

    if (width || height) {
      let transform = `c_${crop}`
      if (width) transform += `,w_${width}`
      if (height) transform += `,h_${height}`
      if (gravity !== "auto") transform += `,g_${gravity}`
      transformations.push(transform)
    }

    transformations.push(`q_${quality}`)
    transformations.push(`f_${format}`)

    if (effect) {
      transformations.push(`e_${effect}`)
    }

    const transformString = transformations.join("/")

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformString}/${publicId}`
  }

  /**
   * Generate thumbnail URL
   */
  generateThumbnailUrl(publicId: string, size = 200): string {
    return this.generateOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: "thumb",
      gravity: "auto",
      quality: "auto",
      format: "auto",
    })
  }

  /**
   * Generate responsive image URLs
   */
  generateResponsiveUrls(publicId: string): {
    thumbnail: string
    small: string
    medium: string
    large: string
    original: string
  } {
    return {
      thumbnail: this.generateOptimizedUrl(publicId, { width: 150, height: 150, crop: "thumb" }),
      small: this.generateOptimizedUrl(publicId, { width: 300, height: 300, crop: "fit" }),
      medium: this.generateOptimizedUrl(publicId, { width: 600, height: 600, crop: "fit" }),
      large: this.generateOptimizedUrl(publicId, { width: 1200, height: 1200, crop: "fit" }),
      original: `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`,
    }
  }

  /**
   * Validate image file before upload
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.",
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

  /**
   * Compress image before upload (client-side)
   */
  async compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        // Draw and compress
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file) // Return original if compression fails
            }
          },
          file.type,
          quality,
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Handle potentially malformed image URLs and provide fallbacks
   */
  handleMalformedUrl(url: string | string[], productName?: string): string {
    try {
      // If it's an array (possibly malformed), try to reconstruct
      if (Array.isArray(url)) {
        if (url.length > 0 && typeof url[0] === "string" && url[0].length === 1) {
          // Malformed character array
          const reconstructed = url.join("")
          try {
            const parsed = JSON.parse(reconstructed)
            if (Array.isArray(parsed) && parsed.length > 0) {
              return this.generateOptimizedUrl(parsed[0])
            }
          } catch (e) {
            console.warn("Failed to reconstruct malformed URL")
          }
        } else if (url.length > 0 && typeof url[0] === "string") {
          // Normal array, take first item
          return this.generateOptimizedUrl(url[0])
        }
      }

      // If it's a string
      if (typeof url === "string") {
        if (url.startsWith("http")) {
          return url // Already a full URL
        } else if (url.trim() && !url.includes("{") && !url.includes("[")) {
          return this.generateOptimizedUrl(url) // Cloudinary public ID
        }
      }

      // Fallback to placeholder
      return `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(productName || "Product")}`
    } catch (error) {
      console.error("Error handling malformed URL:", error)
      return `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(productName || "Product")}`
    }
  }
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService()
export default cloudinaryService
