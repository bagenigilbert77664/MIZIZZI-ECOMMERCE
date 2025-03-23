/**
 * Utility functions for handling images
 */

/**
 * Checks if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Gets a placeholder image URL with specified dimensions
 */
export function getPlaceholderImage(width: number, height: number): string {
  return `/placeholder.svg?height=${height}&width=${width}`
}

/**
 * Ensures an image URL is valid, returning a placeholder if not
 */
export function getSafeImageUrl(url: string | undefined | null, width = 300, height = 300): string {
  if (!url || !isValidUrl(url)) {
    return getPlaceholderImage(width, height)
  }
  return url
}

/**
 * Creates a blur data URL for image placeholders
 */
export function createBlurDataURL(width = 100, height = 100, color = "eeeeee"): string {
  return `data:image/svg+xml;base64,${Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="#${color}"/></svg>`).toString("base64")}`
}

