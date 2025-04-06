"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "@/hooks/use-product-form"

interface ProductPricingInventoryTabProps {
  form: UseFormReturn<ProductFormValues>
}

export function ProductPricingInventoryTab({ form }: ProductPricingInventoryTabProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value || ""} // Prevent NaN values
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value)
                      field.onChange(value)
                    }}
                  />
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
                <FormLabel>Sale Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value === null || field.value === undefined ? "" : field.value} // Prevent NaN values
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : Number(e.target.value)
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormDescription>Discounted price (leave empty for no discount)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...field}
                    value={field.value || ""} // Prevent NaN values
                    onChange={(e) => {
                      const value = e.target.value === "" ? "" : Number(e.target.value)
                      field.onChange(value)
                    }}
                  />
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
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
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
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="SKU123" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>Stock Keeping Unit</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Featured Product</FormLabel>
                    <FormDescription>Display this product on the featured section</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_new"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">New Product</FormLabel>
                    <FormDescription>Mark this product as new</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_flash_sale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Flash Sale</FormLabel>
                    <FormDescription>Include this product in flash sales</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_luxury_deal"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Luxury Deal</FormLabel>
                    <FormDescription>Mark this product as a luxury deal</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

