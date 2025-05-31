"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FormProvider } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Product } from "@/types"
import { useToast } from "@/components/ui/use-toast"
import { useAdminAuth } from "@/contexts/admin/auth-context"
import { ArrowLeft, Save } from "lucide-react"
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
import { ProductBasicInfoTab as ProductBasicInfoTabComponent } from "@/components/admin/products/product-basic-info-tab"
import { ProductPricingInventoryTab } from "@/components/admin/products/product-pricing-inventory-tab"
import { ProductImagesTab } from "@/components/admin/products/product-images-tab"
import { ProductVariantsTab } from "@/components/admin/products/product-variants-tab"
import { ProductSeoTab } from "@/components/admin/products/product-seo-tab"
import { useProductForm } from "@/hooks/use-product-form"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { websocketService } from "@/services/websocket"
import { useProduct, useProductImages, useCategories, useBrands } from "@/hooks/use-swr-product"
import { NetworkDetector } from "@/components/network-detector"
import { imageCache } from "@/services/image-cache"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Product name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  price: z.string().refine(
    (value) => {
      try {
        const parsed = Number.parseFloat(value)
        return !isNaN(parsed) && parsed > 0
      } catch (error) {
        return false
      }
    },
    {
      message: "Price must be a valid number greater than 0.",
    },
  ),
  categoryId: z.string().min(1, {
    message: "Please select a category.",
  }),
  brandId: z.string().min(1, {
    message: "Please select a brand.",
  }),
  images: z.array(z.string()).optional(),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  size: z.string().optional(),
  color: z.string().optional(),
})

interface EditProductClientProps {
  productId: string
}

// Function to check if productId is a valid number
const isValidProductId = (productId: string): boolean => {
  return !isNaN(Number(productId)) && Number(productId) > 0
}

