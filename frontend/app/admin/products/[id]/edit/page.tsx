"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  Save,
  ArrowLeft,
  ImagePlus,
  DollarSign,
  Tag,
  Layers,
  Search,
  ShoppingBag,
  Palette,
  Package,
  BarChart4,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Info,
  Edit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { generateSlug } from "@/lib/utils"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Product, ProductVariant } from "@/types"
import { ProductUpdateNotification } from "@/components/admin/product-update-notification"

// Define product schema for form validation
const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  sale_price: z.coerce.number().positive("Sale price must be positive").optional().nullable(),
  stock: z.coerce.number().int("Stock must be an integer").nonnegative("Stock must be non-negative"),
  category_id: z.coerce.number().positive("Please select a category"),
  brand_id: z.coerce.number().positive("Please select a brand").optional().nullable(),
  sku: z.string().optional(),
  weight: z.coerce.number().positive("Weight must be positive").optional().nullable(),
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

// Define variant schema for form validation
const variantSchema = z.object({
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int("Stock must be an integer").nonnegative("Stock must be non-negative"),
  sku: z.string().optional(),
})

type VariantFormValues = z.infer<typeof variantSchema>

export default function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [images, setImages] = useState<string[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [isAddingVariant, setIsAddingVariant] = useState(false)
  const [isEditingVariant, setIsEditingVariant] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [formChanged, setFormChanged] = useState(false)
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false)
  const [navigateTo, setNavigateTo] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [brandError, setBrandError] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Initialize form with default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: 0,
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
  })

  // Initialize variant form with default values
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

  const { watch, setValue, formState } = form

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setFormChanged(true)
    })
    return () => subscription.unsubscribe()
  }, [form.watch])

  // Watch the name field to auto-generate slug
  const name = watch("name")
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("name", e.target.value)
    if (e.target.value) {
      setValue("slug", generateSlug(e.target.value))
    }
  }

  // Watch sale price to auto-set is_sale
  const salePrice = watch("sale_price")
  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number.parseFloat(e.target.value) : null
    setValue("sale_price", value)
    setValue("is_sale", value !== null && value > 0)
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch product data, categories, and brands
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return

      setIsLoading(true)
      setApiError(null)

      try {
        // Fetch product data
        const productData = await adminService.getProduct(id)
        setProduct(productData)
        setImages(productData.image_urls || [])
        setVariants(productData.variants || [])

        // Set form values
        Object.entries(productData).forEach(([key, value]) => {
          if (key in form.getValues()) {
            setValue(key as any, value)
          }
        })

        // Fetch categories
        try {
          const categoriesResponse = await adminService.getCategories()
          setCategories(categoriesResponse.items || [])
        } catch (error) {
          console.error("Error fetching categories:", error)
          setCategories([])
        } finally {
          setIsLoadingCategories(false)
        }

        // Fetch brands
        try {
          setBrandError(false)
          const brandsResponse = await adminService.getBrands()
          const brandsData = brandsResponse.items || []

          // If we have no brands but the product has a brand_id, create a fallback
          if (brandsData.length === 0 && productData.brand_id) {
            brandsData.push({
              id: productData.brand_id,
              name:
                typeof productData.brand === "object"
                  ? productData.brand?.name
                  : productData.brand || `Brand ${productData.brand_id}`,
            })
          }

          setBrands(brandsData)
        } catch (error) {
          console.error("Error fetching brands:", error)
          setBrandError(true)

          // Create a fallback with the current product's brand if needed
          if (productData.brand_id) {
            setBrands([
              {
                id: productData.brand_id,
                name:
                  typeof productData.brand === "object"
                    ? productData.brand?.name
                    : productData.brand || `Brand ${productData.brand_id}`,
              },
            ])
          } else {
            setBrands([])
          }
        } finally {
          setIsLoadingBrands(false)
        }
      } catch (error) {
        console.error("Error fetching product data:", error)
        setApiError("Failed to load product data. Please try again.")
        toast({
          title: "Error",
          description: "Failed to load product data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setFormChanged(false)
      }
    }

    fetchData()
  }, [id, isAuthenticated, setValue])

  // Handle navigation with unsaved changes check
  const handleNavigation = (path: string) => {
    if (formChanged) {
      setNavigateTo(path)
      setUnsavedChangesDialog(true)
    } else {
      router.push(path)
    }
  }

  // Handle form submission
  const onSubmit = async (data: ProductFormValues) => {
    try {
      setIsSubmitting(true)
      setApiError(null)

      // Prepare product data for submission
      const productData = {
        ...data,
        image_urls: images,
        thumbnail_url: images.length > 0 ? images[0] : null,
        variants: variants,
      }

      // If the brand_id is 0 (from the "None" option), set it to null
      if (productData.brand_id === 0) {
        productData.brand_id = null
      }

      console.log("Updating product with data:", productData)

      // Use the adminService to update the product
      // This will trigger the real-time update notification
      const updatedProduct = await adminService.updateProduct(id, productData)

      // Show success toast
      toast({
        title: "Product Updated Successfully",
        description: `${data.name} has been updated with the latest information.`,
        variant: "default",
      })

      // Update local state
      setProduct({ ...product, ...productData } as Product)
      setFormChanged(false)
      setSaveSuccess(true)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (error: any) {
      console.error("Failed to update product:", error)

      const errorMessage = error.message || "There was a problem updating the product. Please try again."
      setApiError(errorMessage)

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Create URLs for preview (in a real app, you would upload to server)
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
    setImages([...images, ...newImages])
    setFormChanged(true)
  }

  // Remove image
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setFormChanged(true)
  }

  // Handle adding a variant
  const handleAddVariant = () => {
    setIsAddingVariant(true)
    variantForm.reset({
      color: "",
      size: "",
      price: product?.price || 0,
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
        product_id: Number(id),
        ...data,
      }
      setVariants([...variants, newVariant])
      setIsAddingVariant(false)
    }
    variantForm.reset()
    setFormChanged(true)
  }

  // Handle product deletion
  const handleDeleteProduct = async () => {
    try {
      await adminService.deleteProduct(id)
      toast({
        title: "Success",
        description: "Product deleted successfully",
      })
      router.push("/admin/products")
    } catch (error) {
      console.error("Failed to delete product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  // Loading state while authenticating
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#C01031] border-t-transparent"></div>
          <p className="text-lg font-medium text-[#C01031]">Authenticating...</p>
        </div>
      </div>
    )
  }

  // Loading state while fetching product data
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#C01031] border-t-transparent"></div>
          <p className="text-lg font-medium text-[#C01031]">Loading product data...</p>
        </div>
      </div>
    )
  }

  // Get icon for tab
  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "basic":
        return <ShoppingBag className="h-5 w-5" />
      case "images":
        return <ImagePlus className="h-5 w-5" />
      case "pricing":
        return <DollarSign className="h-5 w-5" />
      case "variants":
        return <Layers className="h-5 w-5" />
      case "seo":
        return <Search className="h-5 w-5" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#7D0A24]">Edit Product</h1>
          <p className="text-muted-foreground">Make changes to your product and save when you're done</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleNavigation("/admin/products")}
            className="border-cherry-200 text-cherry-700 hover:bg-cherry-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Button>

          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="border-none bg-gradient-to-b from-slate-900 to-slate-800 text-white">
              <DialogHeader>
                <DialogTitle className="text-xl text-white">Delete this product?</DialogTitle>
                <DialogDescription className="text-white/70">
                  This action cannot be undone. This will permanently delete the product and all associated data.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 rounded-lg bg-red-500/10 p-4 text-red-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-300" />
                  <div>
                    <h4 className="font-medium">Warning</h4>
                    <p className="text-sm text-red-200/80">
                      Deleting this product will remove it from all collections, orders, and customer carts.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#C01031] to-[#7D0A24] text-white hover:from-[#9F0F2E] hover:to-[#7D0A24] shadow-md hover:shadow-lg transition-all duration-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved changes notification */}
      {formChanged && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>You have unsaved changes</span>
          </div>
          <Button
            size="sm"
            onClick={form.handleSubmit(onSubmit)}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            Save Now
          </Button>
        </div>
      )}

      {/* API error alert */}
      {apiError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Brand API error alert */}
      {brandError && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Brand API Error</AlertTitle>
          <AlertDescription>
            There was an issue loading the brands data. Some brand information may be incomplete.
          </AlertDescription>
        </Alert>
      )}

      {/* Main product card */}
      <Card className="overflow-hidden border-cherry-100 shadow-md">
        <CardHeader className="bg-gradient-to-r from-white to-cherry-50 border-b border-cherry-100">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border bg-slate-50">
              {images.length > 0 ? (
                <img
                  src={images[0] || "/placeholder.svg"}
                  alt={product?.name || "Product"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-300">
                  <Package className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-cherry-800">{product?.name}</h2>
                {product?.is_featured && <Badge className="bg-purple-100 text-purple-800">Featured</Badge>}
                {product?.is_new && <Badge className="bg-blue-100 text-blue-800">New</Badge>}
                {product?.is_sale && <Badge className="bg-red-100 text-red-800">Sale</Badge>}
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>SKU: {product?.sku || "Not set"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart4 className="h-4 w-4" />
                  <span>{product?.stock || 0} in stock</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    {product?.sale_price
                      ? `KSh ${product.sale_price.toLocaleString()} (${Math.round(((product.price - product.sale_price) / product.price) * 100)}% off)`
                      : `KSh ${product?.price?.toLocaleString() || 0}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-cherry-200 text-cherry-700 hover:bg-cherry-50 hover:text-cherry-900"
                      onClick={() => window.open(`/product/${id}`, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on storefront</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                <div className="mb-6">
                  <TabsList className="grid w-full max-w-3xl grid-cols-5 rounded-xl bg-cherry-50 p-1">
                    {["basic", "images", "pricing", "variants", "seo"].map((tab) => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-cherry-800 data-[state=active]:shadow-sm"
                      >
                        {getTabIcon(tab)}
                        <span className="hidden sm:inline">
                          {tab === "seo" ? "SEO & Visibility" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4 pt-2">
                  <Card className="overflow-hidden border-cherry-100 shadow-sm">
                    <div className="h-1.5 w-full bg-gradient-to-r from-cherry-500 to-cherry-600"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-cherry-600" />
                        <CardTitle>Basic Information</CardTitle>
                      </div>
                      <CardDescription>Edit the basic details of your product.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-lg border border-cherry-100 bg-cherry-50/50 p-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-cherry-800">Product Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e)
                                    handleNameChange(e)
                                  }}
                                  className="border-cherry-200 bg-white focus-visible:ring-cherry-500"
                                  placeholder="Enter product name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="mt-4">
                          <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel className="text-cherry-800">URL Slug</FormLabel>
                                  <span className="text-xs text-cherry-600">Auto-generated from name</span>
                                </div>
                                <FormControl>
                                  <div className="flex items-center rounded-md border border-cherry-200 bg-slate-50 px-3 text-sm text-slate-500">
                                    <span className="mr-1">yourstore.com/product/</span>
                                    <Input
                                      {...field}
                                      className="flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 p-4">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Enter product description..."
                                  className="min-h-32 resize-y border-slate-200"
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Provide a detailed description of your product to help customers make informed
                                decisions.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 p-4">
                          <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(Number.parseInt(value))}
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger className="border-slate-200">
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {isLoadingCategories ? (
                                      <div className="flex items-center justify-center p-4">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Loading categories...</span>
                                      </div>
                                    ) : (
                                      categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                          {category.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4">
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
                                    <SelectTrigger className="border-slate-200">
                                      <SelectValue placeholder="Select a brand" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="0">None</SelectItem>
                                    {isLoadingBrands ? (
                                      <div className="flex items-center justify-center p-4">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        <span>Loading brands...</span>
                                      </div>
                                    ) : (
                                      brands.map((brand) => (
                                        <SelectItem key={brand.id} value={brand.id.toString()}>
                                          {brand.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 p-4">
                          <FormField
                            control={form.control}
                            name="sku"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SKU</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="border-slate-200"
                                    placeholder="e.g., PROD-12345"
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Stock Keeping Unit. A unique identifier for your product.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4">
                          <FormField
                            control={form.control}
                            name="material"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Material</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="border-slate-200"
                                    placeholder="e.g., Cotton, Leather, Metal"
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription>The primary material used in this product.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images" className="space-y-4 pt-2">
                  <Card className="overflow-hidden border-cherry-100 shadow-sm">
                    <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <ImagePlus className="h-5 w-5 text-purple-600" />
                        <CardTitle>Product Images</CardTitle>
                      </div>
                      <CardDescription>Upload and manage images for your product.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {images.length === 0 && (
                        <Alert className="mb-6 border-purple-200 bg-purple-50 text-purple-800">
                          <Info className="h-4 w-4" />
                          <AlertTitle>No images yet</AlertTitle>
                          <AlertDescription>
                            Products with high-quality images sell better. We recommend adding at least 3 images.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {images.map((image, index) => (
                          <div
                            key={index}
                            className={`group relative aspect-square overflow-hidden rounded-lg border-2 ${index === 0 ? "border-purple-400 ring-2 ring-purple-200" : "border-slate-200"}`}
                          >
                            <img
                              src={image || "/placeholder.svg"}
                              alt={`Product image ${index + 1}`}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <div className="flex gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={() => removeImage(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {index === 0 && (
                              <div className="absolute bottom-2 left-2 rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white">
                                Main Image
                              </div>
                            )}
                          </div>
                        ))}
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-purple-300 hover:bg-purple-50">
                          <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center">
                            <div className="rounded-full bg-purple-100 p-2 text-purple-600">
                              <Upload className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-slate-800">Upload images</p>
                              <p className="text-xs text-slate-500">Drag & drop or click to browse</p>
                            </div>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-2 font-medium text-slate-800">Image Guidelines</h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                            <span>Use high-resolution images (at least 1000×1000 pixels)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                            <span>Show the product from multiple angles</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                            <span>Include lifestyle images showing the product in use</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                            <span>Ensure good lighting and a clean background</span>
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Pricing Tab */}
                <TabsContent value="pricing" className="space-y-4 pt-2">
                  <Card className="overflow-hidden border-cherry-100 shadow-sm">
                    <div className="h-1.5 w-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <CardTitle>Pricing & Inventory</CardTitle>
                      </div>
                      <CardDescription>Set pricing and inventory details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-lg border border-green-100 bg-green-50/50 p-4">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-green-800">Regular Price (KSh)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-green-600" />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      className="border-green-200 bg-white pl-10 focus-visible:ring-green-500"
                                    />
                                  </div>
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
                                <FormLabel className="text-green-800">Sale Price (KSh)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-green-600" />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={value === null ? "" : value}
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e.target.value ? Number.parseFloat(e.target.value) : null)
                                        handleSalePriceChange(e)
                                      }}
                                      className="border-green-200 bg-white pl-10 focus-visible:ring-green-500"
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Leave empty if not on sale. Setting a sale price will automatically mark the product
                                  as "On Sale".
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {form.watch("price") > 0 &&
                          form.watch("sale_price") &&
                          (form.watch("sale_price") ?? 0) > 0 &&
                          (form.watch("sale_price") ?? 0) < (form.watch("price") ?? 0) && (
                            <div className="mt-4 rounded-md bg-green-100 p-3">
                              <div className="flex items-center gap-2 text-sm text-green-800">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>
                                  Discount:{" "}
                                  {Math.round(
                                    ((form.watch("price") - (form.watch("sale_price") || 0)) / form.watch("price")) *
                                      100,
                                  )}
                                  % off (KSh {(form.watch("price") - (form.watch("sale_price") || 0)).toLocaleString()}{" "}
                                  savings)
                                </span>
                              </div>
                            </div>
                          )}
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 p-4">
                          <FormField
                            control={form.control}
                            name="stock"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock Quantity</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} className="border-slate-200" />
                                </FormControl>
                                <FormDescription>Number of items available for purchase.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="rounded-lg border border-slate-200 p-4">
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
                                    onChange={(e) =>
                                      field.onChange(e.target.value ? Number.parseFloat(e.target.value) : null)
                                    }
                                    className="border-slate-200"
                                  />
                                </FormControl>
                                <FormDescription>Used for shipping calculations.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Variants Tab */}
                <TabsContent value="variants" className="space-y-4 pt-2">
                  <Card className="overflow-hidden border-cherry-100 shadow-sm">
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500"></div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-amber-600" />
                          <CardTitle>Product Variants</CardTitle>
                        </div>
                        <CardDescription>Manage different variations of your product.</CardDescription>
                      </div>
                      <Button
                        onClick={handleAddVariant}
                        disabled={isAddingVariant || isEditingVariant !== null}
                        className="bg-amber-500 text-white hover:bg-amber-600"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Variant
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {isAddingVariant || isEditingVariant !== null ? (
                        <Card className="border-2 border-dashed border-amber-300 bg-amber-50/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-amber-800">
                              {isEditingVariant !== null ? "Edit Variant" : "Add New Variant"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Form {...variantForm}>
                              <form onSubmit={variantForm.handleSubmit(onSubmitVariant)} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <FormField
                                    control={variantForm.control}
                                    name="color"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          <Palette className="h-4 w-4 text-amber-600" />
                                          <span>Color</span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="e.g., Red, Blue, Green"
                                            className="border-amber-200 bg-white focus-visible:ring-amber-500"
                                            value={field.value || ""}
                                          />
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
                                        <FormLabel className="flex items-center gap-2">
                                          <Palette className="h-4 w-4 text-amber-600" />
                                          <span>Size</span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="e.g., S, M, L, XL"
                                            className="border-amber-200 bg-white focus-visible:ring-amber-500"
                                            value={field.value || ""}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                  <FormField
                                    control={variantForm.control}
                                    name="price"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          <DollarSign className="h-4 w-4 text-amber-600" />
                                          <span>Price (KSh)</span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            {...field}
                                            className="border-amber-200 bg-white focus-visible:ring-amber-500"
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
                                        <FormLabel className="flex items-center gap-2">
                                          <Package className="h-4 w-4 text-amber-600" />
                                          <span>Stock</span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="0"
                                            {...field}
                                            className="border-amber-200 bg-white focus-visible:ring-amber-500"
                                          />
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
                                        <FormLabel className="flex items-center gap-2">
                                          <Tag className="h-4 w-4 text-amber-600" />
                                          <span>SKU</span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            className="border-amber-200 bg-white focus-visible:ring-amber-500"
                                            value={field.value || ""}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setIsAddingVariant(false)
                                      setIsEditingVariant(null)
                                    }}
                                    className="border-amber-200 text-amber-800 hover:bg-amber-50"
                                  >
                                    Cancel
                                  </Button>
                                  <Button type="submit" className="bg-amber-500 text-white hover:bg-amber-600">
                                    {isEditingVariant !== null ? "Update Variant" : "Add Variant"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </CardContent>
                        </Card>
                      ) : null}

                      {variants.length > 0 ? (
                        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b bg-slate-50">
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Color
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Size
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Price
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Stock
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                                    SKU
                                  </th>
                                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {variants.map((variant, index) => (
                                  <tr key={variant.id} className="hover:bg-slate-50">
                                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                                      {variant.color ? (
                                        <div className="flex items-center gap-2">
                                          <div
                                            className="h-4 w-4 rounded-full border border-slate-300"
                                            style={{ backgroundColor: variant.color.toLowerCase() }}
                                          ></div>
                                          <span>{variant.color}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                                      {variant.size || <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                                      KSh {variant.price.toLocaleString()}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                                      {variant.stock <= 0 ? (
                                        <Badge variant="destructive" className="font-normal">
                                          Out of stock
                                        </Badge>
                                      ) : variant.stock < 10 ? (
                                        <Badge
                                          variant="outline"
                                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                        >
                                          Low stock ({variant.stock})
                                        </Badge>
                                      ) : (
                                        <span className="font-medium text-green-600">{variant.stock}</span>
                                      )}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                                      {variant.sku || <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditVariant(variant, index)}
                                          disabled={isAddingVariant || isEditingVariant !== null}
                                          className="h-8 rounded-md px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                        >
                                          <Edit className="mr-1 h-3.5 w-3.5" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteVariant(index)}
                                          disabled={isAddingVariant || isEditingVariant !== null}
                                          className="h-8 rounded-md px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        >
                                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                                          Delete
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                          <div className="mb-3 rounded-full bg-amber-100 p-3 text-amber-600">
                            <Layers className="h-6 w-6" />
                          </div>
                          <h3 className="mb-1 text-lg font-medium text-slate-800">No variants yet</h3>
                          <p className="mb-4 max-w-md text-sm text-slate-500">
                            Variants allow you to offer different options like sizes and colors for the same product.
                          </p>
                          <Button onClick={handleAddVariant} className="bg-amber-500 text-white hover:bg-amber-600">
                            <Plus className="mr-2 h-4 w-4" /> Add Your First Variant
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SEO Tab */}
                <TabsContent value="seo" className="space-y-4 pt-2">
                  <Card className="overflow-hidden border-cherry-100 shadow-sm">
                    <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-cyan-600" />
                        <CardTitle>SEO & Visibility</CardTitle>
                      </div>
                      <CardDescription>
                        Optimize your product for search engines and set visibility options.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-4">
                        <FormField
                          control={form.control}
                          name="meta_title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-cyan-800">Meta Title</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="border-cyan-200 bg-white focus-visible:ring-cyan-500"
                                  placeholder={product?.name || "Product title for search engines"}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Leave empty to use the product name. Recommended length: 50-60 characters.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="mt-4">
                          <FormField
                            control={form.control}
                            name="meta_description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-cyan-800">Meta Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Brief description for search results..."
                                    className="min-h-20 resize-y border-cyan-200 bg-white focus-visible:ring-cyan-500"
                                    value={field.value || ""}
                                  />
                                </FormControl>
                                <FormDescription>
                                  A short description for search engine results. Recommended length: 150-160 characters.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                          <h3 className="font-medium text-slate-800">Product Visibility</h3>

                          <FormField
                            control={form.control}
                            name="is_featured"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 bg-white p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="border-purple-300 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-purple-900">Featured Product</FormLabel>
                                  <FormDescription>
                                    Display this product in featured sections on your homepage and category pages.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="is_new"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 bg-white p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-blue-900">New Product</FormLabel>
                                  <FormDescription>
                                    Mark this product as new. New products may appear in "New Arrivals" sections.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                          <h3 className="font-medium text-slate-800">Special Promotions</h3>

                          <FormField
                            control={form.control}
                            name="is_flash_sale"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 bg-white p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="border-orange-300 data-[state=checked]:bg-orange-600 data-[state=checked]:text-white"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-orange-900">Flash Sale</FormLabel>
                                  <FormDescription>
                                    Include this product in flash sales and time-limited promotions.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="is_luxury_deal"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-slate-200 bg-white p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="border-cherry-300 data-[state=checked]:bg-cherry-600 data-[state=checked]:text-white"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-cherry-900">Luxury Deal</FormLabel>
                                  <FormDescription>
                                    Mark this product as a luxury or premium item with special treatment.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <h3 className="mb-2 font-medium text-slate-800">SEO Preview</h3>
                        <div className="rounded-md border border-slate-200 bg-white p-4">
                          <div className="mb-1 text-sm text-green-600">
                            {window.location.origin}/product/{form.watch("slug") || "product-url"}
                          </div>
                          <div className="mb-1 text-lg font-medium text-blue-800">
                            {form.watch("meta_title") || form.watch("name") || "Product Title"}
                          </div>
                          <div className="text-sm text-slate-600">
                            {form.watch("meta_description") ||
                              (form.watch("description") ? form.watch("description")?.substring(0, 160) : "") ||
                              "Product description will appear here. Add a meta description to customize what appears in search results."}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="border-t border-cherry-100 bg-cherry-50/40 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
            <Button
              variant="outline"
              onClick={() => handleNavigation("/admin/products")}
              className="border-cherry-200 text-cherry-700 hover:bg-cherry-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleNavigation(`/admin/products/${id}`)}
                className="border-cherry-200 text-cherry-700 hover:bg-cherry-50"
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#C01031] to-[#7D0A24] text-white hover:from-[#9F0F2E] hover:to-[#7D0A24] shadow-md hover:shadow-lg transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Success message */}
      {saveSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-green-100 border border-green-200 text-green-800 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="font-medium">Product Updated</h3>
            <p className="text-sm">Your changes have been saved successfully</p>
          </div>
        </div>
      )}

      {/* Unsaved changes dialog */}
      <Dialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
        <DialogContent className="border-none bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Unsaved Changes</DialogTitle>
            <DialogDescription className="text-white/70">
              You have unsaved changes that will be lost if you leave this page.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-lg bg-amber-500/10 p-4 text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <div>
                <h4 className="font-medium">Warning</h4>
                <p className="text-sm text-amber-200/80">Any changes you've made will not be saved.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setUnsavedChangesDialog(false)}
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Stay on Page
            </Button>
            <Button
              onClick={() => {
                setUnsavedChangesDialog(false)
                router.push(navigateTo)
              }}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Leave Without Saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProductUpdateNotification showToasts={false} />
    </div>
  )
}

