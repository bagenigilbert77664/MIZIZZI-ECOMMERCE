"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Trash2, Upload, Save, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { generateSlug } from "@/lib/utils"
import { Loader } from "@/components/ui/loader"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import type { ProductVariant } from "@/types"
import { checkApiHealth } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const productSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  slug: z.string().min(3, { message: "Slug must be at least 3 characters" }),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0" }),
  sale_price: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0),
  category_id: z.coerce.number().min(1, { message: "Please select a category" }),
  brand_id: z.coerce.number().optional().nullable(),
  sku: z.string().optional(),
  weight: z.coerce.number().positive().optional().nullable(),
  is_featured: z.boolean().default(false),
  is_new: z.boolean().default(true),
  is_sale: z.boolean().default(false),
  is_flash_sale: z.boolean().default(false),
  is_luxury_deal: z.boolean().default(false),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  material: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

const variantSchema = z.object({
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.coerce.number().positive({ message: "Price must be positive" }),
  stock: z.coerce
    .number()
    .int({ message: "Stock must be an integer" })
    .nonnegative({ message: "Stock must be non-negative" }),
  sku: z.string().optional(),
})

type VariantFormValues = z.infer<typeof variantSchema>

export default function NewProductPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [images, setImages] = useState<string[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isEditingVariant, setIsEditingVariant] = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [apiHealth, setApiHealth] = useState<boolean | null>(null)

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: 1, // Changed from 0 to 1
      sale_price: null,
      stock: 0,
      category_id: 0,
      brand_id: null,
      sku: "",
      weight: null,
      is_featured: false,
      is_new: true,
      is_sale: false,
      is_flash_sale: false,
      is_luxury_deal: false,
      meta_title: "",
      meta_description: "",
      material: "",
    },
    mode: "onChange",
  })

  const variantForm = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      color: "",
      size: "",
      price: 0,
      stock: 0,
      sku: "",
    },
  })

  const { watch, setValue, handleSubmit } = form

  // Memoized data fetching to prevent multiple calls
  const fetchCategoriesAndBrands = useCallback(async () => {
    if (!isAuthenticated || categories.length > 0) return

    console.log("Fetching categories and brands...")
    setIsLoadingData(true)

    try {
      const [categoriesResponse, brandsResponse] = await Promise.allSettled([
        adminService.getCategories(),
        adminService.getBrands(),
      ])

      if (categoriesResponse.status === "fulfilled") {
        const value = categoriesResponse.value as any
        const categoryData = Array.isArray(value)
          ? value
          : (value && Array.isArray(value.items) ? value.items : [])
        console.log("Successfully fetched categories:", categoryData.length)
        setCategories(categoryData)
      } else {
        console.error("Error fetching categories:", categoriesResponse.reason)
        setCategories([])
      }

      if (brandsResponse.status === "fulfilled") {
        const value = brandsResponse.value as any
        const brandData = Array.isArray(value)
          ? value
          : (value && Array.isArray(value.items) ? value.items : [])
        console.log("Successfully fetched brands:", brandData.length)
        setBrands(brandData)
      } else {
        console.error("Error fetching brands:", brandsResponse.reason)
        setBrands([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load categories and brands. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }, [isAuthenticated, categories.length])

  // Watch the name field to auto-generate slug
  const name = watch("name")
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value
      setValue("name", newName)
      if (newName) {
        const newSlug = generateSlug(newName)
        setValue("slug", newSlug)
      }
    },
    [setValue],
  )

  // Watch sale price to auto-set is_sale
  const salePrice = watch("sale_price")
  const handleSalePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value ? Number.parseFloat(e.target.value) : null
      setValue("sale_price", value)
      setValue("is_sale", value !== null && value > 0)
    },
    [setValue],
  )

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch data only once when authenticated
  useEffect(() => {
    if (isAuthenticated && categories.length === 0) {
      fetchCategoriesAndBrands()
    }
  }, [isAuthenticated, fetchCategoriesAndBrands, categories.length])

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const isApiHealthy = await checkApiHealth()
      setApiHealth(isApiHealthy)
    }
    checkHealth()
  }, [])

  // Memoized categories and brands for select options
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => (
        <SelectItem key={category.id} value={category.id.toString()}>
          {category.name}
        </SelectItem>
      )),
    [categories],
  )

  const brandOptions = useMemo(
    () =>
      brands.map((brand) => (
        <SelectItem key={brand.id} value={brand.id.toString()}>
          {brand.name}
        </SelectItem>
      )),
    [brands],
  )

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setIsSubmitting(true)
      setSaveStatus("saving")

      console.log("Form submission started with data:", data)

      // Validate form data before submission
      if (!data.name || data.name.trim().length < 3) {
        throw new Error("Product name must be at least 3 characters long")
      }
      if (!data.price || data.price <= 0) {
        throw new Error("Product price must be greater than 0")
      }
      if (!data.category_id || data.category_id <= 0) {
        throw new Error("Please select a category")
      }

      // Prepare product data with all form values
      const productData = {
        name: data.name.trim(),
        slug:
          data.slug?.trim() ||
          data.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        description: data.description || "",
        price: Number(data.price),
        sale_price: data.sale_price ? Number(data.sale_price) : null,
        stock: Number(data.stock) || 0,
        category_id: Number(data.category_id),
        brand_id: data.brand_id && data.brand_id !== 0 ? Number(data.brand_id) : null,
        sku: data.sku || `SKU-${Date.now()}`,
        weight: data.weight ? Number(data.weight) : null,
        is_featured: Boolean(data.is_featured),
        is_new: Boolean(data.is_new),
        is_sale: Boolean(data.is_sale),
        is_flash_sale: Boolean(data.is_flash_sale),
        is_luxury_deal: Boolean(data.is_luxury_deal),
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        material: data.material || "",
        image_urls: images,
        thumbnail_url: images.length > 0 ? images[0] : undefined,
        variants: variants,
        tags: [], // Add empty tags array for now
      }

      console.log("Submitting product data:", productData)

      // Call the admin service to create the product
      const response = await adminService.createProduct(productData)
      console.log("Product creation response:", response)

      // Show success message
      toast({
        title: "Success!",
        description: `Product "${response.name}" has been created successfully.`,
      })
      setSaveStatus("success")

      // Redirect to products list after a short delay
      setTimeout(() => {
        router.push("/admin/products")
      }, 1500)
    } catch (error: any) {
      console.error("Product creation failed:", error)

      let errorMessage = "Failed to create product. Please try again."

      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      setSaveStatus("error")

      // Reset save status after 3 seconds
      setTimeout(() => {
        setSaveStatus("idle")
      }, 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddVariant = useCallback(() => {
    setIsAddingVariant(true)
    variantForm.reset({
      color: "",
      size: "",
      price: form.getValues("price") || 0,
      stock: 0,
      sku: "",
    })
  }, [variantForm, form])

  const handleEditVariant = useCallback(
    (variant: ProductVariant, index: number) => {
      setIsEditingVariant(index)
      variantForm.reset({
        color: variant.color || "",
        size: variant.size || "",
        price: variant.price,
        stock: variant.stock,
        sku: variant.sku || "",
      })
    },
    [variantForm],
  )

  const handleDeleteVariant = useCallback((index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const onSubmitVariant = useCallback(
    (data: VariantFormValues) => {
      if (isEditingVariant !== null) {
        // Update existing variant
        setVariants((prev) => {
          const updated = [...prev]
          updated[isEditingVariant] = {
            ...updated[isEditingVariant],
            ...data,
          }
          return updated
        })
        setIsEditingVariant(null)
      } else {
        // Add new variant
        const newVariant: ProductVariant = {
          id: Date.now(), // Temporary ID for UI purposes
          product_id: 0, // Will be set after product creation
          ...data,
        }
        setVariants((prev) => [...prev, newVariant])
        setIsAddingVariant(false)
      }
      variantForm.reset()
    },
    [isEditingVariant, variantForm],
  )

  const handleCancelVariant = useCallback(() => {
    setIsAddingVariant(false)
    setIsEditingVariant(null)
    variantForm.reset()
  }, [variantForm])

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8">
          <Loader />
        </div>
      </div>
    )
  }

  console.log("Form validation state:", {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    isSubmitting,
    isLoadingData,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
        </div>
        <div className="flex items-center space-x-2">
          {saveStatus === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveStatus === "success" && <span className="text-green-500">Saved</span>}
          {saveStatus === "error" && <span className="text-red-500">Error</span>}
        </div>
      </div>

      {apiHealth === false ? (
        <Alert variant="destructive">
          <AlertTitle>Backend API Unreachable</AlertTitle>
          <AlertDescription>
            The backend API is currently unreachable. Please ensure the server is running and accessible.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoadingData ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading categories and brands...</span>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
                <TabsTrigger value="variants">Variants</TabsTrigger>
                <TabsTrigger value="seo">SEO & Visibility</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Enter the basic details of your product.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                handleNameChange(e)
                              }}
                              placeholder="Enter product name"
                            />
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
                            <Input {...field} placeholder="product-slug" />
                          </FormControl>
                          <FormDescription>Used for the product URL. Auto-generated from the name.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Enter product description..." className="min-h-32" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number.parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>{categoryOptions}</SelectContent>
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
                              onValueChange={(value) => field.onChange(value ? Number.parseInt(value) : null)}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a brand" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">None</SelectItem>
                                {brandOptions}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter SKU" />
                          </FormControl>
                          <FormDescription>Stock Keeping Unit. A unique identifier for your product.</FormDescription>
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
                            <Input {...field} placeholder="e.g., Cotton, Leather, Metal" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="images" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Images</CardTitle>
                    <CardDescription>Upload images for your product.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image || "/placeholder.svg"}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-40 object-cover rounded-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {index === 0 && (
                            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              Thumbnail
                            </div>
                          )}
                        </div>
                      ))}
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Click to upload</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing & Inventory</CardTitle>
                    <CardDescription>Set pricing and inventory details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Regular Price ($) *</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" {...field} placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sale_price"
                        render={({ field: { value, ...field } }) => (
                          <FormItem>
                            <FormLabel>Sale Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={value === null ? "" : value}
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e)
                                  handleSalePriceChange(e)
                                }}
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormDescription>Leave empty if not on sale.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Quantity *</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field: { value, ...field } }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={value === null ? "" : value}
                                {...field}
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variants" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Product Variants</CardTitle>
                      <CardDescription>Add different variations of your product.</CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddVariant}
                      disabled={isAddingVariant || isEditingVariant !== null}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Variant
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isAddingVariant || isEditingVariant !== null ? (
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle>{isEditingVariant !== null ? "Edit Variant" : "Add New Variant"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Form {...variantForm}>
                            <form onSubmit={variantForm.handleSubmit(onSubmitVariant)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={variantForm.control}
                                  name="color"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Color</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., Red, Blue, Green" />
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
                                        <Input {...field} placeholder="e.g., S, M, L, XL" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                  control={variantForm.control}
                                  name="price"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Price ($)</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" min="0" {...field} />
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
                                        <Input type="number" min="0" {...field} />
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
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={handleCancelVariant}>
                                  Cancel
                                </Button>
                                <Button type="submit">
                                  {isEditingVariant !== null ? "Update Variant" : "Add Variant"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </CardContent>
                      </Card>
                    ) : null}

                    {variants.length > 0 ? (
                      <div className="border rounded-md">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="px-4 py-2 text-left">Color</th>
                              <th className="px-4 py-2 text-left">Size</th>
                              <th className="px-4 py-2 text-left">Price</th>
                              <th className="px-4 py-2 text-left">Stock</th>
                              <th className="px-4 py-2 text-left">SKU</th>
                              <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map((variant, index) => (
                              <tr key={variant.id} className="border-b">
                                <td className="px-4 py-2">{variant.color || "-"}</td>
                                <td className="px-4 py-2">{variant.size || "-"}</td>
                                <td className="px-4 py-2">${variant.price.toFixed(2)}</td>
                                <td className="px-4 py-2">{variant.stock}</td>
                                <td className="px-4 py-2">{variant.sku || "-"}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditVariant(variant, index)}
                                      disabled={isAddingVariant || isEditingVariant !== null}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => handleDeleteVariant(index)}
                                      disabled={isAddingVariant || isEditingVariant !== null}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No variants added yet. Click "Add Variant" to create variations of this product.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SEO & Visibility</CardTitle>
                    <CardDescription>
                      Optimize your product for search engines and set visibility options.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="meta_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter meta title" />
                          </FormControl>
                          <FormDescription>Leave empty to use the product name.</FormDescription>
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
                            <Textarea {...field} placeholder="Enter meta description..." className="min-h-20" />
                          </FormControl>
                          <FormDescription>A short description for search engine results.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="is_featured"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Featured Product</FormLabel>
                                <FormDescription>Display this product in featured sections.</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="is_new"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>New Product</FormLabel>
                                <FormDescription>Mark this product as new.</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="is_flash_sale"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Flash Sale</FormLabel>
                                <FormDescription>Include this product in flash sales.</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="is_luxury_deal"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Luxury Deal</FormLabel>
                                <FormDescription>Mark this product as a luxury deal.</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[140px]"
                onClick={() => {
                  console.log("Button clicked!")
                  console.log("Form errors:", form.formState.errors)
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Create Product
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}
