"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Banknote, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"

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
              className="p-0 h-auto text-red-600 hover:text-red-800 hover:bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to payment methods
            </Button>
            <div className="flex items-center">
              <Banknote className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="font-medium">Cash on Delivery</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-yellow-50 border border-yellow-100 rounded-xl p-5 flex items-start"
          >
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
          </motion.div>

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 rounded-xl">
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
                className="min-h-[100px] border-gray-300 focus:border-yellow-600 focus:ring-yellow-600 rounded-lg"
              />
            </div>

            <div className="pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg"
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
              </motion.div>
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

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center"
          >
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Order Confirmed!</h3>
              <p className="text-gray-600 mb-4">
                Your order has been placed successfully. You'll pay {formatCurrency(amount)} in cash upon delivery.
              </p>
              <p className="text-sm text-gray-500">Redirecting to confirmation page...</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
