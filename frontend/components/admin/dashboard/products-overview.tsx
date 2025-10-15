"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Star, Package, AlertTriangle, Search, Plus } from "lucide-react"
import { motion } from "framer-motion"

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
    return (
      <div className="p-8 text-center">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No product data available</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
            Add products to your store to see statistics and performance metrics here.
          </p>
          <Button className="bg-cherry-600 hover:bg-cherry-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Add First Product
          </Button>
        </div>
      </div>
    )
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <Tabs defaultValue="top_selling">
      <div className="flex items-center justify-between mb-4">
        <TabsList className="bg-muted/30 p-1 rounded-xl">
          <TabsTrigger
            value="top_selling"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-cherry-400"
          >
            Top Selling
          </TabsTrigger>
          <TabsTrigger
            value="highest_rated"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-cherry-400"
          >
            Highest Rated
          </TabsTrigger>
          <TabsTrigger
            value="low_stock"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-cherry-400"
          >
            Low Stock
          </TabsTrigger>
          <TabsTrigger
            value="out_of_stock"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-cherry-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:text-cherry-400"
          >
            Out of Stock
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
          </Button>
          <Button size="sm" className="h-8 gap-1 bg-cherry-600 hover:bg-cherry-700">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Product</span>
          </Button>
        </div>
      </div>

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
                <Badge variant="destructive">{product.stock}</Badge>
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
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-lg">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{emptyMessage}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
          Add more products or wait for sales data to populate this section.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      className="overflow-x-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
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
            <motion.tr
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {renderRow(product)}
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  )
}
