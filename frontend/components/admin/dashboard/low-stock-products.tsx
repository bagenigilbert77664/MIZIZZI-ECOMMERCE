"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package } from "lucide-react"
import { useMobile } from "@/styles/hooks/use-mobile"

interface Product {
  id: string
  name: string
  stock: number
  price: number
  sku?: string
  thumbnail_url?: string
}

interface LowStockProductsProps {
  products: Product[]
}

export function LowStockProducts({ products }: LowStockProductsProps) {
  const router = useRouter()
  const isMobile = useMobile()

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-gray-400 dark:text-gray-500">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No low stock products found</p>
          <p className="text-xs mt-2">All products are well-stocked</p>
        </div>
      </div>
    )
  }

  // Mobile-optimized card view
  if (isMobile) {
    return (
      <div className="space-y-3">
        {products.slice(0, 5).map((product) => (
          <div key={product.id} className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="p-3 flex items-center gap-3">
              {product.thumbnail_url ? (
                <img
                  src={product.thumbnail_url || "/placeholder.svg"}
                  alt={product.name}
                  className="h-12 w-12 rounded-md object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {product.sku ? `SKU: ${product.sku}` : `Price: $${product.price?.toFixed(2) || "0.00"}`}
                </div>
              </div>
              {product.stock === 0 ? (
                <Badge variant="destructive" className="justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {product.stock}
                </Badge>
              ) : product.stock <= 5 ? (
                <Badge variant="secondary" className="justify-center">
                  {product.stock}
                </Badge>
              ) : (
                <Badge variant="outline" className="justify-center">
                  {product.stock}
                </Badge>
              )}
            </div>
            <div className="p-2 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                className="w-full text-xs h-8"
              >
                Update Stock
              </Button>
            </div>
          </div>
        ))}
        {products.length > 5 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/products?filter=low_stock")}
              className="text-xs"
            >
              View all low stock products
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Product</TableHead>
            <TableHead className="w-[80px] text-center">Stock</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.slice(0, 5).map((product) => (
            <TableRow key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <TableCell className="font-medium">
                <div className="flex items-center space-x-3">
                  {product.thumbnail_url ? (
                    <img
                      src={product.thumbnail_url || "/placeholder.svg"}
                      alt={product.name}
                      className="h-9 w-9 rounded-md object-cover border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div className="truncate max-w-[180px] md:max-w-[240px]">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                    {product.sku && <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</div>}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {product.stock === 0 ? (
                  <Badge variant="destructive" className="w-full justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {product.stock}
                  </Badge>
                ) : product.stock <= 5 ? (
                  <Badge variant="secondary" className="w-full justify-center">
                    {product.stock}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-full justify-center">
                    {product.stock}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">${product.price?.toFixed(2) || "0.00"}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                  className="w-full text-xs h-8"
                >
                  Update
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {products.length > 5 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/products?filter=low_stock")}
            className="text-xs"
          >
            View all low stock products
          </Button>
        </div>
      )}
    </div>
  )
}
