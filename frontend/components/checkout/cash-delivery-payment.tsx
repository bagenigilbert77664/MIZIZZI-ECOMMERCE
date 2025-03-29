"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Banknote, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"

interface CashDeliveryPaymentProps {
  amount: number
  onBack: () => void
  onPaymentComplete: () => void
}

export function CashDeliveryPayment({ amount, onBack, onPaymentComplete }: CashDeliveryPaymentProps) {
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Simulate API call to process cash on delivery order
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulate successful order placement
      setSuccess(true)

      // Simulate redirect to confirmation page after 2 seconds
      setTimeout(() => {
        onPaymentComplete()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to process your order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {!success ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="p-0 h-auto text-orange-500 hover:text-orange-600 hover:bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to payment methods
            </Button>
            <div className="flex items-center">
              <Banknote className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="font-medium">Cash on Delivery</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex items-start">
            <div className="mr-3 mt-1">
              <Banknote className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-yellow-800 mb-1">Cash on Delivery Information</h3>
              <p className="text-sm text-yellow-700">
                You'll pay {formatCurrency(amount)} in cash when your order is delivered to your doorstep. Please have
                the exact amount ready.
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-notes" className="text-sm font-medium">
                Delivery Notes (Optional)
              </Label>
              <Textarea
                id="delivery-notes"
                placeholder="Add any special instructions for delivery"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "CONFIRM ORDER"
                )}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Banknote className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="font-medium">Cash on Delivery</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Order Confirmed!</h3>
              <p className="text-gray-600 mb-4">
                Your order has been placed successfully. You'll pay {formatCurrency(amount)} in cash upon delivery.
              </p>
              <p className="text-sm text-gray-500">Redirecting to confirmation page...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

