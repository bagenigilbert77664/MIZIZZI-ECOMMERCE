"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, CheckCircle, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"

interface AirtelPaymentProps {
  amount: number
  onBack: () => void
  onPaymentComplete: () => void
}

export function AirtelPayment({ amount, onBack, onPaymentComplete }: AirtelPaymentProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPinRequested, setIsPinRequested] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 12 characters
    const value = e.target.value.replace(/[^\d]/g, "").slice(0, 12)
    setPhoneNumber(value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate phone number
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number")
      return
    }

    setError(null)
    setIsProcessing(true)

    // Simulate Airtel Money request
    setTimeout(() => {
      setIsProcessing(false)
      setIsPinRequested(true)

      // Simulate PIN entry and success
      setTimeout(() => {
        setIsPinRequested(false)
        setIsSuccess(true)
        setTransactionId(`AM${Math.floor(Math.random() * 1000000000)}`)

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

        <div className="h-10">
          <Image
            src="/placeholder.svg?height=40&width=120"
            alt="Airtel Money"
            width={120}
            height={40}
            className="h-full w-auto object-contain"
          />
        </div>
      </div>

      {!isSuccess ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-center mb-6">
            <Smartphone className="h-12 w-12 mx-auto text-red-600 mb-3" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Airtel Money Payment</h3>
            <p className="text-gray-600">
              Enter your Airtel Money registered phone number to pay {formatPrice(amount)}
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4 text-sm">{error}</div>}

          {!isPinRequested ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="e.g. 254712345678"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="h-12"
                  disabled={isProcessing}
                />
                <p className="text-xs text-gray-500">Enter your phone number in the format 254XXXXXXXXX</p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Pay with Airtel Money"
                )}
              </Button>

              <div className="text-center text-xs text-gray-500 mt-4">
                By clicking "Pay with Airtel Money", you will receive a prompt on your phone to enter your PIN.
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="animate-pulse mb-4">
                <Smartphone className="h-16 w-16 mx-auto text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Check Your Phone</h3>
              <p className="text-gray-600 mb-4">
                A prompt has been sent to {phoneNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
              </p>
              <div className="text-sm text-gray-500 max-w-xs mx-auto">
                Please enter your Airtel Money PIN on your phone to complete the payment of {formatPrice(amount)}
              </div>

              <div className="mt-8 flex justify-center">
                <div className="flex space-x-2">
                  <div
                    className="h-3 w-3 rounded-full bg-red-600 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="h-3 w-3 rounded-full bg-red-600 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                  <div
                    className="h-3 w-3 rounded-full bg-red-600 animate-bounce"
                    style={{ animationDelay: "600ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="mb-4 text-red-600">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600 mb-4">
            Your Airtel Money payment of {formatPrice(amount)} has been processed successfully.
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
          Your payment information is securely processed. We do not store your Airtel Money PIN.
        </p>
      </div>
    </div>
  )
}

