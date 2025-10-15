"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { generateSlug } from "@/lib/utils"
import { Loader } from "@/components/ui/loader"
import { useAdminAuth } from "@/contexts/admin/auth-context"

const productSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  slug: z.string().min(3, { message: "Slug must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  price: z.coerce.number().positive({ message: "Price must be positive" }),
  stock: z.coerce
    .number()
    .int({ message: "Stock must be an integer" })
    .nonnegative({ message: "Stock must be non-negative" }),
  category_id: z.coerce.number().positive({ message: "Please select a category" }),
  brand: z.string().optional(),
  sku: z.string().optional(),
  material: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

export default function NewProductPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: 0,
      stock: 0,
      category_id: 0,
      brand: "",
      sku: "",
      material: "",
    },
  })

  const { watch, setValue, handleSubmit } = form

  const name = watch("name")
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("name", e.target.value)
    if (e.target.value) {
      setValue("slug", generateSlug(e.target.value))
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return

      try {
        try {
          const categoriesResponse = await adminService.getCategories()
          setCategories(categoriesResponse.items || [])
          setIsLoadingCategories(false)
        } catch (error) {
          console.error("Error fetching categories:", error)
          setCategories([])
          setIsLoadingCategories(false)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [isAuthenticated])

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setIsSubmitting(true)

      const productData = {
        ...data,
        image_urls: [],
        thumbnail_url: undefined,
        variants: [],
        is_new: true,
        is_featured: false,
        is_sale: false,
        is_flash_sale: false,
        is_luxury_deal: false,
      }

      console.log("[v0] Creating product with data:", JSON.stringify(productData, null, 2))
      const response = await adminService.createProduct(productData)

      console.log("[v0] Product created successfully, full response:", JSON.stringify(response, null, 2))

      const productId = response?.id || response?.product?.id || response?.data?.id

      console.log("[v0] Extracted product ID:", productId)
      console.log("[v0] Product ID type:", typeof productId)

      if (!productId) {
        console.error("[v0] Failed to extract product ID from response:", response)
        throw new Error("Product created but no ID was returned from the server")
      }

      toast({
        title: "Success",
        description: "Product created successfully. You can now edit it to add more details.",
      })

      console.log("[v0] Redirecting to:", `/admin/products/${productId}/edit`)

      setTimeout(() => {
        router.push(`/admin/products/${productId}/edit`)
      }, 500)
    } catch (error) {
      console.error("Failed to create product:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create product. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8">
          <Loader />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/products")}
            className="mb-4 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New Product</h1>
              <p className="text-gray-500 mt-1">Add basic information to get started</p>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-semibold text-gray-900">Product Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          handleNameChange(e)
                        }}
                        placeholder="Enter product name"
                        className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-semibold text-gray-900">URL Slug</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="product-url-slug"
                        className="h-12 border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-gray-500">
                      Auto-generated from product name. Used in the product URL.
                    </FormDescription>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base font-semibold text-gray-900">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your product in detail..."
                        className="min-h-32 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl resize-none"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              {/* Category and Brand */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-semibold text-gray-900">Category</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number.parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {isLoadingCategories ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading...
                            </div>
                          ) : (
                            categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()} className="rounded-lg">
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-semibold text-gray-900">Brand (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nike, Adidas, etc."
                          className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl"
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-gray-500">Enter any brand name</FormDescription>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-semibold text-gray-900">Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base font-medium">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            placeholder="0.00"
                            className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl pl-8"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-semibold text-gray-900">Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          placeholder="0"
                          className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
              </div>

              {/* SKU and Material */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-semibold text-gray-900">SKU (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="PROD-001"
                          className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl font-mono text-sm"
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-gray-500">Stock Keeping Unit</FormDescription>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="material"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-semibold text-gray-900">Material (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Cotton, Leather, etc."
                          className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200 rounded-xl"
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-gray-500">
                        Enter the material of the product
                      </FormDescription>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold text-orange-900">Next steps:</span> After creating the product, you'll
                  be able to add images, variants, SEO details, and more advanced settings in the edit page.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/products")}
                  className="h-12 text-base rounded-xl border-gray-300 hover:bg-gray-50 transition-all duration-200 flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 text-base rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all duration-200 flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Product...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Create Product
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
