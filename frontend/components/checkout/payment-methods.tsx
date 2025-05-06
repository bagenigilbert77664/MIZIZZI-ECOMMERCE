"use client"

import { useState, useEffect } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CreditCard, Smartphone, Banknote, CheckCircle, ShieldCheck, LockKeyhole } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"

interface PaymentMethodsProps {
  selectedMethod: string
  onSelectMethod: (method: string) => void
}

export function PaymentMethods({ selectedMethod, onSelectMethod }: PaymentMethodsProps) {
  const [isClient, setIsClient] = useState(false)
  const [processingMethod, setProcessingMethod] = useState<string | null>(null)
  const [loadingMethodDetails, setLoadingMethodDetails] = useState<boolean>(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleMethodSelect = (method: string) => {
    if (method === selectedMethod) return

    setProcessingMethod(method)

    // Simulate loading of payment method details
    setTimeout(() => {
      setProcessingMethod(null)
      onSelectMethod(method)

      // Simulate loading details
      setLoadingMethodDetails(true)
      setTimeout(() => {
        setLoadingMethodDetails(false)
      }, 1000)
    }, 600)
  }

  // Payment methods
  const paymentMethods = [
    {
      id: "mpesa",
      name: "M-Pesa",
      description: "Pay using M-Pesa mobile money. You'll receive a prompt on your phone.",
      icon: Smartphone,
      gradient: "from-emerald-500 to-green-600",
      textColor: "text-emerald-700",
      borderColor: "border-emerald-400",
      boxShadow: "shadow-emerald-200",
      hoverGradient: "hover:from-emerald-600 hover:to-green-700",
    },
    {
      id: "card",
      name: "Credit/Debit Card",
      description: "Pay securely with your credit or debit card. We accept Visa, Mastercard, and more.",
      icon: CreditCard,
      gradient: "from-blue-500 to-indigo-600",
      textColor: "text-blue-700",
      borderColor: "border-blue-400",
      boxShadow: "shadow-blue-200",
      hoverGradient: "hover:from-blue-600 hover:to-indigo-700",
    },
    {
      id: "cash",
      name: "Cash on Delivery",
      description: "Pay with cash when your order is delivered to your doorstep.",
      icon: Banknote,
      gradient: "from-amber-500 to-yellow-600",
      textColor: "text-amber-700",
      borderColor: "border-amber-400",
      boxShadow: "shadow-amber-200",
      hoverGradient: "hover:from-amber-600 hover:to-yellow-700",
    },
  ]

  if (!isClient) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 mb-6">
        <h3 className="text-xl font-bold text-gray-900">Select Payment Method</h3>
        <p className="text-gray-600 text-sm">Choose your preferred payment option to complete your purchase.</p>
      </div>

      <RadioGroup
        value={selectedMethod}
        onValueChange={handleMethodSelect}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {paymentMethods.map((method) => (
          <div key={method.id} className="relative">
            <RadioGroupItem value={method.id} id={method.id} className="peer sr-only" />
            <motion.div
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ y: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="h-full"
            >
              <Label
                htmlFor={method.id}
                className={cn(
                  "flex flex-col h-full cursor-pointer rounded-2xl border-2 bg-white p-6 transition-all",
                  `${method.boxShadow} hover:shadow-lg`,
                  selectedMethod === method.id
                    ? `${method.borderColor} shadow-md`
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                {processingMethod === method.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl z-10 backdrop-blur-sm">
                    <div
                      className={cn(
                        "h-8 w-8 animate-spin rounded-full border-4 border-t-transparent",
                        method.borderColor,
                      )}
                    ></div>
                  </div>
                )}

                <div className="mb-5">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-gradient-to-br",
                      method.gradient,
                    )}
                  >
                    <method.icon className="h-8 w-8 text-white" />
                  </div>
                  <span
                    className={cn(
                      "font-bold text-xl mb-2 block",
                      selectedMethod === method.id ? method.textColor : "text-gray-900",
                    )}
                  >
                    {method.name}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 flex-grow">{method.description}</p>

                <div
                  className={cn(
                    "w-full h-10 rounded-lg flex items-center justify-center font-medium text-white transition-all",
                    "bg-gradient-to-r",
                    method.gradient,
                    method.hoverGradient,
                    selectedMethod === method.id ? "opacity-100" : "opacity-70",
                  )}
                >
                  {selectedMethod === method.id ? (
                    <span className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Selected
                    </span>
                  ) : (
                    "Choose"
                  )}
                </div>
              </Label>
            </motion.div>
          </div>
        ))}
      </RadioGroup>

      <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 mt-6">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center text-gray-500 text-xs gap-1">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span>Secure Payment</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your payment information is secure and encrypted</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center text-gray-500 text-xs gap-1">
                <LockKeyhole className="h-4 w-4 text-blue-500" />
                <span>PCI Compliant</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>We follow Payment Card Industry Data Security Standards</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
