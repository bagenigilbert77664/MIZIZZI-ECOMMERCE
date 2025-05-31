import useSWR from "swr"
import fetcher from "@/lib/api"

export interface ProductImage {
  id: string
  product_id: string
  url: string
  filename?: string
  is_primary?: boolean
  sort_order?: number
  alt_text?: string
}

export interface ProductImagesResponse {
  success: boolean
  images: ProductImage[]
  total_count: number
  thumbnail_url?: string
}

export function useProductImages(productId: string | number | undefined) {
  // Convert productId to string and ensure it exists
  const key = productId ? `/api/admin/products/${productId}/images` : null

  const { data, error, isLoading, mutate } = useSWR<ProductImagesResponse>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    errorRetryCount: 2,
    onError: (error) => {
      console.error("Error fetching product images:", error)
    },
  })

  return {
    images: data?.images || [],
    thumbnailUrl: data?.thumbnail_url,
    totalCount: data?.total_count || 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

export function useBatchProductImages(productIds: string[]) {
  const key = productIds.length > 0 ? "/api/product-images/batch" : null

  const { data, error, isLoading } = useSWR(
    key,
    () =>
      fetcher(key!, {
        method: "POST",
        data: { product_ids: productIds },
        headers: { "Content-Type": "application/json" },
      }).then((res: any) => res.data),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  )

  return {
    batchImages: data?.images || {},
    isLoading,
    isError: !!error,
    error,
  }
}
