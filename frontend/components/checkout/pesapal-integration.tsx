"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Loader2, Shield, Lock, ArrowRight, AlertCircle, CheckCircle2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface PesapalIntegrationProps {
  amount: number
  orderId?: string | number
  customerEmail?: string
  customerPhone?: string
  onSuccess?: () => void
  onBack?: () => void
}

export function PesapalIntegration({
  amount,
  orderId,
  customerEmail = "",
  customerPhone = "",
  onSuccess,
  onBack,
}: PesapalIntegrationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState(customerEmail)
  const [phone, setPhone] = useState(customerPhone)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [processingStep, setProcessingStep] = useState(0)

  const { toast } = useToast()

  const processingSteps = [
    "Validating payment details...",
    "Connecting to Pesapal gateway...",
    "Generating secure payment link...",
    "Redirecting to payment page...",
  ]

  const formatPhoneNumber = (phoneNumber: string) => {
    let cleaned = phoneNumber.replace(/\D/g, "")
    if (cleaned.startsWith("0")) {
      cleaned = "254" + cleaned.substring(1)
    } else if (!cleaned.startsWith("254") && cleaned.length > 0) {
      cleaned = "254" + cleaned
    }
    return cleaned
  }

  const validateForm = () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return false
    }
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number")
      return false
    }
    if (!firstName.trim()) {
      setError("Please enter your first name")
      return false
    }
    if (!lastName.trim()) {
      setError("Please enter your last name")
      return false
    }
    return true
  }

  const handlePayment = async () => {
    if (!validateForm()) return

    setLoading(true)
    setError(null)
    setProcessingStep(0)

    try {
      const paymentData = {
        order_id: orderId ? `ORDER_${orderId}` : `PAYMENT_${Date.now()}`,
        amount: amount,
        currency: "KES",
        description: `MIZIZZI Order Payment - ${orderId || "Direct Payment"}`,
        customer_email: email,
        customer_phone: formatPhoneNumber(phone),
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          email_address: email,
          phone_number: formatPhoneNumber(phone),
          line_1: "Nairobi",
          city: "Nairobi",
          country_code: "KE",
          postal_code: "00100",
        },
      }

      // Simulate processing steps
      const stepInterval = setInterval(() => {
        setProcessingStep((prev) => {
          if (prev < processingSteps.length - 1) {
            return prev + 1
          } else {
            clearInterval(stepInterval)
            return prev
          }
        })
      }, 800)

      console.log("[v0] Sending Pesapal payment request:", paymentData)

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
      const response = await fetch(`${backendUrl}/api/pesapal/card/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`, // Add JWT token for authentication
        },
        body: JSON.stringify(paymentData),
      })

      const result = await response.json()

      console.log("[v0] Pesapal payment response:", result)

      if (result.status === "success" && result.redirect_url) {
        toast({
          title: "Payment link generated!",
          description: "Redirecting to secure payment gateway...",
        })

        // Redirect to Pesapal payment page
        window.location.href = result.redirect_url

        if (onSuccess) {
          onSuccess()
        }
      } else {
        throw new Error(result.message || result.error || "Failed to create payment request")
      }
    } catch (err: any) {
      console.error("[v0] Pesapal payment error:", err)

      let errorMessage = "An error occurred while processing your payment"
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      toast({
        variant: "destructive",
        title: "Payment failed",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-lg mx-auto"
    >
      <Card className="overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 border-0 shadow-2xl">
        <CardHeader className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white overflow-hidden">
          {/* Animated background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-indigo-400/20"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />

          <div className="relative z-10">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <motion.div
                className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <CreditCard className="h-6 w-6" />
              </motion.div>
              Pesapal Payment
              <motion.div
                animate={{ rotate: [0, 180, 360], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="ml-auto"
              >
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </motion.div>
            </CardTitle>
            <p className="text-blue-100 mt-2">Secure payment powered by Pesapal - Kenya's trusted payment gateway</p>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </motion.div>

              <h3 className="text-xl font-semibold text-gray-800 mb-4">Processing Payment</h3>

              <div className="space-y-3">
                {processingSteps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: index <= processingStep ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ delay: index * 0.2 }}
                    className={cn(
                      "flex items-center gap-3 text-sm",
                      index <= processingStep ? "text-blue-600" : "text-gray-400",
                    )}
                  >
                    <motion.div
                      animate={index === processingStep ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                      className={cn("w-2 h-2 rounded-full", index <= processingStep ? "bg-blue-500" : "bg-gray-300")}
                    />
                    {step}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Amount display */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Amount to Pay</span>
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    KES {amount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Customer details form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl mt-1"
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl mt-1"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl mt-1"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl mt-1"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Enter your phone number for payment notifications</p>
              </div>

              {/* Action buttons */}
              <div className="space-y-4 pt-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    <span className="relative z-10 flex items-center gap-3">
                      <Lock className="h-5 w-5" />
                      Pay with Pesapal
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </motion.div>

                {onBack && (
                  <Button
                    variant="outline"
                    onClick={onBack}
                    disabled={loading}
                    className="w-full h-12 border-gray-200 hover:bg-gray-50 rounded-xl bg-transparent"
                  >
                    Back to Payment Methods
                  </Button>
                )}
              </div>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-6 pt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="h-4 w-4 text-blue-500" />
                  <span>PCI Compliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  <span>Trusted by 1M+</span>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default PesapalIntegration
