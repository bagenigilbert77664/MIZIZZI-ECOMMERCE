"use client"

import { useState, useEffect, useRef } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckCircle, ShieldCheck, LockKeyhole } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"

interface PaymentMethodsProps {
  selectedMethod: string
  onSelect?: (method: string) => void
  onSelectMethod?: (method: string) => void
}

export function PaymentMethods({ selectedMethod, onSelectMethod, onSelect }: PaymentMethodsProps) {
  const [isClient, setIsClient] = useState(false)
  const [processingMethod, setProcessingMethod] = useState<string | null>(null)
  const [loadingMethodDetails, setLoadingMethodDetails] = useState<boolean>(false)
  const completeOrderButtonRef = useRef<HTMLButtonElement | null>(null)

  // Custom SVG icons to avoid 404 errors
  const MpesaIcon = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="h-8 w-8 text-white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14c0 .55-.45 1-1 1s-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v8zm5 0c0 .55-.45 1-1 1s-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1v8z" />
    </svg>
  )

  const CreditCardIcon = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="h-8 w-8 text-white">
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
    </svg>
  )

  const CashIcon = () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="h-8 w-8 text-white">
      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
    </svg>
  )

  // Find the complete order button when component mounts
  useEffect(() => {
    setIsClient(true)

    // Find the complete order button by text content
    const findCompleteOrderButton = () => {
      const buttons = document.querySelectorAll("button")
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i]
        if (
          button.textContent &&
          (button.textContent.includes("Complete Order") || button.textContent.includes("Complete Order & Pay"))
        ) {
          completeOrderButtonRef.current = button
          break
        }
      }
    }

    findCompleteOrderButton()

    // If not found immediately, try again after a short delay
    if (!completeOrderButtonRef.current) {
      setTimeout(findCompleteOrderButton, 500)
    }
  }, [])

  const handleMethodSelect = (method: string) => {
    if (method === selectedMethod) {
      // If already selected, proceed to payment processing
      if (onSelectMethod) {
        onSelectMethod(method)
      } else if (onSelect) {
        onSelect(method)
      }

      // Trigger the "Complete Order" button click if it exists
      if (completeOrderButtonRef.current) {
        completeOrderButtonRef.current.click()
      }
      return
    }

    setProcessingMethod(method)

    // Use whichever callback is provided
    if (onSelectMethod) {
      onSelectMethod(method)
    } else if (onSelect) {
      onSelect(method)
    }

    // Simulate loading details
    setLoadingMethodDetails(true)
    setTimeout(() => {
      setProcessingMethod(null)
      setLoadingMethodDetails(false)
    }, 600)
  }

  // Payment methods - updated to match backend expected values
  const paymentMethods = [
    {
      id: "mpesa",
      name: "M-Pesa",
      description: "Pay using M-Pesa mobile money. You'll receive a prompt on your phone or pay via paybill.",
      icon: "mpesa",
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
      icon: "card",
      gradient: "from-blue-500 to-indigo-600",
      textColor: "text-blue-700",
      borderColor: "border-blue-400",
      boxShadow: "shadow-blue-200",
      hoverGradient: "hover:from-blue-600 hover:to-indigo-700",
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay with cash when your order is delivered to your doorstep.",
      icon: "cash",
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
              whileHover={{ y: -5 }}
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
                onClick={() => {
                  if (selectedMethod === method.id) {
                    // If already selected, trigger the Complete Order button
                    if (completeOrderButtonRef.current) {
                      completeOrderButtonRef.current.click()
                    }
                  }
                }}
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
                    {method.icon === "mpesa" ? (
                      <MpesaIcon />
                    ) : method.icon === "card" ? (
                      <CreditCardIcon />
                    ) : (
                      <CashIcon />
                    )}
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
                      Click to Proceed
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
