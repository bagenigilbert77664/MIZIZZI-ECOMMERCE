/**
 * Utility for safe logging that sanitizes sensitive data
 */

// Define types of data that should be sanitized
type SensitiveData = {
  email?: string
  name?: string
  password?: string
  phone?: string
  address?: string
  [key: string]: any
}

/**
 * Sanitize sensitive user data for logging
 * @param data Object containing potentially sensitive data
 * @returns Sanitized object safe for logging
 */
export function sanitizeForLogging(data: SensitiveData): any {
  if (!data) return null

  // Create a copy to avoid modifying the original
  const sanitized = { ...data }

  // Sanitize email
  if (sanitized.email) {
    const [username, domain] = sanitized.email.split("@")
    sanitized.email = username ? `${username.charAt(0)}***@${domain}` : "***@***"
  }

  // Sanitize name
  if (sanitized.name) {
    sanitized.name = `${sanitized.name.charAt(0)}***`
  }

  // Remove password completely
  if (sanitized.password) {
    sanitized.password = "********"
  }

  // Sanitize phone
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.replace(/\d(?=\d{4})/g, "*")
  }

  // Sanitize address
  if (sanitized.address) {
    sanitized.address = "*** (hidden)"
  }

  // Sanitize any nested objects
  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key])
    }
  })

  return sanitized
}

/**
 * Safe console logging that only works in development and sanitizes data
 */
export const logger = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(message, data ? sanitizeForLogging(data) : "")
    }
  },

  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(message, error ? sanitizeForLogging(error) : "")
    }
    // In production, you might want to send errors to a monitoring service
    // if (process.env.NODE_ENV === 'production') {
    //   // Send to error monitoring service
    // }
  },

  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(message, data ? sanitizeForLogging(data) : "")
    }
  },

  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.info(message, data ? sanitizeForLogging(data) : "")
    }
  },
}

