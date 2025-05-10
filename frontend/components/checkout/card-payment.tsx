"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CreditCard, Lock, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "")

    // Limit to 16 digits
    const truncated = digits.slice(0, 16)

    // Add spaces after every 4 digits
    const formatted = truncated.replace(/(\d{4})(?=\d)/g, "$1 ")

    return formatted
  }

  const formatExpiryDate = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "")

    // Limit to 4 digits
    const truncated = digits.slice(0, 4)

    // Add slash after first 2 digits if there are more than 2
    if (truncated.length > 2) {
      return `${truncated.slice(0, 2)}/${truncated.slice(2)}`
    }

    return truncated
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value))
  }

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(formatExpiryDate(e.target.value))
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow up to 3 digits for CVV
    const value = e.target.value.replace(/\D/g, "").slice(0, 3)
    setCvv(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
      toast({
        title: "Invalid Card Number",
        description: "Please enter a valid 16-digit card number",
        variant: "destructive",
      })
      return
    }

    if (!cardName) {
      toast({
        title: "Missing Information",
        description: "Please enter the cardholder name",
        variant: "destructive",
      })
      return
    }

    if (!expiryDate || expiryDate.length < 5) {
      toast({
        title: "Invalid Expiry Date",
        description: "Please enter a valid expiry date (MM/YY)",
        variant: "destructive",
      })
      return
    }

    if (!cvv || cvv.length < 3) {
      toast({
        title: "Invalid CVV",
        description: "Please enter a valid 3-digit CVV code",
        variant: "destructive",
      })
      return
    }

    // Process payment
    setIsProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Payment Successful",
        description: `Your payment of KES ${amount.toFixed(2)} has been processed successfully.`,
      })

      // Call the completion handler
      onPaymentComplete()
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (false) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-green-50 p-6 mb-6">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your payment of KSh {amount.toLocaleString()} has been processed successfully.
        </p>
        <p className="text-gray-500 text-sm mb-8">You will be redirected to the order confirmation page...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h3 className="text-lg font-medium">Card Payment</h3>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg mb-6 flex items-center gap-3">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Your payment information is encrypted and secure. We do not store your card details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="card-number">Card Number</Label>
          <div className="relative">
            <Input
              id="card-number"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={handleCardNumberChange}
              className="pl-10"
              disabled={isProcessing}
            />
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-name">Cardholder Name</Label>
          <Input
            id="card-name"
            placeholder="John Doe"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry-date">Expiry Date</Label>
            <Input
              id="expiry-date"
              placeholder="MM/YY"
              value={expiryDate}
              onChange={handleExpiryDateChange}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input
              id="cvv"
              placeholder="123"
              value={cvv}
              onChange={handleCvvChange}
              type="password"
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            className="w-full h-12 bg-cherry-700 hover:bg-cherry-800 text-white font-medium"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Processing...
              </>
            ) : (
              <>Pay KES {amount.toFixed(2)}</>
            )}
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-center gap-2 mt-4">
        <img src="/placeholder.svg?height=20&width=30" alt="Visa" className="h-5" />
        <img src="/placeholder.svg?height=20&width=30" alt="Mastercard" className="h-5" />
        <img src="/placeholder.svg?height=20&width=30" alt="American Express" className="h-5" />
      </div>
    </div>
  )
}
