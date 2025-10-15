import type { AxiosResponse } from "axios"

/**
 * Handles API errors in a consistent way
 * @param error The error from the API call
 * @param defaultMessage Default message to show if no specific error message is available
 * @returns An object with error details
 */
export const handleApiError = (error: any, defaultMessage = "An error occurred") => {
  if (error.name === "NetworkError") {
    console.error("Network error detected:", error.message)
    return {
      status: 0,
      message: error.message,
      details: error,
      isNetworkError: true,
      isBackendDown: error.message.includes("localhost:5000"),
    }
  }

  if (error.name === "CORSError") {
    console.error("CORS error detected:", error.message)
    return {
      status: 0,
      message: error.message,
      details: error,
      isCorsError: true,
    }
  }

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const status = error.response.status
    const data = error.response.data

    // Log the error details for debugging
    console.error(`API error ${status}:`, data)

    let message = defaultMessage
    if (data?.error) {
      message = data.error
    } else if (data?.message) {
      message = data.message
    } else if (status === 401) {
      message = "Authentication required. Please log in."
    } else if (status === 403) {
      message = "Access denied. You don't have permission to perform this action."
    } else if (status === 404) {
      message = "The requested resource was not found."
    } else if (status === 500) {
      message = "A server error occurred. Please try again later."
    }

    // Return structured error information
    return {
      status,
      message,
      details: data.details || data,
      isServerError: status >= 500,
      isClientError: status >= 400 && status < 500,
      isAuthError: status === 401 || status === 403,
      isNotFound: status === 404,
    }
  } else if (error.request) {
    // The request was made but no response was received
    console.error("API request error (no response):", error.request)

    const isNetworkError = error.code === "ERR_NETWORK" || error.message === "Network Error"
    const message = isNetworkError
      ? "Unable to connect to the server. Please check if the backend server is running on localhost:5000."
      : "No response from server. Please check your connection."

    return {
      status: 0,
      message,
      details: error.request,
      isNetworkError: true,
      isBackendDown: isNetworkError,
    }
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error("API setup error:", error.message)
    return {
      status: 0,
      message: error.message || defaultMessage,
      details: error,
      isSetupError: true,
    }
  }
}

/**
 * Formats API request data to match backend expectations
 * @param data The data to format
 * @returns Formatted data
 */
export const formatApiRequestData = (data: any) => {
  // Deep clone the data to avoid modifying the original
  const formattedData = JSON.parse(JSON.stringify(data))

  // Convert objects to JSON strings for fields that expect it
  if (formattedData.shipping_address && typeof formattedData.shipping_address === "object") {
    formattedData.shipping_address = JSON.stringify(formattedData.shipping_address)
  }

  if (formattedData.billing_address && typeof formattedData.billing_address === "object") {
    formattedData.billing_address = JSON.stringify(formattedData.billing_address)
  }

  return formattedData
}

/**
 * Parses API response data to handle common formats
 * @param response The API response
 * @returns Parsed data
 */
export const parseApiResponse = (response: AxiosResponse) => {
  const data = response.data

  // Handle different response formats
  if (data.data) {
    return data.data
  } else if (data.items) {
    return {
      items: data.items,
      pagination: data.pagination,
    }
  }

  return data
}

/**
 * Creates a user-friendly error message from an API error
 * @param error The error object from handleApiError
 * @returns A user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (error.isNetworkError && error.isBackendDown) {
    return "The server is currently unavailable. Please ensure the backend server is running and try again."
  }

  if (error.isCorsError) {
    return "There was a connection issue. Please refresh the page and try again."
  }

  if (error.isAuthError) {
    return "Your session has expired. Please log in again."
  }

  if (error.isServerError) {
    return "A server error occurred. Please try again in a few moments."
  }

  return error.message || "An unexpected error occurred. Please try again."
}

/**
 * Determines if an error should be shown to the user
 * @param error The error object from handleApiError
 * @returns Whether to show the error to the user
 */
export const shouldShowErrorToUser = (error: any): boolean => {
  // Don't show network errors for non-critical endpoints
  if (error.isNetworkError && !error.isBackendDown) {
    return false
  }

  // Don't show auth errors for optional endpoints like wishlist
  if (error.isAuthError && error.status === 401) {
    return false
  }

  // Show all other errors
  return true
}

/**
 * Logs errors appropriately based on their type
 * @param error The error object from handleApiError
 * @param context Additional context about where the error occurred
 */
export const logError = (error: any, context?: string) => {
  const prefix = context ? `[${context}]` : "[API]"

  if (error.isNetworkError) {
    console.warn(`${prefix} Network error:`, error.message)
  } else if (error.isCorsError) {
    console.warn(`${prefix} CORS error:`, error.message)
  } else if (error.isServerError) {
    console.error(`${prefix} Server error:`, error.message, error.details)
  } else if (error.isAuthError) {
    console.warn(`${prefix} Auth error:`, error.message)
  } else {
    console.error(`${prefix} Error:`, error.message, error.details)
  }
}

/**
 * Creates a safe API request wrapper that handles errors gracefully
 */
export const safeApiCall = async <T>(
  apiCall: () => Promise<AxiosResponse<T>>,
  fallbackData?: T,
  context?: string
)
: Promise<
{
  data: T | undefined
  error: any | null
}
> =>
{
  try {
    const response = await apiCall()
    return { data: parseApiResponse(response) as T, error: null }
  } catch (err: any) {
    const error = handleApiError(err)
    logError(error, context)
    return { data: fallbackData, error }
  }
}
