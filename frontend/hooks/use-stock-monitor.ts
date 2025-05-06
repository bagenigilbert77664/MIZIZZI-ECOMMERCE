import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '@/services/inventory-service';

interface StockMonitorOptions {
  productId: number;
  variantId?: number;
  interval?: number; // Polling interval in milliseconds
  onStockChange?: (newStockLevel: number, previousStockLevel: number) => void;
  onLowStock?: (stockLevel: number, threshold: number) => void;
  onOutOfStock?: () => void;
}

export function useStockMonitor({
  productId,
  variantId,
  interval = 60000, // Default to checking every minute
  onStockChange,
  onLowStock,
  onOutOfStock
}: StockMonitorOptions) {
  const [stockLevel, setStockLevel] = useState<number | null>(null);
  const [previousStockLevel, setPreviousStockLevel] = useState<number | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLowStock, setIsLowStock] = useState<boolean>(false);
  const [isOutOfStock, setIsOutOfStock] = useState<boolean>(false);

  // Function to check stock level
  const checkStockLevel = useCallback(async () => {
    if (!productId) return;

    setIsLoading(true);
    setError(null);

    try {
      const inventoryData = await inventoryService.getProductInventory(productId, variantId);

      const item = Array.isArray(inventoryData) ? inventoryData[0] : inventoryData;

      if (item) {
        // Update previous stock level if we already had a value
        if (stockLevel !== null) {
          setPreviousStockLevel(stockLevel);
        }

        const newStockLevel = item.available_quantity;
        setStockLevel(newStockLevel);
        setLowStockThreshold(item.low_stock_threshold);

        // Check if low stock
        const isLow = newStockLevel <= item.low_stock_threshold && newStockLevel > 0;
        setIsLowStock(isLow);

        // Check if out of stock
        const isOut = newStockLevel <= 0;
        setIsOutOfStock(isOut);

        // Handle callbacks
        if (stockLevel !== null && newStockLevel !== stockLevel) {
          onStockChange?.(newStockLevel, stockLevel);
        }

        if (isLow) {
          onLowStock?.(newStockLevel, item.low_stock_threshold);
        }

        if (isOut) {
          onOutOfStock?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check stock level');
      console.error('Error checking stock level:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productId, variantId, stockLevel, onStockChange, onLowStock, onOutOfStock]);

  // Initial check
  useEffect(() => {
    checkStockLevel();
  }, [checkStockLevel]);

  // Setup polling interval
  useEffect(() => {
    if (!productId || interval <= 0) return;

    const timer = setInterval(checkStockLevel, interval);

    return () => {
      clearInterval(timer);
    };
  }, [productId, interval, checkStockLevel]);

  return {
    stockLevel,
    previousStockLevel,
    isLoading,
    error,
    isLowStock,
    isOutOfStock,
    lowStockThreshold,
    refreshStock: checkStockLevel
  };
}
