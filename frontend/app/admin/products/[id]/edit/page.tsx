"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { adminService } from "@/services/admin"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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
import { useProductForm } from "@/styles/hooks/use-product-form"
import { FormProvider } from "react-hook-form"
import type { Product } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { websocketService } from "@/services/websocket"

export default function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, logout, refreshAccessToken } = useAdminAuth()

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
  const [dataFetched, setDataFetched] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // Fixed: Declare isSubmitting here
  const isUpdatingForm = useRef(false) // Fixed: Declare isUpdatingForm here
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null) // Fixed: Correct type
  const fetchAttemptRef = useRef(0)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  // Initialize form with custom hook
  const {
    form,
    formState,
    isSubmitting: isFormSubmitting,
    formChanged,
    setFormChanged,
    images,
    setImages,
    variants,
    setVariants,
    resetForm,
    handleSubmit,
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

  // Function to handle auto-save
  const handleAutoSave = async () => {
    if (!formChanged || isSubmitting) return

    try {
      if (await ensureValidToken()) {
        setIsSubmitting(true)

        const values = form.getValues()

        await handleSubmit(values)

        setLastAutoSave(new Date().toLocaleTimeString())

        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
      setIsSubmitting(false)
    }
  }

  // Set up auto-save timer when enabled
  useEffect(() => {
    if (autoSaveEnabled && formChanged) {
      // Auto-save every 2 minutes if there are changes
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setInterval(handleAutoSave, 2 * 60 * 1000)
    } else if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [autoSaveEnabled, formChanged, isSubmitting])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch product data, categories, and brands
  useEffect(() => {
    // Skip if not authenticated or already fetched
    if (!isAuthenticated || dataFetched || authLoading) return

    console.log("Fetching product data...")

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setApiError(null)

        // Fetch product data
        console.log("Fetching product with ID:", id)

        // Limit fetch attempts to prevent infinite loops
        if (fetchAttemptRef.current >= 3) {
          throw new Error("Failed to load product after multiple attempts. Please try again later.")
        }

        fetchAttemptRef.current += 1

        const productData = await adminService.getProduct(id)
        console.log("Product data received:", productData)

        if (!productData) {
          throw new Error("Product not found")
        }

        // Initialize form with product data
        resetForm(productData)

        // Mark form as ready after initialization
        setFormReady(true)

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
        fetchAttemptRef.current = 0
      } catch (error: any) {
        console.error("Error fetching product data:", error)
        setApiError(error.message || "Failed to load product data. Please try again.")
        toast({
          title: "Error",
          description: error.message || "Failed to load product data. Please try again.",
          variant: "destructive",
        })
      } finally {
        // Always set loading to false, even if there's an error
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, isAuthenticated, resetForm, authLoading])

  // Ensure token is valid before form submission
  const ensureValidToken = async (): Promise<boolean> => {
    try {
      await refreshAccessToken()
      console.log("Token refreshed successfully before form submission")
      return true
    } catch (error: any) {
      console.error("Token refresh failed:", error)
      toast({
        title: "Authentication Error",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      })
      logout() // Explicitly logout the user
      setTimeout(() => {
        router.push("/admin/login")
      }, 500)
      return false
    }
  }

  // Handle navigation with unsaved changes check
  const handleNavigation = (path: string) => {
    if (formChanged) {
      setNavigateTo(path)
      setUnsavedChangesDialog(true)
    } else {
      router.push(path)
    }
  }

  // Add a useEffect to check for unsaved changes when leaving the page
  useEffect(() => {
    // Function to handle beforeunload event
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formChanged) {
        // Standard way to show a confirmation dialog before leaving
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload)

    // Clean up
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [formChanged])

  // Enhance the saveSectionChanges function to dispatch events for real-time updates
  const saveSectionChanges = useCallback(
    async (section: string): Promise<boolean> => {
      try {
        // Show saving toast
        toast({
          title: `Saving ${section}`,
          description: "Please wait while your changes are being saved...",
        })

        setIsSubmitting(true)
        setApiError(null)

        // Ensure we have a valid token
        if (!(await ensureValidToken())) {
          setIsSubmitting(false)
          return false
        }

        // Get current form values
        const formValues = form.getValues()

        // Prepare product data for submission
        const productData = {
          ...formValues,
          image_urls: images,
          thumbnail_url: images.length > 0 ? images[0] : null,
          variants: variants,
        }

        // If the brand_id is 0 (from the "None" option), set it to null
        if (productData.brand_id === 0) {
          productData.brand_id = null
        }

        console.log(`Submitting ${section} data for product ID: ${id}`)

        // Dispatch event to notify that update is starting
        if (typeof window !== "undefined") {
          const startEvent = new CustomEvent("product-update-start", {
            detail: { id, section },
          })
          window.dispatchEvent(startEvent)
        }

        // Direct API call to update the product
        const token = localStorage.getItem("admin_token")
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.")
        }

        // Set up headers with authentication
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }

        // Add a timeout to ensure the request doesn't hang
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        try {
          // Make the API call with proper headers and timeout
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/products/${id}`, {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(productData),
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          // Check if the response is ok
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error("API error response:", errorData)
            throw new Error(errorData.message || `Failed to update product. Status: ${response.status}`)
          }

          // Parse the response
          const updatedProduct = await response.json()
          console.log(`${section} updated successfully for product: ${updatedProduct.name}`)

          // Update the UI
          setProduct(updatedProduct)
          setSaveSuccess(true)
          setLastSaved(new Date().toLocaleTimeString())
          setFormChanged(false)

          toast({
            title: `${section} Updated Successfully`,
            description: `${updatedProduct.name} has been updated with the latest information.`,
          })

          // Hide success message after 3 seconds
          setTimeout(() => {
            setSaveSuccess(false)
          }, 3000)

          // Update local storage to track last saved time
          try {
            localStorage.setItem(`product_${id}_last_saved`, new Date().toISOString())
          } catch (storageError) {
            console.warn("Could not save to localStorage:", storageError)
          }

          // Notify about product update via WebSocket
          try {
            websocketService.emit("product_updated", {
              id: id,
              timestamp: Date.now(),
              section: section,
              product: updatedProduct,
            })
            console.log("WebSocket notification sent for product update")

            // Also dispatch a custom event that components can listen for
            if (typeof window !== "undefined") {
              const event = new CustomEvent("product-updated", {
                detail: { id, product: updatedProduct, section },
              })
              window.dispatchEvent(event)
              console.log("Custom event dispatched for product update")
            }
          } catch (notifyError) {
            console.warn("Failed to notify about product update:", notifyError)
          }

          // Refresh the product data to ensure we have the latest version
          const refreshedProduct = await adminService.getProduct(id)
          if (refreshedProduct) {
            // Temporarily disable form change tracking during reset
            isUpdatingForm.current = true
            resetForm(refreshedProduct)
            isUpdatingForm.current = false
          }

          return true
        } catch (fetchError: any) {
          clearTimeout(timeoutId)

          if (fetchError.name === "AbortError") {
            console.error("Update request timed out")
            throw new Error("Request timed out. Please try again.")
          }

          throw fetchError
        }
      } catch (error: any) {
        console.error("Error in saveSectionChanges:", error)

        toast({
          title: "Error Saving Changes",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })

        // Check if this is an authentication error
        if (error.response?.status === 401 || error.message?.includes("Authentication")) {
          throw new Error("Authentication failed. Your session has expired. Please log in again.")
        }

        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [id, form, images, variants, isAuthenticated, refreshAccessToken, toast, setProduct, resetForm, setFormChanged],
  )

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={() => handleNavigation("/admin/products")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Products
              </Button>
              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                Edit Product: {product?.name}
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        {apiError && (
          <div className="px-6 pt-2">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          </div>
        )}

        <CardContent className="p-0">
          <FormProvider {...form}>
            <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b">
                <TabsList className="bg-transparent h-auto p-0 w-full flex overflow-x-auto">
                  <TabsTrigger
                    value="basic"
                    className="flex-1 data-[state=active]:bg-orange-50 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none py-3 px-4"
                  >
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger
                    value="pricing"
                    className="flex-1 data-[state=active]:bg-orange-50 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none py-3 px-4"
                  >
                    Pricing & Inventory
                  </TabsTrigger>
                  <TabsTrigger
                    value="images"
                    className="flex-1 data-[state=active]:bg-orange-50 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none py-3 px-4"
                  >
                    Images
                  </TabsTrigger>
                  <TabsTrigger
                    value="variants"
                    className="flex-1 data-[state=active]:bg-orange-50 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none py-3 px-4"
                  >
                    Variants
                  </TabsTrigger>
                  <TabsTrigger
                    value="seo"
                    className="flex-1 data-[state=active]:bg-orange-50 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none py-3 px-4"
                  >
                    SEO
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="basic" className="mt-0">
                  <ProductBasicInfoTab
                    form={form}
                    categories={categories}
                    brands={brands}
                    isLoadingCategories={isLoadingCategories}
                    isLoadingBrands={isLoadingBrands}
                    brandError={brandError}
                    saveSectionChanges={saveSectionChanges}
                  />
                </TabsContent>

                <TabsContent value="pricing" className="mt-0">
                  <ProductPricingInventoryTab form={form} saveSectionChanges={saveSectionChanges} />
                </TabsContent>

                <TabsContent value="images" className="mt-0">
                  <ProductImagesTab
                    images={images}
                    setImages={setImages}
                    setFormChanged={setFormChanged}
                    saveSectionChanges={saveSectionChanges}
                  />
                </TabsContent>

                <TabsContent value="variants" className="mt-0">
                  <ProductVariantsTab
                    variants={variants}
                    setVariants={setVariants}
                    productId={Number(id)}
                    setFormChanged={setFormChanged}
                    productPrice={product?.price || 0}
                    saveSectionChanges={saveSectionChanges}
                  />
                </TabsContent>

                <TabsContent value="seo" className="mt-0">
                  <ProductSeoTab form={form} saveSectionChanges={saveSectionChanges} />
                </TabsContent>
              </div>
            </Tabs>
          </FormProvider>
        </CardContent>
      </Card>

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
    </div>
  )
}
