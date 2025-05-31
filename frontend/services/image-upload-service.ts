/**
 * Image Upload Service for handling product image uploads
 */

interface UploadResponse {
  url: string
  filename: string
  size: number
}

interface UploadOptions {
  maxSizeMB?: number
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

export class ImageUploadService {
  private static instance: ImageUploadService
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  }

  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService()
    }
    return ImageUploadService.instance
  }

  /**
   * Upload a single image file
   */
  async uploadImage(file: File, productId?: string, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    try {
      // Validate file
      if (!file.type.startsWith("image/")) {
        throw new Error("File must be an image")
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error("File size must be less than 5MB")
      }

      // Create form data
      const formData = new FormData()
      formData.append("file", file) // Change from "image" to "file"
      if (productId) {
        formData.append("product_id", productId)
      }

      // Get auth token
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("Authentication required")
      }

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

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } catch (error) {
              reject(new Error("Invalid response format"))
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText)
              reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`))
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        xhr.addEventListener("timeout", () => {
          reject(new Error("Upload timeout"))
        })

        // Set timeout to 30 seconds
        xhr.timeout = 30000

        // Open request
        xhr.open("POST", `${this.baseUrl}/api/admin/upload/image`)

        // Set headers - DON'T set Content-Type for FormData, let browser set it
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)
        // Remove any Content-Type header setting for FormData uploads

        // Send request
        xhr.send(formData)
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      throw error
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: File[],
    productId?: string,
    onProgress?: (progress: number) => void,
  ): Promise<UploadResponse[]> {
    const results: UploadResponse[] = []
    const totalFiles = files.length
    let completedFiles = 0

    for (const file of files) {
      try {
        const result = await this.uploadImage(file, productId, (fileProgress) => {
          // Calculate overall progress
          const overallProgress = (completedFiles / totalFiles) * 100 + fileProgress / totalFiles
          if (onProgress) {
            onProgress(Math.round(overallProgress))
          }
        })

        results.push(result)
        completedFiles++

        if (onProgress) {
          onProgress(Math.round((completedFiles / totalFiles) * 100))
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        // Continue with other files even if one fails
        completedFiles++
      }
    }

    return results
  }

  /**
   * Delete an image
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${this.baseUrl}/api/admin/upload/image`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: imageUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete image")
      }

      return true
    } catch (error) {
      console.error("Error deleting image:", error)
      throw error
    }
  }

  /**
   * Compress image before upload
   */
  async compressImage(file: File, options: UploadOptions = {}): Promise<File> {
    const { maxSizeMB = 2, quality = 0.8, maxWidth = 1200, maxHeight = 1200 } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error("Failed to compress image"))
            }
          },
          file.type,
          quality,
        )
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })
  }
}

// Export singleton instance
export const imageUploadService = ImageUploadService.getInstance()
