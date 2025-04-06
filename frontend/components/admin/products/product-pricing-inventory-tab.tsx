"use client"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Loader2, DollarSign, Package, Tag, Percent, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "@/hooks/use-product-form"
import { useState } from "react"

interface ProductPricingInventoryTabProps {
  form: UseFormReturn<ProductFormValues>
  saveSectionChanges: (section: string) => Promise<boolean>
}

export function ProductPricingInventoryTab({ form, saveSectionChanges }: ProductPricingInventoryTabProps) {
  const [isSaving, setIsSaving] = useState(false)

  // Handle save button click
  const handleSave = async () => {
    setIsSaving(true)
    await saveSectionChanges("Pricing & Inventory")
    setIsSaving(false)
  }

  // Add a safety check to ensure the form is available before rendering form fields
  if (!form || !form.control) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading form...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border shadow-sm bg-white">
      <CardContent className="pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Pricing</h3>

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Regular Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-10 h-11"
                        {...field}
                        value={field.value || ""} // Prevent NaN values
                        onChange={(e) => {
                          const value = e.target.value === "" ? "" : Number(e.target.value)
                          field.onChange(value)
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Regular price of the product</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sale_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Sale Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-10 h-11"
                        {...field}
                        value={field.value === null || field.value === undefined ? "" : field.value} // Prevent NaN values
                        onChange={(e) => {
                          const value = e.target.value === "" ? null : Number(e.target.value)
                          field.onChange(value)
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Discounted price (leave empty for no discount)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Inventory</h3>

            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Stock Quantity</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        className="pl-10 h-11"
                        {...field}
                        value={field.value || ""} // Prevent NaN values
                        onChange={(e) => {
                          const value = e.target.value === "" ? "" : Number(e.target.value)
                          field.onChange(value)
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Number of items in stock</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Weight (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-11"
                      {...field}
                      value={field.value === null || field.value === undefined ? "" : field.value} // Prevent NaN values
                      onChange={(e) => {
                        const value = e.target.value === "" ? null : Number(e.target.value)
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>Product weight in kilograms</FormDescription>
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
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="SKU123"
                        className="pl-10 h-11 font-mono text-sm"
                        {...field}
                        value={field.value || ""}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Stock Keeping Unit</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Product Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm hover:border-orange-200 transition-colors">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Featured Product</FormLabel>
                    <FormDescription>Display this product on the featured section</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_new"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm hover:border-orange-200 transition-colors">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">New Product</FormLabel>
                    <FormDescription>Mark this product as new</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_flash_sale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm hover:border-orange-200 transition-colors">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Flash Sale</FormLabel>
                    <FormDescription>Include this product in flash sales</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_luxury_deal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm hover:border-orange-200 transition-colors">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Luxury Deal</FormLabel>
                    <FormDescription>Mark this product as a luxury deal</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t p-4 bg-gray-50">
        <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Pricing & Inventory
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

