import React from "react"
/**
 * Utility functions for safely rendering data in React components
 */

/**
 * Safely converts any value to a string for React rendering
 */
export function safeStringify(value: any): string {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(safeStringify).join(", ")
  }

  if (typeof value === "object") {
    // Special handling for address objects
    if (value.city && value.country && (value.street || value.address_line1)) {
      return formatAddressObject(value)
    }

    // Handle other common object patterns
    if (value.name) return String(value.name)
    if (value.title) return String(value.title)
    if (value.label) return String(value.label)

    // Fallback: return object type indicator
    return "[Object]"
  }

  return String(value)
}

/**
 * Formats address objects into readable strings
 */
export function formatAddressObject(address: any): string {
  if (!address || typeof address !== "object") {
    return ""
  }

  const parts = [
    address.street || address.address_line1,
    address.address_line2,
    address.city,
    address.state || address.region,
    address.postal_code || address.zipCode || address.zip,
    address.country,
  ].filter(Boolean)

  return parts.join(", ")
}

/**
 * Safely renders any value in JSX
 */
export function renderSafely(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  // For objects and arrays, convert to safe string
  return safeStringify(value)
}

/**
 * Type guard to check if a value is a valid React child
 */
export function isValidReactChild(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    React.isValidElement(value)
  )
}
