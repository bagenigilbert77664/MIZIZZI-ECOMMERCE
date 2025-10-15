import type React from "react"

interface SafeRenderProps {
  data: any
  fallback?: React.ReactNode
  className?: string
}

/**
 * SafeRender component to prevent "Objects are not valid as a React child" errors
 * Safely renders objects by converting them to strings or showing fallback content
 */
export function SafeRender({ data, fallback = null, className }: SafeRenderProps) {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return <>{fallback}</>
  }

  // Handle primitives (string, number, boolean)
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return <span className={className}>{data}</span>
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return <span className={className}>{data.join(", ")}</span>
  }

  // Handle objects (including address objects)
  if (typeof data === "object") {
    // Special handling for address objects
    if (data.city && data.country && (data.street || data.address_line1)) {
      const addressParts = [
        data.street || data.address_line1,
        data.address_line2,
        data.city,
        data.state,
        data.postal_code || data.zipCode,
        data.country,
      ].filter(Boolean)

      return <span className={className}>{addressParts.join(", ")}</span>
    }

    // For other objects, try to extract meaningful information
    if (data.name) {
      return <span className={className}>{data.name}</span>
    }

    if (data.title) {
      return <span className={className}>{data.title}</span>
    }

    // Last resort: show object keys or fallback
    return <>{fallback || <span className={className}>[Object]</span>}</>
  }

  // Fallback for any other type
  return <>{fallback}</>
}

/**
 * Hook to safely format address objects for display
 */
export function useAddressFormatter() {
  const formatAddress = (address: any): string => {
    if (!address || typeof address !== "object") {
      return ""
    }

    const parts = [
      address.street || address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.postal_code || address.zipCode,
      address.country,
    ].filter(Boolean)

    return parts.join(", ")
  }

  const formatAddressLines = (address: any): string[] => {
    if (!address || typeof address !== "object") {
      return []
    }

    const lines = []

    if (address.street || address.address_line1) {
      lines.push(address.street || address.address_line1)
    }

    if (address.address_line2) {
      lines.push(address.address_line2)
    }

    const cityLine = [address.city, address.state, address.postal_code || address.zipCode].filter(Boolean).join(", ")

    if (cityLine) {
      lines.push(cityLine)
    }

    if (address.country) {
      lines.push(address.country)
    }

    return lines
  }

  return { formatAddress, formatAddressLines }
}
