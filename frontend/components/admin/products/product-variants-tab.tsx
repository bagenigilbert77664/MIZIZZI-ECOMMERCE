"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, X, Check } from "lucide-react"
import type { ProductVariant } from "@/types"

// Define variant schema for form validation
const variantSchema = z.object({
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int("Stock must be an integer").nonnegative("Stock must be non-negative"),
  sku: z.string().optional(),
})

type VariantFormValues = z.infer<typeof variantSchema>

interface ProductVariantsTabProps {
  variants: ProductVariant[]
  setVariants: (variants: ProductVariant[]) => void
  productId: number
  setFormChanged: (changed: boolean) => void
  productPrice: number
}

export function ProductVariantsTab({
  variants,
  setVariants,
  productId,
  setFormChanged,
  productPrice,
}: ProductVariantsTabProps) {
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isEditingVariant, setIsEditingVariant] = useState<number | null>(null)

  // Initialize variant form with default values
  const variantForm = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      color: "",
      size: "",
      price: productPrice,
      stock: 0,
      sku: "",
    },
  })

  // Handle adding a variant
  const handleAddVariant = () => {
    setIsAddingVariant(true)
    variantForm.reset({
      color: "",
      size: "",
      price: productPrice,
      stock: 0,
      sku: "",
    })
  }

  // Handle editing a variant
  const handleEditVariant = (variant: ProductVariant, index: number) => {
    setIsEditingVariant(index)
    variantForm.reset({
      color: variant.color || "",
      size: variant.size || "",
      price: variant.price,
      stock: variant.stock,
      sku: variant.sku || "",
    })
  }

  // Handle deleting a variant
  const handleDeleteVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
    setFormChanged(true)
  }

  // Handle variant form submission
  const onSubmitVariant = (data: VariantFormValues) => {
    if (isEditingVariant !== null) {
      // Update existing variant
      const updatedVariants = [...variants]
      updatedVariants[isEditingVariant] = {
        ...updatedVariants[isEditingVariant],
        ...data,
      }
      setVariants(updatedVariants)
      setIsEditingVariant(null)
    } else {
      // Add new variant
      const newVariant: ProductVariant = {
        id: Date.now(), // Temporary ID for UI purposes
        product_id: productId,
        ...data,
      }
      setVariants([...variants, newVariant])
      setIsAddingVariant(false)
    }
    variantForm.reset()
    setFormChanged(true)
  }

  // Cancel adding/editing variant
  const handleCancelVariant = () => {
    setIsAddingVariant(false)
    setIsEditingVariant(null)
    variantForm.reset()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Product Variants</h3>
            <Button onClick={handleAddVariant} disabled={isAddingVariant || isEditingVariant !== null}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </div>

          {(isAddingVariant || isEditingVariant !== null) && (
            <Card className="border-cherry-200 bg-cherry-50">
              <CardContent className="pt-6">
                <h4 className="text-base font-medium mb-4">
                  {isEditingVariant !== null ? "Edit Variant" : "Add New Variant"}
                </h4>
                <Form {...variantForm}>
                  <form onSubmit={variantForm.handleSubmit(onSubmitVariant)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={variantForm.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                              <Input placeholder="Red, Blue, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={variantForm.control}
                        name="size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Size</FormLabel>
                            <FormControl>
                              <Input placeholder="S, M, L, XL, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={variantForm.control}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={variantForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={variantForm.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={handleCancelVariant}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Check className="h-4 w-4 mr-2" />
                        {isEditingVariant !== null ? "Update Variant" : "Add Variant"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {variants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant, index) => (
                  <TableRow key={variant.id}>
                    <TableCell>{variant.color || "-"}</TableCell>
                    <TableCell>{variant.size || "-"}</TableCell>
                    <TableCell>{variant.sku || "-"}</TableCell>
                    <TableCell>${variant.price.toFixed(2)}</TableCell>
                    <TableCell>{variant.stock}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditVariant(variant, index)}
                          disabled={isAddingVariant || isEditingVariant !== null}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteVariant(index)}
                          disabled={isAddingVariant || isEditingVariant !== null}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 border rounded-md bg-gray-50">
              <p className="text-gray-500">No variants added yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Add variants if this product comes in different colors, sizes, etc.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

