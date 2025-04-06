"use client"

import type React from "react"

import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { generateSlug } from "@/lib/utils"
import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "@/hooks/use-product-form"

interface ProductBasicInfoTabProps {
  form: UseFormReturn<ProductFormValues>
  categories: any[]
  brands: any[]
  isLoadingCategories: boolean
  isLoadingBrands: boolean
  brandError: boolean
}

export function ProductBasicInfoTab({
  form,
  categories,
  brands,
  isLoadingCategories,
  isLoadingBrands,
  brandError,
}: ProductBasicInfoTabProps) {
  const { setValue } = form

  // Handle name change to auto-generate slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("name", e.target.value)
    if (e.target.value) {
      setValue("slug", generateSlug(e.target.value))
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} onChange={handleNameChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="product-slug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={isLoadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category">
                            {isLoadingCategories ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </div>
                            ) : (
                              "Select a category"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                      disabled={isLoadingBrands}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a brand">
                            {isLoadingBrands ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </div>
                            ) : (
                              "Select a brand"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {brandError && (
                      <p className="text-sm text-amber-600 mt-1">
                        Warning: There was an issue loading brands. Only the current brand is shown.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <FormControl>
                      <Input placeholder="Cotton, Polyester, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter product description" className="min-h-[200px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Stock Keeping Unit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  )
}
