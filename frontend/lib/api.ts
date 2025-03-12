import axios from "axios"

// Update the API_URL to use the base URL without /api
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

// Update the axios instance to handle API requests properly
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // This is important for cookies if you're using them
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("mizizzi_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Detailed error logging for debugging
    console.error("API Error:", error.message)
    if (error.response) {
      console.error("Status:", error.response.status)
      console.error("Data:", error.response.data)
      console.error("Headers:", error.response.headers)
    } else if (error.request) {
      console.error("No response received:", error.request)
    } else {
      console.error("Error during request setup:", error.message)
    }

    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem("mizizzi_refresh_token")
        if (!refreshToken) {
          throw new Error("No refresh token available")
        }

        const response = await api.post("/api/auth/refresh", {
          refresh_token: refreshToken,
        })

        const { access_token } = response.data
        localStorage.setItem("mizizzi_token", access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        // Clear auth state and redirect to login
        localStorage.removeItem("mizizzi_token")
        localStorage.removeItem("mizizzi_refresh_token")
        localStorage.removeItem("mizizzi_user")
        window.location.href = "/auth/login"
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api

