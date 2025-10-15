"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CreditCard,
  Smartphone,
  Banknote,
  Shield,
  Lock,
  CheckCircle2,
  Star,
  Sparkles,
  ArrowRight,
  Award,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface PaymentMethod {
  id: string
  name: string
  description: string
  longDescription: string
  icon: React.ReactNode
  gradient: string
  features: string[]
  processingTime: string
  fees: string
  availability: string[]
  badge?: string
  badgeColor?: string
  popular?: boolean
  recommended?: boolean
}

export default function PaymentMethodsPage() {
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const paymentMethods: PaymentMethod[] = [
    {
      id: "pesapal",
      name: "Pesapal Gateway",
      description: "Complete payment solution with multiple options",
      longDescription:
        "Kenya's most trusted payment gateway supporting M-Pesa, Airtel Money, Visa, Mastercard, and international cards. Bank-level security with instant processing.",
      icon: <CreditCard className="h-8 w-8" />,
      gradient: "from-blue-600 via-purple-600 to-indigo-700",
      features: [
        "M-Pesa Integration",
        "Airtel Money",
        "Visa & Mastercard",
        "International Cards",
        "Instant Processing",
        "Bank-Level Security",
      ],
      processingTime: "Instant",
      fees: "2.9% + KES 10",
      availability: ["Kenya", "Tanzania", "Uganda", "Rwanda"],
      badge: "Most Popular",
      badgeColor: "bg-blue-500",
      popular: true,
      recommended: true,
    },
    {
      id: "mpesa",
      name: "M-Pesa Direct",
      description: "Direct M-Pesa mobile money payments",
      longDescription:
        "Pay directly through M-Pesa with our streamlined integration. No card required - just your phone number and M-Pesa PIN.",
      icon: <Smartphone className="h-8 w-8" />,
      gradient: "from-green-600 to-emerald-700",
      features: [
        "Direct M-Pesa",
        "No Card Required",
        "Mobile Optimized",
        "Instant Confirmation",
        "24/7 Available",
        "Secure PIN",
      ],
      processingTime: "30 seconds",
      fees: "1.5%",
      availability: ["Kenya"],
      badge: "Fastest",
      badgeColor: "bg-green-500",
      popular: true,
    },
    {
      id: "card",
      name: "Credit & Debit Cards",
      description: "International card payments",
      longDescription:
        "Accept payments from Visa, Mastercard, American Express, and other major card networks worldwide with advanced fraud protection.",
      icon: <CreditCard className="h-8 w-8" />,
      gradient: "from-purple-600 to-pink-600",
      features: [
        "Visa & Mastercard",
        "American Express",
        "Global Acceptance",
        "Fraud Protection",
        "3D Secure",
        "Recurring Payments",
      ],
      processingTime: "2-3 minutes",
      fees: "3.4% + KES 15",
      availability: ["Worldwide"],
      badge: "Global",
      badgeColor: "bg-purple-500",
    },
    {
      id: "airtel",
      name: "Airtel Money",
      description: "Airtel mobile money payments",
      longDescription:
        "Seamless payments through Airtel Money with instant processing and confirmation. Perfect for Airtel subscribers.",
      icon: <Smartphone className="h-8 w-8" />,
      gradient: "from-red-600 to-orange-600",
      features: [
        "Airtel Money",
        "Instant Processing",
        "Mobile First",
        "No Setup Required",
        "Secure Transactions",
        "Real-time Confirmation",
      ],
      processingTime: "45 seconds",
      fees: "2.0%",
      availability: ["Kenya", "Tanzania", "Uganda"],
      badge: "Reliable",
      badgeColor: "bg-red-500",
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay when you receive your order",
      longDescription:
        "No upfront payment required. Pay with cash when your order is delivered to your doorstep. Available in major cities.",
      icon: <Banknote className="h-8 w-8" />,
      gradient: "from-amber-600 to-yellow-600",
      features: [
        "No Prepayment",
        "Cash Payment",
        "Doorstep Delivery",
        "Order Verification",
        "Flexible Timing",
        "No Online Risk",
      ],
      processingTime: "On delivery",
      fees: "KES 200 service fee",
      availability: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"],
      badge: "No Risk",
      badgeColor: "bg-amber-500",
    },
  ]

  const securityFeatures = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Bank-Level Security",
      description: "256-bit SSL encryption protects all transactions",
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "PCI DSS Compliant",
      description: "Certified payment security standards",
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Trusted by 1M+",
      description: "Over 1 million successful transactions",
    },
  ]

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId)
  }

  const handleProceedToPayment = async () => {
    if (!selectedMethod) return

    setIsProcessing(true)

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Redirect to checkout with selected method
    router.push(`/checkout?payment_method=${selectedMethod}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-3 rounded-full mb-6"
          >
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="text-purple-700 font-semibold">Premium Payment Experience</span>
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold luxury-gradient-text mb-6">Choose Your Payment Method</h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Experience seamless, secure payments with our premium gateway solutions. Select from multiple payment
            options designed for your convenience.
          </p>
        </motion.div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <AnimatePresence>
            {paymentMethods.map((method, index) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative"
              >
                {/* Badge */}
                {method.badge && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className={cn(
                      "absolute -top-3 left-6 z-20 px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg",
                      method.badgeColor,
                    )}
                  >
                    {method.badge}
                  </motion.div>
                )}

                {/* Recommended Badge */}
                {method.recommended && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="absolute -top-3 right-6 z-20 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg"
                  >
                    ⭐ RECOMMENDED
                  </motion.div>
                )}

                <Card
                  className={cn(
                    "luxury-payment-card cursor-pointer h-full",
                    selectedMethod === method.id && "selected",
                  )}
                  onClick={() => handleMethodSelect(method.id)}
                >
                  <CardContent className="p-8 h-full flex flex-col">
                    {/* Icon and Title */}
                    <div className="mb-6">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg",
                          `bg-gradient-to-br ${method.gradient}`,
                        )}
                      >
                        {method.icon}
                      </motion.div>

                      <h3 className="text-2xl font-bold text-foreground mb-2">{method.name}</h3>

                      <p className="text-muted-foreground">{method.description}</p>
                    </div>

                    {/* Long Description */}
                    <p className="text-sm text-muted-foreground mb-6 flex-grow leading-relaxed">
                      {method.longDescription}
                    </p>

                    {/* Features Grid */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-sm text-foreground mb-3">Features:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {method.features.map((feature, featureIndex) => (
                          <motion.div
                            key={feature}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + featureIndex * 0.05 }}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <div className={cn("w-2 h-2 rounded-full bg-gradient-to-r", method.gradient)} />
                            <span>{feature}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Processing Time:</span>
                        <span className="font-semibold text-foreground">{method.processingTime}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Fees:</span>
                        <span className="font-semibold text-foreground">{method.fees}</span>
                      </div>
                      <div className="flex justify-between items-start text-sm">
                        <span className="text-muted-foreground">Available in:</span>
                        <div className="text-right">
                          {method.availability.map((country, i) => (
                            <div key={country} className="font-semibold text-foreground">
                              {country}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Selection Button */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        className={cn(
                          "w-full h-12 rounded-xl font-bold text-white transition-all duration-300",
                          selectedMethod === method.id
                            ? "luxury-button"
                            : `bg-gradient-to-r ${method.gradient} hover:opacity-90`,
                        )}
                      >
                        {selectedMethod === method.id ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Selected
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Select Method
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold luxury-gradient-text mb-2">Enterprise-Grade Security</h3>
                <p className="text-muted-foreground">
                  Your payments are protected by industry-leading security measures
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {securityFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="luxury-security-badge mx-auto mb-4 w-fit">
                      {feature.icon}
                      <span className="font-semibold">{feature.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Proceed Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="text-center"
        >
          <Button
            onClick={handleProceedToPayment}
            disabled={!selectedMethod || isProcessing}
            className="luxury-button px-12 py-6 text-lg rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
                Processing...
              </span>
            ) : selectedMethod ? (
              <span className="flex items-center gap-3">
                Proceed to Checkout
                <ArrowRight className="h-5 w-5" />
              </span>
            ) : (
              "Select a Payment Method"
            )}
          </Button>

          {selectedMethod && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground mt-4">
              You selected:{" "}
              <span className="font-semibold">{paymentMethods.find((m) => m.id === selectedMethod)?.name}</span>
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
