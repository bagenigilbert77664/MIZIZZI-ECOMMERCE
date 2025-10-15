"use client"

interface CloudinaryUploadResponse {
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

interface CloudinaryImageData {
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

interface CloudinaryError {
  message: string
  http_code: number
}

class CloudinaryService {
  private baseUrl: string
  private cloudName: string
  private uploadPreset: string
  private apiKey: string
  private apiSecret: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    this.cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ""
    this.uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ""
    this.apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || ""
    this.apiSecret = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || ""
  }

  private async generateSignature(params: Record<string, string | number>, timestamp: number): Promise<string> {
    // Create the parameters object including timestamp
    const allParams = { ...params, timestamp }

    // Sort parameters alphabetically and create query string (excluding signature and api_key)
    const sortedParams = Object.keys(allParams)
      .filter((key) => key !== "signature" && key !== "api_key")
      .sort()
      .map((key) => `${key}=${allParams[key]}`)
      .join("&")

    // The string to sign should be the sorted params + API secret
    const stringToSign = sortedParams + this.apiSecret

    console.log("[v0] String to sign:", stringToSign)
    console.log("[v0] API Secret (first 10 chars):", this.apiSecret.substring(0, 10) + "...")

    try {
      // Use SHA-1 hash (not HMAC) as per Cloudinary documentation
      const encoder = new TextEncoder()
      const data = encoder.encode(stringToSign)
      const hashBuffer = await crypto.subtle.digest("SHA-1", data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hexSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

      console.log("[v0] Generated signature:", hexSignature)
      return hexSignature
    } catch (error) {
      console.error("[v0] Failed to generate SHA-1 signature:", error)
      throw new Error("Failed to generate signature")
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }
  }

  async uploadImage(file: File): Promise<CloudinaryUploadResponse> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.error("Cloudinary configuration missing:", {
        cloudName: this.cloudName ? "✓" : "✗",
        apiKey: this.apiKey ? "✓" : "✗",
        apiSecret: this.apiSecret ? "✓" : "✗",
      })

      throw new Error(
        `Cloudinary configuration is missing. Please set the following environment variables in your .env.local file:\n        \nNEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name\nNEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key\nNEXT_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret\n\nTo get these values:\n1. Log into your Cloudinary dashboard (cloudinary.com)\n2. Go to Settings → API Keys\n3. Copy the Cloud Name, API Key, and API Secret\n\nAfter adding these variables, restart your development server.`,
      )
    }

    const timestamp = Math.round(Date.now() / 1000)
    const params = {
      timestamp: timestamp,
      folder: "mizizzi_products", // Optional: organize uploads in folders
    }

    const signature = await this.generateSignature(params, timestamp)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("api_key", this.apiKey)
    formData.append("timestamp", timestamp.toString())
    formData.append("signature", signature)
    formData.append("folder", "mizizzi_products")

    try {
      console.log("[v0] Uploading to Cloudinary with proper HMAC-SHA1 signature...")
      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = `Upload failed with status: ${response.status}`
        try {
          const errorData = await response.json()
          console.error("[v0] Cloudinary API error:", errorData)
          errorMessage = errorData.error?.message || errorData.message || errorMessage
        } catch (parseError) {
          console.error("[v0] Failed to parse Cloudinary error response:", parseError)
        }

        return {
          success: false,
          error: errorMessage,
          message: `Cloudinary upload failed: ${errorMessage}`,
        }
      }

