"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Edit, Star, Check, ShoppingCart, Heart, Share2, Truck, ShieldCheck, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { Loader } from "@/components/ui/loader"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Separator } from "@/components/ui/separator"
import type { Product } from "@/types"

export default function ViewProductPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchProduct = async () => {
      if (!isAuthenticated) return

      setIsLoading(true)
      try {
        const productData = await adminService.getProduct(id)
        setProduct(productData)
      } catch (error) {
        console.error("Error fetching product:", error)
        toast({
          title: "Error",
          description: "Failed to load product data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id, isAuthenticated])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="text-xl font-semibold">Product not found</h2>
        <p className="text-muted-foreground">The product you're looking for doesn't exist or has been removed.</p>
        <Button className="mt-4" onClick={() => router.push("/admin/products")}>
          Back to Products
        </Button>
      </div>
    )
  }

  // Calculate discount percentage
  const discountPercentage =
    product.sale_price && product.price > product.sale_price
      ? Math.round(((product.price - product.sale_price) / product.price) * 100)
      : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">View Product</h1>
        </div>
        <Button onClick={() => router.push(`/admin/products/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Product
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Product Preview</CardTitle>
            <CardDescription>This is how your product appears to customers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-white shadow-sm mb-4">
              <Image
                src={(product.image_urls?.[0] ?? "/placeholder.svg?height=500&width=500")}
                alt={product.name}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {discountPercentage > 0 && (
                <Badge className="absolute left-4 top-4 bg-cherry-600 text-white border-0 px-2 py-1 rounded-sm">
                  -{discountPercentage}%
                </Badge>
              )}
              {product.is_sale && !discountPercentage && (
                <Badge className="absolute left-4 top-4 bg-cherry-600 text-white border-0 px-2 py-1 rounded-sm">
                  SALE
                </Badge>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 snap-x mb-4">
              {(product.image_urls ?? []).map((image: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-square w-16 flex-shrink-0 overflow-hidden rounded-md border snap-center"
                >
                  <Image
                    src={image || "/placeholder.svg?height=80&width=80"}
                    alt={`${product.name} - View ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-gray-600 font-normal">
                  {product.brand_id || "Mizizzi"}
                </Badge>
                {product.stock > 0 ? (
                  <Badge className="bg-green-100 text-green-800 border-0 text-xs font-normal">In Stock</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs font-normal">Out of Stock</Badge>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>

              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < 4 ? "fill-cherry-500 text-cherry-500" : "fill-gray-200 text-gray-200"}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">4.0 ({product.reviews?.length || 0} reviews)</span>
              </div>

              <div className="flex items-baseline gap-2 py-2">
                <span className="text-xl font-bold text-cherry-600">
                  KSh {(product.sale_price || product.price).toLocaleString()}
                </span>
                {product.sale_price && product.sale_price < product.price && (
                  <span className="text-sm text-gray-500 line-through">KSh {product.price.toLocaleString()}</span>
                )}
              </div>

              <p className="text-sm text-gray-700">{product.description}</p>

              <div className="flex gap-2 pt-4">
                <Button className="bg-cherry-600 hover:bg-cherry-700 text-white border-0" size="sm">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
                <Button variant="outline" size="sm" className="border-cherry-600 text-cherry-600 hover:bg-cherry-50">
                  <Heart className="mr-2 h-4 w-4" />
                  Add to Wishlist
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 border-gray-300">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>Detailed information about this product.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="visibility">Visibility</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Product Name</h3>
                    <p className="text-base">{product.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">SKU</h3>
                    <p className="text-base">{product.sku || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Category</h3>
                    <p className="text-base">
                      {typeof product.category === "object" && product.category !== null && "name" in product.category
                        ? (product.category as { name: string }).name
                        : (product.category as string) || "Uncategorized"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Brand</h3>
                    <p className="text-base">
                      {typeof product.brand === "object" && product.brand !== null && "name" in product.brand
                        ? product.brand.name
                        : (product.brand as unknown as string) || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="text-sm text-gray-700">{product.description}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Material</h3>
                    <p className="text-base">{product.material || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Weight</h3>
                    <p className="text-base">{product.weight ? `${product.weight} kg` : "N/A"}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Regular Price</h3>
                    <p className="text-base">KSh {product.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Sale Price</h3>
                    <p className="text-base">
                      {product.sale_price ? `KSh ${product.sale_price.toLocaleString()}` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Stock</h3>
                    <p className="text-base">
                      {product.stock > 0 ? (
                        <span className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-1" /> {product.stock} in stock
                        </span>
                      ) : (
                        <span className="text-red-500">Out of stock</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Discount</h3>
                    <p className="text-base">{discountPercentage > 0 ? `${discountPercentage}% off` : "No discount"}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Variants ({product.variants?.length || 0})</h3>
                  {product.variants && product.variants.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Color
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Size
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stock
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SKU
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {product.variants.map((variant) => (
                            <tr key={variant.id}>
                              <td className="px-4 py-2 text-sm">{variant.color || "-"}</td>
                              <td className="px-4 py-2 text-sm">{variant.size || "-"}</td>
                              <td className="px-4 py-2 text-sm">KSh {variant.price.toLocaleString()}</td>
                              <td className="px-4 py-2 text-sm">
                                {variant.stock > 0 ? variant.stock : <span className="text-red-500">Out of stock</span>}
                              </td>
                              <td className="px-4 py-2 text-sm">{variant.sku || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No variants for this product.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="visibility" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Featured</h3>
                    <p className="text-base">{product.is_featured ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">New Arrival</h3>
                    <p className="text-base">{product.is_new ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">On Sale</h3>
                    <p className="text-base">{product.is_sale ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Flash Sale</h3>
                    <p className="text-base">{product.is_flash_sale ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Luxury Deal</h3>
                    <p className="text-base">{product.is_luxury_deal ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                    <p className="text-base">
                      {product.created_at ? new Date(product.created_at).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">SEO Information</h3>
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500">Meta Title</h4>
                      <p className="text-sm">{product.meta_title || product.name || "No title provided"}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500">Meta Description</h4>
                      <p className="text-sm">
                        {product.meta_description || product.description || "No meta description provided."}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Free Delivery</p>
                    <p className="text-xs text-gray-500">Orders over KSh 10,000</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Authentic Products</p>
                    <p className="text-xs text-gray-500">100% Genuine Guarantee</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-cherry-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700">Easy Returns</p>
                    <p className="text-xs text-gray-500">14-Day Return Policy</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4 mt-4">
        <Button variant="outline" onClick={() => router.push("/admin/products")}>
          Back to Products
        </Button>
        <Button onClick={() => router.push(`/admin/products/${id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Product
        </Button>
      </div>
    </div>
  )
}
