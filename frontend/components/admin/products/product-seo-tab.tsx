import { Card, CardContent } from "@/components/ui/card"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { UseFormReturn } from "react-hook-form"
import type { ProductFormValues } from "@/hooks/use-product-form"

interface ProductSeoTabProps {
  form: UseFormReturn<ProductFormValues>
}

export function ProductSeoTab({ form }: ProductSeoTabProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="meta_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input placeholder="SEO Title" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormDescription>Leave empty to use the product name</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meta_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="SEO Description"
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    A short description for search engines. Leave empty to use the product description.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
      </CardContent>
    </Card>
  )
}
