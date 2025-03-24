"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, CheckCircle, CreditCard, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"

interface CardPaymentProps {
  amount: number
  onBack: () => void
  onPaymentComplete: () => void
}

// Make sure this is exported as the default export
export default function CardPayment({ amount, onBack, onPaymentComplete }: CardPaymentProps) {
  const [cardDetails, setCardDetails] = useState({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [is3DSecure, setIs3DSecure] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    let formattedValue = value

    // Format card number with spaces
    if (name === "number") {
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/[^\d]/g, "")
        .slice(0, 16)
        .replace(/(.{4})/g, "$1 ")
        .trim()
    }

    // Format expiry date
    if (name === "expiry") {
      formattedValue = value.replace(/[^\d]/g, "").slice(0, 4)

      if (formattedValue.length > 2) {
        formattedValue = `${formattedValue.slice(0, 2)}/${formattedValue.slice(2)}`
      }
    }

    // Format CVC
    if (name === "cvc") {
      formattedValue = value.replace(/[^\d]/g, "").slice(0, 3)
    }

    setCardDetails((prev) => ({
      ...prev,
      [name]: formattedValue,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (cardDetails.number.replace(/\s/g, "").length < 16) {
      setError("Please enter a valid card number")
      return
    }

    if (!cardDetails.name) {
      setError("Please enter the cardholder name")
      return
    }

    if (cardDetails.expiry.length < 5) {
      setError("Please enter a valid expiry date (MM/YY)")
      return
    }

    if (cardDetails.cvc.length < 3) {
      setError("Please enter a valid CVC code")
      return
    }

    setError(null)
    setIsProcessing(true)

    // Simulate card processing
    setTimeout(() => {
      setIsProcessing(false)
      setIs3DSecure(true)

      // Simulate 3D Secure verification
      setTimeout(() => {
        setIs3DSecure(false)
        setIsSuccess(true)
        setTransactionId(`CC${Math.floor(Math.random() * 1000000000)}`)

        // Complete payment after showing success message
        setTimeout(() => {
          onPaymentComplete()
        }, 2000)
      }, 3000)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to payment methods
        </button>

        <div className="flex items-center gap-2 h-8">
          <Image
            src="/placeholder.svg?height=32&width=50"
            alt="Visa"
            width={50}
            height={32}
            className="h-full w-auto object-contain"
          />
          <Image
            src="/placeholder.svg?height=32&width=50"
            alt="Mastercard"
            width={50}
            height={32}
            className="h-full w-auto object-contain"
          />
        </div>
      </div>

      {!isSuccess ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          {!is3DSecure ? (
            <>
              <div className="text-center mb-6">
                <CreditCard className="h-12 w-12 mx-auto text-blue-600 mb-3" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Card Payment</h3>
                <p className="text-gray-600">Enter your card details to pay {formatPrice(amount)}</p>
              </div>

              {error && <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4 text-sm">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    name="number"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardDetails.number}
                    onChange={handleInputChange}
                    className="h-12"
                    disabled={isProcessing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-name">Cardholder Name</Label>
                  <Input
                    id="card-name"
                    name="name"
                    type="text"
                    placeholder="John Smith"
                    value={cardDetails.name}
                    onChange={handleInputChange}
                    className="h-12"
                    disabled={isProcessing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-expiry">Expiry Date</Label>
                    <Input
                      id="card-expiry"
                      name="expiry"
                      type="text"
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={handleInputChange}
                      className="h-12"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card-cvc">CVC</Label>
                    <Input
                      id="card-cvc"
                      name="cvc"
                      type="text"
                      placeholder="123"
                      value={cardDetails.cvc}
                      onChange={handleInputChange}
                      className="h-12"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Pay Now"
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
                  <Lock className="h-3 w-3" />
                  <span>Secure payment processed by our payment partner</span>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-pulse mb-4">
                <Lock className="h-16 w-16 mx-auto text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3D Secure Verification</h3>
              <p className="text-gray-600 mb-4">You are being redirected to your bank's verification page</p>
              <div className="text-sm text-gray-500 max-w-xs mx-auto">
                This additional security step helps protect your card from unauthorized use
              </div>

              <div className="mt-8 flex justify-center">
                <div className="flex space-x-2">
                  <div
                    className="h-3 w-3 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="h-3 w-3 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                  <div
                    className="h-3 w-3 rounded-full bg-blue-600 animate-bounce"
                    style={{ animationDelay: "600ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="mb-4 text-blue-600">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-4">
            Your card payment of {formatPrice(amount)} has been processed successfully.
          </p>
          <div className="bg-gray-50 p-4 rounded-md inline-block">
            <p className="text-sm text-gray-500">Transaction ID</p>
            <p className="text-lg font-medium text-gray-900">{transactionId}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Secure Payment</h4>
        <p className="text-sm text-gray-600">
          Your payment information is securely processed with industry-standard encryption. We do not store your full
          card details.
        </p>
      </div>
    </div>
  )
}

