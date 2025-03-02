import axios from "axios"

// Create an axios instance with default configuration
const authAPI = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// Request interceptor to add the auth token
authAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("mizizzi_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor for token refresh
authAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/refresh")) {
      originalRequest._retry = true
      try {
        const response = await authAPI.post("/auth/refresh")
        const { access_token } = response.data
        localStorage.setItem("mizizzi_token", access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return authAPI(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem("mizizzi_token")
        localStorage.removeItem("mizizzi_user")
        window.location.href = "/auth/login"
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)

// Auth service methods
const authService = {
  register: async (userData: {
    name: string
    email: string
    password: string
    phone?: string
  }) => {
    try {
      const response = await authAPI.post("/auth/register", userData)
      return response.data
    } catch (error: any) {
      throw error.response?.data || error.message
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await authAPI.post("/auth/login", credentials)
      return response.data
    } catch (error: any) {
      throw error.response?.data || error.message
    }
  },

  logout: async () => {
    try {
      const response = await authAPI.post("/auth/logout")
      return response.data
    } catch (error: any) {
      throw error.response?.data || error.message
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await authAPI.get("/auth/me")
      return response.data
    } catch (error: any) {
      throw error.response?.data || error.message
    }
  },

  updateProfile: async (userData: any) => {
    try {
      const response = await authAPI.put("/auth/me", userData)
      return response.data
    } catch (error: any) {
      throw error.response?.data || error.message
    }
  },

  socialLogin: async (provider: string) => {
    try {
      const response = await authAPI.post("/auth/social-login", { provider })
      return response.data
    } catch (error: any) {
      throw error.response?.data || error.message
    }
  },
}

export default authService

