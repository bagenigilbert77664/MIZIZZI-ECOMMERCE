"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, Save } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProductBasicInfoTab } from "@/components/admin/products/product-basic-info-tab"
import { ProductPricingInventoryTab } from "@/components/admin/products/product-pricing-inventory-tab"
import { ProductImagesTab } from "@/components/admin/products/product-images-tab"
import { ProductVariantsTab } from "@/components/admin/products/product-variants-tab"
import { ProductSeoTab } from "@/components/admin/products/product-seo-tab"
import { ProductDeleteDialog } from "@/components/admin/products/product-delete-dialog"
import { useProductForm } from "@/hooks/use-product-form"
import type { Product } from "@/types"

export default function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [activeTab, setActiveTab] = useState("basic")
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false)
  const [navigateTo, setNavigateTo] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [brandError, setBrandError] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)

  // Initialize form with custom hook
  const {
    form,
    formState,
    isSubmitting,
    formChanged,
    setFormChanged,
    images,
    setImages,
    variants,
    setVariants,
    handleSubmit,
    resetForm,
  } = useProductForm({
    productId: id,
    onSuccess: (updatedProduct) => {
      setProduct(updatedProduct)
      setSaveSuccess(true)
      setLastSaved(new Date().toLocaleTimeString())
      setFormChanged(false)

      toast({
        title: "Product Updated Successfully",
        description: `${updatedProduct.name} has been updated with the latest information.`,
      })

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    },
    onError: (error) => {
      setApiError(error)
      toast({
        title: "Update Failed",
        description: error,
        variant: "destructive",
      })
    },
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch product data, categories, and brands - using useCallback to prevent infinite loops
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || dataFetched) return

    setIsLoading(true)
    setApiError(null)

    try {
      // Fetch product data
      const productData = await adminService.getProduct(id)
      setProduct(productData)

      // Initialize form with product data
      resetForm(productData)

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

      // Mark data as fetched to prevent additional fetches
      setDataFetched(true)
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
  }, [id, isAuthenticated, resetForm, dataFetched])

  // Call fetchData only once when component mounts and auth is ready
  useEffect(() => {
    if (isAuthenticated && !dataFetched) {
      fetchData()
    }
  }, [isAuthenticated, fetchData, dataFetched])

  // Handle navigation with unsaved changes check
  const handleNavigation = (path: string) => {
    if (formChanged) {
      setNavigateTo(path)
      setUnsavedChangesDialog(true)
    } else {
      router.push(path)
    }
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

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-cherry-600" />
        <span className="ml-2">Loading product data...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleNavigation("/admin/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <h1 className="text-2xl font-bold">Edit Product: {product?.name}</h1>
        </div>
        <div className="flex items-center space-x-2">
          {saveSuccess && <span className="text-sm text-green-600">Saved at {lastSaved}</span>}
          <Button onClick={form.handleSubmit(handleSubmit)} disabled={isSubmitting || !formChanged}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            Delete Product
          </Button>
        </div>
      </div>

      {apiError && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <ProductBasicInfoTab
            form={form}
            categories={categories}
            brands={brands}
            isLoadingCategories={isLoadingCategories}
            isLoadingBrands={isLoadingBrands}
            brandError={brandError}
          />
        </TabsContent>

        <TabsContent value="pricing">
          <ProductPricingInventoryTab form={form} />
        </TabsContent>

        <TabsContent value="images">
          <ProductImagesTab images={images} setImages={setImages} setFormChanged={setFormChanged} />
        </TabsContent>

        <TabsContent value="variants">
          <ProductVariantsTab
            variants={variants}
            setVariants={setVariants}
            productId={Number(id)}
            setFormChanged={setFormChanged}
            productPrice={product?.price || 0}
          />
        </TabsContent>

        <TabsContent value="seo">
          <ProductSeoTab form={form} />
        </TabsContent>
      </Tabs>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setUnsavedChangesDialog(false)
                router.push(navigateTo)
              }}
            >
              Leave Page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Product Dialog */}
      <ProductDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDeleteProduct}
        productName={product?.name || "this product"}
      />
    </div>
  )
}

