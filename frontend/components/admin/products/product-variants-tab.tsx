"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, X, Check, DollarSign, Package, Tag, Save, Loader2 } from "lucide-react"
import type { ProductVariant } from "@/types"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

// Define variant schema for form validation
const variantSchema = z.object({
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int("Stock must be an integer").nonnegative("Stock must be non-negative"),
  sku: z.string().optional(),
})

type VariantFormValues = z.infer<typeof variantSchema>

// Update the interface to include the saveSectionChanges function
interface ProductVariantsTabProps {
  variants: ProductVariant[]
  setVariants: (variants: ProductVariant[]) => void
  productId: number
  setFormChanged: (changed: boolean) => void
  productPrice: number
  saveSectionChanges: (section: string) => Promise<boolean>
}

// Update the component to include the save button and loading state
export function ProductVariantsTab({
  variants,
  setVariants,
  productId,
  setFormChanged,
  productPrice,
  saveSectionChanges,
}: ProductVariantsTabProps) {
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isEditingVariant, setIsEditingVariant] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Handle save button click
  const handleSave = async () => {
    setIsSaving(true)
    await saveSectionChanges("Variants")
    setIsSaving(false)
  }

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
      updateVariant({ ...updatedVariants[isEditingVariant], index: isEditingVariant })
      setIsEditingVariant(null)
    } else {
      // Add new variant
      const newVariant: ProductVariant = {
        id: Date.now(), // Temporary ID for UI purposes
        product_id: productId,
        ...data,
      }
      addVariant(newVariant)
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

  const addVariant = async (newVariant: ProductVariant) => {
    // Create a copy of the current variants
    const updatedVariants = [...variants]

    // Add the new variant to the local state with a temporary numeric ID
    const tempId = Date.now()
    const variantWithTempId = { ...newVariant, id: tempId }
    updatedVariants.push(variantWithTempId)

    // Update the UI immediately (optimistic update)
    setVariants(updatedVariants)
    setFormChanged(true)

    try {
      // Attempt to save changes to the server
      await saveSectionChanges("variants")

      // If successful, no need to do anything else as the server data will be loaded
    } catch (error: unknown) {
      // If the API call fails, revert the optimistic update
      const filteredVariants = variants.filter((v) => v.id !== tempId)
      setVariants(filteredVariants)
      toast({
        title: "Failed to add variant",
        description:
          error && typeof error === "object" && "message" in error
            ? (error as { message?: string }).message
            : "An error occurred while adding the variant.",
        variant: "destructive",
      })
    }
  }

  const updateVariant = async (updatedVariant: ProductVariant & { index: number }) => {
    const { index, ...variantData } = updatedVariant
    const updatedVariants = [...variants]
    const originalVariant = updatedVariants[index]

    updatedVariants[index] = { ...originalVariant, ...variantData }
    setVariants(updatedVariants)
    setFormChanged(true)

    try {
      await saveSectionChanges("variants")
    } catch (error: unknown) {
      setVariants([...variants])
      toast({
        title: "Failed to update variant",
        description:
          error && typeof error === "object" && "message" in error
            ? (error as { message?: string }).message
            : "An error occurred while updating the variant.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="border shadow-sm bg-white">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Product Variants</h3>
            <Button
              onClick={handleAddVariant}
              disabled={isAddingVariant || isEditingVariant !== null}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </div>

          {(isAddingVariant || isEditingVariant !== null) && (
            <Card className="border-orange-200 bg-orange-50 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">
                  {isEditingVariant !== null ? "Edit Variant" : "Add New Variant"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...variantForm}>
                  <form onSubmit={variantForm.handleSubmit(onSubmitVariant)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={variantForm.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Color</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input placeholder="Red, Blue, etc." className="h-11" {...field} />
                                {field.value && (
                                  <div
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full shadow-md"
                                    style={{ backgroundColor: field.value }}
                                  />
                                )}
                              </div>
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
                            <FormLabel className="text-base font-medium">Size</FormLabel>
                            <FormControl>
                              <Input placeholder="S, M, L, XL, etc." className="h-11" {...field} />
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
                            <FormLabel className="text-base font-medium">SKU</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                  placeholder="Stock Keeping Unit"
                                  className="pl-10 h-11 font-mono text-sm"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={variantForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Price</FormLabel>
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
                                  onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                                />
                              </div>
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
                            <FormLabel className="text-base font-medium">Stock</FormLabel>
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
                                  onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={handleCancelVariant}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
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
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-medium">Color</TableHead>
                    <TableHead className="font-medium">Size</TableHead>
                    <TableHead className="font-medium">SKU</TableHead>
                    <TableHead className="font-medium">Price</TableHead>
                    <TableHead className="font-medium">Stock</TableHead>
                    <TableHead className="text-right font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant, index) => (
                    <TableRow key={variant.id} className="hover:bg-orange-50">
                      <TableCell>
                        {variant.color ? (
                          <div className="flex items-center">
                            <Badge variant="outline" className="bg-white mr-2">
                              {variant.color}
                            </Badge>
                            <div
                              className="w-4 h-4 rounded-full shadow-md"
                              style={{ backgroundColor: variant.color }}
                            />
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {variant.size ? (
                          <Badge variant="outline" className="bg-white">
                            {variant.size}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{variant.sku || "-"}</TableCell>
                      <TableCell className="font-medium">${variant.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={variant.stock > 10 ? "outline" : variant.stock > 0 ? "secondary" : "destructive"}
                          className={variant.stock > 10 ? "bg-white" : ""}
                        >
                          {variant.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVariant(variant, index)}
                            disabled={isAddingVariant || isEditingVariant !== null}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVariant(index)}
                            disabled={isAddingVariant || isEditingVariant !== null}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
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
            </div>
          ) : (
            <div className="text-center py-12 border rounded-md bg-gray-50">
              <div className="flex flex-col items-center">
                <div className="p-3 bg-gray-100 rounded-full mb-3">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No variants added yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                  Add variants if this product comes in different colors, sizes, or other variations
                </p>
                <Button
                  onClick={handleAddVariant}
                  className="mt-4 bg-orange-500 hover:bg-orange-600"
                  disabled={isAddingVariant || isEditingVariant !== null}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Variant
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t p-4 bg-cherry-500">
        <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Variants
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
