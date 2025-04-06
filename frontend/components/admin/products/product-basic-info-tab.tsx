"use client"

import type React from "react"

import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Loader2, AlertCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateSlug } from "@/lib/utils"
import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "@/hooks/use-product-form"
import { useState } from "react"

interface ProductBasicInfoTabProps {
  form: UseFormReturn<ProductFormValues>
  categories: any[]
  brands: any[]
  isLoadingCategories: boolean
  isLoadingBrands: boolean
  brandError: boolean
  saveSectionChanges: (section: string) => Promise<boolean>
}

export function ProductBasicInfoTab({
  form,
  categories,
  brands,
  isLoadingCategories,
  isLoadingBrands,
  brandError,
  saveSectionChanges,
}: ProductBasicInfoTabProps) {
  const { setValue } = form
  const [isSaving, setIsSaving] = useState(false)

  // Handle name change to auto-generate slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("name", e.target.value)
    if (e.target.value) {
      setValue("slug", generateSlug(e.target.value))
    }
  }

  // Handle save button click
  const handleSave = async () => {
    setIsSaving(true)
    await saveSectionChanges("Basic Info")
    setIsSaving(false)
  }

  return (
    <Card className="border shadow-sm bg-white">
      <CardContent className="pt-6">
        <Form {...form}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} onChange={handleNameChange} className="h-11" />
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
                    <FormLabel className="text-base font-medium">Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="product-slug" {...field} className="h-11 font-mono text-sm" />
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
                    <FormLabel className="text-base font-medium">Category</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={isLoadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
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
                    <FormLabel className="text-base font-medium">Brand</FormLabel>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(value) => field.onChange(value ? Number(value) : null)}
                      disabled={isLoadingBrands}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
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
                      <div className="flex items-center mt-2 text-sm text-amber-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Warning: There was an issue loading brands. Only the current brand is shown.</span>
                      </div>
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
                    <FormLabel className="text-base font-medium">Material</FormLabel>
                    <FormControl>
                      <Input placeholder="Cotton, Polyester, etc." {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter product description"
                        className="min-h-[240px] resize-none"
                        {...field}
                      />
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
                    <FormLabel className="text-base font-medium">SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Stock Keeping Unit" {...field} className="h-11 font-mono text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-end border-t p-4 bg-gray-50">
        <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Basic Info
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

