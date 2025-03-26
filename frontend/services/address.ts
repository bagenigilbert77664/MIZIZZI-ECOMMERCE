import api from "@/lib/api"
import type { Address, AddressFormValues } from "@/types/address"

class AddressService {
  private logPrefix = "[AddressService]"

  private log(message: string, data?: any) {
    console.log(this.logPrefix, message, data ? data : "")
  }

  /**
   * Get all addresses for the current user
   */
  async getAddresses(): Promise<Address[]> {
    try {
      this.log("Fetching addresses...")
      const response = await api.get("/api/addresses")
      this.log("Addresses fetched successfully", response.data)
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
      this.log(`Fetching address ${id}...`)
      const response = await api.get(`/api/addresses/${id}`)
      this.log(`Address ${id} fetched successfully`, response.data)
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
      this.log("Fetching default address...")
      const response = await api.get("/api/addresses/default")
      this.log("Default address fetched successfully", response.data)
      return response.data
    } catch (error) {
      // Return null instead of throwing if no default address exists
      if (error instanceof Error && (error as any).response && (error as any).response.status === 404) {
        this.log("No default address found, returning null")
        return null
      }
      console.error("Error fetching default address:", error)
      return null // Return null instead of throwing to prevent UI errors
    }
  }

  /**
   * Create a new address
   */
  async createAddress(addressData: AddressFormValues): Promise<Address> {
    try {
      this.log("Creating new address...", addressData)
      const response = await api.post("/api/addresses", addressData)
      this.log("Address created successfully", response.data)
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
      this.log(`Updating address ${id}...`, addressData)
      const response = await api.put(`/api/addresses/${id}`, addressData)
      this.log(`Address ${id} updated successfully`, response.data)
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
      this.log(`Deleting address ${id}...`)
      await api.delete(`/api/addresses/${id}`)
      this.log(`Address ${id} deleted successfully`)
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
      this.log(`Setting address ${id} as default...`)
      const response = await api.post(`/api/addresses/${id}/set-default`)
      this.log(`Address ${id} set as default successfully`, response.data)
      return response.data.address
    } catch (error) {
      console.error(`Error setting address ${id} as default:`, error)
      throw error
    }
  }

  /**
   * Get or create a single address for checkout
   * This is a convenience method for the Jumia-style single address management
   */
  async getOrCreateCheckoutAddress(): Promise<Address | null> {
    try {
      this.log("Getting address for checkout...")
      // First try to get the default address
      const defaultAddress = await this.getDefaultAddress()
      if (defaultAddress) {
        this.log("Using default address for checkout", defaultAddress)
        return defaultAddress
      }

      // If no default address, try to get any address
      const addresses = await this.getAddresses().catch(() => [])
      if (addresses && addresses.length > 0) {
        this.log("Using first available address for checkout", addresses[0])
        return addresses[0]
      }

      // No addresses found
      this.log("No addresses found for checkout")
      return null
    } catch (error) {
      console.error("Error getting checkout address:", error)
      return null
    }
  }
}

export const addressService = new AddressService()

