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
import type { ProductFormValues } from "@/styles/hooks/use-product-form"
import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"

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
  const { setValue, watch } = form
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Watch for form changes to enable auto-save
  const name = watch("name")
  const slug = watch("slug")
  const description = watch("description")
  const category_id = watch("category_id")
  const brand_id = watch("brand_id")
  const material = watch("material")
  const sku = watch("sku")

  // Handle name change to auto-generate slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setValue("name", newName)

    // Only auto-generate slug if it hasn't been manually edited or is empty
    if (!slug || slug === generateSlug(name)) {
      setValue("slug", generateSlug(newName))
    }

    setHasChanges(true)
  }

  // Handle save button click
  const handleSave = async () => {
    if (!hasChanges) {
      toast({
        description: "No changes to save",
      })
      return
    }

    setIsSaving(true)
    try {
      const success = await saveSectionChanges("Basic Info")
      if (success) {
        setLastSaved(new Date().toLocaleTimeString())
        setHasChanges(false)

        // Dispatch custom event for product update
        window.dispatchEvent(
          new CustomEvent("product-basic-info-updated", {
            detail: { data: form.getValues() },
          }),
        )
      }
    } catch (error) {
      console.error("Error saving basic info:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Set up auto-save functionality
  useEffect(() => {
    // Clear any existing timer when form values change
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }

    if (hasChanges) {
      // Set a new timer to auto-save after 30 seconds of inactivity
      const timer = setTimeout(() => {
        handleSave()
      }, 30000)

      setAutoSaveTimer(timer)
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [name, slug, description, category_id, brand_id, material, sku, hasChanges])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer)
      }
    }
  }, [])

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
                      <Input
                        placeholder="product-slug"
                        {...field}
                        className="h-11 font-mono text-sm"
                        onChange={(e) => {
                          field.onChange(e)
                          setHasChanges(true)
                        }}
                      />
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
                      onValueChange={(value) => {
                        field.onChange(Number(value))
                        setHasChanges(true)
                      }}
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
                      onValueChange={(value) => {
                        field.onChange(value ? Number(value) : null)
                        setHasChanges(true)
                      }}
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
                      <Input
                        placeholder="Cotton, Polyester, etc."
                        {...field}
                        className="h-11"
                        onChange={(e) => {
                          field.onChange(e)
                          setHasChanges(true)
                        }}
                      />
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
                        onChange={(e) => {
                          field.onChange(e)
                          setHasChanges(true)
                        }}
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
                      <Input
                        placeholder="Stock Keeping Unit"
                        {...field}
                        className="h-11 font-mono text-sm"
                        onChange={(e) => {
                          field.onChange(e)
                          setHasChanges(true)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {lastSaved && <div className="text-sm text-gray-500 mt-2">Last saved: {lastSaved}</div>}
            </div>
          </div>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-4 bg-gray-50">
        <div className="text-sm text-gray-500">
          {hasChanges && !isSaving && "Unsaved changes"}
          {isSaving && "Saving changes..."}
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`bg-orange-500 hover:bg-orange-600 ${!hasChanges ? "opacity-70" : ""}`}
        >
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
