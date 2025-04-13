"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, Loader2, Check, AlertCircle, Info, UserPlus, ArrowRight, ArrowLeft } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth/auth-context"
import { registerSchema, validatePasswordRequirements, formatKenyanPhoneNumber } from "@/lib/validations/auth"
import type { RegisterFormValues } from "@/lib/validations/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

export function RegisterForm() {
  const router = useRouter()
  const { register: registerUser } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors, isValid, isSubmitted, isValidating },
    setError: setFormError,
    clearErrors,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  })

  const password = watch("password", "")
  const { requirements } = validatePasswordRequirements(password)

  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100

  // Function to handle next step
  const handleNextStep = async () => {
    let canProceed = false

    // Validate current step fields before proceeding
    switch (currentStep) {
      case 1:
        canProceed = await trigger("name")
        break
      case 2:
        canProceed = await trigger("email")
        break
      case 3:
        canProceed = await trigger("phone")
        break
      case 4:
        canProceed = await trigger("password")
        break
      case 5:
        canProceed = await trigger("confirmPassword")
        break
      case 6:
        canProceed = await trigger("terms")
        break
    }

    if (canProceed) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  // Function to handle previous step
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  // Modify the onSubmit function to work with our new page transition
  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true)
      setError(null)
      clearErrors()

      // Format phone number to international format
      const formattedPhone = formatKenyanPhoneNumber(data.phone || "")

      // Prepare the data for the backend
      const userData = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: formattedPhone,
      }

      await registerUser(userData)

      // Show success state
      setRegistrationSuccess(true)

      // Show toast notification
      toast({
        title: "Account created successfully!",
        description: "Welcome to Mizizzi. You can now sign in with your credentials.",
        className: "bg-green-50 border-green-200 text-green-800",
      })

      // The auth context will handle the redirect after the page transition
    } catch (err: any) {
      console.error("Registration error:", err)

      if (err.field === "email") {
        setFormError("email", {
          type: "manual",
          message: err.message,
        })
        setCurrentStep(2)
      } else if (err.field === "phone") {
        setFormError("phone", {
          type: "manual",
          message: err.message,
        })
        setCurrentStep(3)
      } else {
        setError(err.message || "Registration failed. Please try again.")
      }
      setIsLoading(false)
    }
  }

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  }

  if (registrationSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center text-center py-12"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotate: 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{
              duration: 0.5,
              repeat: 1,
              type: "tween",
            }}
            className="h-full w-full flex items-center justify-center"
          ></motion.div>
          <Check className="h-10 w-10 text-green-600" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
        <p className="text-gray-600 mb-4">Welcome to the Mizizzi family</p>
        <div className="w-full max-w-xs mx-auto">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5 }}
              className="h-full bg-cherry-600 rounded-full"
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">Redirecting to login page...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 md:p-8">
      {/* Header with logo */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 mr-3 shadow-lg">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%20From%202025-02-18%2013-30-22-eJUp6LVMkZ6Y7bs8FJB2hdyxnQdZdc.png"
            alt="Mizizzi Logo"
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </div>
        <span className="text-2xl font-bold tracking-tight text-cherry-900">Mizizzi</span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2 bg-gray-100" indicatorClassName="bg-cherry-600" />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between mb-8">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep > index + 1
                ? "bg-cherry-600 text-white"
                : currentStep === index + 1
                  ? "bg-cherry-100 text-cherry-800 border-2 border-cherry-600"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {currentStep > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Full Name */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's get started</h2>
                <p className="text-gray-600">First, tell us your name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 block">
                  Full Name
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...register("name")}
                  className={`${errors.name ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} h-12 rounded-lg shadow-sm transition-colors duration-200`}
                  disabled={isLoading}
                  aria-invalid={errors.name ? "true" : "false"}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="font-medium text-cherry-700 hover:text-cherry-800">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Email */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your email address</h2>
                <p className="text-gray-600">We'll use this for account verification</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                  Email
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register("email")}
                  className={`${errors.email ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} h-12 rounded-lg shadow-sm transition-colors duration-200`}
                  disabled={isLoading}
                  aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex-1 h-12 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Phone Number */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your phone number</h2>
                <p className="text-gray-600">For order updates and delivery notifications</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 block">
                  Phone Number
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678 or +254712345678"
                  autoComplete="tel"
                  {...register("phone")}
                  className={`${errors.phone ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} h-12 rounded-lg shadow-sm transition-colors duration-200`}
                  disabled={isLoading}
                  aria-invalid={errors.phone ? "true" : "false"}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex-1 h-12 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Password */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create a password</h2>
                <p className="text-gray-600">Make sure it's secure and easy to remember</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 block">
                  Password
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("password")}
                    className={`${errors.password ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} pr-10 h-12 rounded-lg shadow-sm transition-colors duration-200`}
                    disabled={isLoading}
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}

                {/* Password Requirements */}
                <div className="space-y-2 rounded-lg border border-gray-200 p-4 bg-gray-50 mt-4">
                  <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
                  <div className="grid gap-2">
                    {requirements.map((req, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          initial={false}
                          animate={
                            req.met ? { scale: [1, 1.2, 1], backgroundColor: ["#f3f4f6", "#dcfce7", "#dcfce7"] } : {}
                          }
                          transition={{ duration: 0.3 }}
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${req.met ? "bg-green-100" : "bg-gray-100"}`}
                        >
                          {req.met ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-gray-400" />
                          )}
                        </motion.div>
                        <span className={req.met ? "text-green-700" : "text-gray-600"}>{req.requirement}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex-1 h-12 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Confirm Password */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm your password</h2>
                <p className="text-gray-600">Please re-enter your password to confirm</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 block">
                  Confirm Password
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    className={`${errors.confirmPassword ? "border-red-300 ring-red-100" : "border-gray-300 focus:border-cherry-500 focus:ring-cherry-200"} pr-10 h-12 rounded-lg shadow-sm transition-colors duration-200`}
                    disabled={isLoading}
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex-1 h-12 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 6: Terms and Conditions */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
              transition={{ type: "tween", duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost done!</h2>
                <p className="text-gray-600">Please review and accept our terms</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Account Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{getValues("name")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{getValues("email")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{getValues("phone")}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={watch("terms") || false}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setValue("terms", true, { shouldValidate: true })
                        } else {
                          setValue("terms", false as any, { shouldValidate: true })
                        }
                      }}
                      disabled={isLoading}
                      className="mt-1 text-cherry-700 border-gray-300 rounded focus:ring-cherry-500"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="font-medium text-cherry-700 underline underline-offset-4 hover:text-cherry-800"
                      >
                        terms and conditions
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="font-medium text-cherry-700 underline underline-offset-4 hover:text-cherry-800"
                      >
                        privacy policy
                      </Link>
                    </label>
                  </div>
                  {errors.terms && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.terms.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex-1 h-12 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-all duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !watch("terms")}
                  className="flex-1 h-12 bg-cherry-800 hover:bg-cherry-900 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Create account
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  )
}
