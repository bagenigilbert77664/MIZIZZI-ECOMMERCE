"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

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

  if (!products || products.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">No low stock products found</div>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  {product.thumbnail_url && (
                    <img
                      src={product.thumbnail_url || "/placeholder.svg"}
                      alt={product.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <span>{product.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={product.stock === 0 ? "destructive" : "outline"}>{product.stock}</Badge>
              </TableCell>
              <TableCell>${product.price?.toFixed(2) || "0.00"}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/products/${product.id}`)}>
                  Update
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

