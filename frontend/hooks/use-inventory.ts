"use client"

import { useInventory as useInventoryContext } from "@/contexts/inventory/inventory-context"

// Re-export the hook for backward compatibility
export const useInventory = useInventoryContext

// Export default for convenience
export default useInventory
