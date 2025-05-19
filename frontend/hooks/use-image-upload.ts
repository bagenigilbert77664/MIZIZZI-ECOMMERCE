"use client"

import { useState, useCallback } from "react"

interface UseImageUploadOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  quality?: number
  autoRetry?: boolean
  maxRetries?: number
}

interface UseImageUploadResult {
  uploadImage: (file: File) => Promise<string>
  isUploading: boolean
  progress: number
  error: Error | null
  reset: () => void
}

type UploadFunction = (file: File, onProgress?: (progress: number) => void) => Promise<string>

/**
 * Hook for handling image uploads with compression and progress tracking
 * @param uploadFn Function that handles the actual upload
 * @param options Configuration options
 * @returns Object with upload state and functions
 */
export function useImageUpload(uploadFn: UploadFunction, options: UseImageUploadOptions = {}): UseImageUploadResult {
  const { maxSizeMB = 1, maxWidthOrHeight = 1920, quality = 0.8, autoRetry = true, maxRetries = 3 } = options

  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Reset the upload state
  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
    setRetryCount(0)
  }, [])

  // Compress the image before uploading
  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      try {
        // Import the compression library dynamically
        const imageCompression = (await import("browser-image-compression")).default

        // Compress the image
        const compressedFile = await imageCompression(file, {
          maxSizeMB,
          maxWidthOrHeight,
          useWebWorker: true,
          fileType: file.type,
          initialQuality: quality,
        })

        console.log(
          `Original file size: ${(file.size / 1024 / 1024).toFixed(2)}MB, ` +
            `Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
        )

        return compressedFile
      } catch (err) {
        console.warn("Image compression failed, using original file:", err)
        return file
      }
    },
    [maxSizeMB, maxWidthOrHeight, quality],
  )

  // Upload the image with progress tracking
  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      try {
        setIsUploading(true)
        setProgress(0)
        setError(null)

        // Compress the image
        const compressedFile = await compressImage(file)

        // Track upload progress
        const onProgress = (progressPercent: number) => {
          setProgress(progressPercent)
        }

        // Upload the compressed file
        const url = await uploadFn(compressedFile, onProgress)
        setProgress(100)
        setIsUploading(false)
        return url
      } catch (err) {
        // Handle upload error
        const error = err instanceof Error ? err : new Error(String(err))

        // Retry logic
        if (autoRetry && retryCount < maxRetries) {
          console.warn(`Upload failed, retrying (${retryCount + 1}/${maxRetries}):`, error)
          setRetryCount((prev) => prev + 1)

          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000
          await new Promise((resolve) => setTimeout(resolve, delay))

          return uploadImage(file)
        }

        setError(error)
        setIsUploading(false)
        throw error
      }
    },
    [uploadFn, compressImage, autoRetry, maxRetries, retryCount],
  )

  return {
    uploadImage,
    isUploading,
    progress,
    error,
    reset,
  }
}
