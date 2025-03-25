import api from "@/lib/api"
import type { Address, AddressFormValues } from "@/types/address"

class AddressService {
  /**
   * Get all addresses for the current user
   */
  async getAddresses(): Promise<Address[]> {
    try {
      const response = await api.get("/addresses")
      return response.data.items || []
    } catch (error) {
      console.error("Error fetching addresses:", error)
      throw error
    }
  }

  /**
   * Get a specific address by ID
   */
  async getAddress(id: number): Promise<Address> {
    try {
      const response = await api.get(`/addresses/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching address ${id}:`, error)
      throw error
    }
  }

  /**
   * Get the default address for the current user
   */
  async getDefaultAddress(): Promise<Address | null> {
    try {
      const response = await api.get("/addresses/default")
      return response.data
    } catch (error) {
      console.error("Error fetching default address:", error)
      // Return null instead of throwing if no default address exists
      if (error instanceof Error && (error as any).response && (error as any).response.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Create a new address
   */
  async createAddress(addressData: AddressFormValues): Promise<Address> {
    try {
      const response = await api.post("/addresses", addressData)
      return response.data.address
    } catch (error) {
      console.error("Error creating address:", error)
      throw error
    }
  }

  /**
   * Update an existing address
   */
  async updateAddress(id: number, addressData: Partial<AddressFormValues>): Promise<Address> {
    try {
      const response = await api.put(`/addresses/${id}`, addressData)
      return response.data.address
    } catch (error) {
      console.error(`Error updating address ${id}:`, error)
      throw error
    }
  }

  /**
   * Delete an address
   */
  async deleteAddress(id: number): Promise<void> {
    try {
      await api.delete(`/addresses/${id}`)
    } catch (error) {
      console.error(`Error deleting address ${id}:`, error)
      throw error
    }
  }

  /**
   * Set an address as the default
   */
  async setDefaultAddress(id: number): Promise<Address> {
    try {
      const response = await api.post(`/addresses/${id}/set-default`)
      return response.data.address
    } catch (error) {
      console.error(`Error setting address ${id} as default:`, error)
      throw error
    }
  }
}

export const addressService = new AddressService()
