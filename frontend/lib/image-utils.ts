/**
 * Utility functions for image handling
 */

// Generate a low quality image placeholder URL
export function generateLowQualityPlaceholder(originalUrl: string, width = 20, quality = 10): string {
  // If it's already a placeholder, return as is
  if (originalUrl.includes("/placeholder.svg")) {
    return originalUrl
  }

  // If it's a Next.js image URL, add quality and size parameters
  if (originalUrl.startsWith("/_next/image")) {
    const url = new URL(originalUrl, window.location.origin)
    url.searchParams.set("q", quality.toString())
    url.searchParams.set("w", width.toString())
    return url.toString()
  }

  // For external images, we can't generate a low quality version
  // Return the original URL
  return originalUrl
}

// Check if an image exists and is accessible
export async function checkImageExists(url: string): Promise<boolean> {
  if (!url) return false

  try {
    const response = await fetch(url, { method: "HEAD" })
    return response.ok
  } catch (error) {
    console.warn(`Failed to check if image exists: ${url}`, error)
    return false
  }
}

// Get image dimensions from a URL
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      })
    }
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`))
    }
    img.src = url
  })
}

// Convert a File or Blob to a data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error("Failed to convert file to data URL"))
    }
    reader.readAsDataURL(file)
  })
}

// Compress an image before upload
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    format?: "jpeg" | "png" | "webp"
  } = {},
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.8, format = "jpeg" } = options

  // Convert file to data URL
  const dataUrl = await fileToDataUrl(file)

  // Create an image element
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = dataUrl
  })

  // Calculate new dimensions while maintaining aspect ratio
  let width = img.width
  let height = img.height

  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  // Create a canvas and draw the resized image
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Failed to get canvas context")
  }

  ctx.drawImage(img, 0, 0, width, height)

  // Convert canvas to blob
  const mimeType = format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp"

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error("Failed to convert canvas to blob"))
        }
      },
      mimeType,
      quality,
    )
  })

  // Create a new file from the blob
  return new File([blob], file.name, {
    type: mimeType,
    lastModified: Date.now(),
  })
}
