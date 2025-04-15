"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Globe, Search, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "@/hooks/use-product-form"
import { useState } from "react"

interface ProductSeoTabProps {
  form: UseFormReturn<ProductFormValues>
  saveSectionChanges: (section: string) => Promise<boolean>
}

export function ProductSeoTab({ form, saveSectionChanges }: ProductSeoTabProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await saveSectionChanges("SEO")
    setIsSaving(false)
  }

  return (
    <Card className="border shadow-sm bg-white">
      <CardContent className="pt-6">
        <Form {...form}>
          <div className="space-y-8">
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800">Search Engine Optimization</h3>
              <p className="text-sm text-gray-500 mt-1">
                Optimize your product for search engines to improve visibility
              </p>
            </div>

            <FormField
              control={form.control}
              name="meta_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium flex items-center">
                    <Search className="h-4 w-4 mr-2 text-gray-500" />
                    Meta Title
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="SEO Title" {...field} value={field.value || ""} className="h-11" />
                  </FormControl>
                  <FormDescription>
                    Leave empty to use the product name. Recommended length: 50-60 characters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meta_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-gray-500" />
                    Meta Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="SEO Description"
                      className="min-h-[120px] resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    A short description for search engines. Leave empty to use the product description. Recommended
                    length: 150-160 characters.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">SEO Preview</h4>
              <div className="space-y-1">
                <p className="text-blue-600 text-base font-medium truncate">
                  {form.watch("meta_title") || form.watch("name") || "Product Title"}
                </p>
                <p className="text-green-700 text-xs">
                  {window.location.origin}/product/{form.watch("slug") || "product-slug"}
                </p>
                <p className="text-gray-600 text-sm line-clamp-2">
                  {form.watch("meta_description") || form.watch("description") || ""}
                </p>
              </div>
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
              <Save className="mr-2 h-4 w-4" /> Save SEO
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
