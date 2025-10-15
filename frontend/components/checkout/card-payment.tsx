"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle, CreditCard, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface CardPaymentProps {
  orderId?: string | number
  amount: number
  onSuccess?: () => void
  onPaymentComplete?: () => Promise<void>
  onBack?: () => void
}

export function CardPayment({ orderId, amount, onSuccess, onPaymentComplete, onBack }: CardPaymentProps) {
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()
  const router = useRouter()

  // Format card number as user types
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    const formattedValue = value
      .replace(/(\d{4})/g, "$1 ")
      .trim()
      .substring(0, 19)
    setCardNumber(formattedValue)
  }

  // Format expiry date as user types
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    if (value.length <= 2) {
      setExpiryDate(value)
    } else {
      setExpiryDate(`${value.substring(0, 2)}/${value.substring(2, 4)}`)
    }
  }

  // Process payment
  const handlePayment = async () => {
    // Basic validation
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      setError("Please enter a valid 16-digit card number")
      return
    }

    if (!cardName) {
      setError("Please enter the cardholder name")
      return
    }

    if (expiryDate.length !== 5) {
      setError("Please enter a valid expiry date (MM/YY)")
      return
    }

    if (cvv.length !== 3) {
      setError("Please enter a valid 3-digit CVV")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Simulate successful payment
      setSuccess(true)
      toast({
        title: "Payment successful",
        description: "Your payment has been processed successfully",
      })

      // Call the success callback or redirect
      if (onPaymentComplete) {
        await onPaymentComplete()
      } else if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while processing your payment")
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: err.message || "An error occurred while processing your payment",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          Card Payment
        </CardTitle>
        <CardDescription>Pay securely with your credit or debit card</CardDescription>
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
            <AlertTitle>Payment Successful</AlertTitle>
            <AlertDescription>Your payment has been processed successfully.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="w-full"
                disabled={loading}
                maxLength={19}
              />
            </div>

            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={handleExpiryDateChange}
                  className="w-full"
                  disabled={loading}
                  maxLength={5}
                />
              </div>

              <div>
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <Input
                  id="cvv"
                  type="password"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                  className="w-full"
                  disabled={loading}
                  maxLength={3}
                />
              </div>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                id="amount"
                type="text"
                value={`KES ${Number(amount).toFixed(2)}`}
                disabled
                className="w-full bg-gray-50"
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
              Pay Now
            </Button>
          </>
        )}

        {success && (
          <Button
            className="w-full"
            onClick={() => {
              if (onSuccess) onSuccess()
            }}
          >
            Continue
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default CardPayment
