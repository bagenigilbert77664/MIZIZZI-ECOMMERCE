"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle, Loader2, LockIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"

interface CardPaymentProps {
  amount: number
  onBack: () => void
  onPaymentComplete: () => void
}

export default function CardPayment({ amount, onBack, onPaymentComplete }: CardPaymentProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and format with spaces every 4 digits
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 16)
    const formatted = value.replace(/(.{4})/g, "$1 ").trim()
    setCardNumber(formatted)
    setError(null)
  }

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format as MM/YY
    let value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4)
    if (value.length > 2) {
      value = value.slice(0, 2) + "/" + value.slice(2)
    }
    setExpiryDate(value)
    setError(null)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 3-4 digits
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4)
    setCvv(value)
    setError(null)
  }

  const validateForm = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
      setError("Please enter a valid card number")
      return false
    }

    if (!cardName) {
      setError("Please enter the cardholder name")
      return false
    }

    if (!expiryDate || expiryDate.length < 5) {
      setError("Please enter a valid expiry date (MM/YY)")
      return false
    }

    // Check if expiry date is in the future
    const [month, year] = expiryDate.split("/")
    const expiryMonth = Number.parseInt(month, 10)
    const expiryYear = Number.parseInt("20" + year, 10)
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      setError("Your card has expired")
      return false
    }

    if (!cvv || cvv.length < 3) {
      setError("Please enter a valid CVV/CVC code")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Simulate API call to process card payment
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulate successful payment
      setSuccess(true)

      // Simulate redirect to confirmation page after 2 seconds
      setTimeout(() => {
        onPaymentComplete()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to process card payment. Please try again.")
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
              <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">Card Payment</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start"
          >
            <div className="mr-3 mt-1">
              <LockIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Secure Payment</h3>
              <p className="text-sm text-blue-700">
                Your payment information is encrypted and secure. We do not store your card details.
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
              <Label htmlFor="card-number" className="text-sm font-medium">
                Card Number
              </Label>
              <Input
                id="card-number"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="h-12 border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-name" className="text-sm font-medium">
                Cardholder Name
              </Label>
              <Input
                id="card-name"
                type="text"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="h-12 border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry-date" className="text-sm font-medium">
                  Expiry Date
                </Label>
                <Input
                  id="expiry-date"
                  type="text"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  className="h-12 border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvv" className="text-sm font-medium">
                  CVV/CVC
                </Label>
                <Input
                  id="cvv"
                  type="text"
                  placeholder="123"
                  value={cvv}
                  onChange={handleCvvChange}
                  className="h-12 border-gray-300 focus:border-blue-600 focus:ring-blue-600 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${formatCurrency(amount)}`
                  )}
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4 pt-4">
            <img src="/visa.svg" alt="Visa" className="h-8" />
            <img src="/mastercard.svg" alt="Mastercard" className="h-8" />
            <img src="/amex.svg" alt="American Express" className="h-8" />
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium">Card Payment</span>
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
              <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">
                Your payment of {formatCurrency(amount)} has been processed successfully.
              </p>
              <p className="text-sm text-gray-500">Redirecting to confirmation page...</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
