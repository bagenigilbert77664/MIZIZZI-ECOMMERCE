"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Smartphone, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/lib/utils"

interface AirtelPaymentProps {
  amount: number
  onBack: () => void
  onPaymentComplete: () => void
}

export function AirtelPayment({ amount, onBack, onPaymentComplete }: AirtelPaymentProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1)

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 12 characters
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 12)
    setPhoneNumber(value)
    setError(null)
  }

  const validatePhoneNumber = () => {
    if (!phoneNumber) {
      setError("Phone number is required")
      return false
    }

    // Basic validation for Kenyan phone numbers
    const kenyanPhoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/
    if (!kenyanPhoneRegex.test(phoneNumber)) {
      setError("Please enter a valid Kenyan phone number")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePhoneNumber()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Simulate API call to initiate Airtel Money payment
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Move to confirmation step
      setStep(2)

      // Simulate payment confirmation after 3 seconds
      setTimeout(() => {
        setSuccess(true)

        // Simulate redirect to confirmation page after 2 seconds
        setTimeout(() => {
          onPaymentComplete()
        }, 2000)
      }, 3000)
    } catch (err: any) {
      setError(err.message || "Failed to initiate Airtel Money payment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return ""

    // Format as 07XX XXX XXX or similar
    if (phone.length === 10 && phone.startsWith("0")) {
      return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`
    }

    // Format as +254 7XX XXX XXX
    if (phone.length === 12 && phone.startsWith("254")) {
      return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`
    }

    return phone
  }

  return (
    <div className="space-y-6">
      {step === 1 ? (
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
              <Smartphone className="h-5 w-5 text-red-600 mr-2" />
              <span className="font-medium">Airtel Money Payment</span>
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start">
            <div className="mr-3 mt-1">
              <Smartphone className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-medium text-red-800 mb-1">How Airtel Money works</h3>
              <p className="text-sm text-red-700">
                Enter your Airtel Money registered phone number below. You'll receive a prompt on your phone to enter
                your Airtel Money PIN to complete the payment of {formatCurrency(amount)}.
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
              <Label htmlFor="phone-number" className="text-sm font-medium">
                Airtel Money Phone Number
              </Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="e.g. 07XXXXXXXX or 254XXXXXXXXX"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                className="h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-500">Enter your phone number in the format 07XXXXXXXX or 254XXXXXXXXX</p>
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
                  `Pay ${formatCurrency(amount)} with Airtel Money`
                )}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone className="h-5 w-5 text-red-600 mr-2" />
              <span className="font-medium">Airtel Money Payment</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            {success ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Successful!</h3>
                <p className="text-gray-600 mb-4">Your payment of {formatCurrency(amount)} has been received.</p>
                <p className="text-sm text-gray-500">Redirecting to confirmation page...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full border-4 border-t-orange-500 border-orange-200 animate-spin mb-4"></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Payment Processing</h3>
                <p className="text-gray-600 mb-4">
                  We've sent an Airtel Money prompt to{" "}
                  <span className="font-medium">{formatPhoneDisplay(phoneNumber)}</span>
                </p>
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 max-w-md mx-auto">
                  <p className="text-sm text-yellow-800">
                    Please check your phone and enter your Airtel Money PIN to complete the payment of{" "}
                    {formatCurrency(amount)}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