// Client component that receives the unwrapped productId as a prop
export function EditProductClient({ productId }: { productId: string }) {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, logout, refreshAccessToken } = useAdminAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const {
    data: product,
    isLoading: isLoadingProduct,
    error: productError,
    mutate: mutateProduct,
  } = useProduct(productId)
  const {
    images: productImages,
    isLoading: isLoadingImages,
    mutate: mutateImages,
  } = useProductImages(isValidProductId(productId) ? productId : undefined)
  const { data: categories, isLoading: isLoadingCategories, error: categoriesError } = useCategories()
  const { data: brands, isLoading: isLoadingBrands, error: brandsError } = useBrands()
  const [activeTab, setActiveTab] = useState("basic")
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false)
  const [navigateTo, setNavigateTo] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [brandError, setBrandError] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const { isSubmitting: isFormSubmitting } = useProductForm({
    productId,
    onSuccess: () => {},
    onError: () => {},
  }).formState
  const [isSubmitting, setIsSubmitting] = useState(isFormSubmitting)
  const isUpdatingForm = useRef(false)
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fetchAttemptRef = useRef(0)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [manualSaveAttempted, setManualSaveAttempted] = useState(false)
  const [reconnectingImages, setReconnectingImages] = useState(false)

  // Initialize form with custom hook
  const {
    form,
    formState,
    isSubmitting: isFormSubmittingInner,
    formChanged,
    setFormChanged,
    images,
    setImages,
    variants,
    setVariants,
    resetForm,
    handleSubmit,
  } = useProductForm({
    productId,
    onSuccess: (updatedProduct: Product) => {
      setSaveSuccess(true)
      setLastSaved(new Date().toLocaleTimeString())
      setFormChanged(false)

      // Cache images to prevent loss on refresh
      if (images && images.length > 0) {
        imageCache.cacheProductImages(productId, images)
      }

      toast({
        title: "Product Updated Successfully",
        description: `${updatedProduct.name} has been updated with the latest information.`,
      })

      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
      mutateProduct()
      mutateImages()
    },
    onError: (error: string) => {
      setApiError(error)
      toast({
        title: "Update Failed",
        description: error,
        variant: "destructive",
      })
    },
  })

  // Try to recover images from cache if they're not available
  useEffect(() => {
    if (productId && (!images || images.length === 0) && !isLoadingImages) {
      // Set reconnecting state
      setReconnectingImages(true)

      // Try to get images from cache
      const cachedImages = imageCache.getProductImages(productId)
      if (cachedImages && cachedImages.length > 0) {
        console.log(`Recovered ${cachedImages.length} images from cache for product ${productId}`)
        setImages(cachedImages)
        toast({
          title: "Images Recovered",
          description: `Successfully recovered ${cachedImages.length} product images that were previously uploaded.`,
        })
      } else if (productImages && productImages.length > 0) {
        // Fall back to any images from SWR cache
        console.log(`Using ${productImages.length} images from API for product ${productId}`)
        const imageUrls = productImages.map((img: any) => (typeof img === "string" ? img : img.url))
        setImages(imageUrls)
        // Also cache these for future use
        imageCache.cacheProductImages(productId, imageUrls)
      }

      setReconnectingImages(false)
    }
  }, [productId, images, setImages, isLoadingImages, productImages, toast])

  // Update the handleAutoSave function to check network status
  const handleAutoSave = async () => {
    if (!formChanged || isSubmitting || !isOnline) return

    try {
      if (await ensureValidToken()) {
        setIsSubmitting(true)

        const values = form.getValues()

        await handleSubmit(values)

        // Store images in cache after save
        if (images && images.length > 0) {
          imageCache.cacheProductImages(productId, images)
        }

        setLastAutoSave(new Date().toLocaleTimeString())

        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
      setIsSubmitting(false)
    }
  }

  // Handle manual save button click
  const handleManualSave = async () => {
    if (!formChanged || isSubmitting || !isOnline) return

    setManualSaveAttempted(true)
    try {
      if (await ensureValidToken()) {
        setIsSubmitting(true)

        const values = form.getValues()

        await handleSubmit(values)

        // Important: Cache images after save for persistence
        if (images && images.length > 0) {
          imageCache.cacheProductImages(productId, images)
        }

        setLastSaved(new Date().toLocaleTimeString())
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Manual save failed:", error)
      toast({
        title: "Save Failed",
        description: "There was a problem saving your changes. Please try again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    } finally {
      setManualSaveAttempted(false)
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
  }, [autoSaveEnabled, formChanged, isSubmitting, isOnline])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Update the resetForm call to use the SWR product data when it becomes available
  useEffect(() => {
    if (product && !isLoadingProduct) {
      console.log("SWR product data loaded:", product)

      // Check if product has valid data
      if (product.id) {
        console.log("Resetting form with valid product data")
        resetForm(product)
        setFormReady(true)
        setDataFetched(true)

        // Check and use cached images if available
        const cachedImages = imageCache.getProductImages(productId)
        if (cachedImages && cachedImages.length > 0 && (!product.image_urls || product.image_urls.length === 0)) {
          // Product doesn't have images but we have cached ones, use those
          setImages(cachedImages)
          console.log(`Using ${cachedImages.length} cached images for product ${productId}`)
        } else if (product.image_urls && product.image_urls.length > 0) {
          // Cache product images for persistence
          setImages(product.image_urls)
          imageCache.cacheProductImages(productId, product.image_urls)
        }
      } else {
        console.error("Product data is invalid:", product)

        // Try to load product from localStorage as fallback
        try {
          const localStorageKey = `product_${productId}`
          const savedProductData = localStorage.getItem(localStorageKey)
          if (savedProductData) {
            const savedProduct = JSON.parse(savedProductData)
            console.log("Using product data from localStorage:", savedProduct)
            resetForm(savedProduct)
            setFormReady(true)
            setDataFetched(true)

            // Also try to get images from localStorage
            const cachedImages = imageCache.getProductImages(productId)
            if (cachedImages && cachedImages.length > 0) {
              setImages(cachedImages)
            }
          } else {
            toast({
              title: "Error Loading Product",
              description: "Could not load product details. Please try again.",
              variant: "destructive",
            })
          }
        } catch (localStorageError) {
          console.error("Error loading product from localStorage:", localStorageError)
          toast({
            title: "Error Loading Product",
            description: "Could not load product details. Please try again.",
            variant: "destructive",
          })
        }
      }
    } else if (productError) {
      console.error("Error loading product:", productError)

      // Try to load product from localStorage as fallback
      try {
        const localStorageKey = `product_${productId}`
        const savedProductData = localStorage.getItem(localStorageKey)
        if (savedProductData) {
          const savedProduct = JSON.parse(savedProductData)
          console.log("Using product data from localStorage after API error:", savedProduct)
          resetForm(savedProduct)
          setFormReady(true)
          setDataFetched(true)

          // Also try to get images from localStorage
          const cachedImages = imageCache.getProductImages(productId)
          if (cachedImages && cachedImages.length > 0) {
            setImages(cachedImages)
          }
        } else {
          toast({
            title: "Error Loading Product",
            description: "Failed to load product details. Please try again.",
            variant: "destructive",
          })
        }
      } catch (localStorageError) {
        console.error("Error loading product from localStorage:", localStorageError)
        toast({
          title: "Error Loading Product",
          description: "Failed to load product details. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [product, isLoadingProduct, productError, resetForm, productId, setImages, toast])

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
        // Cache images before unload to prevent loss
        if (images && images.length > 0) {
          imageCache.cacheProductImages(productId, images)
        }

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
  }, [formChanged, productId, images])

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

        console.log(`Submitting ${section} data for product ID: ${productId}`)

        // Dispatch event to notify that update is starting
        if (typeof window !== "undefined") {
          const startEvent = new CustomEvent("product-update-start", {
            detail: { id: productId, section },
          })
          window.dispatchEvent(startEvent)
        }

        // Direct API call to update the product
        const token = localStorage.getItem("admin_token") || localStorage.getItem("mizizzi_token")
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
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/products/${productId}`, {
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

          // Cache images after successful save
          if (images && images.length > 0) {
            imageCache.cacheProductImages(productId, images)
          }

          // Update the UI
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
            localStorage.setItem(`product_${productId}_last_saved`, new Date().toISOString())
          } catch (storageError) {
            console.warn("Could not save to localStorage:", storageError)
          }

          // Notify about product update via WebSocket
          try {
            websocketService.emit("product_updated", {
              id: productId,
              timestamp: Date.now(),
              section: section,
              product: updatedProduct,
            })
            console.log("WebSocket notification sent for product update")

            // Also dispatch a custom event that components can listen for
            if (typeof window !== "undefined") {
              const event = new CustomEvent("product-updated", {
                detail: { id: productId, product: updatedProduct, section },
              })
              window.dispatchEvent(event)
              console.log("Custom event dispatched for product update")
            }
          } catch (notifyError) {
            console.warn("Failed to notify about product update:", notifyError)
          }

          mutateProduct()
          mutateImages()

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
    [
      productId,
      form,
      images,
      variants,
      isAuthenticated,
      refreshAccessToken,
      toast,
      resetForm,
      setFormChanged,
      mutateProduct,
      mutateImages,
    ],
  )

  // Add useEffect to listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Set initial state
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Add a debug component to show loading state and errors
  const DebugInfo = () => {
    if (isLoadingProduct) {
      return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
          <p className="text-blue-700">Loading product data...</p>
        </div>
      )
    }

    if (productError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
          <p className="text-red-700">Error loading product: {productError.message}</p>
        </div>
      )
    }

    if (!product) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
          <p className="text-yellow-700">No product data available</p>
        </div>
      )
    }

    return null
  }

  // Add the DebugInfo component to the render function, right after the NetworkDetector
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <NetworkDetector />
      <DebugInfo />
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

            {/* Add a save button in the header for easy access */}
            <Button
              variant="default"
              onClick={handleManualSave}
              disabled={isSubmitting || !formChanged || !isOnline}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </CardHeader>

        {apiError && (
          <div className="px-6 pt-2">
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          </div>
        )}

        {reconnectingImages && (
          <div className="px-6 pt-2">
            <Alert className="mb-4 bg-orange-50 border-orange-200">
              <AlertDescription>Attempting to recover your product images...</AlertDescription>
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
                  <ProductBasicInfoTabComponent
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
                    productId={productId}
                  />
                </TabsContent>

                <TabsContent value="variants" className="mt-0">
                  <ProductVariantsTab
                    variants={variants}
                    setVariants={setVariants}
                    productId={Number(productId)}
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

        {formChanged && (
          <CardFooter className="border-t p-4 bg-orange-50 flex justify-between items-center">
            <div className="text-sm text-orange-600">
              You have unsaved changes. Don't forget to save before leaving this page.
            </div>
            <Button
              onClick={handleManualSave}
              disabled={isSubmitting || !isOnline}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </Button>
          </CardFooter>
        )}
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

interface ProductBasicInfoTabProps {
  form: any
  categories: { id: string; name: string }[]
  brands: { id: string; name: string }[]
  isLoadingCategories: boolean
  isLoadingBrands: boolean
  brandError: boolean
  saveSectionChanges: (section: string) => Promise<boolean>
}

const ProductBasicInfoTab: React.FC<ProductBasicInfoTabProps> = ({
  form,
  categories,
  brands,
  isLoadingCategories,
  isLoadingBrands,
  brandError,
  saveSectionChanges,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Product name" {...field} />
            </FormControl>
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
              <Input placeholder="Product description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Price</FormLabel>
            <FormControl>
              <Input type="number" placeholder="Product price" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {isLoadingCategories ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
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
      <FormField
        control={form.control}
        name="brandId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {isLoadingBrands ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : brandError ? (
                  <SelectItem value="error" disabled>
                    Error loading brands
                  </SelectItem>
                ) : (
                  brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
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
      <Button type="button" onClick={() => saveSectionChanges("basic")}>
        Save Basic Info
      </Button>
    </div>
  )
}

import type { ProductFormValues } from "@/hooks/use-product-form"
import { adminService } from "@/services/admin"

const handleSubmit = async (
  data: ProductFormValues,
  productId: string,
  images: string[],
  variants: any[],
  onSuccess: (updatedProduct: Product) => void,
  onError: (message: string) => void,
  setIsSubmitting: (isSubmitting: boolean) => void,
) => {
  try {
    setIsSubmitting(true)
    console.log("Form submission started with data:", data)

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

    console.log("Submitting product data:", productData)

    // Save to localStorage for backup
    try {
      localStorage.setItem(`product_${productId}`, JSON.stringify(productData))
    } catch (storageError) {
      console.warn("Could not save to localStorage:", storageError)
    }

    // Update the product
    try {
      const updatedProduct = await adminService.updateProduct(productId, productData)
      console.log("Product updated successfully:", updatedProduct)

      // Call the success callback
      onSuccess(updatedProduct)

      // Update local storage to track last saved time
      try {
        localStorage.setItem(`product_${productId}_last_saved`, new Date().toISOString())
      } catch (storageError) {
        console.warn("Could not save to localStorage:", storageError)
      }
    } catch (updateError: any) {
      console.error("Error during product update:", updateError)
      // Check if this is an authentication error
      if (
        updateError.response?.status === 401 ||
        (updateError.message && updateError.message.includes("Authentication"))
      ) {
        throw new Error("Authentication failed. Please log in again.")
      }
      throw updateError
    }
  } catch (error: any) {
    console.error("Failed to update product:", error)
    const errorMessage = error.message || "There was a problem updating the product. Please try again."
    onError(errorMessage)

    // Check if this is an authentication error that should trigger a redirect
    if (error.message && error.message.includes("Authentication failed")) {
      // We'll handle the redirect in the component that uses this hook
      onError("Authentication failed. Please log in again.")
    }
  } finally {
    setIsSubmitting(false)
  }
}
