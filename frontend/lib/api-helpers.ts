import type { AxiosResponse } from "axios"

/**
 * Handles API errors in a consistent way
 * @param error The error from the API call
 * @param defaultMessage Default message to show if no specific error message is available
 * @returns An object with error details
 */
export const handleApiError = (error: any, defaultMessage = "An error occurred") => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const status = error.response.status
    const data = error.response.data

    // Log the error details for debugging
    console.error(`API error ${status}:`, data)

    // Return structured error information
    return {
      status,
      message: data.error || data.message || defaultMessage,
      details: data.details || data,
      isServerError: status >= 500,
      isClientError: status >= 400 && status < 500,
      isAuthError: status === 401 || status === 403,
    }
  } else if (error.request) {
    // The request was made but no response was received
    console.error("API request error (no response):", error.request)
    return {
      status: 0,
      message: "No response from server. Please check your connection.",
      details: error.request,
      isNetworkError: true,
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
