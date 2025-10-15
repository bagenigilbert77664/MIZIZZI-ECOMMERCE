"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, Banknote, ArrowRight, Shield, Zap, Clock, CheckCircle2, Sparkles, Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface ApplePaymentCardsProps {
  selectedMethod?: string
  onSelectMethod: (method: string) => void
  onProceedToPayment: () => void
  amount: number
  isProcessing?: boolean
}

export function ApplePaymentCards({
  selectedMethod,
  onSelectMethod,
  onProceedToPayment,
  amount,
  isProcessing = false,
}: ApplePaymentCardsProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const paymentMethods = [
    {
      id: "pesapal",
      name: "Pay with Pesapal",
      subtitle: "Cards & Mobile Money",
      description: "Secure payment with M-Pesa, Visa, Mastercard & more",
      icon: CreditCard,
      gradient: "from-blue-500 via-purple-500 to-indigo-600",
      glowColor: "shadow-blue-500/25",
      features: [
        { icon: Zap, text: "Instant", color: "text-yellow-500" },
        { icon: Shield, text: "Secure", color: "text-green-500" },
        { icon: Star, text: "Recommended", color: "text-purple-500" },
      ],
      processingTime: "Instant",
      popular: true,
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      subtitle: "Pay at Your Door",
      description: "Pay with cash when your order arrives safely",
      icon: Banknote,
      gradient: "from-emerald-500 via-green-500 to-teal-600",
      glowColor: "shadow-emerald-500/25",
      features: [
        { icon: Clock, text: "Flexible", color: "text-blue-500" },
        { icon: Shield, text: "Risk Free", color: "text-green-500" },
        { icon: CheckCircle2, text: "Simple", color: "text-emerald-500" },
      ],
      processingTime: "On delivery",
      popular: false,
    },
  ]

  const handleCardClick = (methodId: string) => {
    if (selectedMethod === methodId) {
      // If already selected, proceed to payment
      onProceedToPayment()
    } else {
      // Select this method
      onSelectMethod(methodId)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Choose Payment Method</h2>
        <p className="text-gray-600 font-medium">
          Total: <span className="text-2xl font-bold text-gray-900">KES {amount.toLocaleString()}</span>
        </p>
      </div>

      {/* Payment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <AnimatePresence>
          {paymentMethods.map((method, index) => {
            const isSelected = selectedMethod === method.id
            const isHovered = hoveredCard === method.id
            const IconComponent = method.icon

            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.5,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="relative group"
                onHoverStart={() => setHoveredCard(method.id)}
                onHoverEnd={() => setHoveredCard(null)}
              >
                {/* Popular Badge */}
                {method.popular && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10"
                  >
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      RECOMMENDED
                    </div>
                  </motion.div>
                )}

                <motion.div
                  whileHover={{
                    y: -8,
                    transition: { type: "spring", stiffness: 400, damping: 25 },
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="h-full"
                >
                  <Card
                    className={cn(
                      "relative overflow-hidden cursor-pointer transition-all duration-300 h-full",
                      "border-2 rounded-3xl backdrop-blur-xl",
                      isSelected
                        ? `border-transparent bg-white shadow-2xl ${method.glowColor}`
                        : "border-gray-200 bg-white/80 hover:border-gray-300 shadow-lg hover:shadow-xl",
                      isHovered && !isSelected && "shadow-xl scale-[1.02]",
                    )}
                    onClick={() => handleCardClick(method.id)}
                  >
                    {/* Gradient Background for Selected */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn("absolute inset-0 bg-gradient-to-br opacity-5", method.gradient)}
                      />
                    )}

                    {/* Animated Border for Selected */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn("absolute inset-0 rounded-3xl bg-gradient-to-r p-[2px]", method.gradient)}
                      >
                        <div className="w-full h-full bg-white rounded-3xl" />
                      </motion.div>
                    )}

                    <CardContent className="relative z-10 p-8 h-full flex flex-col">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <motion.div
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            className={cn(
                              "p-4 rounded-2xl shadow-lg",
                              isSelected
                                ? `bg-gradient-to-br ${method.gradient} text-white`
                                : "bg-gray-100 text-gray-600",
                            )}
                          >
                            <IconComponent className="h-8 w-8" />
                          </motion.div>

                          <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{method.name}</h3>
                            <p className="text-sm text-gray-500 font-medium">{method.subtitle}</p>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
                                `bg-gradient-to-br ${method.gradient}`,
                              )}
                            >
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 mb-6 leading-relaxed">{method.description}</p>

                      {/* Features */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        {method.features.map((feature, featureIndex) => (
                          <motion.div
                            key={feature.text}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + featureIndex * 0.1 }}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-full border border-gray-200"
                          >
                            <feature.icon className={cn("w-4 h-4", feature.color)} />
                            <span className="text-sm font-medium text-gray-700">{feature.text}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="mt-auto pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Processing Time</span>
                          <span className="font-semibold text-gray-900">{method.processingTime}</span>
                        </div>
                      </div>

                      {/* Action Button for Selected */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ delay: 0.2 }}
                            className="mt-6"
                          >
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                onProceedToPayment()
                              }}
                              disabled={isProcessing}
                              className={cn(
                                "w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-all duration-300",
                                `bg-gradient-to-r ${method.gradient} hover:shadow-xl text-white`,
                                "hover:scale-[1.02] active:scale-[0.98]",
                              )}
                            >
                              {isProcessing ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                                  />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  Continue with {method.name.split(" ")[2] || method.name}
                                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Security Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-8 pt-8 border-t border-gray-100"
      >
        <div className="flex items-center gap-2 text-gray-500">
          <Shield className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium">256-bit SSL Encryption</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <CheckCircle2 className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">PCI DSS Compliant</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Star className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium">Trusted by 100K+</span>
        </div>
      </motion.div>
    </div>
  )
}

export default ApplePaymentCards
