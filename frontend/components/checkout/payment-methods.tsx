"use client"

import type React from "react"

import { useState } from "react"
import { CreditCard, Smartphone, AlertCircle, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

interface PaymentMethodProps {
  selectedMethod: string
  onSelectMethod: (methodId: string) => void
}

interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  logoUrl?: string
  primaryColor: string
}

export function PaymentMethods({ selectedMethod, onSelectMethod }: PaymentMethodProps) {
  const [error, setError] = useState<string | null>(null)

  // Define available payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: "mpesa",
      name: "Pay with M-Pesa",
      description: "Fast and secure mobile money payment",
      icon: <Smartphone className="h-5 w-5 text-green-600" />,
      logoUrl: "/placeholder.svg?height=40&width=120",
      primaryColor: "green",
    },
    {
      id: "airtel",
      name: "Pay with Airtel Money",
      description: "Quick mobile money transfer",
      icon: <Smartphone className="h-5 w-5 text-red-600" />,
      logoUrl: "/placeholder.svg?height=40&width=120",
      primaryColor: "red",
    },
    {
      id: "card",
      name: "Pay with Card",
      description: "Secure payment with Visa or Mastercard",
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      logoUrl: "/placeholder.svg?height=40&width=120",
      primaryColor: "blue",
    },
    {
      id: "cash",
      name: "Cash on Delivery",
      description: "Pay when you receive your order",
      icon: <CreditCard className="h-5 w-5 text-gray-600" />,
      logoUrl: "/placeholder.svg?height=40&width=120",
      primaryColor: "gray",
    },
  ]

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <Card
            key={method.id}
            className={`border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
              selectedMethod === method.id
                ? "border-cherry-900 shadow-md"
                : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
            }`}
            onClick={() => onSelectMethod(method.id)}
          >
            <CardContent className="p-0">
              <div className="relative">
                {/* Colored header based on payment method */}
                <div
                  className={`h-2 w-full ${
                    method.id === "mpesa"
                      ? "bg-green-500"
                      : method.id === "airtel"
                        ? "bg-red-500"
                        : method.id === "card"
                          ? "bg-blue-500"
                          : "bg-gray-500"
                  }`}
                />

                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                          selectedMethod === method.id
                            ? "border-cherry-900 bg-cherry-900 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedMethod === method.id && <Check className="h-3 w-3" />}
                      </div>
                      <h4 className="font-medium text-gray-900">{method.name}</h4>
                    </div>

                    <div className="h-10">
                      <Image
                        src={method.logoUrl || "/placeholder.svg"}
                        alt={method.name}
                        width={120}
                        height={40}
                        className="h-full w-auto object-contain"
                      />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 ml-8">{method.description}</p>

                  <AnimatePresence>
                    {selectedMethod === method.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 pt-4 border-t border-gray-100"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Selected payment method</span>
                          <span className="text-xs px-2 py-1 bg-cherry-50 text-cherry-900 rounded-full">
                            Recommended
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

