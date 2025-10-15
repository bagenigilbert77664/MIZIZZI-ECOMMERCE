"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, Shield, CheckCircle2, ArrowRight, Lock, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface PaymentSelectionProps {
  selectedMethod?: string
  onMethodSelect: (method: string) => void
  amount: number
  cartData?: any
  shippingAddress?: any
  billingAddress?: any
}

export function PaymentSelection({
  selectedMethod,
  onMethodSelect,
  amount,
  cartData,
  shippingAddress,
  billingAddress,
}: PaymentSelectionProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [loadingMethod, setLoadingMethod] = useState<string | null>(null)

  const paymentMethods = [
    {
      id: "pesapal",
      title: "Pesapal",
      subtitle: "Cards & Mobile Money",
      description: "Pay securely with M-PESA, Visa, Mastercard & more",
      icon: CreditCard,
      logo: "/pesapal-logo.png",
      popular: true,
    },
    {
      id: "cod",
      title: "Cash on Delivery",
      subtitle: "Pay at Your Door",
      description: "Settle payment when your order arrives",
      icon: Truck,
      logo: "",
      popular: false,
    },
  ]

  const cherry = {
    border: "border-[#7B1E1E]",
    ring: "ring-[#7B1E1E]/30",
    bg: "bg-[#7B1E1E]",
    hover: "hover:bg-[#691818]",
    text: "text-[#7B1E1E]",
  }

  const handleMethodSelect = (methodId: string) => {
    setLoadingMethod(methodId)
    // Delay to show the loading animation
    setTimeout(() => {
      onMethodSelect(methodId)
      // Reset loading state after a short delay
      setTimeout(() => setLoadingMethod(null), 500)
    }, 100)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <AnimatePresence>
        {loadingMethod && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4"
            >
              {/* Apple-style spinner */}
              <div className="relative w-16 h-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-[#7B1E1E]"
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Opening Payment Gateway</p>
                <p className="text-sm text-gray-500 mt-1">Please wait...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Choose Payment Method</h1>
        <p className="text-gray-500 text-lg">Select how you'd like to complete your order</p>
      </div>

      <Card className="border border-gray-200 shadow-sm rounded-2xl bg-white">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Order Total</p>
            <p className="text-3xl font-semibold text-gray-900">KES {amount.toLocaleString()}</p>
          </div>
          <div className="text-right space-y-1 text-sm text-gray-500">
            <p>1 item</p>
            <p>Subtotal: KES {(amount * 0.86).toLocaleString()}</p>
            <p>Shipping: Free</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Shield className="h-4 w-4 text-green-600" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <CheckCircle2 className={`h-4 w-4 ${cherry.text}`} />
          <span>PCI DSS Certified</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Lock className="h-4 w-4 text-purple-600" />
          <span>CBK Regulated</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {paymentMethods.map((method, index) => {
          const isSelected = selectedMethod === method.id
          const Icon = method.icon
          const isLoading = loadingMethod === method.id

          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="relative"
            >
              <Card
                onClick={() => !isLoading && handleMethodSelect(method.id)}
                onMouseEnter={() => setHoveredCard(method.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={cn(
                  "group relative h-full cursor-pointer rounded-2xl border bg-white transition-all duration-300",
                  isSelected
                    ? `${cherry.border} shadow-lg ring-2 ${cherry.ring}`
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md",
                  isLoading && "opacity-75 cursor-wait",
                )}
              >
                {method.popular && (
                  <div
                    className={`absolute top-4 right-4 ${cherry.bg} text-white text-xs px-3 py-1 rounded-full font-medium shadow`}
                  >
                    Most Popular
                  </div>
                )}

                <CardContent className="p-8 flex flex-col items-center text-center space-y-5">
                  {method.logo ? (
                    <Image
                      src={method.logo || "/placeholder.svg"}
                      alt={method.title}
                      width={80}
                      height={40}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <div className="p-3 rounded-xl bg-gray-100">
                      <Icon className="h-8 w-8 text-gray-600" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{method.title}</h3>
                    <p className="text-sm text-gray-500">{method.subtitle}</p>
                  </div>

                  <p className="text-sm text-gray-500 leading-relaxed">{method.description}</p>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isLoading) {
                        handleMethodSelect(method.id)
                      }
                    }}
                    disabled={isLoading}
                    variant="default"
                    className={cn(
                      "w-full h-11 rounded-xl font-medium transition-all relative",
                      isSelected
                        ? `${cherry.bg} text-white ${cherry.hover}`
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                      isLoading && "cursor-wait",
                    )}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                          className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                        Loading...
                      </span>
                    ) : (
                      <>
                        Continue with {method.title}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center text-sm text-gray-400 pt-8">
        Transactions are encrypted & secured by <span className={`font-medium ${cherry.text}`}>Pesapal</span>
      </div>
    </div>
  )
}

export default PaymentSelection
