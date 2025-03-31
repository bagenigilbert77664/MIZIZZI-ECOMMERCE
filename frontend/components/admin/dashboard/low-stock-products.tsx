import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface LowStockProductsProps {
  products: Array<{
    id: number
    name: string
    slug: string
    thumbnail_url: string
    stock: number
  }>
}

export function LowStockProducts({ products }: LowStockProductsProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                No low stock products
              </TableCell>
            </TableRow>
          ) : (
            products.slice(0, 5).map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {product.thumbnail_url ? (
                      <div className="h-10 w-10 overflow-hidden rounded-md">
                        <Image
                          src={product.thumbnail_url || "/placeholder.svg"}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-500">
                        No img
                      </div>
                    )}
                    <span className="line-clamp-1">{product.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                    {product.stock} left
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/products/${product.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

