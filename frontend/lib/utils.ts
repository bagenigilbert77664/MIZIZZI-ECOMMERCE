import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes sensitive data for logging
 * @param data The data to sanitize
 * @param sensitiveKeys Keys to sanitize (default: password, token, secret)
 * @returns Sanitized data safe for logging
 */
export function sanitizeLog(data: any, sensitiveKeys: string[] = ["password", "token", "secret", "key"]): any {
  if (!data) return data

  // Handle primitive types
  if (typeof data !== "object") return data

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLog(item, sensitiveKeys))
  }

  // Handle objects
  const sanitized = { ...data }

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()

    // Check if this key should be sanitized
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
      if (typeof sanitized[key] === "string") {
        // Mask the value, showing only first and last character
        const value = sanitized[key]
        if (value.length > 2) {
          sanitized[key] = `${value.charAt(0)}***${value.charAt(value.length - 1)}`
        } else {
          sanitized[key] = "***"
        }
      } else {
        sanitized[key] = "***"
      }
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeLog(sanitized[key], sensitiveKeys)
    }
  }

  return sanitized
}

/**
 * Formats a price for display
 * @param price The price to format
 * @param currency The currency code (default: KES)
 * @returns Formatted price string
 */
export function formatPrice(price: number, currency = "KES"): string {
  if (price === undefined || price === null) return "N/A"

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Formats a currency value for display
 * @param amount The amount to format
 * @param currency The currency code (default: KES)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = "KES"): string {
  if (amount === undefined || amount === null) return "N/A"

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Truncates text to a specified length
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text

  return `${text.substring(0, maxLength)}...`
}

/**
 * Generates a random string ID
 * @param length Length of the ID (default: 8)
 * @returns Random string ID
 */
export function generateId(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

/**
 * Safely parses JSON with error handling
 * @param jsonString The JSON string to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.error("Failed to parse JSON:", error)
    return fallback
  }
}

/**
 * Debounces a function call
 * @param func The function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value The value to check
 * @returns True if the value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}
