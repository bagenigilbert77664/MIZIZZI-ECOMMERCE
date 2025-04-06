"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"

interface Product {
  id: string
  name: string
  slug: string
  thumbnail_url?: string
  total_quantity?: number
  total_sales?: number
  average_rating?: number
  review_count?: number
  stock?: number
}

interface ProductStatsProps {
  productStats: {
    top_selling: Product[]
    highest_rated: Product[]
    low_stock: Product[]
    out_of_stock: Product[]
  }
}

export function ProductsOverview({ productStats }: ProductStatsProps) {
  const router = useRouter()

  if (!productStats) {
    return <div className="text-center py-6 text-muted-foreground">No product statistics available</div>
  }

  return (
    <Tabs defaultValue="top_selling">
      <TabsList className="mb-4">
        <TabsTrigger value="top_selling">Top Selling</TabsTrigger>
        <TabsTrigger value="highest_rated">Highest Rated</TabsTrigger>
        <TabsTrigger value="low_stock">Low Stock</TabsTrigger>
        <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
      </TabsList>

      <TabsContent value="top_selling">
        <ProductTable
          products={productStats.top_selling}
          columns={["Product", "Quantity Sold", "Total Sales", "Actions"]}
          emptyMessage="No top selling products data available"
          renderRow={(product) => (
            <>
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
              <TableCell>{product.total_quantity || 0}</TableCell>
              <TableCell>${product.total_sales?.toFixed(2) || "0.00"}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/products/${product.id}`)}>
                  View
                </Button>
              </TableCell>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="highest_rated">
        <ProductTable
          products={productStats.highest_rated}
          columns={["Product", "Rating", "Reviews", "Actions"]}
          emptyMessage="No highest rated products data available"
          renderRow={(product) => (
            <>
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
                <div className="flex items-center">
                  {product.average_rating?.toFixed(1) || "0.0"}
                  <Star className="h-4 w-4 ml-1 fill-yellow-400 text-yellow-400" />
                </div>
              </TableCell>
              <TableCell>{product.review_count || 0}</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/products/${product.id}`)}>
                  View
                </Button>
              </TableCell>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="low_stock">
        <ProductTable
          products={productStats.low_stock}
          columns={["Product", "Stock", "Actions"]}
          emptyMessage="No low stock products data available"
          renderRow={(product) => (
            <>
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
                <Badge variant="default">{product.stock}</Badge>
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/products/${product.id}`)}>
                  Update Stock
                </Button>
              </TableCell>
            </>
          )}
        />
      </TabsContent>

      <TabsContent value="out_of_stock">
        <ProductTable
          products={productStats.out_of_stock}
          columns={["Product", "Status", "Actions"]}
          emptyMessage="No out of stock products data available"
          renderRow={(product) => (
            <>
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
                <Badge variant="destructive">Out of Stock</Badge>
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => router.push(`/admin/products/${product.id}`)}>
                  Update Stock
                </Button>
              </TableCell>
            </>
          )}
        />
      </TabsContent>
    </Tabs>
  )
}

interface ProductTableProps {
  products: Product[]
  columns: string[]
  emptyMessage: string
  renderRow: (product: Product) => React.ReactNode
}

function ProductTable({ products, columns, emptyMessage, renderRow }: ProductTableProps) {
  if (!products || products.length === 0) {
    return <div className="text-center py-6 text-muted-foreground">{emptyMessage}</div>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>{renderRow(product)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
