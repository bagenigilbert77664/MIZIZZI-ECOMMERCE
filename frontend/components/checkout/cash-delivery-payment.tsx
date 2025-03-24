"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle, Truck } from "lucide-react"

interface CashDeliveryPaymentProps {
  amount: number
  onBack: () => void
  onPaymentComplete: () => void
}

export function CashDeliveryPayment({ amount, onBack, onPaymentComplete }: CashDeliveryPaymentProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = () => {
    setIsConfirming(true)

    // Simulate a short delay before completing
    setTimeout(() => {
      setIsConfirming(false)
      onPaymentComplete()
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center py-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-bold">Cash on Delivery</h3>
          <p className="text-gray-600 mb-6">Pay with cash when your order is delivered to your doorstep.</p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-bold text-lg">KSh {amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 text-left">
              <h4 className="font-medium mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                How Cash on Delivery Works
              </h4>
              <ul className="text-sm text-gray-600 space-y-2 pl-6 list-disc">
                <li>Your order will be processed immediately</li>
                <li>Our delivery team will contact you before delivery</li>
                <li>Prepare the exact amount to avoid change issues</li>
                <li>Inspect your items before making payment</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={handleConfirm}
              className="w-full py-6 h-auto text-base font-medium"
              disabled={isConfirming}
            >
              {isConfirming ? "Processing..." : "Confirm Order"}
            </Button>

            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center justify-center gap-2 h-auto py-2"
              disabled={isConfirming}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Payment Methods
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Remove the default export and only use the named export
// export default CashDeliveryPayment

