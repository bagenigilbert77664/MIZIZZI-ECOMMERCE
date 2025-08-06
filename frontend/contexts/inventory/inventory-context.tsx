"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import inventoryService, {
  type InventoryItem,
  type AvailabilityResponse,
  type CartValidationResponse,
} from "@/services/inventory-service"

interface InventoryContextType {
  checkAvailability: (productId: number, quantity?: number, variantId?: number) => Promise<AvailabilityResponse>
  validateCartItems: (
    items: Array<{ product_id: number; variant_id?: number; quantity: number }>,
  ) => Promise<CartValidationResponse>
  getProductInventory: (productId: number, variantId?: number) => Promise<InventoryItem | null>
  isLoading: boolean
  error: string | null
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function useInventory() {
  const context = useContext(InventoryContext)
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }
  return context
}

interface InventoryProviderProps {
  children: ReactNode
}

export function InventoryProvider({ children }: InventoryProviderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkAvailability = useCallback(
    async (productId: number, quantity = 1, variantId?: number): Promise<AvailabilityResponse> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await inventoryService.checkAvailability(productId, quantity, variantId)
        return response
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to check product availability"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const validateCartItems = useCallback(
    async (
      items: Array<{ product_id: number; variant_id?: number; quantity: number }>,
    ): Promise<CartValidationResponse> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await inventoryService.validateCartItems(items)
        return response
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to validate cart items"
        setError(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const getProductInventory = useCallback(
    async (productId: number, variantId?: number): Promise<InventoryItem | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await inventoryService.getProductInventory(productId, variantId)
        if (Array.isArray(response)) {
          return response.length > 0 ? response[0] : null
        }
        return response
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to get product inventory"
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const value = {
    checkAvailability,
    validateCartItems,
    getProductInventory,
    isLoading,
    error,
  }

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}
