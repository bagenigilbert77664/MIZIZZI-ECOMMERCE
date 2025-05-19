"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, Banknote, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CashDeliveryPaymentProps {
  orderId?: string | number
  amount: number
  onSuccess?: () => void
  onPaymentComplete?: () => Promise<void>
  onBack?: () => void
}

export function CashDeliveryPayment({
  orderId,
  amount,
  onSuccess,
  onPaymentComplete,
  onBack,
}: CashDeliveryPaymentProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState("")

  const { toast } = useToast()
  const router = useRouter()

  // Process payment
  const handlePayment = async () => {
    setLoading(true)
    setError(null)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulate successful payment
      setSuccess(true)
      toast({
        title: "Order confirmed",
        description: "Your order has been confirmed for cash on delivery",
      })

      // Call the success callback or redirect
      if (onPaymentComplete) {
        await onPaymentComplete()
      } else if (onSuccess) {
        onSuccess()
      } else if (orderId) {
        router.push(`/order-confirmation/${orderId}`)
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while confirming your order")
      toast({
        variant: "destructive",
        title: "Order confirmation failed",
        description: err.message || "An error occurred while confirming your order",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-green-600" />
          Cash on Delivery
        </CardTitle>
        <CardDescription>Pay with cash when your order is delivered</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Order Confirmed</AlertTitle>
            <AlertDescription>Your order has been confirmed for cash on delivery.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <h3 className="text-sm font-medium text-yellow-800">Important Information</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                <li>Please have the exact amount ready at the time of delivery</li>
                <li>Our delivery agent will provide a receipt upon payment</li>
                <li>Payment must be made before opening the package</li>
              </ul>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Pay
              </label>
              <Input
                id="amount"
                type="text"
                value={`KES ${Number(amount).toFixed(2)}`}
                disabled
                className="w-full bg-gray-50"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Notes (Optional)
              </label>
              <Textarea
                id="notes"
                placeholder="Any special instructions for delivery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full"
                disabled={loading}
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!success && (
          <>
            <Button variant="outline" onClick={onBack} disabled={loading}>
              Back
            </Button>
            <Button onClick={handlePayment} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Order
            </Button>
          </>
        )}

        {success && (
          <Button
            className="w-full"
            onClick={() => {
              if (onSuccess) onSuccess()
              else if (orderId) router.push(`/order-confirmation/${orderId}`)
            }}
          >
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default CashDeliveryPayment
