"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CreditCard, Smartphone, Banknote, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PaymentMethodsProps {
  selectedMethod: string
  onSelectMethod: (method: string) => void
}

export function PaymentMethods({ selectedMethod, onSelectMethod }: PaymentMethodsProps) {
  const [error, setError] = useState<string | null>(null)

  const handleMethodSelect = (method: string) => {
    setError(null)
    onSelectMethod(method)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <RadioGroup defaultValue={selectedMethod} onValueChange={handleMethodSelect} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* M-Pesa */}
          <Card
            className={`border cursor-pointer transition-all ${
              selectedMethod === "mpesa" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"
            }`}
            onClick={() => handleMethodSelect("mpesa")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mpesa" id="mpesa" className="text-orange-500" />
                  <Label htmlFor="mpesa" className="font-medium text-lg cursor-pointer">
                    M-Pesa
                  </Label>
                </div>
                <div className="h-8 w-8 rounded-md bg-green-600 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>Pay using M-Pesa mobile money. You'll receive a prompt on your phone.</CardDescription>
            </CardContent>
          </Card>

          {/* Airtel Money */}
          <Card
            className={`border cursor-pointer transition-all ${
              selectedMethod === "airtel" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"
            }`}
            onClick={() => handleMethodSelect("airtel")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="airtel" id="airtel" className="text-orange-500" />
                  <Label htmlFor="airtel" className="font-medium text-lg cursor-pointer">
                    Airtel Money
                  </Label>
                </div>
                <div className="h-8 w-8 rounded-md bg-red-600 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>Pay using Airtel Money. You'll receive a prompt on your phone.</CardDescription>
            </CardContent>
          </Card>

          {/* Credit/Debit Card */}
          <Card
            className={`border cursor-pointer transition-all ${
              selectedMethod === "card" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"
            }`}
            onClick={() => handleMethodSelect("card")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" className="text-orange-500" />
                  <Label htmlFor="card" className="font-medium text-lg cursor-pointer">
                    Credit/Debit Card
                  </Label>
                </div>
                <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Pay securely with your credit or debit card. We accept Visa, Mastercard, and more.
              </CardDescription>
            </CardContent>
          </Card>

          {/* Cash on Delivery */}
          <Card
            className={`border cursor-pointer transition-all ${
              selectedMethod === "cash" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"
            }`}
            onClick={() => handleMethodSelect("cash")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" className="text-orange-500" />
                  <Label htmlFor="cash" className="font-medium text-lg cursor-pointer">
                    Cash on Delivery
                  </Label>
                </div>
                <div className="h-8 w-8 rounded-md bg-yellow-600 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>Pay with cash when your order is delivered to your doorstep.</CardDescription>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>

      <div className="mt-6 flex justify-center">
        <Button
          onClick={() => handleMethodSelect(selectedMethod)}
          disabled={!selectedMethod}
          className="w-full md:w-auto px-8 py-6 h-auto text-base font-medium bg-orange-500 hover:bg-orange-600 text-white"
        >
          CONTINUE WITH {selectedMethod ? selectedMethod.toUpperCase() : "SELECTED PAYMENT"}
        </Button>
      </div>
    </div>
  )
}