      const result = await response.json()
      console.log("[v0] Cloudinary upload successful:", result.secure_url)
      return {
        success: true,
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      }
    } catch (error) {
      console.error("Cloudinary upload error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: "Network error during upload",
      }
    }
  }

  async uploadMultipleImages(files: File[]): Promise<CloudinaryUploadResponse[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file))
    return Promise.all(uploadPromises)
  }

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

  async uploadProductImage(
    productId: string | number,
    file: File,
    options: {
      altText?: string
      onProgress?: (progress: number) => void
    } = {},
  ): Promise<{
    success: boolean
    uploaded_image?: CloudinaryImageData
    error?: string
    message?: string
  }> {
    try {
      const { altText, onProgress } = options

      const formData = new FormData()
      formData.append("image", file)
      formData.append("product_id", productId.toString())
      if (altText) {
        formData.append("alt_text", altText)
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

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
            xhr.setRequestHeader(key, value as string)
          }
        })

        xhr.open("POST", `${this.baseUrl}/api/admin/products/${productId}/images/upload`)
        xhr.send(formData)
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      throw error
    }
  }

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

  async deleteImageFromCloudinary(publicId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      if (!this.cloudName || !this.apiKey || !this.apiSecret) {
        throw new Error("Cloudinary configuration is missing")
      }

      const timestamp = Math.round(Date.now() / 1000)
      const params = {
        public_id: publicId,
        timestamp: timestamp,
      }

      const signature = await this.generateSignature(params, timestamp)

      const formData = new FormData()
      formData.append("public_id", publicId)
      formData.append("api_key", this.apiKey)
      formData.append("timestamp", timestamp.toString())
      formData.append("signature", signature)

      console.log("[v0] Deleting from Cloudinary:", publicId)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Cloudinary delete error:", errorData)
        throw new Error(errorData.error?.message || `Delete failed with status: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] Cloudinary delete result:", result)

      return {
        success: result.result === "ok" || result.result === "not found",
        message:
          result.result === "ok"
            ? "Image deleted from Cloudinary"
            : result.result === "not found"
              ? "Image already deleted or not found in Cloudinary"
              : "Image not found in Cloudinary",
      }
    } catch (error) {
      console.error("Error deleting from Cloudinary:", error)
      throw error
    }
  }

  extractPublicIdFromUrl(url: string): string | null {
    try {
      // Handle different Cloudinary URL formats:
      // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image.jpg
      // https://res.cloudinary.com/cloud_name/image/upload/folder/image.jpg

      if (!url || !url.includes("cloudinary.com")) {
        return null
      }

      // Remove query parameters
      const urlWithoutParams = url.split("?")[0]

      // Split by /upload/ to get the part after it
      const parts = urlWithoutParams.split("/upload/")
      if (parts.length < 2) {
        return null
      }

      // Get everything after /upload/
      let publicIdPart = parts[1]

      // Remove version number if present (v1234567890/)
      publicIdPart = publicIdPart.replace(/^v\d+\//, "")

      // Remove file extension
      const lastDotIndex = publicIdPart.lastIndexOf(".")
      if (lastDotIndex > 0) {
        publicIdPart = publicIdPart.substring(0, lastDotIndex)
      }

      console.log("[v0] Extracted public_id:", publicIdPart, "from URL:", url)
      return publicIdPart
    } catch (error) {
      console.error("Error extracting public_id from URL:", error)
      return null
    }
  }

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
    if (publicId.startsWith("blob:")) {
      console.warn(`[v0] Blob URL detected in generateOptimizedUrl, returning as-is: ${publicId}`)
      return publicId
    }

    if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
      // If it's already a full URL, return as-is
      return publicId
    }

    if (!this.cloudName) {
      return "/placeholder.svg"
    }

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

  generateImageUrl(publicId: string, transformations?: string): string {
    if (publicId.startsWith("blob:")) {
      console.warn(`[v0] Blob URL detected in generateImageUrl, returning as-is: ${publicId}`)
      return publicId
    }

    if (publicId.startsWith("http://") || publicId.startsWith("https://")) {
      return publicId
    }

    if (!this.cloudName) {
      return "/placeholder.svg"
    }

    const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`

    if (transformations) {
      return `${baseUrl}/${transformations}/${publicId}`
    }

    return `${baseUrl}/${publicId}`
  }

  generateThumbnail(publicId: string, width = 300, height = 300): string {
    if (publicId.startsWith("blob:")) {
      console.warn(`[v0] Blob URL detected in generateThumbnail, returning placeholder`)
      return `/placeholder.svg?height=${height}&width=${width}`
    }

    return this.generateImageUrl(publicId, `w_${width},h_${height},c_fill,q_auto,f_auto`)
  }

  generateThumbnailUrl(publicId: string, size = 200): string {
    if (publicId.startsWith("blob:")) {
      console.warn(`[v0] Blob URL detected in generateThumbnailUrl, returning placeholder`)
      return `/placeholder.svg?height=${size}&width=${size}`
    }

    return this.generateOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: "thumb",
      gravity: "auto",
      quality: "auto",
      format: "auto",
    })
  }

  generateResponsiveUrls(publicId: string): {
    thumbnail: string
    small: string
    medium: string
    large: string
    original: string
  } {
    if (publicId.startsWith("blob:")) {
      console.warn(`[v0] Blob URL detected in generateResponsiveUrls, returning placeholders`)
      return {
        thumbnail: "/placeholder.svg?height=150&width=150",
        small: "/placeholder.svg?height=300&width=300",
        medium: "/placeholder.svg?height=600&width=600",
        large: "/placeholder.svg?height=1200&width=1200",
        original: "/placeholder.svg?height=1200&width=1200",
      }
    }

    return {
      thumbnail: this.generateOptimizedUrl(publicId, { width: 150, height: 150, crop: "thumb" }),
      small: this.generateOptimizedUrl(publicId, { width: 300, height: 300, crop: "fit" }),
      medium: this.generateOptimizedUrl(publicId, { width: 600, height: 600, crop: "fit" }),
      large: this.generateOptimizedUrl(publicId, { width: 1200, height: 1200, crop: "fit" }),
      original: `https://res.cloudinary.com/${this.cloudName}/image/upload/${publicId}`,
    }
  }

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
              const validUrls = parsed.filter((u: string) => !u.startsWith("blob:"))
              if (validUrls.length > 0) {
                return this.generateOptimizedUrl(validUrls[0])
              }
            }
          } catch (e) {
            console.warn("Failed to reconstruct malformed URL")
          }
        } else if (url.length > 0 && typeof url[0] === "string") {
          // Normal array, take first non-blob item
          const validUrl = url.find((u: string) => !u.startsWith("blob:"))
          if (validUrl) {
            return this.generateOptimizedUrl(validUrl)
          }
        }
      }

      // If it's a string
      if (typeof url === "string") {
        if (url.startsWith("blob:")) {
          console.warn(`[v0] Blob URL detected in handleMalformedUrl, returning placeholder`)
          return `/placeholder.svg?height=400&width=400&text=${encodeURIComponent(productName || "Product")}`
        }

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

export const cloudinaryService = new CloudinaryService()
export default cloudinaryService
