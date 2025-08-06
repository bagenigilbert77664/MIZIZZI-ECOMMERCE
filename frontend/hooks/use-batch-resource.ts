"use client"

import { useState, useEffect } from "react"

interface BatchResourceOptions<T, R> {
  fetchFunction: (ids: T[]) => Promise<R[]>
  batchSize?: number
  retryCount?: number
  retryDelay?: number
  onProgress?: (loaded: number, total: number) => void
}

/**
 * Hook for efficiently loading resources in batches
 * @param ids Array of IDs to fetch
 * @param options Configuration options
 * @returns Object containing data, loading state, and error
 */
export function useBatchResource<T, R>(ids: T[], options: BatchResourceOptions<T, R>) {
  const [data, setData] = useState<R[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { fetchFunction, batchSize = 10, retryCount = 3, retryDelay = 1000, onProgress } = options

  useEffect(() => {
    if (!ids.length) {
      setLoading(false)
      return
    }

    let isMounted = true
    const results: R[] = []
    let loadedCount = 0

    const processBatch = async (batchIds: T[], currentRetry = 0): Promise<R[]> => {
      try {
        const batchResults = await fetchFunction(batchIds)
        return batchResults
      } catch (err) {
        if (currentRetry < retryCount) {
          console.warn(`Batch failed, retrying (${currentRetry + 1}/${retryCount})...`)
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
          return processBatch(batchIds, currentRetry + 1)
        }
        throw err
      }
    }

    const loadAllBatches = async () => {
      try {
        // Split IDs into batches
        const batches: T[][] = []
        for (let i = 0; i < ids.length; i += batchSize) {
          batches.push(ids.slice(i, i + batchSize))
        }

        // Process batches sequentially to avoid overwhelming the server
        for (let i = 0; i < batches.length; i++) {
          if (!isMounted) return

          const batchResults = await processBatch(batches[i])

          if (!isMounted) return

          results.push(...batchResults)
          loadedCount += batches[i].length

          if (onProgress && isMounted) {
            onProgress(loadedCount, ids.length)
          }

          // Update data incrementally
          if (isMounted) {
            setData([...results])
          }
        }

        if (isMounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error("Error loading batched resources:", err)
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      }
    }

    loadAllBatches()

    return () => {
      isMounted = false
    }
  }, [ids, fetchFunction, batchSize, retryCount, retryDelay, onProgress])

  return { data, loading, error }
}
