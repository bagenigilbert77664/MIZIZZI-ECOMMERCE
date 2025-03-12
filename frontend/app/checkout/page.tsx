"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/contexts/cart/cart-context"
import { useAuth } from "@/contexts/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader } from "@/components/ui/loader"
import { AlertCircle, CreditCard, Landmark, Phone, Truck } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

export default function CheckoutPage() {
  const { items, subtotal, shipping, total, isLoading, error } = useCart()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Shipping address
    shipping_first_name: user?.first_name || "",
    shipping_last_name: user?.last_name || "",
    shipping_email: user?.email || "",
    shipping_phone: user?.phone || "",
    shipping_address: "",
    shipping_city: "",
    shipping_state: "",
    shipping_postal_code: "",

    // Billing address (same as shipping by default)
    billing_same_as_shipping: true,
    billing_first_name: "",
    billing_last_name: "",
    billing_email: "",
    billing_phone: "",
    billing_address: "",
    billing_city: "",
    billing_state: "",
    billing_postal_code: "",

    // Payment and shipping
    payment_method: "mpesa",
    shipping_method: "standard",
    notes: "",
    coupon_code: "",
  })

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle radio button changes
  const handleRadioChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  // Calculate tax (16% VAT)
  const tax = Math.round(subtotal * 0.16)
  const finalTotal = total + tax

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/checkout")
      return
    }

    if (items.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Your cart is empty. Add items before checking out.",
        variant: "destructive",
      })
      router.push("/products")
      return
    }

    try {
      setIsSubmitting(true)
      setCheckoutError(null)

      // Prepare shipping address
      const shippingAddress = {
        first_name: formData.shipping_first_name,
        last_name: formData.shipping_last_name,
        email: formData.shipping_email,
        phone: formData.shipping_phone,
        address_line1: formData.shipping_address,
        city: formData.shipping_city,
        state: formData.shipping_state,
        postal_code: formData.shipping_postal_code,
        country: "Kenya", // Default country
      }

      // Prepare billing address (same as shipping or different)
      const billingAddress = formData.billing_same_as_shipping
        ? shippingAddress
        : {
            first_name: formData.billing_first_name,
            last_name: formData.billing_last_name,
            email: formData.billing_email,
            phone: formData.billing_phone,
            address_line1: formData.billing_address,
            city: formData.billing_city,
            state: formData.billing_state,
            postal_code: formData.billing_postal_code,
            country: "Kenya", // Default country
          }

      // Create order
      const orderData = {
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        payment_method: formData.payment_method,
        shipping_method: formData.shipping_method,
        notes: formData.notes,
        coupon_code: formData.coupon_code || undefined,
        shipping_cost: shipping,
      }

      // Submit order to API
      const response = await api.post("/orders", orderData)

      // Handle successful order
      toast({
        title: "Order Placed Successfully",
        description: `Your order #${response.data.order.order_number} has been placed.`,
      })

      // Redirect to order confirmation page
      router.push(`/orders/${response.data.order.id}/confirmation`)
    } catch (error: any) {
      console.error("Checkout error:", error)

      // Handle specific error cases
      if (error.response?.data?.error) {
        setCheckoutError(error.response.data.error)
      } else {
        setCheckoutError("An error occurred while processing your order. Please try again.")
      }

      toast({
        title: "Checkout Failed",
        description: "There was a problem processing your order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push("/auth/login?redirect=/checkout")
    }
  }, [isAuthenticated, isLoading, router])

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-6">
              <CreditCard className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Please log in to checkout</h2>
            <p className="mb-6 text-center text-muted-foreground">
              You need to be logged in to complete your purchase.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/auth/login?redirect=/checkout">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader size="large" />
            <p className="mt-4 text-muted-foreground">Loading checkout information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show empty cart message
  if (items.length === 0) {
    return (
      <div className="container max-w-4xl py-10">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Truck className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Your cart is empty</h2>
            <p className="mb-6 text-center text-muted-foreground">
              Add some items to your cart before proceeding to checkout.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-10">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Checkout</h1>

      {(error || checkoutError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || checkoutError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
              <CardDescription>Enter your shipping details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="shipping_first_name">First Name</Label>
                <Input
                  id="shipping_first_name"
                  name="shipping_first_name"
                  value={formData.shipping_first_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping_last_name">Last Name</Label>
                <Input
                  id="shipping_last_name"
                  name="shipping_last_name"
                  value={formData.shipping_last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping_email">Email</Label>
                <Input
                  id="shipping_email"
                  name="shipping_email"
                  type="email"
                  value={formData.shipping_email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping_phone">Phone</Label>
                <Input
                  id="shipping_phone"
                  name="shipping_phone"
                  value={formData.shipping_phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="shipping_address">Address</Label>
                <Input
                  id="shipping_address"
                  name="shipping_address"
                  value={formData.shipping_address}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping_city">City</Label>
                <Input
                  id="shipping_city"
                  name="shipping_city"
                  value={formData.shipping_city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping_state">County/State</Label>
                <Input
                  id="shipping_state"
                  name="shipping_state"
                  value={formData.shipping_state}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shipping_postal_code">Postal Code</Label>
                <Input
                  id="shipping_postal_code"
                  name="shipping_postal_code"
                  value={formData.shipping_postal_code}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Billing Information</CardTitle>
                  <CardDescription>Enter your billing details</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="billing_same_as_shipping"
                    name="billing_same_as_shipping"
                    checked={formData.billing_same_as_shipping}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="billing_same_as_shipping" className="text-sm font-normal">
                    Same as shipping
                  </Label>
                </div>
              </div>
            </CardHeader>

            {!formData.billing_same_as_shipping && (
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="billing_first_name">First Name</Label>
                  <Input
                    id="billing_first_name"
                    name="billing_first_name"
                    value={formData.billing_first_name}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_last_name">Last Name</Label>
                  <Input
                    id="billing_last_name"
                    name="billing_last_name"
                    value={formData.billing_last_name}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_email">Email</Label>
                  <Input
                    id="billing_email"
                    name="billing_email"
                    type="email"
                    value={formData.billing_email}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_phone">Phone</Label>
                  <Input
                    id="billing_phone"
                    name="billing_phone"
                    value={formData.billing_phone}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="billing_address">Address</Label>
                  <Input
                    id="billing_address"
                    name="billing_address"
                    value={formData.billing_address}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_city">City</Label>
                  <Input
                    id="billing_city"
                    name="billing_city"
                    value={formData.billing_city}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_state">County/State</Label>
                  <Input
                    id="billing_state"
                    name="billing_state"
                    value={formData.billing_state}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_postal_code">Postal Code</Label>
                  <Input
                    id="billing_postal_code"
                    name="billing_postal_code"
                    value={formData.billing_postal_code}
                    onChange={handleInputChange}
                    required={!formData.billing_same_as_shipping}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Shipping Method</CardTitle>
              <CardDescription>Select your preferred shipping method</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.shipping_method}
                onValueChange={(value) => handleRadioChange("shipping_method", value)}
                className="grid gap-4"
              >
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="standard" id="shipping_standard" />
                  <Label
                    htmlFor="shipping_standard"
                    className="flex flex-1 cursor-pointer items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">Standard Shipping</p>
                      <p className="text-sm text-muted-foreground">Delivery in 3-5 business days</p>
                    </div>
                    <div className="font-medium">{shipping === 0 ? "Free" : `KSh ${shipping.toLocaleString()}`}</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <RadioGroupItem value="express" id="shipping_express" />
                  <Label htmlFor="shipping_express" className="flex flex-1 cursor-pointer items-center justify-between">
                    <div>
                      <p className="font-medium">Express Shipping</p>
                      <p className="text-sm text-muted-foreground">Delivery in 1-2 business days</p>
                    </div>
                    <div className="font-medium">KSh {(shipping + 500).toLocaleString()}</div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Select your preferred payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="mpesa" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="mpesa" onClick={() => handleRadioChange("payment_method", "mpesa")}>
                    M-Pesa
                  </TabsTrigger>
                  <TabsTrigger value="card" onClick={() => handleRadioChange("payment_method", "credit_card")}>
                    Card
                  </TabsTrigger>
                  <TabsTrigger value="bank" onClick={() => handleRadioChange("payment_method", "bank_transfer")}>
                    Bank Transfer
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="mpesa" className="mt-4 space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Phone className="h-10 w-10 text-green-600" />
                      <div>
                        <h3 className="font-medium">M-Pesa Payment</h3>
                        <p className="text-sm text-muted-foreground">
                          You'll receive an M-Pesa prompt on your phone to complete payment
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="card" className="mt-4 space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-10 w-10 text-blue-600" />
                      <div>
                        <h3 className="font-medium">Credit/Debit Card</h3>
                        <p className="text-sm text-muted-foreground">Secure payment via credit or debit card</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="bank" className="mt-4 space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Landmark className="h-10 w-10 text-purple-600" />
                      <div>
                        <h3 className="font-medium">Bank Transfer</h3>
                        <p className="text-sm text-muted-foreground">Make a direct bank transfer to our account</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Add any special instructions or notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Special delivery instructions, etc."
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="coupon_code">Coupon Code (Optional)</Label>
                  <Input
                    id="coupon_code"
                    name="coupon_code"
                    placeholder="Enter coupon code"
                    value={formData.coupon_code}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[300px] overflow-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className="relative h-16 w-16 flex-none overflow-hidden rounded-md border bg-muted">
                      <img
                        src={item.product.thumbnail_url || "/placeholder.svg?height=64&width=64"}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-medium">KSh {item.total.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? "Free" : `KSh ${shipping.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (16% VAT)</span>
                  <span>KSh {tax.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>KSh {finalTotal.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? (
                  <>
                    <Loader size="small" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  `Pay KSh ${finalTotal.toLocaleString()}`
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

