import type { Address } from "@/types/address"
import { api } from "@/lib/api"

class AddressService {
  private baseUrl = "/api/addresses"
  private cache: { addresses?: Address[]; timestamp?: number } = {}
  private cacheTimeout = 30000 // 30 seconds cache validity

  constructor() {
    console.log("[AddressService] Initialized")
  }

  async getAddresses(params?: any): Promise<Address[]> {
    console.log("[AddressService] Fetching addresses from", this.baseUrl, params)
    try {
      // Check if we have a valid cache
      const now = Date.now()
      if (this.cache.addresses && this.cache.timestamp && now - this.cache.timestamp < this.cacheTimeout) {
        console.log("[AddressService] Using cached addresses data")
        return this.cache.addresses
      }

      const response = await api.get(this.baseUrl, { params })
      console.log("[AddressService] Raw API response", response)

      // Check if the response has the expected structure
      let addresses: Address[] = []
      if (response.data && response.data.items) {
        console.log("[AddressService] Response has items array", response.data.items.length)
        addresses = response.data.items
      } else {
        // If not, return the data directly (assuming it's an array)
        addresses = response.data
      }

      // Update cache
      this.cache.addresses = addresses
      this.cache.timestamp = now

      return addresses
    } catch (error) {
      console.log("[AddressService] Error fetching addresses", error)
      // If we have cached data, return it on error
      if (this.cache.addresses) {
        console.log("[AddressService] Returning cached addresses on error")
        return this.cache.addresses
      }
      throw error
    }
  }

  async getAddress(id: number): Promise<Address> {
    console.log("[AddressService] Fetching address", id)
    try {
      const response = await api.get(`${this.baseUrl}/${id}`)
      return response.data
    } catch (error) {
      console.log("[AddressService] Error fetching address", id, error)
      throw error
    }
  }

  async getDefaultAddress(): Promise<Address> {
    console.log("[AddressService] Fetching default address")
    try {
      const response = await api.get(`${this.baseUrl}/default`)
      return response.data
    } catch (error) {
      console.log("[AddressService] Error fetching default address", error)
      throw error
    }
  }

  async createAddress(addressData: Partial<Address>): Promise<Address> {
    console.log("[AddressService] Creating new address", addressData)
    try {
      // Check if user already has an address
      const existingAddresses = await this.getAddresses()

      if (existingAddresses.length > 0) {
        // If user already has an address, update it instead of creating a new one
        console.log("[AddressService] User already has an address, updating instead of creating")
        return this.updateAddress(existingAddresses[0].id, addressData)
      }

      // Ensure all required fields are present
      const requiredFields = ["first_name", "last_name", "address_line1", "city", "state", "postal_code", "country"]
      for (const field of requiredFields) {
        if (!addressData[field as keyof Partial<Address>]) {
          throw new Error(`Missing required field: ${field}`)
        }
      }

      // Format the data for the API - try with lowercase address type
      const formattedData = {
        first_name: addressData.first_name,
        last_name: addressData.last_name,
        address_line1: addressData.address_line1,
        address_line2: addressData.address_line2 || "",
        city: addressData.city,
        state: addressData.state,
        postal_code: addressData.postal_code,
        country: addressData.country,
        phone: addressData.phone || "",
        alternative_phone: addressData.alternative_phone || "",
        address_type: addressData.address_type ? addressData.address_type.toLowerCase() : "shipping",
        is_default: true, // Always set as default since we're only managing one address
      }

      console.log("[AddressService] Formatted address data for API", formattedData)

      try {
        // Make sure we're sending the data in the correct format
        const response = await api.post(this.baseUrl, formattedData)

        // Check if the response has the expected structure
        if (response.data && response.data.address) {
          return response.data.address
        }

        this.cache = {} // Invalidate cache
        return response.data
      } catch (apiError: any) {
        // Log detailed error information
        console.error("[AddressService] API Error Details:", {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data,
          message: apiError.message,
        })
        throw apiError
      }
    } catch (error) {
      console.log("[AddressService] Error in createAddress", error)
      throw error
    }
  }

  async updateAddress(id: number, addressData: Partial<Address>): Promise<Address> {
    console.log("[AddressService] Updating address", id, addressData)
    try {
      // Format the data for the API
      const formattedData: Record<string, any> = {
        ...addressData,
        is_default: true, // Always set as default since we're only managing one address
      }

      // Make sure address_type is lowercase
      if (formattedData.address_type) {
        formattedData.address_type = formattedData.address_type.toLowerCase()
      }

      const response = await api.put(`${this.baseUrl}/${id}`, formattedData)
      this.cache = {} // Invalidate cache
      return response.data.address
    } catch (error) {
      console.log("[AddressService] Error updating address", id, error)
      throw error
    }
  }

  async deleteAddress(id: number): Promise<void> {
    console.log("[AddressService] Deleting address", id)
    try {
      // Check if this is the only address
      const addresses = await this.getAddresses()
      if (addresses.length <= 1) {
        throw new Error("Cannot delete the only address. Please edit it instead.")
      }

      await api.delete(`${this.baseUrl}/${id}`)
      console.log("[AddressService] Address", id, "deleted successfully")
      this.cache = {} // Invalidate cache
    } catch (error) {
      console.log("[AddressService] Error deleting address", id, error)
      throw error
    }
  }

  async setDefaultAddress(id: number): Promise<Address> {
    console.log("[AddressService] Setting address", id, "as default")
    try {
      const response = await api.post(`${this.baseUrl}/${id}/set-default`)
      this.cache = {} // Invalidate cache
      return response.data.address
    } catch (error) {
      console.log("[AddressService] Error setting default address", id, error)
      throw error
    }
  }
}

// Create a singleton instance
export const addressService = new AddressService()

// Also export the class for testing or if multiple instances are needed
export default AddressService

